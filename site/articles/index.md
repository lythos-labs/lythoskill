# Articles

Long-form pieces on the design ideas behind lythoskill, written for readers who build with AI agents. No installation required — these are about *why*, not *how*. (English only, for now.)

All five pieces grew out of a single event: an external reviewer (DeepWiki) interrogated this repository, and the answers revealed a coherent design philosophy for agent consumers. Start with the canonical piece; the four companions each expand one idea it covers briefly.

**Start here:**

- [Agent-Boosted UX](./agent-boosted-ux) — the canonical piece. What UX means when the user is an agent: error messages as API responses, CLI output as interrupt vectors, and the five design patterns that follow.

**Companions (short, standalone):**

- [The Goldilocks Consumer](./goldilocks-consumer) — the five patterns are easiest to state negatively: what each one rejects.
- [ZK Review and Concept Migration](./zk-concept-symmetry) — exploiting agent ignorance as a sensor and training knowledge as a bridge, including the four gap types a ZK reviewer surfaces.
- [OS Vocabulary as Engineering Language](./os-vocabulary) — the full mapping table: page faults, SIGCHLD, dirty page writeback — precise terms whose key rows map to files and subcommands you can grep.
- [Conclusion-First ADRs and the Self-Proving Loop](./conclusion-first) — decide before implementing, and an honest look at what dogfooding does and does not prove.

Before publication, every article went through the same pipeline that gates all external writing on this site: fact-check against the repository, writer-criteria review, and a zero-knowledge readability pass — a fresh agent with no project context reads cold and reports what it understood. The first ZK pass on this section rated it 4/10 (five near-identical articles); the restructure into one canonical piece plus four companions is its verdict applied.
