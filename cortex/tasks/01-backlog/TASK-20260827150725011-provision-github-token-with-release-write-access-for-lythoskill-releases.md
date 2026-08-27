# TASK-20260827150725011: Provision GitHub token with release-write access for lythoskill releases

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created after `publish-github-release.sh` failed with HTTP 403 |

## Background & Goals

`scripts/publish-github-release.sh` was added to keep GitHub tags/releases in lock-step with npm. During the backfill of `v0.17.3`, the script successfully created and pushed the Git tag, but `gh release create` failed:

```
HTTP 403: Resource not accessible by personal access token
(https://api.github.com/repos/lythos-labs/lythoskill/releases)
```

The current `.github-token` (used by `gh` CLI) has repo push/admin access but **not** release-write access. This task tracks provisioning a replacement token that can create GitHub Releases, then verifying the backfill.

## Requirements

- [ ] Replace `.github-token` with a GitHub PAT that has permission to create releases on `lythos-labs/lythoskill`.
- [ ] Re-run `./scripts/publish-github-release.sh 371af8fe` to create the `v0.17.3` GitHub Release.
- [ ] Verify via `gh release list` and web fetch that `v0.17.3` appears as Latest.
- [ ] Document the required scopes in `AGENTS.md` or `release-auth-workflow.md` so future agents/users know which token permissions to maintain.

## Technical Approach

Two token strategies:

1. **Classic PAT** (simplest, repository-scoped via user access):
   - Scope: `repo` (full control of private repositories — covers release creation, contents, actions read).
   - Owner: user `calt13` (current `.github-token` account).

2. **Fine-grained PAT** (recommended for least privilege):
   - Resource owner: `lythos-labs`
   - Repository access: `lythos-labs/lythoskill` only
   - Repository permissions:
     - **Contents**: Read and Write (required to create releases and read repo metadata)
     - **Actions**: Read (to list/check workflow runs via `gh run list`)
     - **Metadata**: Read (automatic, required for API access)
   - No other permissions needed for the current workflow.

After updating `.github-token`:

```bash
# Verify auth
GH_TOKEN=$(<.github-token) gh auth status

# Re-run release creation for v0.17.3
./scripts/publish-github-release.sh 371af8fe

# Verify
GH_TOKEN=$(<.github-token) gh release list --repo lythos-labs/lythoskill --limit 5
```

## Acceptance Criteria

- [ ] `GH_TOKEN=$(<.github-token) gh release create ...` no longer returns 403.
- [ ] `gh release list --repo lythos-labs/lythoskill` shows `v0.17.3` and it is marked `Latest`.
- [ ] Web fetch of https://github.com/lythos-labs/lythoskill/releases/tag/v0.17.3 returns the release page (not 404/403).
- [ ] Required token scopes are documented in release SOP.

## Progress Log

- 2026-08-27 — Task created after `publish-github-release.sh` failed with 403 while backfilling `v0.17.3`.

## Related Files
- Modified:
  - `.github-token` (not tracked; user action)
  - `AGENTS.md` / `packages/lythoskill-creator/skill/references/release-auth-workflow.md` (docs update pending)
- Added:
  - `scripts/publish-github-release.sh`
  - `cortex/tasks/01-backlog/TASK-20260827141405220-fix-version-synchronization-npm-github-tags-releases-and-site-display.md`

## Git Commit Message
```
docs(release): document required GitHub token scopes for releases (TASK-20260827150725011)

- Add fine-grained PAT permission list to release-auth-workflow.md
- Update AGENTS.md Release & Auth section
```

## Notes

- Current `.github-token` can push code/tags but cannot create releases.
- If using a fine-grained PAT, ensure it is **not** expired before the next release.
- After this token is in place, future releases follow: `./scripts/publish.sh` then `./scripts/publish-github-release.sh`.
