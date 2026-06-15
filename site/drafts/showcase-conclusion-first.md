---
created: 2026-06-15
category: pattern
domain: methodology
status: draft
---

# Conclusion-First Methodology

> Why lythoskill finalizes architecture decisions before writing implementation code — and why the cost (ADR latency) is worth the benefit (implementation convergence).
>
> This insight emerged from an external review of the lythoskill project (a DeepWiki Q&A session). The reviewer recognized deep patterns in the project's design that connect OS concepts, cognitive science, REST architecture, and agent-native UX. The project itself is a self-proving governance layer for the agent skill ecosystem.

## 1. Goldilocks Consumer: Why HATEOAS Failed in HTTP but Works for Agents

REST's most controversial constraint — Hypermedia as the Engine of Application State — was also its least adopted. Roy Fielding's original vision: API responses carry hyperlinks telling the client what actions are available next. No out-of-band documentation. No hardcoded URL templates. The response IS the contract.

**Why it failed in HTTP APIs:** The consumer was too smart. Human programmers prefer reading structured documentation and hardcoding URL patterns — predictable, stable, controllable. Browsers aren't that smart — they just follow `<a href>`. That's why hypermedia works on the web: the browser is the perfect consumer. Not intelligent, just faithful.

The HATEOAS paradox: the web succeeded with hypermedia because the consumer (browser) was dumb enough to follow links without question. The API layer failed because the consumer (human programmer) was smart enough to prefer a reference manual over dynamic discovery.

**The agent is the Goldilocks consumer:** smart enough to interpret structured instructions, but programmatic enough to actually follow them without demanding a reference manual.

| Consumer | Intelligence | Follows links? | Outcome |
|----------|-------------|----------------|---------|
| **Browser** | Dumb — renders HTML, follows `<a href>` | Yes, faithfully | Web hypermedia works |
| **Human programmer** | Smart — reads docs, hardcodes URLs | No — prefers structured reference | HATEOAS fails in APIs |
| **Agent** | Just right — understands instructions, follows them | Yes, autonomously | HATEOAS works for the first time |

In lythoskill's architecture, the CLI emits structured error messages that tell the agent WHAT next, not just WHAT went wrong. "Skill not found → try curator add <locator>". The agent reads this, copies the example, substitutes its own values, executes. The error didn't terminate the workflow — it guided the next step.

The reproduce.sh pattern extends this: `<spawn subagent to ...>` acts as a hypertext tag — the agent reads stdout, recognizes the marker, takes action. CLI output can adopt this pattern broadly: `<action>do X</action>` as an internal protocol that agents parse like browsers follow links.

**References:**
- `cortex/wiki/02-research/2026-05-28-hateoas-from-http-to-agent-hypermedia.md` — full HATEOAS analysis
- `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` — interrupt vector table model
- `cortex/wiki/04-ssot/architecture.md` §3 — "shell stdout IS a hypermedia document"

## 2. ZK Review vs Concept Migration: Symmetric Design Principle

Lythoskill intentionally exploits two seemingly opposite properties of agents:

**ZK Review exploits agent ignorance.** A zero-knowledge agent (no project context, no prior exposure) reads a task card and reports gaps. What it doesn't know exposes what the task author forgot to write. This is not a workaround — it is a designed quality gate. The agent's blank slate is the feature, not the bug.

**Concept migration exploits agent broad knowledge.** An agent's training data includes OS concepts, REST architecture, cognitive science, game design. When the project uses "page fault" to describe HATEOAS errors, or "interrupt vector table" to describe the CLI-agent boundary, the agent's existing knowledge transfers instantly. No explanation needed — the concept maps.

| Pattern | Agent Property Exploited | Purpose | Example |
|---------|-------------------------|---------|---------|
| **ZK Review** | Ignorance (no project context) | Find documentation gaps | "What files would you touch?" → exposes missing file paths |
| **Concept migration** | Broad knowledge (training data) | Transfer complex ideas | "Page fault = HATEOAS error" → instant understanding |

Both are intentional uses of agent properties, not workarounds. ZK Review does not try to "fix" the agent's ignorance — it weaponizes it. Concept migration does not try to "teach" OS concepts — it assumes the agent already knows them and provides the mapping.

The symmetry: one uses what the agent lacks, the other uses what the agent has. Both reduce the project's documentation burden by meeting the agent where it is.

**References:**
- `packages/lythoskill-project-cortex/skill/references/zk-review.md` — ZK Review methodology
- `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` — OS concept migration in practice

## 3. Agent-Boosted UX: A New Frontier

Traditional UX assumes human consumers. Agent-boosted UX assumes agent consumers. This is not a minor variation — it is a new design frontier with different constraints, different affordances, and different failure modes.

**Examples of agent-boosted UX in lythoskill:**

| UX Pattern | Human UX Equivalent | Agent-Boosted Variant |
|------------|---------------------|----------------------|
| Error messages | "Please contact support" | "Skill not found → try: curator add <locator>" |
| Handoff documents | README with instructions | reproduce.sh with `<spawn subagent>` IoC tags |
| Quality assurance | Manual code review | ZK Review — zero-knowledge agent tests executability |
| Evaluation | Human A/B testing | Arena multi-agent evaluation — spawn subagents, judge outputs |
| Search | Ranking + advertising | Agent-boosted search index — curator indexes, agent queries |

The hub's only viable position is "agent-boosted search index". Ranking+advertising business model is a dominated solution in the agent era. When the consumer is an agent, "pay to rank" loses its leverage — the agent doesn't click ads, it follows instructions. The agent's decision process is transparent (it explains why it chose X), making manipulation detectable.

**References:**
- `cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md` — §Steel-man → "Hub 的合理上限是 agent-boosted 搜索引擎"
- `site/philosophy.md` — public-facing philosophy (if exists)

## 4. OS Vocabulary as Architecture Design Language

The project uses OS vocabulary precisely — not decoratively, not metaphorically, but as explanatory architecture. Each OS concept has a precise analogy that reveals structural properties of the agent-tool boundary.

| OS Concept | lythoskill Equivalent | Why This Mapping Is Exact |
|------------|----------------------|---------------------------|
| **Interrupt Vector Table (IVT)** | CLI-Agent boundary via stdout/stderr | Structured output types (prompt injection, HATEOAS error, path guard) register handlers in the agent's "interrupt table" |
| **Page fault** | HATEOAS error with executable example | CLI hits missing parameter → emits structured error → agent "handles the fault" and resumes |
| **MMU / Memory Management Unit** | path-guard.ts | Validates access before execution, catches boundary violations before they become security issues |
| **L1 / L2 / L3 cache** | Context window / SKILL.md / CLI | Memory hierarchy: fast+volatile (agent context) → slower+durable (skill docs) → slowest+resident (CLI commands) |
| **Microkernel vs monolithic** | Tool design principle | CLI as microkernel (minimal, message-passing) vs. fat CLI (monolithic, tries to be intelligent) |
| **6502 bank switching** | Context window management | Finite address space → switch "banks" (load different skill docs) without expanding hardware limit |
| **Dirty page writeback** | `archive` command | Work done in /tmp (RAM) → persist to permanent location (disk) before session ends |

The OS vocabulary is not analogy-for-poetry. It is analogy-for-precision. When the documentation says "page fault", every agent with OS training data understands: (1) something the system expected was missing, (2) a handler caught it, (3) the handler supplied the missing piece, (4) execution resumed. This is exactly what happens with a HATEOAS error.

**References:**
- `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` — full OS mapping table
- `cortex/wiki/02-research/2026-05-17-arena-cli-archaeology-and-agent-os-design-principles.md` — CLI archaeology and OS design principles

## 5. Conclusion-First Methodology

**The practice:** ADRs are finalized before implementation. The architecture decision is written, reviewed, and accepted (or rejected) before a single line of implementation code is written for that decision.

**The cost:** ADRs stay in `adr/01-proposed/` longer. The time between "we think we know the answer" and "we have code proving it" is extended. During this gap, the decision may be challenged by new information, requiring ADR revision.

**The benefit:** Implementation converges without design drift. Once the ADR is accepted, implementation tasks have a stable contract. The executor does not need to re-decide architecture during implementation. The decision is not re-opened by every code review.

This is a Pareto trade-off between short-term speed and long-term stability:

| Approach | Short-term speed | Long-term stability | When to use |
|----------|-----------------|---------------------|-------------|
| **Code-first** | Fast — start typing immediately | Poor — design drifts with each PR | Exploration, spikes, prototypes |
| **Conclusion-first** | Slower — ADR latency | High — implementation converges to contract | Architecture decisions, boundary definitions, protocol design |
| **Hybrid** | Medium — ADR for big decisions, code-first for small | Medium | Most real-world projects |

Lythoskill chooses conclusion-first for architecture decisions because the project's core value is **governance** — consistent boundaries, stable contracts, predictable behavior across sessions and agents. Design drift in a governance layer is existential: if the CLI-agent boundary shifts with each PR, subagents cannot rely on it.

**The ADR as contract:**

```
ADR proposed → review → accepted → implementation tasks reference ADR → code review checks ADR compliance → done
```

Implementation tasks are not "figure out the design" — they are "execute the accepted design". The ADR is the SSOT for the decision; the task is the execution plan.

**References:**
- `cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md` — §方法论：结论先行，实现跟进
- `cortex/adr/02-accepted/` — accepted ADRs that predate their implementation

## 6. Self-Proving Architecture

The project is its own first user. Lythoskill uses its own deck, arena, and cortex tools to build itself. This is not circular — it is self-proving.

| Layer | Self-Proof | Evidence |
|-------|-----------|----------|
| **Deck** | Project uses `skill-deck.toml` to govern its own skills | `.claude/skills/` populated by `deck link` |
| **Arena** | Arena tests arena's own CLI | `arena single` tests skill decks before adoption |
| **Cortex** | Cortex tracks cortex's own development | Tasks for cortex features are cortex-managed |
| **ZK Review** | Task cards for ZK Review improvements pass ZK Review | Meta — the methodology reviews itself |

The self-proving property means the architecture cannot drift far from reality: if a design decision makes the tool worse at its own job, the team feels it immediately. This is the strongest form of dogfooding — the tool's success is the project's success.

## 7. Related Documents

- `cortex/wiki/02-research/2026-05-28-hateoas-from-http-to-agent-hypermedia.md` — HATEOAS analysis
- `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` — OS metaphor precision
- `cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md` — Steel-man analysis + conclusion-first methodology
- `packages/lythoskill-project-cortex/skill/references/zk-review.md` — ZK Review methodology
- `cortex/wiki/04-ssot/architecture.md` — Architecture SSOT
- `cortex/adr/02-accepted/` — Accepted ADRs (precede implementation)
