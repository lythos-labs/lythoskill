# TASK-20260909010121918 — arena decision-log last-writer-wins clobbers concurrent cells

## Background

Surfaced by arena run 2026-09-09 (archived at `playground/2026-09-09-arena-cortex-desc-ab/`,
judge-verdict.md §5.4). The arena protocol mandates each cell append to a shared
`decision-log.jsonl`. Concurrent cells on side-a clobbered each other: only S1a's 9 entries
survived; S3a/S4a entries were overwritten. side-b's log survived only because its writer
noted the interleaving and re-read before appending — luck, not protocol.

## Why

Decision logs are the primary evidence trail for judge scoring. Losing them doesn't just
lose history — it biases A/B verdicts toward whichever cell wrote last, corrupting the
experiment's evidentiary base.

## Approach

Two candidate fixes (pick via implementation, ADR only if trade-off is non-obvious):
1. **Per-cell logs**: `decision-log-<cell-id>.jsonl`, merged by the runner at collect time.
   Eliminates write contention entirely; slightly more collect logic.
2. **Append-only discipline**: read-then-append in ONE op (cat log >> new entries atomically).
   Keeps single file; still racy on non-atomic multi-step appends.

Prefer (1) — arena cells already have unique cell ids, and the runner already does an
artifact-collect pass. Update the arena skill/protocol doc that mandates decision-log.jsonl.

## Acceptance Criteria

- [ ] Concurrent cells can no longer clobber each other's decision entries (demonstrate with a 2-writer concurrency test or explicit per-cell file naming)
- [ ] Judge collect step merges per-cell logs into a single decision-log.jsonl
- [ ] Arena protocol/skill doc updated to match the implemented behavior

## References

- Judge finding: `playground/2026-09-09-arena-cortex-desc-ab/judge-verdict.md` §5.4
