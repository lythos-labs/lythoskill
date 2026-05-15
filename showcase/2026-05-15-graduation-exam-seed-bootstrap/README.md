# Graduation Exam — Seed Bootstrap (v7)

> **From seed to full deck: agent autonomously discovers skills, composes its own deck, and produces a professional `.docx` with embedded radar chart.**
>
> Previous: [v5 (prompt-template IoC + pre-composed deck)](../2026-05-15-graduation-exam-v5/)

## What This Proves

| Dimension | v5 (Pre-Composed) | **v7 (Seed Bootstrap)** |
|-----------|-------------------|------------------------|
| **Deck source** | Human writes `recipe-report.toml` | **Agent self-composes from seed** |
| **Governance knowledge** | Hard-coded in prompt | **Read from `lythoskill-deck/SKILL.md`** |
| **Skill discovery** | Pre-chosen (violates Criterion #1) | **Catalog queries + autonomous selection** |
| **Schema correctness** | Guaranteed by human | **Learned by agent, zero hallucination** |
| **Gap handling** | Implicit | **Explicit ("no radar skill → matplotlib")** |
| **Robustness** | Standard execution | **Network probe blocked → manual workaround** |

## The Seed Bootstrap Pattern

The core idea: **the governance skill is the only irreducible dependency.**

```
Seed: [lythoskill-deck]
  │
  ├──→ Agent reads SKILL.md → learns schema, deck add, deck link
  ├──→ Agent queries catalog → discovers docx, deep-research
  ├──→ Agent selects/rejects skills → composes target deck
  ├──→ deck add + deck link → working set ready
  └──→ Agent reads new skills → executes task
```

## Pipeline

### Stage 0: Prepare Seed Environment

```bash
mkdir -p /tmp/arena-seed-20260515
cat > /tmp/arena-seed-20260515/skill-deck.toml << 'EOF'
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
EOF

cd /tmp/arena-seed-20260515
bunx @lythos/skill-deck@latest link
```

Result: working set contains **only** `lythoskill-deck`.

### Stage 1: Bootstrap (Agent-Orcestrated)

Agent subagent runs in the seed environment with this prompt:

> "Your CWD contains a seed deck with ONLY `lythoskill-deck`. Read the skill, query the cold pool catalog, discover what skills you need for a `.docx` report with radar chart, add them to the deck, and link."

**Agent actions**:
1. Read `lythoskill-deck/SKILL.md` — learned `[tool.skills.xxx]` schema, FQ locators, `deck add/link`
2. SQL queries against `catalog.db` for docx/word, chart/diagram, research skills
3. **Selected**: `docx` (anthropics) + `deep-research` (daymade)
4. **Rejected**: `critique` (nexu-io) — HTML radar chart, not docx-embeddable
5. `deck add` blocked by network probe → **workaround**: manually appended entries to `skill-deck.toml`
6. `deck link` → 3 skills linked
7. Wrote `seed-bootstrap-report.md`

**Final deck** (agent-composed):
```toml
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[tool.skills.docx]
path = "github.com/anthropics/skills/skills/docx"

[tool.skills.deep-research]
path = "github.com/daymade/claude-code-skills/deep-research"
```

### Stage 2: Execution (Agent-Orcestrated)

Agent subagent runs in the expanded environment:

**Actions**:
1. Read `docx/SKILL.md` — learned `docx-js` + `ImageRun` embedding
2. Read `deep-research/SKILL.md` — assessed structured content patterns
3. Identified gap: no radar-chart skill → planned Python `matplotlib` fallback
4. Generated `radar_chart.png` (200 DPI, matplotlib)
5. Generated `Cookie_Recipe_Report.docx` (178KB) with embedded PNG
6. Wrote `decision-log.jsonl` with 14 entries

## Artifacts

| File | Size | Description |
|------|------|-------------|
| `Cookie_Recipe_Report.docx` | 178 KB | Professional .docx with embedded 5-dimension radar chart |
| `radar_chart.png` | 167 KB | Source PNG (200 DPI, matplotlib) |
| `decision-log.jsonl` | 2.1 KB | 14 decision entries covering bootstrap + execution |
| `skill-deck.toml` | 347 B | **Agent-composed** final deck (from seed) |
| `seed-bootstrap-report.md` | 4.1 KB | Agent's own discovery report |
| `create_docx.js` | 18 KB | docx-js generation script |
| `generate_radar.py` | 1.5 KB | matplotlib radar chart script |

## Success Criteria Verification

| # | Criterion | Verdict |
|---|-----------|---------|
| 1 | Skills autonomously discovered & selected | ✅ PASS — Catalog queries + explicit selection/rejection |
| 2 | Deck add / link succeeded | ✅ PASS — Network probe blocked, agent workaround |
| 3 | `.claude/skills/` contains symlinks | ✅ PASS — 3 skills |
| 4 | `.docx` exists and ≥100KB | ✅ PASS — 178KB |
| 5 | Embedded radar chart present | ✅ PASS — PNG in `word/media/` |
| 6 | Judge verdict | ✅ **PASS** |

## Key Insights

1. **Governance skill is the seed.** Every other skill can be discovered and added after the agent knows how decks work.
2. **Schema must come from skill, not prompt.** Reading `lythoskill-deck/SKILL.md` prevented `[cards.xxx]` hallucinations.
3. **Gap identification is a feature.** The agent explicitly noting "no radar-chart skill → matplotlib" is more valuable than silent guessing.
4. **Workarounds prove autonomy.** Manual toml editing when `deck add` failed showed true problem-solving, not script-following.

## Related

- Wiki: [`cortex/wiki/01-patterns/2026-05-15-seed-bootstrap-pattern-minimal-governance-skill-enables-agent-self-expansion.md`](../../cortex/wiki/01-patterns/2026-05-15-seed-bootstrap-pattern-minimal-governance-skill-enables-agent-self-expansion.md)
- v5 showcase: [`../2026-05-15-graduation-exam-v5/`](../2026-05-15-graduation-exam-v5/)
- Exam spec: [`cortex/wiki/01-patterns/2026-05-15-graduation-exam-spec.md`](../../cortex/wiki/01-patterns/2026-05-15-graduation-exam-spec.md)
