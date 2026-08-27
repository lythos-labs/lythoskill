# ADR-20260827124021589: Separate release jobs for npm publish and Pages deploy

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-08-27 | Created after v0.17.4 release workflow failed because Pages environment polluted npm OIDC context |
| accepted | 2026-08-27 | Accepted |

## Background

ADR-20260827165402810 introduced a tag-triggered `.github/workflows/release.yml` that publishes npm packages via OIDC trusted publishing, creates a GitHub Release, and deploys the docs site to GitHub Pages in a single job.

During the v0.17.4 test release, the workflow failed at the npm publish step with:

```
npm error 404 Not Found - PUT https://registry.npmjs.org/@lythos%2fhello-world
```

The 404 was a permissions mask. Root cause: the job declared `environment: github-pages` so that `actions/deploy-pages` could deploy the docs site. Because the `environment` applies to the whole job, the OIDC token presented to npm during `npm publish` included `environment=github-pages`. npm's Trusted Publisher for `@lythos/hello-world` was configured with an empty Environment name, so the token did not match the publisher rule and npm rejected the publish.

The same failure would occur for any Trusted Publisher configured without an environment, which is the desired default for "plain repository publishing".

## Decision Drivers

1. **Environment isolation**: npm trusted publishing and GitHub Pages deployment should not share an `environment` context.
2. **Least privilege**: The npm publish job does not need Pages write access; the Pages job does not need npm publish access.
3. **OIDC clarity**: Each job's OIDC token should only carry claims required by the service it talks to.
4. **Maintainability**: Future CI/CD derivatives (e.g., container builds, npm staging) should have a clear place to plug in without fighting environment constraints.
5. **User confirmation discipline**: The user explicitly asked that Pages concerns not be mixed with the main release pipeline, and that this boundary be documented in an ADR.

## Options

### Option A: Single job with `environment: github-pages`, configure npm Trusted Publisher with `github-pages` environment

**Pros**:
- Minimal workflow change.
- Keeps all release steps in one linear run.

**Cons**:
- Pages environment leaks into npm OIDC claims.
- npm Trusted Publisher is forced to know about a GitHub Pages environment that has nothing to do with npm.
- Any future environment change on Pages (e.g., required reviewers) would also gate npm publish.
- Violates the principle that Pages is a separate CI/CD derivative.

### Option B: Split into two jobs — `publish` (no environment) and `pages` (`environment: github-pages`)

**Pros**:
- npm Trusted Publisher can keep Environment name empty (the default, repository-only claim).
- Pages deployment gets its own isolated environment with no impact on npm.
- Each job can have minimal, specific permissions.
- Failure in Pages does not mark the npm publish as failed, and vice versa.
- Aligns with the ADR boundary between "main release artifacts" and "docs site derivative".

**Cons**:
- Workflow file is slightly longer.
- `pages` job must wait for `publish` job if we want to guarantee the published version is live before docs rebuild (desirable, not mandatory).
- Two job IDs to watch in Actions logs.

### Option C: Keep single job, remove `environment` entirely and use a lower-level Pages deploy mechanism

**Pros**:
- No environment context at all.

**Cons**:
- `actions/deploy-pages@v4` requires an `environment` block to produce a deployment and update Pages status.
- Loses the per-deployment URL annotation.
- More complex than splitting jobs.

## Decision

**Choice**: Adopt **Option B**.

**Rationale**:
- It cleanly separates the main release (npm + GitHub Release) from the docs site deployment.
- It keeps npm Trusted Publisher configuration repository-scoped rather than environment-scoped.
- It matches the user's stated intent: Pages is Pages, release is release.
- It creates a natural extension point for future jobs (e.g., container image build, staging publish) without entangling environments.

## Impact

- Positive:
  - npm Trusted Publisher setup stays simple: organization, repository, workflow filename only.
  - Pages environment protection rules apply only to Pages deployments.
  - Failure domains are isolated.
- Negative:
  - Slightly more YAML.
  - Must express job dependency (`pages` needs `publish` to complete if we want version-tied docs build).
- Follow-up:
  - Update `.github/workflows/release.yml` to two-job layout.
  - Update `AGENTS.md` and `release-auth-workflow.md` to reflect that Pages is a separate job.
  - Re-test with v0.17.4 (or next patch) after updating workflow.

## Migration Plan

1. Rewrite `release.yml`:
   - Job `publish`: checkout tag, setup Bun/Node, test, rewrite workspace deps, npm publish, create GitHub Release, verify manifests.
   - Job `pages`: needs `publish`, checkout tag, setup Bun, install site deps, inject version, build VitePress, upload artifact, deploy to Pages with `environment: github-pages`.
2. Remove `environment: github-pages` from the `publish` job.
3. Keep `permissions` at workflow level (both jobs need `contents: write`, `id-token: write`, `pages: write`), or split per-job.
4. Re-run the failed v0.17.4 release by deleting and re-pushing the tag.

## Open Questions

- Should `pages` job require `publish` job success, or should docs deploy independently of npm publish result? Recommendation: require success so the docs site reflects the published version.
- Should the GitHub Release creation live in `publish` or a third `release` job? Keep it in `publish` for now; it is a core release artifact.

## Related

- Supersedes / amends: ADR-20260827165402810 (tag-triggered release pipeline with OIDC npm provenance), specifically the single-job workflow design.
- Related Task: TASK-20260827170159682 (release pipeline Trusted Publisher setup)
- Related Files: `.github/workflows/release.yml`, `AGENTS.md`, `packages/lythoskill-creator/skill/references/release-auth-workflow.md`
