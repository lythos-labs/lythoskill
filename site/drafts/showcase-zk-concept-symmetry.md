---
created: 2026-06-15
category: pattern
domain: agent-native-design
status: draft
related:
  - cortex/wiki/02-research/2026-05-28-hateoas-from-http-to-agent-hypermedia.md
  - cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md
  - packages/lythoskill-project-cortex/skill/references/zk-review.md
  - cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md
  - site/philosophy.md
  - cortex/wiki/02-research/2026-05-17-arena-cli-archaeology-and-agent-os-design-principles.md
  - cortex/adr/02-accepted/
  - AGENTS.md § ZK Review Gate
  - AGENTS.md § ZK Validation Pattern
---

# ZK vs Concept Migration Symmetry — Intentional Uses of Agent Properties

> This pattern emerged from an external review of the lythoskill project (a DeepWiki Q&A session). The reviewer recognized deep structural connections across OS concepts, cognitive science, REST architecture, and agent-native UX — connections that the project itself had built but not yet named as a unified principle. This document names that principle: **the symmetric, intentional use of two agent properties that are usually treated as limitations.**

---

## 1. The Core Symmetry

The lythoskill project exploits two properties of LLM agents in a **symmetric, intentional, and complementary** way:

| Property | Usually Treated As | Lythoskill Uses It As | Primary Pattern |
|----------|-------------------|----------------------|-----------------|
| **Ignorance** (no project context) | A limitation — "the agent doesn't know our codebase" | A **sensor** — zero-knowledge review finds documentation gaps | ZK Review |
| **Broad knowledge** (training data) | A liability — "the agent hallucinates about things it doesn't know" | A **bridge** — concept migration transfers complex ideas across domains | OS metaphor, HATEOAS, architecture |

Both are **intentional uses of agent properties**, not workarounds. The symmetry is the design principle: the same agent architecture that is "too ignorant to be useful" without docs is also "too knowledgeable to need docs" for cross-domain analogy. The project systematically deploys both ends of this spectrum.

---

## 2. Goldilocks Consumer — HATEOAS

### 2.1 Why HATEOAS Failed in HTTP APIs

REST's Hypermedia as the Engine of Application State (HATEOAS) was the least adopted of Roy Fielding's constraints. The reason is a consumer mismatch:

| Consumer | Intelligence | Behavior | HATEOAS Outcome |
|----------|-------------|----------|-----------------|
| **Browser** | Too dumb — renders HTML, follows `<a href>` | Faithfully follows links | ✅ Web hypermedia works |
| **Human programmer** | Too smart — reads docs, hardcodes URLs | Prefers structured reference over dynamic discovery | ❌ HATEOAS fails in APIs |
| **Agent** | **Just right** — understands instructions, follows them programmatically | Reads structured output, recognizes actionable instructions, executes autonomously | ✅ HATEOAS works for the first time |

The browser is too dumb to program an API. The human programmer is too smart to follow links blindly. The agent is the **Goldilocks consumer**: smart enough to interpret structured instructions, but programmatic enough to actually follow them without demanding a reference manual.

Full analysis: `cortex/wiki/02-research/2026-05-28-hateoas-from-http-to-agent-hypermedia.md` §1-2.

### 2.2 Agent-Native HATEOAS in Lythoskill

In lythoskill's architecture, the consumer is an agent. And agents DO follow links:

```
HTTP REST:                                    Agent CLI:
  Response {                                   Error output {
    "error": "not found",                      "Skill not found: github.com/x/y
    "_links": {                                 → try: curator add github.com/x/y"
      "create": "/api/skills"                  }
    }
  }                                            Agent reads → curator add github.com/x/y

  Human reads → ??? → looks up docs             Zero intermediate steps
```

The difference: **the agent is a programmatic hypermedia consumer.** It reads structured output, recognizes actionable instructions, and executes them. The error message IS the documentation. The CLI output IS the API response. The `<spawn subagent>` tag IS the hyperlink.

Reference: `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` § Type 2: HATEOAS Error (Exception Transfer).

### 2.3 The Security Parallel

If shell stdout is a hypermedia document that agents trust and execute, then **untrusted tool output is a prompt injection vector**. This is structurally identical to phishing, XSS, and JSONP injection — the same defense patterns apply (output escaping, content scanning, sandboxing, CSP). The `qa-sweep` deck's security skills map to this naturally.

Reference: `cortex/wiki/02-research/2026-05-28-hateoas-from-http-to-agent-hypermedia.md` §5.

---

## 3. ZK Review — Exploiting Ignorance as a Sensor

### 3.1 The Method

ZK Review is the **mandatory pre-assignment gate** for task design. The procedure:

```
write task → self-review → ZK Review (WHAT/WHY/HOW) → process gaps
                                              ↓
                                    <2 new gaps & all low-priority?
                                              ↓ no
                                    spawn same agent → back to ZK Review
```

Three rounds is a practical ceiling. If still not converged after round 3, the task design itself is the problem — go back to scope/solution, not more description.

Reference: `packages/lythoskill-project-cortex/skill/references/zk-review.md` § HOW; `AGENTS.md` § ZK Review Gate.

### 3.2 What ZK Review Surfaces That Self-Review Cannot

The most valuable ZK finding is not "missing file path" — it is **design overlap** that the task author knew the answer to but never wrote down:

> *Task: "Implement V2 encoder with temporal smoothing."*
> *ZK agent: "The old encoder already does some temporal smoothing in `_encode_pcm_tts()`. The task doesn't say whether V2 replaces, extends, or duplicates that logic."*

Self-review cannot catch this because the author already knows their own intent. ZK Review can — because the ZK agent has no prior context and reads only what's on the page.

Reference: `packages/lythoskill-project-cortex/skill/references/zk-review.md` § WHY § "最意外的发现：功能重叠".

### 3.3 The Four Required Content Types

ZK Review most often exposes missing content in four categories:

| Type | Question | Example Fix |
|------|----------|-------------|
| **Prerequisite knowledge** | Where is the code? | File path + line number |
| **Interface contracts** | What are the signatures? | Upstream/downstream function declarations |
| **Baseline data** | What are the anchors? | Current value, target range |
| **Scope declaration** | Mandatory vs optional vs not-doing? | Explicit boundaries |

Reference: `AGENTS.md` § ZK Review Gate § "4 required content types".

### 3.4 ZK Review Is Information Exposure, Not Instruction Following

The ZK agent's role is to surface angles the author might have missed — not to dictate changes. The author evaluates, filters, and decides:

| ZK agent says | Your action |
|---------------|-------------|
| "This flag name is confusing" | Information: naming might be a problem. Evaluate cost/benefit. |
| "I don't know what this function does" | Information: missing documentation. Decide if in-scope. |
| "The output surprised me" | Information: UX gap. Decide if bug or learning curve. |
| "This is clearly wrong" | Information: potential bug. Verify with code, don't take agent's word. |

Reference: `packages/lythoskill-project-cortex/skill/references/zk-review.md` § "边界判定：ZK 暴露 gap，不提供真理".

---

## 4. Concept Migration — Exploiting Broad Knowledge as a Bridge

### 4.1 The OS Vocabulary Is Not Decorative

The project's precise use of OS vocabulary is **explanatory, not decorative**. Each OS concept has a precise analogy:

| OS Concept | CLI-Agent Equivalent | Where in Project |
|------------|---------------------|------------------|
| **Interrupt Vector Table** | stdout/stderr as structured output | `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` § The OS Metaphor |
| **Page Fault** | HATEOAS error with executable example | `packages/lythoskill-arena/src/cli.ts` — canonical HATEOAS implementation |
| **SIGCHLD** | reproduce.sh IoC echo | `cortex/wiki/01-patterns/2026-05-17-shell-stdout-as-agent-prompt-injection.md` |
| **SIGSEGV / MMU** | path-guard pre-check | `packages/lythoskill-arena/src/path-guard.ts` |
| **L1 / L2 / L3 cache** | context window / SKILL.md / CLI | `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` § Thin Pattern as Memory Hierarchy |
| **Microkernel vs Monolithic** | tool design principle (intelligence in agent, not CLI) | `site/philosophy.md` § Smart Agent, Dumb Tools |
| **6502 Bank Switching** | context window management | `cortex/wiki/02-research/2026-05-17-arena-cli-archaeology-and-agent-os-design-principles.md` § 6502 隐喻 |
| **Dirty Page Writeback** | `archive` command | `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` § Design Pattern Parallels |

The agent's broad training knowledge — its familiarity with OS architecture, REST principles, memory hierarchies — is the **bridge** that makes these analogies work. A human reader might need a computer science degree to follow; the agent recognizes the concepts immediately because they are in its training data.

### 4.2 The Memory Hierarchy Analogy

The thin pattern reveals why the OS metaphor is the right layering:

```
┌─────────────────────────────────────────────┐
│ Agent (L1 cache — context window)           │
│ Fast, expensive, volatile                   │
│ Role: read interrupts, fix, judge, design   │
├─────────────────────────────────────────────┤
│ SKILL.md (L2 cache — loaded on trigger)     │
│ Slower, cheaper, durable                    │
│ Role: describe intent, link to CLI commands │
├─────────────────────────────────────────────┤
│ CLI (L3 — always resident)                  │
│ Slowest to change, cheapest to run          │
│ Role: mechanical invariants, validation,    │
│       interrupt emission, archive           │
├─────────────────────────────────────────────┤
│ Git / cortex (Disk — persistent storage)    │
│ Cold, durable, versioned                    │
│ Role: ground truth, history, replay         │
└─────────────────────────────────────────────┘
```

Each layer faults to the layer above it. CLI hits a missing parameter → HATEOAS error → agent handles. Agent doesn't know the archive format → reads SKILL.md → delegates to `archive` command. Agent forgets what happened last session → reads daily handoff → resumes.

Reference: `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` § The Thin Pattern as Memory Hierarchy.

### 4.3 The 6502 Metaphor

> "Context window is to the filesystem what 6502 address space was to disk storage."

| 6502 Era | Agent Era |
|----------|-----------|
| 64KB RAM (address space) | Context window (tens to hundreds of K tokens) |
| Floppy / tape / ROM (MB ~ GB) | Filesystem / cortex directory tree (GB ~ TB) |
| Bank switching / paged memory | Task card ID as reference, tools read on demand |
| Programmer manually managed working set | Main agent chooses "pass ID or pass content" |

This is not a cute analogy. It is an **engineering invariant**: context window limited ≠ agent limited. All content that might膨胀 goes in the filesystem, addressed by ID / path / reference, read on demand by tools. This is the engineering foundation of agent OS design.

Reference: `cortex/wiki/02-research/2026-05-17-arena-cli-archaeology-and-agent-os-design-principles.md` § 6502 隐喻.

---

## 5. Agent-Boosted UX — A New Frontier

### 5.1 Traditional UX vs Agent-Boosted UX

| Dimension | Traditional UX | Agent-Boosted UX |
|-----------|---------------|------------------|
| **Consumer** | Human | Agent |
| **Information density** | Low — humans read slowly | High — agents read fast, need structured density |
| **Error handling** | "Something went wrong" | "Something went wrong → here's exactly what to do next" |
| **Navigation** | Menus, buttons, links | HATEOAS error messages, `<spawn subagent>` tags, reproduce.sh IoC |
| **Feedback loop** | Human reports bug → developer fixes | Agent reads output → self-assigns fix → continues |
| **Evaluation** | A/B testing with humans | Arena multi-agent evaluation |

### 5.2 Examples in Lythoskill

| Pattern | Agent-Boosted UX Example | Reference |
|---------|-------------------------|-----------|
| **HATEOAS error messages** | CLI errors include executable examples, not just failure descriptions | `cortex/wiki/02-research/2026-05-28-hateoas-from-http-to-agent-hypermedia.md` |
| **reproduce.sh IoC handoff** | `<spawn subagent to ...>` in shell stdout acts as hypertext tag | `cortex/wiki/01-patterns/2026-05-17-shell-stdout-as-agent-prompt-injection.md` |
| **ZK Review** | Zero-knowledge agent evaluates task executability before assignment | `packages/lythoskill-project-cortex/skill/references/zk-review.md` |
| **Arena multi-agent evaluation** | Spawn parallel subagents with different decks, judge outputs empirically | `cortex/wiki/01-patterns/2026-05-28-agent-evaluation-arena-pattern.md` |
| **Control Transfer Protocol** | CLI emits structured interrupts; agent reads and self-assigns role | `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` |

### 5.3 The Hub's Only Viable Position

In the agent era, the traditional "ranking + advertising" business model is a **dominated solution**. The hub's only viable position is **"agent-boosted search index"** — indexing and query, not ranking recommendation. Curator deliberately positions itself within this boundary.

> "Hub 一旦做 trendings，软广形态自然浮现，因为这一层面就是 skill 生态在展开 meme 竞争。"

Reference: `cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md` § Steel-man → 形态 α.

---

## 6. Conclusion-First Methodology

### 6.1 The Pareto Trade-Off

Lythoskill adopts a **"conclusion-first, implementation-follows"** methodology:

| Phase | Cost | Benefit |
|-------|------|---------|
| **ADR proposed** | Stays in proposed state longer | Implementation converges without design drift |
| **Implementation** | Must follow ADR as contract | No mid-implementation architecture pivots |
| **Review** | ADR may need superseding if reality diverges | Every decision is traceable to a documented rationale |

This is a **Pareto trade-off** between short-term speed and long-term stability. The cost is visible (ADR stays proposed longer). The benefit is invisible but compound (implementation doesn't drift).

Reference: `cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md` § 方法论：结论先行，实现跟进.

### 6.2 ADR as Contract

> "Agent 阅读 ADR 时应理解：proposed 状态在本项目不代表'未决定'，而是'已结论但等待实现'。Implementation tasks 应以 ADR 为契约。"

This is the opposite of "code first, document later." The ADR is the **anchor**; the code is the **derivation**. When implementation reality diverges from the ADR, the ADR is superseded — not ignored.

Reference: `cortex/adr/02-accepted/` — all accepted ADRs were finalized before their implementation tasks began.

### 6.3 Why This Works for Agent-Driven Development

Agents have no time sense and no release perspective. They operate on **local visible correctness** — "this change makes the current test pass." The ADR is the **global visible correctness** mechanism — it encodes the project's accumulated design intent so that each agent session, regardless of context window compaction, can re-converge on the same architectural target.

Reference: `cortex/wiki/02-research/2026-05-17-arena-cli-archaeology-and-agent-os-design-principles.md` § 发现四: Git 是逻辑链，不是时间线.

---

## 7. The Unified Principle: Symmetry as Design Method

The four sections above are not independent patterns. They are **instances of a single design method**:

| Pattern | Agent Property Used | Direction | Purpose |
|---------|---------------------|-----------|---------|
| ZK Review | **Ignorance** (no context) | Inward — into the project's own docs | Find gaps in documentation |
| OS metaphor / HATEOAS | **Broad knowledge** (training data) | Outward — across domains | Transfer complex ideas efficiently |
| Agent-boosted UX | **Programmatic consumption** | Interface — between tool and agent | Design for the actual consumer |
| Conclusion-first | **Local visible correctness** | Temporal — across sessions | Prevent design drift between agents |

The symmetry is the insight: **the same agent that is "too ignorant" to work without docs is also "too knowledgeable" to need docs for cross-domain analogy.** The project systematically deploys both ends of this spectrum — not as workarounds, but as **intentional, complementary design instruments**.

This is why the project is a **self-proving governance layer**: it uses its own patterns to build itself. ZK Review validates the task that builds the ZK Review tool. Arena tests the deck that includes the arena skill. The OS metaphor explains the architecture that implements the OS metaphor. The symmetry is recursive.

---

## 8. Related Documents

- `cortex/wiki/02-research/2026-05-28-hateoas-from-http-to-agent-hypermedia.md` — HATEOAS full research
- `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` — OS metaphor full pattern
- `packages/lythoskill-project-cortex/skill/references/zk-review.md` — ZK Review methodology
- `cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md` — Steel-man, Pareto frontier, conclusion-first methodology
- `site/philosophy.md` — Smart agent, dumb tools; thin pattern; player-deck separation
- `cortex/wiki/02-research/2026-05-17-arena-cli-archaeology-and-agent-os-design-principles.md` — Agent OS design principles, 6502 metaphor
- `cortex/adr/02-accepted/` — Conclusion-first methodology in practice
- `AGENTS.md` § ZK Review Gate — Operational framework
- `AGENTS.md` § ZK Validation Pattern — Documentation readability validation
