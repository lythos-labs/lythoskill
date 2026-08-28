# TASK-20260828141622502: discuss curator SQLite as wiki metadata index backend (ADR-20260613190449007 option D)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260613190449007 accepted 方案A (INDEX.md pinned index) and explicitly deferred 方案D — using curator's SQLite catalog as the metadata index backend for `cortex/wiki/` — as "值得一个独立的 roundtable/ADR，而不是作为本 ADR 的附带方案解决". The ADR lists three open questions that any 方案D proposal must answer:

1. Is the SQLite catalog a **project artifact** or a **personal artifact**? (curator's catalog is "personal environment scan, not project artifact" today.)
2. Who owns INDEX.md generation — dreaming, curator, or a new cortex subcommand?
3. What is the recovery path when the SQLite file is corrupted or lost (rebuild from frontmatter?).

This is a **discussion/spike card**: the deliverable is a decision document, not code. It should only be picked up after 方案A has run long enough to have evidence (INDEX.md kept fresh by dreaming, or demonstrably rotting — either is input).

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Produce a new ADR (in `01-proposed/`) that answers the three open questions above with a concrete recommendation (adopt / reject / defer-with-trigger-conditions), citing 方案A's real-world behavior as evidence
- [ ] R2 (可选) If the recommendation is adopt: sketch the metadata schema (status, importance, superseded-by, related-adr, related-ssot) and the INDEX-generation ownership
- **不做**: no implementation, no SQLite dependency added, no changes to curator or cortex code

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Read first: `cortex/adr/02-accepted/ADR-20260613190449007-*.md` (full 方案D option text), curator's SQLite usage in `packages/lythoskill-curator/src/` (catalog.db), and the "personal environment scan"定位 in curator's SKILL.md.
- Evidence gathering: check whether dreaming has been maintaining `cortex/wiki/01-patterns/INDEX.md` (`git log --oneline -- cortex/wiki/01-patterns/INDEX.md`) — freshness or rot is the deciding evidence.
- Output: `bun packages/lythoskill-project-cortex/src/cli.ts adr "<title>"` then fill the card; it stays proposed for user decision.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] New ADR file exists in `cortex/adr/01-proposed/` referencing ADR-20260613190449007 and answering all three questions → Verify: `ls cortex/adr/01-proposed/ | grep <date>` + read the Decision section
- [ ] The ADR's evidence section cites real INDEX.md maintenance history (git log output) → Verify: grep the ADR for the git log evidence

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260613190449007 acceptance （方案D deferred discussion).

## Related Files
- Modified: (none — new ADR only)
- Added: (pending)

## Git Commit Message
```
docs(adr): propose wiki metadata index backend decision (option D roundtable) (TASK-20260828141622502)

- Answers the three open questions from ADR-20260613190449007
- Evidence: 方案A INDEX maintenance history
```

## Notes
- Deliberately parked in backlog until 方案A has accumulated evidence; do not start immediately.
