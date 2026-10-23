# TASK-20261023182807833: Fix latest-daily lookup with date-filtered query

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-23 | Created |
| in-progress | 2026-10-23 | Started |
| review | 2026-10-23 | Deliverables committed |

## Background & Goals

Every shipped skill that reads "the latest daily" uses
`ls daily/*.md | sort | tail -1`, which encodes a date query as lexicographic
position. It selected `daily/README.md` until 2026-05-05 (`cf74e930` renamed it
to `_README.md`); that rename only works under en_US collation — under
`LC_ALL=C` / `env -i`, `_README.md` sorts after the dated files and is selected
again. Reproduced 2026-10-23 with
`env -i sh -c 'ls daily/*.md | sort | tail -1'` → `daily/_README.md`.

Goal: make "latest daily" a predicate over dated filenames, shipped identically
in every surface that performs the lookup, with the rationale recorded once.

## Requirements

- [x] Canonical query is date-filtered:
      `ls daily/ 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.md$' | sort | tail -1`
- [x] Onboarding SKILL.md (source + built mirror) uses the canonical query and
      points at its rationale reference.
- [x] Scribe-weekly's `tail -7` call sites use the same date filter.
- [x] AGENTS.md session-close check and both SSOT onboarding guides use it.
- [x] Rationale reference added under onboarding `skill/references/`.
- [x] No new package, no `status:` frontmatter, no hand-maintained daily index
      (rationale + rejected alternatives live in ADR-20261023182817984).

## Technical Approach

Per ADR-20261023182817984 (Option B): fix the query implementation inline; do
not command-ize, do not schema-migrate.

Edit order (source → build → shipped mirror):

1. `packages/lythoskill-project-onboarding/skill/SKILL.md` + new
   `skill/references/latest-daily-query.md`
2. `packages/lythoskill-project-scribe-weekly/skill/SKILL.md` and
   `skill/references/weekly-format.md`
3. `AGENTS.md` session-close block
4. `cortex/wiki/04-ssot/agent-onboarding-guide.md` + `.zh.md`
5. `bun packages/lythoskill-creator/src/cli.ts build` → regenerate `skills/**`
6. `cortex/index` + `cortex probe`

The filter is applied before `sort`, so sort keys are ASCII digits/`-` only;
ordering is identical under en_US.UTF-8 and POSIX collation.

## Acceptance Criteria

- [x] No executable call site uses `ls daily/*.md | sort | tail -1`; remaining
      occurrences are the explicit "do not" teaching lines, ADR/history text,
      and `drafts/` + `showcase/` snapshots (verified 2026-10-23 by grep).
- [x] `env -i sh -c "<canonical query>"` → `2026-10-19.md` (not `_README.md`).
- [x] Onboarding + scribe-weekly built mirrors match their sources (creator align).
- [x] `cortex probe` reports no issue for this task; only the pre-existing
      `EPIC-20260828111425886` intake-umbrella drift remains (documented in
      `daily/2026-10-19.md` as expected).
- [x] SSOT wiki entry references this ADR, not a duplicated rationale.

## Progress Log

- 2026-10-23 18:28 — created; ADR-20261023182817984 drafted (Option B).
- 2026-10-23 18:30 — sibling ADR-20261023183001417 drafted after finding the
  template-carrier drift in the same review; both accepted.
- 2026-10-23 18:45 — edits landed (`5ee0e243`); `creator align` 75 passed.
- 2026-10-23 19:05 — ZK reviewer found 3 P1 / 4 P2 in the ADRs; fixed in
  `e1f1c994` (fourth carrier, corpus counts, follow-up for `skill/assets/`).

## Related Files
- Modified: `AGENTS.md`, `packages/lythoskill-project-onboarding/skill/SKILL.md`,
  `.../skill/references/output-formats.md`,
  `packages/lythoskill-project-scribe-weekly/skill/SKILL.md`,
  `.../skill/references/weekly-format.md`,
  `packages/lythoskill-deck/skill/references/toml-format.md`,
  `cortex/wiki/04-ssot/agent-onboarding-guide.md` + `.zh.md`,
  built mirror under `skills/**`
- Added: `packages/lythoskill-project-onboarding/skill/references/latest-daily-query.md`,
  `cortex/adr/02-accepted/ADR-20261023182817984-*`,
  `cortex/adr/02-accepted/ADR-20261023183001417-*`,
  `cortex/wiki/04-ssot/2026-10-23-ssot-vs-copy-*`,
  `weekly/2026-W43.md`

## Git Commit Message
```
fix(onboarding,scribe-weekly): latest-daily lookup filters dated filenames (TASK-20261023182807833)

- Replace `ls daily/*.md | sort | tail -1` with a date-anchored grep before sort
- Rename only masked the README bug: under POSIX collation `_` sorts after digits
- Rationale + rejected options (command-ize, hand index): ADR-20261023182817984
- Propagate to AGENTS.md session-close check and SSOT onboarding guides
```

## Notes

- Related principle, separately recorded: ADR-20261023183001417 (templates have
  one executable carrier) — same SSOT-vs-copy failure class, raised in the same
  review; its migration is follow-up work, not part of this card.
- Rejected: `daily latest --json` command package (no host package; skills run in
  adopter projects without the CLI). Revisit only with a second data consumer.
- Rejected: `status:` frontmatter for "valid handoff" — 0/51 files carry it
  (50 dated + `_README.md`).
- External review that motivated this card: dynamic views as queries is correct;
  "must be a command" is a deployment assumption, not an invariant.
- Related ADRs: ADR-20261023182817984 (view = query), ADR-20261023183001417
  (template carriers).
