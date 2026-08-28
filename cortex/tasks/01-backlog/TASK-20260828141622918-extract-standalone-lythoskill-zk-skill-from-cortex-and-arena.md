# TASK-20260828141622918: extract standalone lythoskill-zk skill from cortex and arena

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260828005453077 (accepted 2026-08-28, now in `cortex/adr/02-accepted/`, Option B): the ZK (zero-knowledge) review pattern — spawn a context-free agent as a *sensor* against an artifact, then process its findings — exists as three embedded copies (cortex ZK Review Gate, arena ZK subagents, BDD reproduce.sh) and will drift. Extract a standalone, general-purpose `lythoskill-zk` thin skill carrying the **method**; cortex and arena keep only their **gate wiring** (when to trigger, what artifacts to point at).

The method is proven (ZK caught the site command bugs doc review missed, twice); the boundary design is the real work — the general skill must not leak cortex/arena vocabulary.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Method/gate boundary written down FIRST (in the new SKILL.md's design notes or the card's Progress Log): method = sensor-not-oracle framing, pass-by-reference dispatch, gap taxonomy (4 types), convergence protocol (3-round ceiling), fill/challenge/reject dispositions, trial-usage pattern. Gate wiring = cortex's task-card trigger, arena's deck testing trigger — stays in those skills
- [ ] R2 (必达) New package `packages/lythoskill-zk/` (`src/` + `skill/`). Scaffold via `bun packages/lythoskill-creator/src/cli.ts init` (see `packages/lythoskill-creator/src/cli.ts:13`; the thin-skill-pattern reference is only 46 lines and has no scaffolding guidance). Verify package.json/tsconfig against an existing sibling (e.g. `packages/lythoskill-cold-pool/`). Package name: **`@lythos/skill-zk`** — the naming convention is "skill-* for agent-facing skills" (skill-arena, skill-deck, skill-curator; cold-pool/infra are not agent-facing). Then `bun packages/lythoskill-creator/src/cli.ts build lythoskill-zk` produces `skills/lythoskill-zk/`
- [ ] R3 (必达) Rewire references: `packages/lythoskill-project-cortex/skill/references/zk-review.md` and arena's skill docs point to the new skill for the METHOD (their gate sections stay local). Arena's method text lives in `packages/lythoskill-arena/skill/references/reproduce-sh-bdd-contract.md:65` and `reproduce-sh-examples.md:47` (SKILL.md only has "mindset alignment" phrasing at lines 140/145) — the acceptance grep must cover `packages/lythoskill-arena/skill/references/`, not just SKILL.md. No duplicated method text remains
- [ ] R4 (必达) The new SKILL.md passes a ZK review of itself (the pattern validating its own packaging): fresh subagent reads only `skills/lythoskill-zk/SKILL.md` and rates whether it could run a ZK review in an arbitrary project — score <7/10 → iterate
- [ ] R5 (必达) New package checklist documented in the card's Progress Log: add to `scripts/publish.sh` PACKAGES (line 87), first manual publish needed before Trusted Publisher can be registered (AGENTS.md §9) — actual publish is NOT part of this task. Deck registration (`skill-deck.toml`) is deferred to the user — say so in the Progress Log
- **不做**: no behavior change to cortex's ZK Review Gate or arena's judging flow; no deletion of the old reference until the new skill is verified (R4) — old text becomes a pointer, gates keep working throughout

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Method SSOT to distill from: `packages/lythoskill-project-cortex/skill/references/zk-review.md` (WHAT/WHY/HOW gap protocol, 4 gap types, 3-round ceiling, dispositions).
- Arena's copy: `packages/lythoskill-arena/skill/references/reproduce-sh-bdd-contract.md` + `reproduce-sh-examples.md` (mindset-validator framing). BDD copy: `cortex/wiki/01-patterns/2026-05-18-zero-knowledge-reproduce-sh-handoff-self-discoverable-bdd-scenario-for-fresh-agents.md` + `showcase/*/reproduce.sh`.
- Lock-step version inherits root (never hand-edit).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `ls skills/lythoskill-zk/SKILL.md` exists after build; `grep -c "cortex\|arena" skills/lythoskill-zk/SKILL.md` → 0 or only in explicit "consumers wire their own gates" examples → Verify: run both
- [ ] `grep -rn "lythoskill-zk\|skill-zk" packages/lythoskill-project-cortex/skill/references/zk-review.md packages/lythoskill-arena/skill/` → pointer present in cortex reference and arena skill (incl. references/) → Verify: run it
- [ ] R4 self-ZK review: fresh subagent (pass-by-reference: only the built SKILL.md path) reports it can run a ZK review in an arbitrary project, score ≥7/10 → Verify: paste the subagent verdict into Progress Log
- [ ] `bun --filter='*' run test` green → Verify: run it (canonical)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260828005453077 acceptance (Option B).
- 2026-08-28: ZK review round 1 — P2s fixed (scaffolding entry point = `creator init`; arena method-text locations pinned + acceptance grep extended to references/), P3s applied (naming convention → @lythos/skill-zk; full wiki path; deck registration deferred to user).

## Related Files
- Modified: packages/lythoskill-project-cortex/skill/references/zk-review.md, packages/lythoskill-arena/skill/references/ (pending)
- Added: packages/lythoskill-zk/, skills/lythoskill-zk/ (pending)

## Git Commit Message
```
feat(zk): extract standalone @lythos/skill-zk skill (TASK-20260828141622918)

- New thin skill carrying the ZK method; cortex/arena keep gate wiring only
- Method/gate boundary documented; self-ZK review of the new SKILL.md
- Implements ADR-20260828005453077 Option B
```

## Notes
- New package checklist (AGENTS.md §9): publish.sh PACKAGES entry + first manual publish + Trusted Publisher — tracked here, executed at release time with user intent.
