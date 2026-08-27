# ADR-20260827165402810: Tag-triggered release pipeline with OIDC npm provenance

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-08-27 | Created from user proposal to migrate release pipeline |

## Background

The current release pipeline is local-agent-driven:

1. `bunx @lythos/skill-creator bump ...` updates `package.json` files.
2. Agent commits the bump.
3. `./scripts/publish.sh` runs locally, reading a long-lived npm token from `.npm-access`.
4. `./scripts/publish-github-release.sh` creates/pushes the Git tag and GitHub Release.

This works but has drawbacks:

- A long-lived npm token lives in the filesystem (`.npm-access`).
- npm publishes happen from a maintainer machine, so they cannot carry npm provenance statements linking the package back to a GitHub Actions run and commit.
- The local machine must have the right npm auth, Bun version, and clean state.
- GitHub Releases and Pages deploy are separate from npm publish, increasing coordination surface.

GitHub and npm now support OIDC-based "trusted publishing": a GitHub Actions workflow can publish to npm without a long-lived token, using a short-lived OIDC credential. This also automatically generates npm provenance.

## Decision Drivers

1. **Security**: Eliminate long-lived npm tokens from local disks and CI secrets.
2. **Attestation**: Every published package should have npm provenance linking it to a GitHub commit and Actions run.
3. **Simplicity for agents**: Local release action should shrink to "bump version + push tag".
4. **Consistency**: npm, GitHub Release, and Pages deploy should all happen from the same tag-triggered workflow.
5. **Auditability**: Release artifacts should be reconstructible from the Actions run logs.

## Options

### Option A: Keep local-agent-driven publishing

Continue using `./scripts/publish.sh` with `.npm-access` and `./scripts/publish-github-release.sh` with the keychain-stored GitHub PAT.

**Pros**:
- Already working today.
- No npm trusted-publisher setup required.
- Fine-grained control over publish order.

**Cons**:
- Long-lived npm token remains a liability.
- No npm provenance.
- Local environment differences can cause drift.
- Agent must run more commands and handle more failure modes.

### Option B: Tag-triggered GitHub Actions pipeline with OIDC npm publishing

Agent's only release action: bump version and `git push --follow-tags`. A new `.github/workflows/release.yml` triggers on `v*` tags, runs tests, publishes all packages to npm via OIDC, creates the GitHub Release, and deploys the docs site to Pages.

**Pros**:
- No long-lived npm token in files or CI secrets.
- Automatic npm provenance for every package.
- Single workflow orchestrates npm + Release + Pages.
- Local agent role is minimal and safe.

**Cons**:
- Requires one-time npm Trusted Publisher configuration for every `@lythos/*` package.
- New packages have a chicken-and-egg problem: must be published once before a Trusted Publisher can be attached.
- Monorepo publish order and workspace-protocol rewrite must still be handled in CI.
- Adds a new workflow that must be maintained and guarded.
- If the release workflow fails mid-run, recovery is more complex than re-running a local script.

### Option C: Hybrid — local npm publish, Actions for Release/Pages only

Keep `./scripts/publish.sh` for npm publish, but move tag creation and GitHub Release creation to a local script, and let Actions handle Pages deploy.

**Pros**:
- Smaller migration.
- Avoids npm Trusted Publisher setup.

**Cons**:
- Does not solve the long-lived npm token or provenance problem.
- Splits responsibility awkwardly.

## Decision

**Choice**: Adopt **Option B** as the target architecture. Keep Option A running during a transition period while Trusted Publishers are configured package-by-package.

**Rationale**:
- Option B aligns with modern supply-chain best practices (no long-lived npm secrets, provenance by default).
- It matches the user's stated principle: the tag is the single trigger; local agent only pulls the trigger.
- The lythoskill monorepo already publishes 13 packages; the one-time setup cost is acceptable.
- Option C does not address the core security/attestation goals.

## Impact

- Positive:
  - `.npm-access` can be retired after transition.
  - All future `@lythos/*` releases carry npm provenance.
  - Release process becomes deterministic and reproducible in Actions.
  - AGENTS.md release SOP simplifies to: bump → commit → `git push --follow-tags` → watch Actions.
- Negative:
  - One-time setup: configure Trusted Publisher for each existing `@lythos/*` package on npmjs.com.
  - New packages still need a manual first publish or a token fallback.
  - The workspace-protocol rewrite (`workspace:*` → concrete version) must be reproduced in the Actions workflow.
  - Failure recovery (e.g., partial publish) needs documented runbook.
- Follow-up:
  - Create `.github/workflows/release.yml`.
  - Update `scripts/publish.sh` to be CI-friendly or replace with a CI-specific script.
  - Update `AGENTS.md` and `release-auth-workflow.md` with the new SOP.
  - Configure npm Trusted Publishers for all existing packages (use `npm-trust` or manual setup).
  - Add tag protection rule for `v*`.
  - Test the new pipeline with a patch release.

## Migration Plan

1. **Preparation**
   - Audit all packages in `scripts/publish.sh` PACKAGES array.
   - For each package, verify it exists on npm and add a Trusted Publisher on npmjs.com:
     - Organization/User: `lythos-labs`
     - Repository: `lythoskill`
     - Workflow filename: `release.yml`
   - New packages without a Trusted Publisher will use a one-time fallback until configured.

2. **Workflow design** (`release.yml`)

   Trigger: `on.push.tags: ['v*']`

   Permissions:
   - `contents: write` — create GitHub Release
   - `id-token: write` — OIDC for npm trusted publishing
   - `pages: write` — deploy docs

   Steps:
   - Checkout tag.
   - Setup Bun.
   - `bun install --frozen-lockfile`.
   - Run tests.
   - Rewrite `workspace:*` → concrete version in publishable manifests (reuse `scripts/rewrite-workspace-deps.ts`).
   - For each package in dependency order, run `npm publish --access public` (npm CLI handles OIDC + provenance).
   - Create GitHub Release with `gh release create`.
   - Build and deploy docs site to Pages.
   - Optionally run `check-published-manifests.ts` as a post-publish guard.

3. **Local SOP change**
   - Agent runs `bunx @lythos/skill-creator bump ...`.
   - Agent commits: `chore(release): vX.Y.Z`.
   - Agent pushes with tags: `git push --follow-tags`.
   - Agent watches Actions: `gh run watch`.

4. **Guardrails**
   - Add tag protection rule for `v*` to prevent overwrite.
   - Consider `environment: npm-production` with required reviewers for the publish job.

## Open Questions

- Does `npm publish` inside a Bun monorepo work cleanly for all 13 packages, or do we need per-package `cd` + `npm publish`?
- Should we keep `scripts/publish.sh` as an emergency fallback during the transition?
- How do we handle a brand-new `@lythos/*` package that has no Trusted Publisher yet?

## Related

- Related ADR: ADR-20260827143012709 (site version metadata and GitHub release synchronization)
- Related Task: TASK-20260827150725011 (provision GitHub PAT — completed)
- Related Files: `scripts/publish.sh`, `scripts/publish-github-release.sh`, `packages/lythoskill-creator/skill/references/release-auth-workflow.md`, `AGENTS.md`
