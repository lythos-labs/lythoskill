# TASK-20260827170159682: Implement tag-triggered release pipeline with OIDC npm provenance

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created from accepted ADR-20260827165402810 |
| in-progress | 2026-08-27 | Started |

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

- [ ] `release.yml` parses and passes `actionlint` or `gh workflow run --ref` dry check.
- [ ] Pushing a `v*` tag on a green main triggers the workflow (tested with the
  next patch release or a deliberate pre-release tag).
 [ ] Published packages show the npm provenance badge and link back to the
  GitHub Actions run.
- [ ] GitHub Release is created automatically and marked latest.
- [ ] Docs site footer reflects the new release version/hash after deploy.
- [ ] `AGENTS.md` and `release-auth-workflow.md` describe the new SOP accurately.
- [ ] `scripts/publish.sh` still works as an emergency fallback.

## Progress Log

- 2026-08-27 17:02 — Created task from accepted ADR-20260827165402810.
- 2026-08-27 17:10 — Drafted `.github/workflows/release.yml` with OIDC npm publish, GitHub Release, and Pages deploy.
- 2026-08-27 17:15 — Updated `AGENTS.md` and `release-auth-workflow.md` SOP; marked local scripts as transition fallbacks.
- 2026-08-27 17:20 — Validated YAML syntax, ran `bun --filter='*' run test` (all green), built `skills/lythoskill-creator/`.
- 2026-08-27 17:22 — Ready to commit, push, and scribe.

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
