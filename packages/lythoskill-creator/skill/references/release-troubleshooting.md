# Release Troubleshooting

> **Failure-mode recovery, not happy-path setup.** The happy-path contract and the
> one-time Trusted Publisher / OIDC setup live in
> [`release-auth-workflow.md`](./release-auth-workflow.md). The prevention gotchas
> ("don't set `registry-url` in `setup-node`", "add `repository` for provenance")
> live in that file's *CI & Publish Gotchas* table. **This file is for when the
> release has already gone wrong** — symptom → root cause → action → verify.
> Read this before re-deriving a failure from source.

Each entry is written so an agent (or external maintainer) can act without
reading `release.yml` / `publish.sh` / `dispatch.ts` first.

---

## 1. Verify step 404 — "No match found for version X"

**Symptom** — the `release` workflow's **Verify published manifests** step fails
with `npm error 404 No match found for version 0.20.x`, on one or a few packages.
The **Publish packages to npm** step right before it *succeeded*.

**Root cause** — npm registry replica propagation lag. `npm publish` writes to the
primary registry; the `npm view` read in the verify step can hit an edge replica
that has not synced the new version yet. It is usually seconds, but a single
package can lag minutes — `@lythos/test-utils` took >4.5 min on 2026-10-14
(v0.20.1) while its 13 siblings propagated in <2.5 min.

**Action**

```bash
# 1. Confirm the packages are actually published (the failing one + a few others):
npm view @lythos/test-utils@0.20.1 version      # expect "0.20.1", not a 404

# 2. Re-run the workflow. The publish step is IDEMPOTENT — it skips versions
#    already on npm — so re-running cannot E403. The verify step now passes and
#    the Create GitHub Release + Pages jobs complete.
gh run rerun <run-id>
gh run watch <run-id> --exit-status
```

**Verify** — the re-run reaches `success`; `gh release view v0.20.1` shows
`draft: false`.

**Escalation** — if a package is still 404 after >10 min, it was never published.
Check that package's Trusted Publisher on npmjs.com (OIDC auth) and that it is in
the `PACKAGES` list in `scripts/publish.sh`.

---

## 2. Trailer follow-up commit doesn't land (dirty tree after `Closes:`/`Review:`)

**Symptom** — after a commit carrying a `Closes:` / `Review:` trailer, the task
files *did* move, but `git status` shows uncommitted moves and a modified
`cortex/INDEX.md`, and no `chore(cortex): … dispatches` follow-up commit appears
in `git log`.

**Root cause** — (fixed in v0.20.1) `dispatch.ts`'s follow-up `git add` pathspec
list contained a bare root `INDEX.md`, which was deleted when the index moved to
`cortex/INDEX.md` (TASK-20261013142924953). `git add … INDEX.md` aborts with
`fatal: pathspec 'INDEX.md' did not match any files` (exit 128) and stages
*nothing*, so the subsequent `git diff --cached --quiet` sees no changes and the
follow-up commit is silently skipped. Recurred 2026-10-13 ×2 and 2026-10-14.

**Action**

```bash
# v0.20.1+ : already fixed (DISPATCH_FOLLOWUP_ADD uses cortex/INDEX.md).
# On an older version, complete the follow-up by hand:
git add cortex/tasks cortex/adr cortex/epics cortex/INDEX.md cortex/wiki/INDEX.md
git commit -m "chore(cortex): N trailer dispatches"
```

**Verify** — `git log --oneline -3` shows a `chore(cortex): … dispatches` commit
immediately after the trailer commit.

---

## 3. `gh run list --limit 1` returns the wrong workflow

**Symptom** — you `gh run watch` a run and it reads `success`, but the real CI is
still running (or red).

**Root cause** — several workflows trigger on the same push; `--limit 1` returns
the most recent run across all of them, which is often CodeQL (it starts in
parallel and can finish first).

**Action**

```bash
# Filter FIRST, watch second. Never watch an unfiltered `--limit 1`.
gh run list --workflow=CI --limit 1     # confirm this is the push you care about
gh run watch <that-run-id> --exit-status
```

**Verify** — the run's headSha matches your push (`gh run view <id> --json headSha`).

---

## 4. Bump reports "Rebuilt N skill(s)" but skill-only packages keep the old version

**Symptom** — after `bump`, some `skills/*/SKILL.md` still carry the previous
version, and CI's "generated skill artifacts are in sync with source" gate goes
red on the release commit.

**Root cause** — skill-only packages (`coach`, `dreaming`, `project-onboarding`,
`project-scribe`, `project-scribe-weekly`, `red-green-release`, `sober`, `writer`)
have no `package.json`, so `bump` cannot enumerate them — it only rebuilds
skill-shipping packages that carry a manifest.

**Action**

```bash
# After EVERY bump, before the release commit:
bun packages/lythoskill-creator/src/cli.ts build --all
```

**Verify** — `git diff --stat` shows no skill file still pinned to the old version
string.

---

## 5. Tag push didn't trigger the release workflow

**Symptom** — you pushed a tag but no `release` run appears.

**Root cause** — `release.yml` fires on `push: tags: v*` and nothing else, and
`git push --follow-tags` only pushes **annotated** tags. A lightweight
`git tag vX.Y.Z` (no `-a`) is silently skipped.

**Action**

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"     # ALWAYS annotated
git push --follow-tags
```

**Verify** — `gh run list --workflow=release --limit 1` shows a run on the tag.
