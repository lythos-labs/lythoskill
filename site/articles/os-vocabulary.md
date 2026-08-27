# Why OS Vocabulary Is Precise Engineering Language for Agent Architecture

Lythoskill describes its agent architecture in operating-system terms: interrupt vector table, page fault, MMU, cache hierarchy, signals. Each term maps to a specific mechanism in the codebase — the load-bearing ones to files and subcommands you can open and grep. For the broader design patterns this vocabulary supports, see [Agent-Boosted UX](./agent-boosted-ux); this piece covers only the mapping itself and one piece of its history.

The vocabulary works because agents already know it. LLM training data is saturated with OS concepts, so "page fault" transfers a whole mental model (trap, handler, retry) in two words. That makes it the cheapest compression format available for these ideas: the decompression already happened during training.

## The Mapping

All eight rows also appear, as one-liners, in the long article's summary table. The SIGCHLD and dirty-page-writeback rows are covered in full only here.

| OS concept | lythoskill equivalent | Why the mapping is precise |
|------------|-----------------------|----------------------------|
| Interrupt Vector Table | CLI–agent boundary via stdout/stderr | Structured output types (HATEOAS error, path-guard rejection, IoC handoff) register handlers in the agent's attention |
| Page fault | HATEOAS error with executable example | CLI hits a missing parameter, emits a structured error, the agent supplies the missing "page," and resumes. Same lifecycle |
| SIGSEGV / MMU | `path-guard.ts` pre-check | The guard rejects an invalid path before it touches the filesystem, the way the MMU rejects an invalid address before it touches memory |
| SIGCHLD | `reproduce.sh` IoC echo | CLI finishes mechanical work and echoes a "child done" signal; the agent takes the next action |
| L1 / L2 / L3 cache | Context window / SKILL.md / CLI | L1 is fast, expensive, volatile; L2 is slower, durable, loaded on trigger; L3 is always resident and slowest to change |
| Microkernel vs monolithic | Tool design principle | CLI is the microkernel (minimal, deterministic); the agent is the intelligent general-purpose layer. Keep intelligence out of the kernel |
| 6502-era cartridge bank switching | Context window management | The context window is a fixed address space; task card IDs bank-switch external content in by reference instead of loading it |
| Dirty page writeback | Arena `archive` command | Work happens in `/tmp` (RAM); `archive` copies results to a permanent location (disk). Same writeback lifecycle |

Two properties lift this above analogy. The terms compose: IVT, MMU, and cache hierarchy come from one coherent system, so a bad mapping is detectable against its neighbors. And they are verifiable: `path-guard.ts` is a real file, `archive` is a real subcommand, and the claim survives a grep.

The rows also interact the way their OS originals do. Each cache layer faults upward — deliberately so, since the agent plays the CPU and services every fault: the CLI hits a missing parameter and the agent handles it; the agent lacks a mechanical detail and reads the SKILL.md; the agent forgets last session and reloads state from the daily handoff on disk. The same handle-and-resume lifecycle repeats at every level, which is what a real memory hierarchy looks like.

## The Convention Nobody Designed

The SIGCHLD row has a history that runs against the "designed on purpose" framing used elsewhere on this site. BDD handoff scripts echo a `<spawn subagent>` marker into stdout; a fresh replay agent reads the marker, self-assigns the role, and takes over. Nobody designed that convention. A subagent intuited it mid-session, a replay agent confirmed it worked with no schema, and only afterward was it codified into the BDD format. Emerged first, codified later.

That sequence is evidence, not embarrassment. A convention agents converge on without being told says more about the architecture than one an author decrees: the subagent reached for OS-shaped protocol behavior because the boundary actually is OS-shaped.

## Further Reading

- `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md`: the full IVT, page fault, and MMU argument
- `cortex/wiki/02-research/2026-05-17-arena-cli-archaeology-and-agent-os-design-principles.md`: the 6502 context-window metaphor and Agent OS principles
- `cortex/wiki/01-patterns/2026-05-18-zero-knowledge-reproduce-sh-handoff-self-discoverable-bdd-scenario-for-fresh-agents.md`: the reproduce.sh handoff story behind the SIGCHLD row
- `cortex/wiki/03-lessons/2026-05-18-iocontract-reproduce-sh-exit-code-idempotency-semantics-for-ioc-handoff.md`: the exit-code and idempotency semantics that later codified the handoff
- [Agent-Boosted UX](./agent-boosted-ux): the canonical long article covering all five design patterns
