---
name: lythoskill-journalist
version: {{PACKAGE_VERSION}}
type: standard
description: |
  记者系技能 — investigative claim verification via multi-source cross-referencing.
  Decomposes claims, searches independent evidence, detects source bias through
  filtering, and assigns per-claim confidence (HIGH/MEDIUM/LOW/CONTRADICTED).
  Leverages arena as multi-agent verification infra. Curator is the memory.
  Use when verifying claims, cross-referencing sources, or assessing information quality.
when_to_use: |
  Verify this claim, fact-check, cross-reference sources, is this true,
  how confident are we, detect bias, source filtering, evidence assessment,
  confidence evaluation, claim verification, multi-source analysis,
  is this skill really good, does this description match reality,
  cross-player review, 三方独立测评, compare agents on task.
  ALSO trigger when curator's fact-check SOP requires structured claim verification.
allowed-tools:
  - WebSearch
  - WebFetch
  - Bash(gh:api:*)
  - Bash(bunx @lythos/skill-arena@*:*)
  - Bash(bunx @lythos/skill-curator@*:*)
---

# Journalist (记者)
> Investigation + narrative synthesis + expression.
> Arena = multi-agent verification infra. Curator = memory.
> Journalist = the SOP connecting them.

## Core Rules

These 7 rules are distilled from lythoskill's accumulated practice —
three-layer trust model, arena combat data, curator provenance chains.

### 1. Decompose before searching
Vague claims ("fast", "reliable", "better than Y") are unverifiable. Break into
atomic, independently testable sub-claims before searching for evidence.
Flag unverifiable claims explicitly — don't guess.

### 2. Independence > count
10 sources citing the same report = 1 source. Sources that cite each other are
echo, not convergence. Always trace to primary source.

### 3. L3 > L2 > L1 (自己动手丰衣足食)
Arena self-test (L3) beats hub review (L2) beats author description (L1).
One arena run is worth more than 5 external reviews. If no L3 data exists,
the first recommendation is always: run arena.

### 4. Toggle sources to see bias
Filtering sources should change the picture — if it doesn't, you don't have
enough diversity. A source that systematically deviates is detected bias,
not noise. Record the pattern: "Hub A rates TS skills +2 above arena baseline."

### 5. Per-claim confidence, not aggregate score
"Claim A: HIGH (3 arena + 1 hub), Claim B: LOW (author-only)" is more useful
than "7.3/10 overall." Aggregate scores hide which parts are verified and
which are guesswork.

### 6. Express with provenance
Every confidence assignment carries source citations. The reader should be
able to trace each claim back to its evidence. Without provenance, confidence
is just another opinion.

### 7. Persist to curator
Assessment results are curator QA data. `curator tag --qa` writes per-claim
confidence with provenance. Next time the same skill is evaluated, prior
assessments are in the cache. The journalist's work compounds.

## Workflow

```
Claim
  → Decompose (Rule 1)
  → Search (WebSearch + curator query + arena)
  → Cross-reference (Rule 2, 3)
  → Bias check (Rule 4)
  → Confidence per sub-claim (Rule 5)
  → Express with provenance (Rule 6)
  → Persist to curator (Rule 7)
```

## Concrete Patterns

**Skill assessment**: "Is skill X actually good?"
→ arena single → cross-reference hub reviews → curator tag --qa

**Cross-player review** (三方独立测评): "Compare Claude vs Kimi vs DeepSeek on task Y"
→ arena vs --players claude,kimi,deepseek → 3 independent verdicts
→ cross-reference agreement/disagreement → bias detection per model
→ "All 3 agree on A. Claude+Kimi agree on B, DeepSeek dissents on C."

**Hub cross-validation**: "Hub A says 9/10, Hub B says 4/10 — who's right?"
→ arena self-test as tiebreaker → detect which hub aligns with reality
→ curator insight: "Hub A systematically +2 on TS skills"

## Gotchas

- **Confidence ≠ certainty**: LOW confidence doesn't mean the claim is false.
  It means there's insufficient evidence. Recommend what would raise confidence.
- **Bias is data**: don't "correct" for bias by adjusting scores. Record the
  pattern and let the reader apply their own filter.
- **Journalist is method, curator is memory**: this skill describes HOW to
  investigate. Curator stores WHAT was found. Separate concerns.
- **Arena IS the multi-agent infra**: journalist doesn't build its own testing
  layer. Arena already spawns independent agents and produces verdicts. Use it.
