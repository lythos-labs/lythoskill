# Journalist → Sober: Skill Evolution via Arena-Driven Validation
> A complete evolution cycle: desc iteration, blind testing, cross-player comparison, A/B variant testing, and cognitive posture refinement.

## What This Demonstrates

- **Desc as SEO battlefield**: journalist's `when_to_use` refined through arena trigger testing
- **Blind testing methodology**: 6 scenarios disguised as normal tasks, 2 players (Claude + Kimi)
- **Cross-player Pareto frontier**: Claude subliminal activation (0/6 explicit, 6/6 SOP) vs Kimi explicit methodology (4/6 explicit, 6/6 SOP) — neither dominates
- **Name-as-signal**: journalist → sober — cognitive posture ("stay clear-headed") replaces tool role ("investigate claims")
- **Innate vs tool**: sober designed for innate placement (eager, always-on), not tool (lazy, triggered)
- **Combo pipeline**: sober identifies gaps → curator discovers skills → deck assembles — documented in combo-patterns.md

## Key Results

| Test | Scenarios | Claude | Kimi |
|------|-----------|--------|------|
| Blind journalist (明测) | 6 | 5.5/6 trigger, found PAUSE gap | 6/6 trigger |
| Blind journalist (盲测) | 6 | 6/6 SOP, 0/6 explicit | 4/6 explicit, 6/6 SOP |
| A/B B3 (innate) | 1 | 14 decisions | — |
| A/B sober B3 (innate) | 1 | **16 decisions, found critical blocker** | — |

## Files

- `packages/lythoskill-sober/skill/SKILL.md` — the final sober skill
- `packages/lythoskill-sober/skill/references/example-evaluation.md` — worked example from kimi arena
- `packages/lythoskill-sober/skill/references/reproduce-scenarios.md` — 6 blind test scenarios
- `packages/lythoskill-sober/skill/references/meta-cognitive-scenarios.md` — 4 meta-cognitive pipeline tests
- `packages/lythoskill-sober/skill/references/combo-patterns.md` — sober + curator + deck combos
- `blind-tests/` — 6-scenario blind test results, summary.json, REPORT.md (Claude + Kimi)
- `ab-comparison/` — journalist vs sober A/B comparison decision-logs + findings
- `reproduce.sh` — arena CLI commands to reproduce the test setup
