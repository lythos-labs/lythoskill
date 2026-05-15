---
created: 2026-05-15
updated: 2026-05-15
category: pattern
---

# Seed Bootstrap Pattern: Minimal Governance Skill Enables Agent Self-Expansion

> Give an agent only `lythoskill-deck`, and it can discover, add, link, and use every other skill it needs. The governance skill is the seed; the agent's ReAct loop is the soil.

## Context

The graduation exam tests whether an agent can autonomously produce a `.docx` report with an embedded radar chart. The naive approach gives the agent a pre-composed deck (e.g., `recipe-report.toml`), but this violates Criterion #1 — skills must be *discovered*, not pre-chosen.

The deeper problem is recursive:
- To write a valid `skill-deck.toml`, the agent must understand deck schema.
- To understand deck schema, the agent must read `lythoskill-deck/SKILL.md`.
- To read `lythoskill-deck/SKILL.md`, the agent must have `lythoskill-deck` in its working set.

This creates a **bootstrap paradox**: how does the agent acquire its first skill without already knowing how decks work?

## The Seed

A **seed deck** contains exactly one skill — the governance skill itself:

```toml
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
```

`lythoskill-deck` is the seed because its `SKILL.md` teaches the agent:
- Deck schema: `[innate.skills.xxx]`, `[tool.skills.xxx]`, fully-qualified locators
- `deck add <locator>` — download/reference a skill
- `deck link` — reconcile working set
- `max_cards` budget and deny-by-default semantics

Once the agent reads this skill, it can use those tools to acquire any other skill.

## Verified Experiment (2026-05-15)

### Pipeline

```
Seed: [lythoskill-deck] ──→ Stage 1: Bootstrap ──→ Stage 2: Execution ──→ Output
         (1 skill)            (agent self-expands)     (docx + radar chart)
```

### Stage 1: Bootstrap (Agent-Orcestrated)

**Input**: Seed deck linked to isolated `/tmp/arena-seed-*/` workdir.

**Agent actions**:
1. Read `lythoskill-deck/SKILL.md` — learned schema, locators, `deck add/link`
2. Queried cold pool catalog (`catalog.db`) with 3 SQL queries:
   - `docx/word` skills
   - `chart/diagram` skills
   - `research` skills
3. **Selected**: `docx` (anthropics) + `deep-research` (daymade)
4. **Rejected**: `critique` (nexu-io) — HTML output, not docx-embeddable
5. Added skills to deck and `deck link`
6. Wrote `seed-bootstrap-report.md` documenting rationale and gaps

**Friction encountered**: `deck add` triggered a network probe (even though skills were already in cold pool). Agent workarounded by manually appending entries to `skill-deck.toml` and running `deck link`.

**Final deck** (agent-composed):
```toml
[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[tool.skills.docx]
path = "github.com/anthropics/skills/skills/docx"

[tool.skills.deep-research]
path = "github.com/daymade/claude-code-skills/deep-research"
```

### Stage 2: Execution

**Input**: Expanded deck from Stage 1.

**Agent actions**:
1. Read `docx/SKILL.md` — learned `docx-js` + `ImageRun` embedding
2. Read `deep-research/SKILL.md` — assessed content generation patterns
3. Identified gap: no radar-chart skill in deck → planned Python `matplotlib` fallback
4. Generated `radar_chart.png` with matplotlib (200 DPI)
5. Generated `Cookie_Recipe_Report.docx` with docx-js (178KB)
6. Wrote `decision-log.jsonl` with 14 timestamped entries

### Results

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Skills autonomously discovered | ✅ PASS | Catalog queries + explicit selection/rejection |
| Deck add/link succeeded | ✅ PASS | Network probe blocked → agent workaround |
| `.claude/skills/` symlinks | ✅ PASS | 3 skills linked |
| `.docx` ≥ 100KB | ✅ PASS | 178KB |
| Embedded radar chart | ✅ PASS | PNG in `word/media/` |
| Judge verdict | ✅ **PASS** | Full chain verified |

### Comparison: Pre-Composed Deck vs Seed Bootstrap

| Dimension | Pre-Composed (`recipe-report.toml`) | **Seed Bootstrap** |
|-----------|--------------------------------------|-------------------|
| Deck source | Human-authored | **Agent self-composed** |
| Governance knowledge | Hard-coded in prompt | **Read from skill** |
| Schema hallucination risk | N/A (human correct) | **Zero** (agent learned schema) |
| Decision chain | 8 decision-log entries | **14 entries** (bootstrap visible) |
| Gap identification | Implicit | **Explicit** ("no radar-chart skill → matplotlib") |
| Robustness | Standard | **Network probe blocked → workaround** |

## When to Apply

- **Agent onboarding to a new project** — seed the governance skill, let agent build its own deck
- **Autonomous skill discovery tasks** — when the user says "figure out what you need"
- **Graduation exams / capability benchmarks** — tests true autonomy, not prompt engineering
- **Minimal-intervention environments** — agent must operate without human-provided decks

## When Not to Apply

- **Production automation** — seed bootstrap is slow (discovery + add + link). Pre-composed decks are faster and deterministic
- **Known, stable workflows** — if the required skills never change, hardcoding the deck is simpler
- **Network-restricted CI** — `deck add` may probe network; seed bootstrap needs cold pool primed or mirror config

## Key Insights

1. **Governance skill is the only irreducible dependency.** Every other skill can be discovered and added after the agent knows how decks work.
2. **Schema knowledge must come from skill, not prompt.** Giving the agent `[tool.skills.xxx]` in a prompt is fragile; reading `lythoskill-deck/SKILL.md` is robust.
3. **Gap identification is a positive signal.** The agent explicitly noting "no radar-chart skill → use matplotlib" is more valuable than silently guessing.
4. **Workarounds prove autonomy.** The network-probe failure and manual-toml workaround showed the agent wasn't just following a script.

## Related

- [2026-05-15-graduation-exam-spec.md](./2026-05-15-graduation-exam-spec.md) — Full exam specification and success criteria
- `playground/2026-05-15-graduation-exam-seed-bootstrap/` — Complete artifacts from this experiment
- `examples/decks/recipe-report.toml` — Pre-composed deck for comparison
- [Agent-Initiated Arena Workflow](../references/agent-autonomous-arena.md) — Proactive arena initiation pattern
- ADR-20260507110332805 — Agent-driven plan-first architecture (deck refresh)
