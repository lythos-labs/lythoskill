---
created: 2026-05-17
updated: 2026-05-17
category: pattern
---

# Control Transfer Protocol — CLI-Agent Boundary as Interrupt Vector Table

> The CLI doesn't just run commands. It hands control to the agent at precise, designed boundaries. stdout and stderr are not output channels — they're interrupt vectors.

**Discovered**: 2026-05-17, synthesized from existing patterns (Shell stdout IoC, HATEOAS errors, path-guard, dormancy) into a unified model.
**Confidence**: High — all three interrupt types independently verified in arena CLI, reproduce.sh, and project-cortex.

## The OS Metaphor

```
User space   │  Process  │  syscall / page fault / signal
─────────────┼───────────┼─────────────────────────────
Kernel space │  OS       │  handler → fix → resume

User space   │  CLI      │  error / echo / guard violation
─────────────┼───────────┼─────────────────────────────
Kernel space │  Agent    │  read output → diagnose → fix → continue
```

In an OS, when a process hits an unmapped address, the CPU raises a page fault. The kernel catches it, reads the missing page from disk, maps it, and resumes the process. The process doesn't know this happened. The interrupt is the control transfer mechanism.

In the CLI-Agent architecture, the same thing happens. The CLI is user space — it has bounded, deterministic operations (copy files, spawn processes, validate paths). The agent is kernel space — it has web fetch, bash, file read/write, and reasoning. When the CLI hits something it can't handle (missing parameter, network failure, boundary violation), it doesn't crash. It emits a structured interrupt. The agent reads it, fixes the situation, and continues.

**The agent loop stays here because this is where supervisor mode lives.** You don't move the loop into user space — that would be a microkernel mistake (too many context switches for trivial operations). You don't eliminate the boundary — that would be a monolithic mistake (CLI tries to be intelligent, agent tries to be mechanical). The interrupt table is the right abstraction: a small, stable interface that lets each side do what it's good at.

## Three Interrupt Types

### Type 1: Prompt Injection (Forward Transfer)

The CLI completes its mechanical work and proactively yields control.

```
CLI:  echo "Step 3: Agent executes task"
CLI:  echo "  cd $WORKDIR && <spawn subagent>"
      │
      ▼ (stdout)
Agent reads, self-assigns role, takes over
```

**OS analogue**: `SIGCHLD` — parent process notified when child finishes, takes next action.
**Design pattern**: **IoC / Dependency Injection**. The CLI doesn't call the agent. It emits a description of what needs to happen next. The agent injects itself as the handler.

This pattern was NOT designed. It emerged when a subagent wrote `reproduce.sh` and intuited that `<spawn subagent>` in echo output would be read and acted on by the next agent. The replay agent confirmed it works without a schema.

Reference: [[2026-05-17-shell-stdout-as-agent-prompt-injection]]

### Type 2: HATEOAS Error (Exception Transfer)

The CLI encounters a problem it can't resolve — missing parameter, unreachable URL, invalid format. The error message is the interrupt.

```
# NOT this (dead-end):
❌ file not found

# THIS (self-healing):
❌ --deck <path|url> is required.
   --deck accepts local paths and http/https URLs (auto-fetched).

   Example (URL — auto-fetched):
     lythoskill-arena single \
       --deck https://raw.githubusercontent.com/.../scout.toml \
       --brief "your task"

   Or with a local deck file:
     lythoskill-arena single --deck ./examples/decks/scout.toml --brief "your task"
```

The agent reads this, copies the example, substitutes its own values, executes. The error didn't terminate the workflow — it guided the next step.

**OS analogue**: Page fault with `si_addr` — the kernel doesn't just say "segfault", it tells you which address was missing, so you can map it.
**Design pattern**: **HATEOAS** (Hypermedia as the Engine of Application State). The error response contains the available transitions. Agent navigates by reading responses, not by knowing all paths in advance.
**Design pattern**: **Chain of Responsibility**. The CLI tries to handle the request, can't, passes it to the next handler (agent) with enough context for the handler to succeed.

**Template**: `[What failed] + [Why it matters] + [How to fix / executable example]`

Reference: ADR-20260515204135649 (3-part template), T9 URL-first HATEOAS playbook, `cortex/tasks/04-completed/TASK-20260509113255134` (17 bare errors → HATEOAS)

### Type 3: Path Guard (Pre-check Interrupt)

The CLI validates before executing — catches the agent's mistake before it becomes a security issue or wasted work.

```
Agent:   reads ../../.npm-access
         │
         ▼
CLI:     path-guard validates → ❌ resolves outside project directory
           Resolved: /Users/.../.../.npm-access
           Project:  /Users/.../lythoskill-main
         │
         ▼
Agent:   reads error → understands boundary → finds correct path
```

**OS analogue**: `SIGSEGV` with `MAP_ERR` — the MMU catches the invalid access before it touches memory, delivers the fault to the handler.
**Design pattern**: **Guard Clause** — validate at the boundary, reject invalid input with enough context to fix it.

Reference: `packages/lythoskill-arena/src/path-guard.ts`

## Design Pattern Parallels

| OS Concept | CLI-Agent Equivalent | When |
|-------------|---------------------|------|
| Interrupt Vector Table | stdout/stderr as structured output | Always |
| Page Fault | HATEOAS error with executable example | Missing param, broken input |
| SIGCHLD | reproduce.sh IoC echo | Mechanical work done, agent's turn |
| SIGSEGV / MMU | path-guard pre-check | Boundary violation before execution |
| signal handler | Agent reads output, self-assigns role | Every interrupt |
| resume after fault | Agent fixes → retries command → continues | Error → fix → continue cycle |
| dirty page writeback | `archive` command copies output to permanent location | Work done, persist |

| Design Pattern | CLI-Agent Equivalent | When |
|----------------|---------------------|------|
| **IoC / Dependency Injection** | CLI emits description; agent injects itself as handler | reproduce.sh IoC |
| **HATEOAS** | Error response carries available next actions | All CLI errors |
| **Chain of Responsibility** | CLI tries → fails → passes to agent with context | Missing params, network failures |
| **Callback / Handler** | Agent is the handler registered for CLI interrupt types | All three types |
| **Guard Clause** | path-guard validates before execution | Path traversal, boundary violations |
| **Null Object** | Dormancy — fallback hint stays silent on healthy path | Mirror/proxy hints |

## Why Not a Structured Framework

The temptation is to formalize this: build an `InterruptProtocol` schema, a `ControlTransfer` enum, a JSON-based handoff format. This is the **EnvironmentProbe + ReconcilePlan** approach — rejected in ADR-20260515204135649.

The reason: **agents don't need ceremony. They need executable context.**

| Approach | What agent sees | Agent can act? |
|----------|----------------|----------------|
| Structured framework | `{"error":"ENOENT","tool":"curl","fix":"brew install curl"}` | Parse → extract → execute. Extra hop. |
| HATEOAS error | `❌ Cannot reach URL. Set LYTHOSKILL_GH_MIRROR. Or download manually.` | Read → understand → act. Zero parse overhead. |

Natural language in stderr is the most token-efficient format for an LLM. Parsing JSON costs tokens without adding information the agent can't extract from prose. The interrupt should be **dense with context, sparse with structure**.

This is also why the thin pattern works: CLI does mechanical things (copy, validate, spawn), SKILL.md does control flow description, agent does intelligent things (design, judge, fix). Adding a protocol layer between them would be a **thick pattern anti-pattern** — ceremony that adds tokens without adding capability.

## The Dormancy Constraint

Every interrupt type has a paired dormancy requirement:

| Interrupt | Dormancy rule |
|-----------|--------------|
| HATEOAS error | Must NOT appear on successful execution |
| Fallback hint (mirror/proxy) | grep for hint keywords on happy path → must return 0 |
| Path guard | Must NOT fire for valid in-project paths |

If a fallback hint fires on the healthy path, it becomes noise. The agent learns to ignore it. The day a real failure occurs, the hint is invisible — it was trained away.

**Dormancy is the negative-space specification of interrupt behavior.** Positive tests verify "does the interrupt fire when it should." Dormancy tests verify "does the interrupt stay silent when it shouldn't."

Reference: [[2026-05-09-dormancy-property-test-for-fallback-hints]]

## The Thin Pattern as Memory Hierarchy

The interrupt model reveals why the thin pattern is the right layering:

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

The interrupt table is how higher layers register their availability to lower layers. The agent doesn't poll the CLI. The CLI doesn't call the agent. The interrupt is the protocol — and it's carried entirely in stdout and stderr text.

## Related

- [[2026-05-17-shell-stdout-as-agent-prompt-injection]] — Type 1: Prompt Injection (forward transfer)
- [[2026-05-09-dormancy-property-test-for-fallback-hints]] — Dormancy constraint on fallback hints
- [[2026-05-17-codex-symlink-snapshot-mode-origin-and-evolution]] — Schema-first design (CLI catches up to schema)
- [[2026-05-15-annotation-mindset-agent-facing-code-annotations-as-ioc-for-agent-behavior]] — IoC as general principle
- ADR-20260515204135649 — 3-part error template, reject structured framework
- ADR-20260517140421425 — CLI vs agent-orchestrated behavioral parity
- T9 URL-first HATEOAS regression playbook — dormancy-verified subagent testing
- `packages/lythoskill-arena/src/cli.ts` — canonical HATEOAS implementation
- `packages/lythoskill-arena/src/path-guard.ts` — Type 3 implementation
