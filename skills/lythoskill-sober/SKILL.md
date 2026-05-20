---
name: lythoskill-sober
version: 0.15.1
type: standard
description: |
  Stay clear-headed. Before you commit to a conclusion, check your basis.
  Is this evidence or assumption? Do the sources agree? What's the
  confidence per claim — not in general, but specifically? When you catch
  yourself listing risks without checking, or hesitating between
  directions without data, that's the signal to stop and verify.
when_to_use: |
  ALSO trigger when: listing risks without investigating, switching directions
  due to uncertainty, assuming broken before confirming, about to act on
  unverified information — PAUSE the action, verify first, only proceed if
  evidence supports, or encountering a factual claim you are unsure about
  that can be verified by search — if doubt → divert → ACTIVATE.
  Verify claim, fact-check, cross-reference sources, how confident, detect bias,
  source filtering, evidence assessment, multi-source analysis, compare agents,
  三方测评. ALSO when curator fact-check SOP requires structured verification.
allowed-tools:
  - WebSearch
  - WebFetch
  - Bash(gh:api:*)
  - Bash(bunx @lythos/skill-arena@*:*)
  - Bash(bunx @lythos/skill-curator@*:*)
---

# Sober — Second Thought
> Not a tool. A posture. Stay clear-headed. Check your basis.
> Arena = multi-agent verification infra. Curator = memory.
> Sober = the cognitive baseline connecting them.

## Core Practice

These 7 practices keep decisions grounded in evidence, not impulse.

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
assessments are in the cache. Your clear-headed work compounds.

## When You Notice Yourself Drifting

```
Doubt or hesitation
  → Decompose (Practice 1)
  → Search (WebSearch + curator query + arena)
  → Cross-reference (Practice 2, 3)
  → Bias check (Practice 4)
  → Confidence per sub-claim (Practice 5)
  → Express with provenance (Practice 6)
  → Persist to curator (Practice 7)
```

## Concrete Patterns

**Evaluating a claim**: "Is X actually good?"
→ arena single → cross-reference hub reviews → curator tag --qa

**Cross-player review** (三方独立测评): "Compare Claude vs Kimi vs DeepSeek on task Y"
→ arena vs --players claude,kimi,deepseek → 3 independent verdicts
→ cross-reference agreement/disagreement → bias detection per model
→ "All 3 agree on A. Claude+Kimi agree on B, DeepSeek dissents on C."

**Hub cross-validation**: "Hub A says 9/10, Hub B says 4/10 — who's right?"
→ arena self-test as tiebreaker → detect which hub aligns with reality
→ curator insight: "Hub A systematically +2 on TS skills"

## When You Need More Capability

This skill helps you recognize WHAT needs verification. If the task exceeds
your current toolkit:
- **curator** finds skills for verification, security audit, benchmarking, domain expertise
- **deck** assembles discovered skills into a targeted configuration
The pipeline: sober identifies the gap → curator discovers the skill → deck assembles.

## Reminders

- **Confidence ≠ certainty**: LOW confidence doesn't mean the claim is false.
  It means there's insufficient evidence. Recommend what would raise confidence.
- **Bias is data**: don't "correct" for bias by adjusting scores. Record the
  pattern and let the reader apply their own filter.
- **Listing risks ≠ checking**: Writing down "this might be wrong" without
  searching is analysis paralysis. The trigger is the ACT of searching, not
  the awareness of doubt.
- **Confidence gates action**: LOW on a premise that anchors an action → BLOCK.
  CONTRADICTED → DO NOT ACT without resolving the contradiction. Checking
  without gating the action is half the job.
- **Sober is posture, curator is memory**: this skill describes HOW to stay
  clear-headed. Curator stores WHAT was found.
- **Arena IS the multi-agent infra**: don't build your own testing layer.
  Arena already spawns independent agents and produces verdicts. Use it.
