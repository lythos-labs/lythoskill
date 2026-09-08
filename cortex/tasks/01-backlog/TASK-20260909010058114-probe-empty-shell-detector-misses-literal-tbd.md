# TASK-20260909010058114 — probe empty-shell detector misses literal "TBD"

## Background

Surfaced by arena cell S4a (run archived at `playground/2026-09-09-arena-cortex-desc-ab/`, judge-verdict.md §5.2).
A task card whose Requirements/Approach/Acceptance Criteria sections contain the literal text
"TBD" — but no `⚠️ PLACEHOLDER_` marker — passes `cortex probe`'s empty-shell check as a
non-empty card. The seeded arena card (all sections "TBD") was flagged stale but NOT
empty-shell until a human/agent read the content.

## Why

Empty-shell detection is the gate that keeps unassignable cards from entering the dispatch
pipeline. A card full of "TBD" is exactly as unassignable as one with `⚠️ PLACEHOLDER_`, but
the detector only matches the marker pattern. Detection gap = silent pipeline pollution.

## Approach

Add a TBD-literal pattern to the empty-shell detector in the probe implementation
(`packages/lythoskill-project-cortex/src/` — locate the existing `⚠️ PLACEHOLDER_` match and
extend it). Match case-insensitive `TBD` (and likely `TODO`/`FIXME`?) as section-body-only
signals, not prose mentions, to avoid false positives on legitimate text. Add dormancy tests:
happy-path cards with real content must NOT flag; TBD-filled cards MUST flag.

## Acceptance Criteria

- [ ] A card with all sections literal "TBD" is flagged empty-shell by `cortex probe`
- [ ] A fully-written card produces zero empty-shell findings (dormancy: no false positives)
- [ ] New detector patterns covered by unit tests; cortex suite green

## References

- Judge finding: `playground/2026-09-09-arena-cortex-desc-ab/judge-verdict.md` §5.2
- Detector source: probe implementation under `packages/lythoskill-project-cortex/src/`
