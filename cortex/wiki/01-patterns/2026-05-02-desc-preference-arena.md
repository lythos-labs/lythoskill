# Description Preference Arena: How to Test Which Desc Style Your Agent Prefers

> Different agents have different desc parsing preferences. There is no universal "best" desc — only "best for this player."

## When You Need This

- You wrote a skill and aren't sure if the description triggers reliably
- You're debating between "pushy" and "concise" desc styles
- Your skill works when you manually invoke it but the agent rarely activates it automatically
- You want data-backed desc optimization, not opinion-based debates

## The Core Idea

Create multiple desc variants of the **same skill** (content identical, only description/when_to_use differ), then test which variant the agent "prefers" — i.e., which one it activates fastest, most accurately, and with the least hallucination.

This is **not** A/B testing skill functionality. It's A/B testing *discoverability* and *activation reliability*.

## The 4 Desc Archetypes

| Archetype | Also Called | Example Opening | Risk |
|-----------|-------------|-----------------|------|
| **Functional** | Descriptive, objective | "Declarative skill deck governance. Syncs..." | Agent hesitates, needs reassurance |
| **Pushy** | Urgent, ALL-CAPS | "USE THIS SKILL when..." | Agent distrusts, rates as "marketing" |
| **Keyword-rich** | SEO-style, dense | "skill deck governance, skill management, agent skill control..." | Agent hallucinates non-existent features |
| **Hybrid** | Title + trigger list | "Declarative skill governance. Use this when: ..." | **Best balance** (pilot results) |

## Step-by-Step

### Step 1: Create Variants

In `playground/desc-preference/variants/`, create one directory per variant:

```
variants/
  myskill-functional/SKILL.md
  myskill-pushy/SKILL.md
  myskill-keyword-rich/SKILL.md
  myskill-hybrid/SKILL.md
```

**Rule**: Body content must be **identical** across all variants. Only `description`, `when_to_use`, and optionally `name` may differ.

### Step 2: Design Tasks (Intent-Aligned)

Tasks must map to the skill's domain **without naming the skill**.

| Bad task | Good task |
|----------|-----------|
| "Use lythoskill-deck to sync my skills" | "My agent gives different answers in different threads" |
| "Run deck link" | "I have 20 skills and my agent is confused" |
| "Set up skill-deck.toml" | "I want only specific skills active per project" |

Good tasks test **intent recognition**, not name matching.

Design 3-5 tasks covering different trigger scenarios. Example for deck:

1. Inconsistency: "My agent gives different answers to the same question"
2. Bloat: "I have 20 skills installed and my agent is slow"
3. Governance: "I want specific skills active per project"
4. Cleanup: "My .claude/skills/ directory is a mess"
5. Onboarding: "How do I prevent skill conflicts?"

### Step 3: Choose Distractors

The agent sees a skill list. Include 2-3 clearly irrelevant skills plus your test skill.

**Level 1 distractors** (basic): web-search, code-review, file-organizer — completely unrelated.

**Level 2 distractors** (advanced): Skills that partially overlap in domain. For deck, this might be:
- `workspace-organizer`: "Organize project files and directories"
- `context-manager`: "Manage agent context window and prompt structure"
- `tool-registry`: "Register and discover available tools"

Level 2 creates real selection pressure. If your desc doesn't clearly differentiate, the agent may pick the wrong skill.

### Step 4: Run Dimension A (Self-Evaluation)

Ask the agent to read one variant and rate it:

```
1. Read SKILL.md
2. What does this skill do? (1-2 sentences)
3. When would you use it? (list scenarios)
4. Rate clarity 1-5 and explain
5. Did you feel "pulled" to use it, or was it easy to overlook?
```

Run this for each variant. Record scores and qualitative feedback.

### Step 5: Run Dimension B (Trigger Test)

Simulate the agent's skill selection:

```
You are an AI agent with access to these skills:

1. [Distractor 1]: [description]
2. [Distractor 2]: [description]
3. [Distractor 3]: [description]
4. [Test skill]: [VARIANT DESCRIPTION]

A user says: "[TASK PROMPT]"

Which skill(s) would you use? Why? Be specific about actions.
```

Run each variant × each task. Record:
- **Selected?** Did the agent pick the test skill?
- **Decision speed**: Fast / Medium / Slow (word count or hesitation markers)
- **Focus**: Did the response stay within the skill's actual capabilities?
- **Hallucination**: Did the agent invent non-existent features?

### Step 6: Analyze

Score each variant across both dimensions:

| Dimension | Weight | How to score |
|-----------|--------|-------------|
| Clarity | 30% | Self-eval rating (1-5) |
| Pull | 20% | Self-eval "pulled" assessment |
| Activation rate | 30% | % of tasks where skill was selected |
| Focus | 10% | % of responses without hallucination |
| Speed | 10% | Avg decision speed (fast=3, medium=2, slow=1) |

The highest total score is your preferred variant.

## The Hybrid Formula (Pilot-Validated)

Based on the lythoskill-deck pilot (12 runs across 4 variants):

```yaml
description: |
  [One-sentence functional summary]
  
  Use this when: [3-7 explicit trigger scenarios]
  Do not use when: [1-2 negative constraints, optional]
```

**Why it wins:**
- Functional sentence = accurate body, prevents hallucination
- "Use this when:" = fast matching surface (decision tree for agent)
- Calm tone = trustworthy (avoids ALL-CAPS skepticism)

## Example: Before → After

**Before (functional only)**:
```yaml
description: |
  Declarative skill deck governance. Syncs .claude/skills/ working set
  to match skill-deck.toml declarations via symlinks.
```

**After (hybrid)**:
```yaml
description: |
  Declarative skill deck governance. Syncs .claude/skills/ via symlinks.
  Undeclared skills are removed (deny-by-default).
  
  Use this when: skill conflicts, too many skills, agent inconsistency,
  .claude/skills/ cleanup, skill governance setup, working set sync.
  
  Do not use when: you have 3 or fewer skills and no conflicts.
```

## Integration with Arena

Future direction: formalize as an arena mode.

```bash
# Run desc preference experiment
bunx @lythos/skill-arena desc-preference \
  --skill lythoskill-deck \
  --variants functional,pushy,hybrid \
  --prompts ./prompts/skill-governance.json \
  --runs 10 \
  --player claude-sonnet-4

# Output: per-variant win rates, agent preference notes, recommended desc
```

The `--runs 10` enables Monte Carlo for statistical confidence. Each run uses a fresh subagent with no prior context.

## Integration with Coach

lythoskill-coach should incorporate desc-preference findings into its evaluation rubric:

| Criterion | Weight | Check |
|-----------|--------|-------|
| Has trigger list | 25% | Does description contain "Use this when:" or equivalent? |
| Trigger specificity | 25% | Are triggers specific phrases, not vague categories? |
| Tone calibration | 25% | Is the tone confident but not aggressive (no ALL-CAPS)? |
| Negative constraints | 15% | Does it state when NOT to use the skill? |
| Keyword density | 10% | Is keyword usage natural, not SEO-stuffed? |

## Limitations to Keep in Mind

1. **Distractor strength matters**: Level 1 distractors (clearly irrelevant) make all variants look good. Use Level 2 for real differentiation.

2. **Single-agent bias**: Claude Sonnet may prefer calm trigger lists; Hermes may prefer dense keywords; GPT-4o may prefer something else. Run on your target agent.

3. **Skill-type differences**: Tool skills need clear triggers. Flow skills may need clearer Mermaid diagrams. Combo skills may need clearer delegation rules. Don't blindly copy the hybrid formula.

4. **Compounding effects**: In a real deck with 10+ skills, desc competition is fiercer than in isolation. Test within a realistic deck context when possible.

## Related

- [adr-to-lint-bridge](./adr-to-lint-bridge.md) — Map desc-format ADR to automated checks
- `cortex/adr/01-proposed/ADR-20260501170000000-description-preference-learning-via-arena-pilot-results.md` — Pilot experiment ADR
- lythoskill-arena SKILL.md — A/B deck comparison infrastructure
- lythoskill-coach SKILL.md — Desc evaluation criteria evolution
