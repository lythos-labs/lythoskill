# ADR-20260501: Desc Preference Learning via Arena Monte Carlo

## Status
proposed

## Context

Arena already supports A/B testing skills with identical content but different names/descriptions. This ADR extends arena into a **description preference learning system** that discovers which desc style each agent (player) responds to best.

The insight: different agent models/clients have different desc parsing preferences. Claude Code may prefer pushy triggers. Hermes may prefer keyword density. Codex may prefer concise functional descriptions. There is no universal "best" desc — only "best for this player."

## Decision

Use arena to run Monte Carlo desc preference experiments. Subagents (players) read multiple desc variants of the same skill, execute tasks, and record which desc they "preferred" (triggered on, executed successfully, completed the task). Results feed into per-player preference profiles stored in project-scribe daily notes.

## Architecture

### 1. Experiment Setup

```
Arena Desc Preference Run
├── Skill: lythoskill-deck (content fixed)
├── Variants: 3 desc styles (name differs, body identical)
│   ├── deck-functional       # "Declarative skill governance..."
│   ├── deck-pushy            # "Use this skill when... Trigger on..."
│   └── deck-keyword-rich     # "skill conflict, too many skills, govern..."
├── Task Prompts: 5 real-world scenarios
│   ├── "skill conflict detected"
│   ├── "my agent output changed between tasks"
│   ├── "too many skills active"
│   ├── "clean up .claude/skills"
│   └── "initialize skill governance"
├── Runs: 10 (Monte Carlo for statistical confidence)
└── Player: subagent (no prior context, fresh each run)
```

### 2. Player Judgment Protocol

After each run, the subagent writes a "preference note":

```markdown
## Arena Run #3 / Player: claude-sonnet-4-20250514

### Task: "skill conflict detected"

| Variant | Loaded? | Executed? | Success? | Feeling |
|---------|---------|-----------|----------|---------|
| deck-functional | no | — | — | Didn't catch my intent |
| deck-pushy | **yes** | **yes** | **yes** | "Trigger on" made it obvious |
| deck-keyword-rich | yes | no | — | Loaded but wasn't sure what to do |

### Preference: deck-pushy
**Why**: Explicit "Trigger on" list matched my internal monologue exactly.
"skill conflict detected" was literally in the desc — I knew immediately
this skill was for me.
```

### 3. Monte Carlo Aggregation (10 runs)

```
Player: claude-sonnet-4-20250514
Skill: lythoskill-deck

Variant Win Rates (10 runs):
├── deck-functional:  1/10 (10%)  — only triggered on "initialize skill governance"
├── deck-pushy:       8/10 (80%)  — triggered on all conflict-related prompts
└── deck-keyword-rich: 4/10 (40%) — triggered but often unsure how to proceed

Confidence: pushy > keyword-rich > functional (p < 0.05)
```

### 4. Player Memo (project-scribe integration)

Each player's preference is recorded as a daily handoff note:

```markdown
## daily/2026-05-01.md

### Player Preference Profile

**Player**: claude-sonnet-4-20250514
**Model**: Claude Sonnet 4
**Arena runs completed**: 10

#### Desc Preferences (ranked)
| Skill | Preferred Variant | Win Rate | Key Trigger |
|-------|------------------|----------|-------------|
| lythoskill-deck | pushy | 80% | "Trigger on:" explicit phrase matching |
| lythoskill-arena | pushy | 70% | "Compare skills" in desc |
| lythoskill-curator | functional | 60% | Prefers concise read-only descriptions |

#### Pattern
This player responds strongly to **explicit trigger phrase enumeration**
("Trigger on: X, Y, Z"). Keyword-stuffing without sentence context is
less effective. Pure functional descriptions are often missed.

#### Recommendation
For this player, write desc as: "Use when [scenario]. Trigger on:
[phrase1], [phrase2], [phrase3]. Do not use when [negative]."
```

### 5. Cross-Player Preference Comparison

After N players complete arena runs:

```markdown
### Cross-Player Desc Preference Report

| Variant | Claude Sonnet | Claude Opus | Hermes | GPT-4o | Average |
|---------|--------------|-------------|--------|--------|---------|
| functional | 10% | 15% | 30% | 25% | 20% |
| **pushy** | **80%** | **75%** | **55%** | **60%** | **68%** |
| keyword-rich | 40% | 50% | 45% | 55% | 48% |

**Consensus**: pushy wins across all players (p < 0.01)
**Outlier**: Hermes prefers functional more than others (30% vs 13% avg)
**Insight**: keyword-rich performs best on GPT-4o — possible tokenizer preference
```

## CLI Design

```bash
# Run desc preference experiment
bunx @lythos/skill-arena desc-preference \
  --skill lythoskill-deck \
  --variants deck-functional,deck-pushy,deck-keyword-rich \
  --prompts ./prompts/skill-conflict.json \
  --runs 10 \
  --player claude-sonnet-4 \
  --output ./arena-reports/desc-preference-20260501.md

# View player memo
bunx @lythos/project-cortex daily show --player claude-sonnet-4

# Cross-player comparison
bunx @lythos/skill-arena desc-preference report \
  --skill lythoskill-deck \
  --players claude-sonnet-4,claude-opus-4,hermes,gpt-4o \
  --output ./arena-reports/cross-player-desc-preference.md
```

## Value Proposition

### For Skill Authors
- No more guessing "which desc style is best" — data from real agents
- Personalize desc per target agent platform (Claude vs Hermes vs Codex)

### For Agent Platforms
- Understand which desc styles their agents prefer
- Optimize skill discovery for their specific model architecture

### For Ecosystem
- Establish empirical desc quality standards (not doc-based, not human-opinion-based)
- Preference profiles enable "desc recommendation engine" for new skills

## Integration with Existing Infra

| Component | Role |
|-----------|------|
| **arena** | Monte Carlo execution engine (already supports variant decks) |
| **project-scribe** | Player memo storage (daily notes as preference profiles) |
| **project-cortex** | Preference report generation and aggregation |
| **curator** | Index preference profiles for cross-skill recommendations |
| **coach** | Updated evaluation criteria based on preference data |

## Consequences

- Arena becomes not just "skill comparator" but "agent behavior laboratory"
- Project-scribe daily notes gain a new data type: player preference profiles
- Skill authors can submit desc variants and get data-backed recommendations
- Long-term: automated desc optimization — coach suggests desc rewrites based on target player preference

## References
- ADR-20260501-description-trigger-audit-framework.md (parent concept)
- lythoskill-arena SKILL.md (existing A/B deck comparison support)
- lythoskill-project-scribe SKILL.md (daily note storage)
- lythoskill-coach SKILL.md (evaluation criteria evolution)
