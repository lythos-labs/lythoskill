# TASK-20260828011012367: cortex wikiSubdirs config drifted from real wiki structure

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |
| in-progress | 2026-08-27 | Started |
| review | 2026-08-27 | Deliverables committed |
| completed | 2026-08-28 | Done |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Found 2026-08-28 (user hint: "检查一下cortex初始化的目录结构是否还能对上"). `packages/lythoskill-project-cortex/src/config.ts` DEFAULT_CONFIG.wikiSubdirs = `{01-patterns, 02-faq, 03-lessons, 04-legacy}` but the real wiki on disk is `{01-patterns, 02-faq, 02-research, 03-lessons, 04-ssot, 05-archived}`. No `.project-workflow.json` override exists — defaults are in force.

Consequences (verified by reading consumers):
- `generate-index.ts:283-311` only indexes patterns/faq/lessons/legacy → generated `cortex/wiki/INDEX.md` **silently drops 02-research, 04-ssot, 05-archived** (confirmed: grep finds no research/ssot section in INDEX.md). The SSOT layer — the most valuable wiki content — is invisible in the index.
- `commands/init.ts` would scaffold the wrong structure for fresh projects (creates `04-legacy`, never creates research/ssot/archived).
- `commands/wiki.ts` has no way to create research/ssot entries.
- `commands/stats.ts` under-counts the wiki.
- `probe.ts:730` zeroes wikiSubdirs for checks → probe reports green despite the drift (guard is blind here; see pitfalls.md §4 "silent guard worse than none").

Also noted: `02-faq` and `02-research` share prefix `02` — historical numbering drift. Renaming dirs would break references across ADRs/dailies, so the fix is config-matches-disk, not renumbering (unless user decides otherwise).

**Provenance (git, 2026-08-28)**: user suspected an agent renamed `04-legacy`→`04-ssot`. Reality is a fossilized config, not a rename: `04-legacy` never held a single file (added to config in 121b3799 as scaffold intent only); `02-research` was created by 66855aca ("move research into wiki") and never added to config; `04-ssot` was created new by the dreaming epic (af585375); `05-archived` likewise. The disk evolved; the default config was never updated.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] DEFAULT_CONFIG.wikiSubdirs updated to match disk reality: patterns/faq/research/lessons/ssot/archived (drop legacy; keep duplicate 02- prefix as-is, documented in config.ts comment)
- [x] generate-index.ts emits sections for all six dirs (research + ssot + archived included)
- [x] wiki.ts command can create research/ssot entries
- [x] stats.ts counts all six dirs (now iterates config — cannot drift again)
- [x] init.ts scaffolds the real structure (loops config; verified live in mktemp dir)
- [x] probe gains a wiki-structure consistency check (drift both directions = findings) — closes the blind guard

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- config.ts is the single change point for defaults; consumers already read from config, so updating defaults + extending the consumer loops is enough.
- probe check: compare `Object.values(config.wikiSubdirs)` against actual subdirs of `cortex/wiki/` — drift both directions (config-not-on-disk, disk-not-in-config) should be findings, not silent.
- Tests: update/extend existing config/generate-index/probe tests; negative test proving the probe check fires on an unknown dir.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] `cortex/wiki/INDEX.md` regenerated includes 02-research, 04-ssot, 05-archived sections → grep count 34 (≥3) ✔
- [x] probe fires on wiki dir not in config → live negative check: temp `99-probe-negative-test/` dir reported as drift, removed after ✔ (plus 3 unit tests in probe-execute.test.ts)
- [x] package tests green: 129 pass, 0 fail (correct invocation: `bun --filter='./packages/lythoskill-project-cortex' run test`; npm name is @lythos/project-cortex)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Registered. Drift verified against config.ts + 4 consumers + generated INDEX.md.
- 2026-08-28: Implemented via coder subagent (agent-6), P1 claims self-verified (tests 129/0, INDEX sections present, probe 497 docs 0 issues). Also swept stale docs inside the package (skill/SKILL.md, references/wiki-workflow.md described the old 4-dir structure). Bonus fix: pre-existing latent type gap in ProbePlan.checks (missing checklistDrift).

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260828011012367)

- Detail 1
- Detail 2
```

## Notes
