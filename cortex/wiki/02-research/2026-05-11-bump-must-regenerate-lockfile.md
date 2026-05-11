---
created: 2026-05-11
updated: 2026-05-11
category: lesson
---

# Bump Must Regenerate bun.lock — CI Frozen-Lockfile Failure

> Symptom: `bun install --frozen-lockfile` fails after bump commit because
> lockfile workspace versions are stale. Class of bug: release pipeline
> incompleteness — the bump process mutated package.json but never
> regenerated the lockfile.

## Root Cause

`bump.ts` changed `version` in 14 `package.json` files but never ran
`bun install`. The lockfile (`bun.lock`) records the version of every
workspace package. After the bump changed those versions, the lockfile
was stale.

CI uses `--frozen-lockfile` which fails if the lockfile would change
from current `package.json` state.

## Why 0.9.x Bumps Passed But 0.10.0 Failed

Not a code change in 0.10.0 — it was Bun version drift:

- The old `bun.lock` had `workspace:*` literals for inter-workspace
  dependencies (e.g. `"@lythos/agent-adapter": "workspace:*"`)
- Older Bun versions serialized `workspace:*` as-is in the lockfile
- Bun 1.3.13 resolves `workspace:*` to real semver ranges
  (`"@lythos/agent-adapter": "^0.9.25"`) and the `--frozen-lockfile`
  check detects the format mismatch

The 0.9.x bumps were "lucky" — they ran on Bun versions that didn't
validate workspace protocol resolution. When the CI runner upgraded
to Bun 1.3.13, the stale lockfile was caught.

## Detection

All 4 CI jobs failed identically:

```
bun install v1.3.13 (bf2e2cec)
Resolving dependencies
Resolved, downloaded and extracted [34]
error: lockfile had changes, but lockfile is frozen
note: try re-running without --frozen-lockfile and commit the updated lockfile
```

Jobs: `test`, `coverage-deck`, `coverage-cold-pool`, `coverage-test-utils`.

## Fix

Added `execFileSync('bun', ['install'], { cwd: root, stdio: 'inherit' })`
to `bump.ts` after `align()`. The bump pipeline now:

1. Write root `package.json` version
2. Align workspace `package.json` versions
3. **`bun install` — regenerate lockfile** ← new step
4. Update `bunx @version` in docs
5. Rebuild skills

## Prevention

- **Any step that mutates `package.json` must be followed by `bun install`
  before commit.** This is not just a bump concern — `align`, dependency
  additions, or any `package.json` edit in a CI-gated repo needs lockfile
  regeneration.
- **Verify on GitHub after push.** Do not trust local `bun install` output
  alone — CI runs a potentially different Bun version (via `bun-version: latest`).
  The real test is the green CI badge on the commit.
