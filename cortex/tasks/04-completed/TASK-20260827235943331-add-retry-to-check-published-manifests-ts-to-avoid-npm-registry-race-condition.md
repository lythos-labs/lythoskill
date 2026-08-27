# TASK-20260827235943331: Add retry to check-published-manifests.ts to avoid npm registry race condition

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created after v0.17.10 release verify step failed |
| completed | 2026-08-27 | Closed via trailer |

## Background & Goals

The v0.17.10 release workflow published all 13 packages successfully, but `scripts/check-published-manifests.ts` immediately ran `npm view` and got 404 for `@lythos/skill-creator@0.17.10` and `@lythos/skill-deck@0.17.10`. The packages were visible seconds later, so this was an npm registry replication delay, not a real leak.

Goal: make the post-publish guard resilient to short-lived registry replication lag by retrying with backoff.

## Requirements

- [x] `productionView()` in `scripts/check-published-manifests.ts` retries `npm view` on failure.
- [x] Retry uses exponential or linear backoff and a finite attempt limit.
- [x] The guard still fails closed if all retries fail.

## Technical Approach

1. Wrap `execFileSync('npm', ['view', ...])` in a loop with up to 5 attempts.
2. Sleep between attempts using `Bun.sleepSync`.
3. Keep the existing fail-closed behavior at the caller level.

## Acceptance Criteria

- [x] `bun scripts/check-published-manifests.ts 0.17.10` passes.
- [x] `bun --filter='*' run test` passes.
- [x] Next tag-triggered release does not fail the verify step due to 404s.

## Progress Log

- 2026-08-27 — Added retry loop to `productionView()`.

## Related Files
- Modified:
  - `scripts/check-published-manifests.ts`
