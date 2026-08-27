# TASK-20260827170159682: Implement tag-triggered release pipeline with OIDC npm provenance

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created from accepted ADR-20260827165402810 |
| in-progress | 2026-08-27 | Started |
| review | 2026-08-27 | Deliverables committed |

## Background & Goals

ADR-20260827165402810 accepted: migrate the local-agent-driven release pipeline
to a tag-triggered GitHub Actions workflow that uses OIDC trusted publishing to
npm. This eliminates the long-lived npm token (`.npm-access`) and gives every
published package automatic provenance linked to a GitHub Actions run.

Goal: local agent only bumps version and pushes the tag; Actions handles test,
npm publish, GitHub Release creation, and Pages deploy from a single workflow.

## Requirements

- [ ] Create `.github/workflows/release.yml` triggered on `v*` tags.
- [ ] Workflow runs tests, publishes all `@lythos/*` packages via OIDC, creates
  GitHub Release, and deploys the docs site to Pages.
- [ ] Reuse existing `scripts/rewrite-workspace-deps.ts` to translate
  `workspace:*` → `^<version>` before publishing.
- [ ] Keep `scripts/publish.sh` and `scripts/publish-github-release.sh` as
  local fallbacks during the transition, but mark them deprecated in docs.
- [ ] Update `AGENTS.md` release SOP to: bump → commit → `git push --follow-tags`
  → watch Actions.
- [ ] Update `packages/lythoskill-creator/skill/references/release-auth-workflow.md`
  with the new CI flow and npm Trusted Publisher setup steps.
- [ ] Add a note about the one-time per-package npm Trusted Publisher
  configuration required before the new pipeline can publish each package.

## Technical Approach

1. **Workflow trigger & permissions**
   - `on.push.tags: ['v*']`
   - `permissions: contents: write, id-token: write, pages: write`
   - Use `actions/checkout@v5`, `oven-sh/setup-bun@v2`, and `actions/cache@v4`.

2. **Test gate**
   - `bun install --frozen-lockfile`
   - `bun --filter='*' run test`
   - Run the same validation scripts as `test.yml` where sensible.

3. **Publish**
   - For each package in the existing `scripts/publish.sh` PACKAGES order:
     - `bun scripts/rewrite-workspace-deps.ts <pkg>/package.json`
     - `cd <pkg> && npm publish --access public`
   - npm CLI inside an Actions job with `registry-url` configured will use the
     built-in `NODE_AUTH_TOKEN` / OIDC flow for trusted publishing.

4. **GitHub Release**
   - `gh release create "${GITHUB_REF_NAME}" --generate-notes`
   - Use `secrets.GITHUB_TOKEN`.

5. **Pages deploy**
   - Build the site with `bun scripts/inject-version.ts` + `bun vitepress build`.
   - `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`.

6. **Post-publish guard**
   - Run `scripts/check-published-manifests.ts <version>` after publish to assert
     no `workspace:*` leaked into npm manifests.

## Acceptance Criteria

- [x] `release.yml` parses and passes YAML syntax check (Python yaml parse).
- [ ] Pushing a `v*` tag on a green main triggers the workflow (tested with the
  next patch release or a deliberate pre-release tag).
- [ ] Published packages show the npm provenance badge and link back to the
  GitHub Actions run.
- [ ] GitHub Release is created automatically and marked latest.
- [ ] Docs site footer reflects the new release version/hash after deploy.
- [x] `AGENTS.md` and `release-auth-workflow.md` describe the new SOP accurately.
- [x] `scripts/publish.sh` still works as an emergency fallback.

## Progress Log

- 2026-08-27 17:02 — Created task from accepted ADR-20260827165402810.
- 2026-08-27 17:10 — Drafted `.github/workflows/release.yml` with OIDC npm publish, GitHub Release, and Pages deploy.
- 2026-08-27 17:15 — Updated `AGENTS.md` and `release-auth-workflow.md` SOP; marked local scripts as transition fallbacks.
- 2026-08-27 17:20 — Validated YAML syntax, ran `bun --filter='*' run test` (all green), built `skills/lythoskill-creator/`.
- 2026-08-27 17:22 — Committed, pushed, scribed daily.
- 2026-08-27 17:29 — Added GitHub ruleset `protect-v-tags` for `refs/tags/v*` (deletion + non-fast-forward protection).
- 2026-08-27 17:30 — npm Trusted Publisher configuration blocked: npm does not expose a public API for this; must be done manually via npmjs.com package access pages. Verified `lythos` user has read-write access to all packages. Generated manual checklist below.

## npm Trusted Publisher Manual Checklist

npm [does not support programmatic configuration](https://docs.npmjs.com/trusted-publishers/) of Trusted Publishers. Each package must be configured via the npmjs.com web UI. The npm user `lythos` has read-write access to all packages, so you can do this with the current login.

For each package, go to its **Access** page → **Trusted Publisher** section → **GitHub Actions**, then fill:

| Package | npm Access Page |
|---------|-----------------|
| `@lythos/hello-world` | https://www.npmjs.com/package/@lythos/hello-world/access |
| `@lythos/agent-adapter` | https://www.npmjs.com/package/@lythos/agent-adapter/access |
| `@lythos/agent-adapter-claude-sdk` | https://www.npmjs.com/package/@lythos/agent-adapter-claude-sdk/access |
| `@lythos/agent-adapter-deepseek-serve` | https://www.npmjs.com/package/@lythos/agent-adapter-deepseek-serve/access |
| `@lythos/agent-adapter-codex` | https://www.npmjs.com/package/@lythos/agent-adapter-codex/access |
| `@lythos/test-utils` | https://www.npmjs.com/package/@lythos/test-utils/access |
| `@lythos/infra` | https://www.npmjs.com/package/@lythos/infra/access |
| `@lythos/cold-pool` | https://www.npmjs.com/package/@lythos/cold-pool/access |
| `@lythos/project-cortex` | https://www.npmjs.com/package/@lythos/project-cortex/access |
| `@lythos/skill-curator` | https://www.npmjs.com/package/@lythos/skill-curator/access |
| `@lythos/skill-arena` | https://www.npmjs.com/package/@lythos/skill-arena/access |
| `@lythos/skill-creator` | https://www.npmjs.com/package/@lythos/skill-creator/access |
| `@lythos/skill-deck` | https://www.npmjs.com/package/@lythos/skill-deck/access |

Fill in:
- **Publisher**: `lythos-labs`
- **Repository**: `lythoskill`
- **Workflow name**: `release.yml`
- **Environment name**: leave blank / "No environment" (the current `release.yml` does not use a dedicated environment for npm publish).
- **Allowed actions**: check both `npm publish` and `npm stage publish`.

After all 13 are configured, the `release` workflow can publish packages via OIDC. Until then, unconfigured packages must use the `./scripts/publish.sh` fallback.

## Related Files

- Modified:
  - `AGENTS.md`
  - `packages/lythoskill-creator/skill/references/release-auth-workflow.md`
  - `scripts/publish.sh` (deprecation comment only)
- Added:
  - `.github/workflows/release.yml`

## Git Commit Message

```
feat(ci): tag-triggered release pipeline with OIDC npm provenance (TASK-20260827170159682)

- Add .github/workflows/release.yml triggered on v* tags.
- Publish all @lythos/* packages via OIDC trusted publishing.
- Create GitHub Release and deploy docs site from the same workflow.
- Update AGENTS.md and release-auth-workflow.md SOP.
```

## Notes

- One-time setup: each `@lythos/*` package on npmjs.com must have a Trusted
  Publisher pointing to `lythos-labs/lythoskill/.github/workflows/release.yml`.
- New packages without a Trusted Publisher need a manual first publish or a
  temporary classic-token fallback.
- Tag protection rule for `v*` is recommended but not in scope for this task
  (requires repo admin settings).
