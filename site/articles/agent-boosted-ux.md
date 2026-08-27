# Agent-Boosted UX: Designing CLIs, Errors, and Docs for Agent Consumers

Lythoskill is a governance layer for AI-agent skills, and it is its own first user: agents run its CLIs, read its errors, review its task cards, and write much of its code. That forced a question most projects never ask: what does UX look like when the consumer is an agent, not a human? This article covers the five patterns that emerged: HATEOAS-style error messages, zero-knowledge review, OS vocabulary as a transfer protocol, an agent-facing search index instead of a hub, and conclusion-first design.

## 1. The Goldilocks Consumer: Why HATEOAS Failed in HTTP but Works for Agents

REST's most controversial constraint, Hypermedia as the Engine of Application State, was also its least adopted. Roy Fielding's original vision: API responses carry hyperlinks telling the client which actions are available next. No out-of-band documentation, no hardcoded URL templates. The response is the contract.

It failed in HTTP APIs primarily because the consumer was the wrong species. Browsers are too dumb to program APIs: they render HTML and follow `<a href>`. Human programmers are too smart for it: they prefer structured documentation and hardcoded URL patterns, predictable and controllable. The web succeeded with hypermedia because the browser was the perfect consumer, not intelligent, just faithful. APIs failed for several reasons (tooling gaps, inertia, the success of simpler RPC styles), but the critical one was the consumer: the human programmer was the worst fit, smart enough to read docs, too opinionated to follow links blindly.

The agent is the Goldilocks consumer. Smart enough to interpret structured instructions, programmatic enough to actually follow them without demanding a reference manual.

| Consumer | Intelligence | Follows links? | Outcome |
|----------|-------------|----------------|---------|
| Browser | Dumb: renders HTML, follows `<a href>` | Yes, faithfully | Web hypermedia works |
| Human programmer | Smart: reads docs, hardcodes URLs | No, prefers structured reference | HATEOAS fails in APIs |
| Agent | Just right: understands instructions, follows them | Yes, autonomously | HATEOAS works for APIs for the first time |

In lythoskill, the CLI emits structured interrupts that the agent reads, interprets, and acts on. Compare a dead-end error with a self-healing one:

```
# NOT this (dead-end):
❌ file not found

# THIS (self-healing):
❌ --deck <path|url> is required.
   --deck accepts local paths and http/https URLs (auto-fetched).

   Example (no local file needed — URL is auto-fetched):
     lythoskill-arena single \
       --deck https://raw.githubusercontent.com/.../scout.toml \
       --brief "your task"

   Or with a local deck file:
     lythoskill-arena single --deck ./examples/decks/scout.toml --brief "your task"
```

The agent reads this, copies the example, substitutes its own values, and executes. The error didn't terminate the workflow; it guided the next step. The error response contains the available transitions, and the agent navigates by reading responses rather than knowing all paths in advance. This pattern is codified in ADR-20260515204135649, which mandates a 3-part error template across the codebase: `[What failed] + [Why it matters] + [How to fix / alternative]`.

There is a dark side. If shell stdout is a hypermedia document that agents trust and execute, then untrusted tool output is a prompt injection vector. This is structurally the same problem category as phishing email, JSONP injection, and XSS, with the same defense patterns: escaping, scanning, sandboxing. The full security analysis lives in `cortex/wiki/02-research/2026-05-28-hateoas-from-http-to-agent-hypermedia.md` §5.

## 2. ZK Review and Concept Migration: A Symmetric Principle

Lythoskill exploits two seemingly opposite properties of agents, treating both as features:

| Property | Exploited by | Purpose |
|----------|-------------|---------|
| Ignorance: no project context | ZK Review | Find documentation gaps |
| Broad knowledge: training data | Concept migration | Transfer complex ideas |

**ZK Review** weaponizes the agent's ignorance. Before a task is assigned, a zero-context agent reads the task card plus AGENTS.md and reports WHAT/WHY/HOW gaps. Because it doesn't know the project, it can't fill in blanks from memory, so it exposes gaps the author cannot self-detect. A real example from the project's methodology reference: a ZK agent pointed out that "the old encoder already does some temporal smoothing in `_encode_pcm_tts()`. The task doesn't say whether V2 replaces, extends, or duplicates that logic." The author knew the answer ("I plan to replace it") but never wrote it down. Self-review has a structural blind spot here; the knowledge curse is not a willpower problem.

**Concept migration** exploits the opposite property. The project uses OS vocabulary (interrupt vector table, page fault, MMU, cache hierarchy) as explanatory precision. The agent already understands these concepts from training data, so mapping them to agent-native equivalents transfers a whole mental model in one word: IVT = CLI-agent boundary, page fault = HATEOAS error, MMU = path-guard, L1/L2/L3 cache = context window / SKILL.md / CLI.

Both patterns share one structural property: they use the agent's native characteristics as design primitives. Traditional UX treats the consumer's limitations as constraints to design around. Agent-boosted UX treats the consumer's capabilities as affordances to design with.

The full ZK Review methodology (prompt templates, convergence protocol) is in `packages/lythoskill-project-cortex/skill/references/zk-review.md`.

## 3. Agent-Boosted UX vs Traditional UX

Traditional UX assumes human consumers: visual hierarchy, click targets, cognitive load management. Agent-boosted UX assumes agent consumers: structured output, executable instructions, context-window efficiency.

| Layer | Traditional UX | Agent-Boosted UX |
|-------|---------------|------------------|
| Error messages | Human-readable, often vague | HATEOAS: structured, with executable next steps |
| Handoff documents | Static README, human reads | `reproduce.sh` IoC: `<spawn subagent>` as hypertext tag |
| Documentation review | Human editor, style check | ZK Review: zero-knowledge agent finds executability gaps |
| Quality evaluation | Human QA, manual testing | Arena: parallel subagents + judge scoring |
| Search/discovery | Ranking + advertising | Agent-boosted search index: no ranking, no ads |

Two of these deserve a closer look.

**`reproduce.sh` as hypermedia protocol.** Lythoskill's BDD handoff format works because shell stdout is the document and the agent is the browser. The `<spawn subagent>` marker in the output is the hyperlink: a fresh replay agent reads the marker, self-assigns a role, and takes over. No schema required. See `cortex/wiki/01-patterns/2026-05-18-zero-knowledge-reproduce-sh-handoff-self-discoverable-bdd-scenario-for-fresh-agents.md`.

**The hub's dominated position.** In the agent era, the traditional hub business model (ranking plus advertising) stops working, because the agent doesn't click ads, doesn't browse trending lists, and follows structured instructions instead. Lythoskill's curator tool deliberately stays an index: it indexes the local skill pool and queries by tag and signal, and it does not do ranking recommendations. That is a structural defense against the pathologies that hit every previous attention market (SEO, clickbait, pay-to-rank, astroturfing), argued in full in `cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md`.

## 4. OS Vocabulary as a Precise Mapping

The OS vocabulary survives scrutiny because each concept has a verifiable counterpart in the agent architecture:

| OS Concept | lythoskill Equivalent | Mapping |
|------------|----------------------|---------|
| Interrupt Vector Table | stdout/stderr as structured output | CLI emits interrupts; agent reads and handles them |
| Page Fault | HATEOAS error with executable example | CLI hits a missing parameter, emits a structured error, agent fixes, resumes. Same lifecycle |
| MMU | `path-guard.ts` | Validates access before execution; catches a boundary violation before it touches the filesystem |
| L1 / L2 / L3 Cache | Context window / SKILL.md / CLI | L1 fast, expensive, volatile. L2 slower, cheaper, durable, loaded on trigger. L3 slowest to change, cheapest to run, always resident |
| Microkernel vs Monolithic | Tool design principle | CLI stays minimal and message-passing; intelligence is deliberately centralized in the agent. The boundary is the design |
| 6502-era Cartridge Bank Switching | Context window management | The context window is a fixed address space, like the 6502's 64KB. Bank switching lived in the cartridge mapper hardware, not the CPU, and task card IDs play that role: reference without loading |
| Dirty Page Writeback | `archive` command | Work done in `/tmp` (RAM) gets copied to a permanent location (disk). Same writeback lifecycle |
| SIGCHLD | `reproduce.sh` IoC echo | CLI notifies the agent that mechanical work is done; agent takes the next action. Same echo §3 reads as a hyperlink, viewed here one abstraction level down |

The memory hierarchy, drawn as a stack:

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

Each layer faults to the layer above it. CLI hits a missing parameter, emits a HATEOAS error, agent handles. Agent doesn't know the archive format, reads SKILL.md, delegates to the `archive` command. Agent forgets what happened last session, reads the daily handoff, resumes. The direction is deliberate: a hardware cache miss propagates outward toward slower memory, but here the agent is the CPU and services every fault, so escalation runs inward toward L1. The claim is stronger than analogy: the context window is an address space, the filesystem is persistent storage, the interrupt is the protocol. The full argument is in `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md`.

## 5. Conclusion-First: ADRs as Contracts

Lythoskill finalizes ADRs before implementation begins. The cost: ADRs sit in `proposed` state longer. The benefit: implementation converges without design drift.

Design drift is what happens when code and intent co-evolve undocumented: by the time someone notices the divergence, correcting it costs more than living with it. Freezing the design in ADR form first prevents that, at the price of slower starts.

| Approach | Short-term speed | Long-term stability | When to use |
|----------|-----------------|---------------------|-------------|
| Design-as-you-go | Fast | Low: drift accumulates | Exploration, prototypes, one-offs |
| Conclusion-first (lythoskill) | Slower upfront | High: implementation converges to contract | Infrastructure, governance, repeated patterns |

Not every project needs conclusion-first. Governance layers (deck, arena, curator, cortex) do, because drift in the foundation propagates to everything built on it.

The repo carries the evidence. `cortex/adr/02-accepted/` holds around 90 accepted ADRs, and the pattern repeats: ADR-20260502012643544 fixed the "skills as flat controllers" mental model before the skill architecture was built out; ADR-20260506103209293 demoted "combo" from a skill type to a deck-level prompt, superseding the earlier design; ADR-20260508230803515 decided the curator would not wrap external discovery APIs, and the follow-up task TASK-20260509113254423 deleted the `discover` command and feed adapter code. In each case the ADR came first and implementation tasks referenced it as their contract. One consequence agents must know: in this project, an ADR in `proposed` state means "concluded, waiting for implementation," not "undecided."

That last rule is itself agent-boosted UX. A state label that a human contributor would absorb from team culture has to be written down, precisely, where an agent will read it. Most of what this article describes comes down to that: the consumer changed, so the interface, from error messages to design documents, had to become explicit, structured, and executable.

## Related Documents

- `cortex/wiki/02-research/2026-05-28-hateoas-from-http-to-agent-hypermedia.md`: HATEOAS security and agent-native hypermedia
- `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md`: IVT, page fault, memory hierarchy
- `packages/lythoskill-project-cortex/skill/references/zk-review.md`: ZK Review methodology and convergence protocol
- `cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md`: Pareto frontier, steel-man analysis, conclusion-first methodology
- `site/philosophy.md`: Governance problem, smart agent / dumb tools, thin pattern
- `cortex/wiki/02-research/2026-05-17-arena-cli-archaeology-and-agent-os-design-principles.md`: Agent OS design principles, 6502 metaphor, git stratigraphy
