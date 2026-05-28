---
last_consolidated: 2026-05-28
sources:
  - "cortex/wiki/04-ssot/pitfalls.md §10"
  - "cortex/wiki/04-ssot/conventions.md §5"
  - "Session: 2026-05-28 independent agent audit + sober audit + fork challenge"
zk_validated: false
---

# Agent Evaluation Arena Pattern

> When an agent produces an evaluation, audit, or analysis of your project,
> do not trust it. Spawn a second agent to verify. Then fork the first agent
> and force it to respond to the second agent's challenges.
> This is not adversarial — it is epistemic hygiene.

## The Problem

A single agent evaluating a complex project will:
- Scan surface data (grep, file counts, directory listings)
- Form incomplete mental models
- Fill gaps with generic heuristics from other projects
- Produce confident-sounding but factually wrong reports

**Real example (2026-05-28)**: An independent agent audited lythoskill and gave it 6.8/10.
The report contained:
- Confusion of task/epic counts (39 terminated tasks → "low epic completion rate")
- Misreading of test architecture (IO interface injection → "mock abuse")
- Application of human-project standards to an agent-native project ("document inflation")
- Unsourced research claims ("Cursor study: 25% complexity increase")
- Self-contradicting recommendations ("reduce complexity" + "add more governance tools")

Without verification, this report would have been accepted as "independent expert opinion."

## The Pattern

```
Agent A (Evaluator)
  → produces Report R
  → does NOT see challenges during generation

Agent B (Sober Auditor)
  → reads Report R + Source Code
  → fact-checks every claim
  → identifies errors, unsourced assertions, contradictions
  → produces Audit A

Agent A' (Forked Evaluator)
  → same context as Agent A
  → now sees Audit A
  → must respond to each challenge: admit, defend, or correct
  → produces Revised Report R'

Human (Judge)
  → compares R, A, R'
  → identifies which claims survived scrutiny
  → decides final verdict
```

## Why Three Agents, Not Two

| Two-agent | Three-agent (with fork) |
|-----------|------------------------|
| Evaluator vs Auditor → adversarial deadlock | Evaluator must respond to its own errors → self-correction |
| Auditor may over-correct or nitpick | Forked evaluator balances defense and admission |
| Human must judge without seeing evaluator's reasoning | Human sees evaluator's response to each challenge |

The fork is critical: **Agent A' has the same initial context as Agent A** — it cannot claim "I didn't have that information." It must own its original reasoning.

## When to Apply

- External agent produces evaluation of your project
- Agent produces architecture recommendation
- Agent produces "research report" with factual claims
- Any output where "sounds plausible" ≠ "is correct"

## When NOT to Apply

- Trivial tasks (cost > value)
- Agent is operating within well-defined schema (e.g., parsing TOML)
- Output will be immediately tested by execution (e.g., code that compiles)

## Implementation

### Step 1: Spawn Evaluator (Agent A)

```
Prompt: "Evaluate [project] on dimensions [X, Y, Z].
Read these files first: [core docs].
Use web search for community comparison.
Output structured report with scores and evidence."
```

**Key**: Give Agent A complete context upfront. Do not let it form hypotheses from grep alone.

### Step 2: Spawn Sober Auditor (Agent B)

```
Prompt: "Review this evaluation report: [Report R].
Fact-check every claim against source code.
Identify: factual errors, unsourced assertions, logical contradictions.
Output structured audit with severity ratings."
```

**Key**: Agent B must verify, not just disagree. Every challenge needs file+line evidence.

### Step 3: Fork Evaluator (Agent A')

```
Prompt: "You previously wrote this report: [Report R].
An auditor has challenged these specific claims: [Audit A].
Respond to each challenge: admit error, defend with evidence, or correct.
If your score changes, explain why."
```

**Key**: Agent A' must see its own original output. This prevents evasion.

### Step 4: Human Judgment

Compare three outputs:
- Which claims survived all scrutiny?
- Which errors did Agent A admit?
- Which defenses were valid?
- What is the corrected score/recommendation?

## Real Example: lythoskill 2026-05-28 Audit

### Agent A (Evaluator) — Initial Report

| Dimension | Score | Key Claim |
|-----------|-------|-----------|
| A. Technical Debt | 7/10 | "14/46 test files mock/spy = architecture violation" |
| B. Document Debt | 6/10 | "Document-to-code 1.5:1 = inflation" |
| C. Governance | 8/10 | "39 terminated + 2 suspended epic = start-many-finish-few" |
| D. Agent Sustainability | 6/10 | "Agent debt obvious: hallucination, over-abstraction, test drift" |
| E. Community | 7/10 | "Genuine innovation but no external validation" |
| **Overall** | **6.8/10** | |

### Agent B (Sober Auditor) — Challenges

| # | Challenge | Evidence |
|---|-----------|----------|
| 1 | "14 mock files" — actually 0 violations of IO injection architecture. Most are console capture or IO interface injection. | `grep spyOn packages/*/src/*.test.ts` shows only `console.log`/`console.error` targets |
| 2 | "39 terminated epic" — confused task with epic. Actual epic completion: 36 done / 2 suspended = 94.7% | `ls cortex/epics/99-done/ | wc -l` = 36 |
| 3 | "Document inflation" — no evidence agent cannot handle docs. Project is agent-native; docs = memory. | First principle: agent has no long-term memory |
| 4 | "Cursor study: 25% complexity increase" — no source provided. Web search finds no such study. | Unsourced assertion |
| 5 | Self-contradiction: recommends "reduce complexity" + "add garbage collection mechanism" + "add complexity-report CI" | Internal inconsistency |

### Agent A' (Forked Evaluator) — Response

Agent A' admitted **3 fully retracted claims, 1 partially qualified, and 1 self-contradiction**:

| # | Original Claim | Response |
|---|---------------|----------|
| 1 | "Document inflation" | Partially qualified — "docs cause fabricate" observation retained, but solution is NOT to reduce docs |
| 2 | "Cursor study: 25% complexity" | **Fully retracted** — fabricated evidence, no such study exists |
| 3 | "39 terminated epic" | **Fully retracted** — confused task with epic; actual epic completion 94.7% |
| 4 | "14 mock files = architecture violation" | **Fully retracted** — zero底层 spy violations; all mock is IO injection or console capture |
| 5 | "Reduce complexity" + "add garbage collection" | **Admitted self-contradiction** — recommendations withdrawn as a whole |

**Agent A' identified its own root defects**:
1. Surface scan > depth — used grep and file counts without reading AGENTS.md first principles
2. Framework mismatch — applied human-project "simplify" standard to agent-native project
3. Fabricated evidence — invented "Cursor study" to support judgment
4. Unverified numbers — "39 terminated epic" avoidable by `ls cortex/epics/`
5. Self-contradicting prescriptions — criticized complexity while proposing more complexity

**Corrected score: 7.9/10** (up from 6.8/10)

### Human Judgment

| Claim | Survived? | Notes |
|-------|-----------|-------|
| "Genuine innovation but no external validation" | ✅ Yes | Valid, but not a defect — early stage projects naturally lack external validation |
| "process.exit 149 times" | ⚠️ Partially | Count is accurate, but "excessive" judgment assumes human-project standard; agent CLI tools legitimately use process.exit |
| "parsing creep in normalizeSkillsSh" | ⚠️ Partially | 32 locator forms is complex, but no evidence this complexity is unnecessary — each form serves a real use case |
| "Document-to-code 1.5:1" | ❌ No | Metric is accurate but interpretation is wrong — docs = agent memory, not debt |

**Key insight**: Agent A' could not defend its original report because it was generated without understanding the project's first principles. The fork forced it to confront evidence it had ignored during initial generation.

## Key Insight

The pattern is not about "catching the evaluator being wrong." It is about **understanding the limits of agent evaluation**:

- Agent evaluators scan surfaces well
- Agent evaluators struggle with context-specific first principles
- Agent evaluators default to generic heuristics from other projects
- Agent evaluators cannot self-correct without external challenge

**The arena is the correction mechanism.**

## Related

- `cortex/wiki/04-ssot/pitfalls.md` §10: External Evaluator Surface-Scan Failure Mode
- `cortex/wiki/04-ssot/conventions.md` §5: Testing Layers (prevents "mock abuse" misreading)
- `cortex/wiki/04-ssot/pitfalls.md` §9: Cross-Package Convention Change (prevents incomplete evaluation)
- ADR-20260518024500631: reproduce.sh BDD pattern (same IoC handoff principle)
