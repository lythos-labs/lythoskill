# Vanilla Seed Bootstrap — Zero-Knowledge Subagent E2E

**Date**: 2026-05-17
**Status**: ✅ PASS
**Method**: Arena agent-orchestrated, zero-knowledge subagent

## What We Tested

Can a completely ignorant agent, given only:
- A **vanilla seed deck** (1 innate skill: `lythoskill-deck`)
- A **minimal AGENTS.md** (79 lines, ~1000 tokens)

…correctly understand lythoskill's architecture and self-expand its toolkit?

## Setup

```
Deck:    examples/decks/vanilla.toml (lythoskill-deck only, max_cards=10)
Context: minimal-AGENTS.md (79 lines — distilled from 1164-line AGENTS.md)
Agent:   Zero-knowledge subagent, no prior project context
```

## Result

The subagent:
1. **Understood the project**: Correctly identified lythoskill as a "multi-agent skill management platform" with cold pool → deck → working set architecture
2. **Self-expanded the deck**: Went from 1 skill to 5 — adding onboarding, scribe, cortex, curator
3. **Self-healed**: Network was restricted → `deck add` failed → agent hand-edited `skill-deck.toml` and ran `deck link` from local cold pool
4. **Made appropriate judgments**: Reserved arena and coach as "task-dependent"
5. **Wrote decision-log.jsonl**: 11 timestamped entries covering every decision phase

## Key Insight

**Short AGENTS.md works because rich supporting layers exist.** The 79 lines are pointers into a deeper knowledge base:
- `cortex/wiki/` — patterns, lessons
- `cortex/adr/` — architecture decisions
- `daily/YYYY-MM-DD.md` — session state
- Skill `references/` — per-skill detail

For other projects adopting this system: push detail into skill references and wiki. Keep AGENTS.md as the page table, not the warehouse.

## Files

- `minimal-AGENTS.md` — The 79-line AGENTS.md used as sole context
- `understanding.md` — Subagent's own analysis of the project
- `decision-log.jsonl` — Full decision trace (11 phases)

## Related

- ADR-20260517224131119: Multi-layer context persistence architecture
- wiki: 2026-05-17-arena-as-empirical-rule-validation
- wiki: 2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table
- Mnilax: CLAUDE.md 12 rules (41% → 3% error rate)
