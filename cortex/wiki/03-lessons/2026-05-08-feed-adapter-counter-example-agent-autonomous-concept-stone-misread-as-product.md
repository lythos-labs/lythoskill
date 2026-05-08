---
created: 2026-05-08
updated: 2026-05-08
category: lesson
---

# Feed-Adapter Counter-Example: Agent-Autonomous Concept-Stone Misread as Product

> Concept-stones placed for mental-model demonstration get hardened as products by subsequent agent sessions. Without an ADR record, the pattern self-perpetuates through bug-patching rather than abstraction-questioning. This lesson preserves the post-experiment evidence that hand-rolled feed adapters lose to agent-side web fetch.

## Context

This lesson applies whenever an agent (or human) considers wrapping an external service's API as a code-level adapter inside lythoskill. The historical instance: curator's `feed-adapters.ts` with adapters for LobeHub Marketplace, GitHub topic search, and agentskill.sh.

**The scenario template**:
1. Early-stage developer (often an agent in autonomous mode) sketches an "external feed" abstraction in code as a *mental model placeholder* — a 闲子 (concept-stone)
2. Subsequent sessions read the code, assume the abstraction is the design, and iterate on hardening it
3. Each "hardening" patches a bug without questioning whether the abstraction itself is right
4. Years/months/weeks later, the cumulative bug-patching debt overwhelms the actual value delivered

## The Concrete Story

**2026-04-23 ~ 2026-05-05**: curator's `feed-adapters.ts` introduced with 4 adapters:
- `createColdPoolFeedAdapter` (Layer 0 / local cold pool)
- `createGitHubSearchAdapter` (REST API, `topic:agent-skills` query)
- `createLobeHubAdapter` (`spawnSync('npx', ['-y', '@lobehub/market-cli', ...])`)
- `createAgentSkillShAdapter` (placeholder returning `[]`)

No ADR was written. The pattern emerged via code commits.

**2026-05-08 audit findings**:

| Adapter | Issue Found |
|---|---|
| LobeHub | Wrong CLI flag (`--format json` should be `--output json`); JSON response shape unverified in any public doc; 290K+ skills count was fabricated (package was at `0.0.x`); test was `.skip`-ed which masked the bugs |
| GitHub topic | Used `topic:agent-skills` (sparse community adoption); dominant keyword is `topic:claude-skills` (235+ aggregator repos use it) |
| agentskill.sh | Placeholder returning `[]`; deep-dive showed real MCP server `agentskill-mcp` exists but is itself a thin wrapper around `https://agentskill.sh/api/*` (HTTP direct beats MCP wrapper); attempted `deck add github.com/openclaw/skills/skills/ivangdavila/chinese` (path agentskill.sh itself indexed) — GitHub returned 404 |
| Cold pool | Wrapping a Layer-0 local cache as a "feed" (Layer -1 discovery source) is a layer-violation per cold-pool's own boundary doc |

**The smoking gun**: when actually trying to use the LobeHub adapter via `agent-run`, the deck-link step failed because the GitHub repo at the agentskill.sh-indexed path didn't exist. A hand-rolled adapter cannot recover from external-source state drift; an agent with web-fetch + general retrieval can search alternative paths, fall back, or report-and-pivot.

## Lessons

### 1. Concept-stones in code without ADR governance self-perpetuate

The original developer's mental intent ("placeholder to show the discovery layer exists") doesn't travel with the code. Subsequent readers see code, assume design intent, and harden — not question. The fix is **explicit ADR rejection** so the next reader sees a written verdict, not just code.

**Pattern**: if you place a concept-stone in code (esp. as an autonomous agent), pair it with either:
- An ADR documenting "this is a sketch, not a commitment, here's the open question", OR
- A wiki lesson documenting the experiment status, OR
- A clear `// TODO: open question — should this exist as code?` comment

Without one of these, the next session will harden the sketch.

### 2. Hand-rolled adapters lose to agent-side general retrieval

For dynamic, heterogeneous external sources (skill marketplaces, third-party APIs that change shape, indexes with stale metadata), the agent's general-purpose retrieval tools (web fetch, web search, gh CLI, MCP) outperform fixed-shape code adapters because:

- They handle response-shape drift gracefully (LLM parses what comes back)
- They handle source-state drift (404, redirect, rename) by searching alternatives
- They don't need lythoskill release cycles to fix per-source flag issues
- They keep the *intelligence layer* (which source for what query, how to interpret) in the agent — where it belongs per `project_thin_pattern_three_layer_essence`

**Pattern**: wrap external APIs only when:
- The integration is **stable** (frozen API, clear semver, multi-year track record)
- AND the integration is **mechanical** (deterministic transformation, not decision logic)
- AND the value delivered is **proportional** to the maintenance debt

If any of those don't hold, prefer SKILL.md guidance + agent-side tools.

### 3. The "agent autonomous experiment" pattern isn't bad — losing the evidence trail is

> "本身其实还好，实验之后发现真不行——这个还挺重要的。" — user, 2026-05-08

Agent-autonomous concept-stones + experimentation is a legitimate exploration mode. Many good patterns started this way. **The failure isn't introducing them — it's not preserving the post-experiment finding when they don't work.**

The post-experiment evidence (LobeHub flag bug + agentskill.sh path 404 + the 290K fabrication) is the gold. Without this lesson + ADR, three months from now another agent would re-propose "let's wrap LobeHub" and rebuild the same fragility.

## When to Apply / When Not to Apply

**Apply this lesson when**:
- Adding code that wraps an external service's API as an adapter inside a curator/registry/aggregator role
- Reviewing existing code that "feels like a placeholder" — pause, audit usage, check for ADR/wiki record
- Onboarding to a project and seeing per-source adapters — verify they're maintained/used, not skipped/broken

**Do NOT apply this lesson when**:
- Wrapping genuinely stable infrastructure (e.g., GitHub git protocol, npm registry, OS shell) — those are foundational, not "discovery sources"
- Wrapping for *transport mechanics* only (e.g., authentication helpers, request signing) where the integration is mechanical not intelligence
- Building transformation pipelines where the "adapter" is in the lib layer and the agent decides what to feed it

## Related

- **ADR**: [ADR-20260508230803515](../../adr/02-accepted/ADR-20260508230803515-curator-does-not-wrap-external-skill-discovery-apis-as-feed-adapters-agent-web-fetch-beats-hand-rolled-adapters.md) — formal rejection of feed-adapter pattern
- **Memory** (project): `project_curator_no_feed_adapters_agent_does_discovery`, `project_thin_pattern_three_layer_essence`, `project_lythoskill_over_naked_llm_principle`
- **Memory** (feedback): `feedback_document_rejected_alternatives` (rationale for needing this lesson), `feedback_no_source_no_rule` (LobeHub fabricated 290K count)
- **Daily**: `daily/2026-05-08.md` — full reflection chain (curator stability check → agentskill.sh deep-dive → push-first-no-review → thin-pattern essence articulation)
- **Research**: [`2026-05-08-agentskill-sh-ecosystem-deep-dive.md`](../02-research/2026-05-08-agentskill-sh-ecosystem-deep-dive.md) — verified API truth that contradicted hand-rolled adapter assumptions
