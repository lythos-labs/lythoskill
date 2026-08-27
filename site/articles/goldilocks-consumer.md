# Goldilocks Consumer: Why HATEOAS Failed in HTTP but Works for Agents

This is a short companion to [Agent-Boosted UX](./agent-boosted-ux), which covers the five patterns in full.

HATEOAS promised API responses that carry their own next actions as hyperlinks. It never took hold in HTTP APIs — the browser was too dumb to program APIs, the human programmer too opinionated to follow links at runtime (the canonical piece tells that history with the proper hedges). Agents sit between those two extremes: smart enough to parse structured instructions, programmatic enough to execute them. That middle position is what makes hypermedia viable again — a lythoskill CLI error can carry an executable example, and the agent reads it, substitutes its own values, and retries without a human in the loop.

This framing came from outside the project. The five patterns existed in the repo before they had names; they were identified as a group during an external review (a DeepWiki Q&A session, June 2026, documented in `site/drafts/showcase-goldilocks-consumer.md`), when the reviewer named what the project had built but never articulated.

The same root cause sits under the other four patterns the canonical article describes. Each exists because the project treats the agent as a distinct consumer type, with specific capabilities and specific limitations, rather than as a smarter human or a dumber programmer. Seen as a group, the five patterns are easier to state negatively: every one of them rejects a default assumption inherited from human-consumer design.

## What each pattern rejects

| Pattern | What it rejects |
|---------|-----------------|
| Goldilocks consumer | "HATEOAS failed, therefore hypermedia is dead" |
| ZK ↔ concept migration | "Agents are unreliable, so add more structure" |
| Agent-boosted UX | "Agent UX is human UX with less UI" |
| OS vocabulary | "OS metaphors are stylistic flair" |
| Conclusion-first | "Implement first, document later" |

The positive claims behind each rejection, with repo evidence, are in the canonical article.

## Related documents

- [Agent-Boosted UX](./agent-boosted-ux): the five patterns in full, with examples and repo references
- `cortex/wiki/02-research/2026-05-28-hateoas-from-http-to-agent-hypermedia.md`: HATEOAS failure in HTTP, success in the agent context, security analysis
- `site/drafts/showcase-goldilocks-consumer.md`: the raw synthesis from the external review session this piece is condensed from
