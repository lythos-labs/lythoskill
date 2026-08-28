# Conclusion-First ADRs and the Self-Proving Loop

Lythoskill finalizes its Architecture Decision Records before implementation begins: the decision is written, reviewed, and accepted or rejected before any code is written for it. This is a companion piece to [Agent-Boosted UX](./agent-boosted-ux), the canonical article on designing for agent consumers. It expands what that article only sketches: the conclusion-first trade-off in full (including the Hybrid row), two ADR case studies from the repo, and the self-proving loop — with an honest account of what self-proving does not prove.

## Conclusion-first: the decision is the deliverable

The cost of finalizing ADRs first is latency. Decisions sit in `adr/01-proposed/` while new information can still force a revision. The benefit is convergence: once an ADR is accepted, implementation tasks execute a stable contract instead of re-deciding architecture mid-PR.

| Approach | Short-term speed | Long-term stability | When to use |
|----------|-----------------|---------------------|-------------|
| **Code-first** | Fast: start typing immediately | Poor: design drifts with each PR | Exploration, spikes, prototypes |
| **Conclusion-first** | Slower: ADR latency | High: implementation converges to contract | Architecture decisions, boundary definitions, protocol design |
| **Hybrid** | Medium: ADR for big decisions, code-first for small | Medium | Most real-world projects |

Lythoskill chooses conclusion-first for architecture decisions because the project's core value is governance: consistent boundaries, stable contracts, predictable behavior across sessions and agents. Design drift in a governance layer is existential. If the CLI-agent boundary shifts with each PR, subagents cannot rely on it.

The pipeline:

```
ADR proposed → review → accepted → implementation tasks reference ADR → code review checks ADR compliance → done
```

The ADR is the single source of truth for the decision; the task is the execution plan.

## Two case studies from `cortex/adr/`

**Rejected before code.** ADR-20260501091724816 proposed renaming the project's "cold pool" to "skill library" to align with the Hermes ecosystem. Two days after it was proposed, it was rejected: Hermes's skill library is a runtime-visible directory, while lythoskill's cold pool is an agent-invisible staging layer, so the shared term would have imported a semantics opposite to the design intent. The rejection cost one document. The equivalent code-first mistake would have broken the `cold_pool` field in every existing `skill-deck.toml`.

**Built, then rejected.** ADR-20260506103209293 demoted "combo" from a skill type to a deck-level prompt, superseding an earlier design that had already been implemented. Conclusion-first does not prevent building the wrong thing; it gives the reversal a durable, citable home, so the next agent reads why the feature was removed instead of rediscovering the reasons the hard way.

The full ADR set lives in `cortex/adr/02-accepted/` (nearly 100 accepted at time of writing), with rejected proposals preserved in `cortex/adr/03-rejected/`.

## The self-proving loop, and its limit

Lythoskill is its own first user. The project builds itself with its own tools:

| Layer | Self-proof | Evidence |
|-------|-----------|----------|
| **Deck** | The project governs its own skills with `skill-deck.toml` | `.claude/skills/` is populated by `deck link` |
| **Arena** | Arena tests skill decks before adoption | Including decks that contain arena itself |
| **Cortex** | Cortex tracks cortex's own development | Tasks for cortex features are cortex-managed |
| **ZK Review** | Task cards for ZK Review improvements pass ZK Review | The methodology reviews itself |

An earlier version of this article claimed that this makes the architecture "self-proving" because the tool's success and the project's success are the same metric. That overstates it. What the loop actually proves is usability by its authors: if a design decision makes the tool worse at its own job, the team feels the friction in the next session, so bad ideas get caught fast. That is a claim about feedback latency, and it is real.

It is not a claim about quality. A tool can be comfortable for the people who built it and still be wrong for everyone else; authors share assumptions that outside users don't, and those shared blind spots are exactly what dogfooding cannot see. Self-proving covers "does this work for us, daily." The quality question, "is this good," needs evidence from outside the loop: zero-knowledge reviewers with no project context, cross-player arena runs, and external readers like the one whose review prompted this rewrite.

## Further reading

All paths are relative to the [repo root](https://github.com/lythos-labs/lythoskill):

- [Agent-Boosted UX](./agent-boosted-ux) — the canonical article: HATEOAS errors, ZK Review, OS vocabulary, agent-facing search
- `cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md` — steel-man analysis and the conclusion-first methodology section
- `cortex/adr/03-rejected/` — rejected proposals, preserved with their reasoning
- `cortex/adr/02-accepted/` — accepted ADRs that predate their implementation
