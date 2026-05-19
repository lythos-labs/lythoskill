---
created: 2026-05-19
updated: 2026-05-19
category: research
---

# Documentation site pattern inventory (from historical excavation)

> Draft content map for a public-facing lythos documentation site. Each section maps to a site page.

## Site pages (priority order)

### 1. The Agent-First Architecture (landing)

**Source:** README.md, README.zh.md, AGENTS.md

lythos is infrastructure for AI agents, not a human tool. The CLI is designed for agents to invoke — declarative TOML, plan-first, exit-code semantics. Humans write the declaration; agents execute.

### 2. Three-Layer Pattern (why thin?)

**Source:** ADR-20260423101938000, wiki/2026-05-02-thin-skill-pattern.md, wiki/2026-05-02-skills-as-flat-controllers-evolution.md

```
CLI (npm)      = heavy mechanical — backup, symlink, archive. Dumb, reliable, testable.
SKILL.md       = heavy judgment — complex reasoning, cross-project reuse. Smart, versioned.
Combo prompt   = light judgment — conditions, call order, state passing. Smart, inline.
```

Spring analogy: Skill = Controller, npm = Service, Starter = BOM. This only exists in ADR, not README.

### 3. Where is the Orchestrator?

**Source:** ADR-20260506103209293, wiki/2026-05-19-where-is-the-orchestrator-combo-prompt-as-lightweight-orchestrator-pattern.md

The orchestrator is not a component. It's distributed by weight across the three layers. No dedicated orchestrator npm needed. Combo prompt handles conditions ("if X then Y"), state passing, error recovery — in natural language.

Connection to entropy-check boundary: the tool should never tell the agent what to do. Sensor reports facts, agent judges.

### 4. Smart Agent, Dumb Tool

**Source:** wiki/2026-05-02-smart-agent-dumb-tools.md, wiki/2026-05-15-annotation-mindset.md

Agent: orchestrates, understands, decides. Handles ambiguity, recovers from errors.
CLI: pure functions, zero side effects. Deterministic input → deterministic output. No LLM calls, no state machines.

### 5. Deny-by-Default Governance

**Source:** README.md, README.zh.md

The defining feature. Undeclared skills are physically absent. No "disable" button — the skill doesn't exist in the agent's view. max_cards hard budget.

### 6. Cold Pool → Declaration → Working Set

**Source:** README.md, ADR-20260507021957847, wiki/cold-pool-evolutionary-rationale.md

Go module-style directory layout. K8s reconciliation model: declarative desired state ↔ filesystem actual state. No central registry, no auth server, no daemon.

### 7. Combo as Lightweight Orchestrator

**Source:** ADR-20260506103209293, ADR-20260424114401090

Combo evolved from "separate skill type" to "deck-level prompt." Doesn't count toward max_cards — it's metadata, not capability. Prompt is natural language: conditions, state passing, error recovery, parallel dispatch.

Evolution story: combo-as-skill → combo-as-prompt. This story only exists across two ADRs.

### 8. Intent/Plan/Execute (fractal)

**Source:** wiki/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md, wiki/2026-05-14-agent-driven-plan-first-architecture.md

Intent (DSL) → Plan (pure data) → Execute (injectable IO). Dry-run emerges naturally. Every package follows this. Every command follows this.

### 9. reproduce.sh — IoC Handoff

**Source:** ADR-20260518024500631, wiki/2026-05-17-shell-stdout-as-agent-prompt-injection.md

The most interesting emergent pattern. Shell handles deterministic scaffold. stdout echo acts as prompt-injection channel. Agent reads stdout, recognizes its role marker, takes over reasoning. Not pre-designed — discovered when a subagent spontaneously wrote echo as a prompt channel.

### 10. CQRS — Scribe/Onboarding Pair

**Source:** ADR-20260424113352614, ADR-20260517224131119

Scribe (write-side): records session state to daily handoff. Onboarding (read-side): three-layer loading restores context. No central "session manager" — the pair is the abstraction. Same pattern as combo prompt + agent reasoning.

### 11. POSSE — also_link_to

**Source:** ADR-20260517152850372, wiki/2026-05-05-multi-agent-posse-syndication.md

IndieWeb POSSE: Publish on your Own Site, Syndicate Elsewhere. Cold pool = own site. Working sets = syndication targets. also_link_to = additional syndication endpoints.

### 12. Task → Deck Mapping (meta-guidance)

**Source:** AGENTS.md lines 111-119, deck SKILL.md (new "Deck as Orchestrator" section)

What the agent should do when the user says "调研" / "扫一下" / "设计". Pre-built decks for common tasks. Deck-first: don't ask, dispatch.

### 13. Skill Types Reference

**Source:** README.md, ADR-20260501160000000

innate (eager), tool (lazy, default), transient (auto-expires), combo (meta-declaration, zero cost). Runtime behavior differences. Historical: implemented as TODO; all types currently behave identically.

### 14. Pre-built Deck Catalogue

**Source:** examples/decks/INDEX.md

18 decks organized by use case. Deep research, QA sweep, architecture explainer, documents, governance, scout, etc.

## Patterns NOT in README that should be on site

| Pattern | Present in README? | Where buried |
|---------|-------------------|-------------|
| Three-layer Spring analogy | No | ADR-20260423101938000 only |
| Orchestrator distribution | No | wiki/2026-05-19 only |
| Smart agent, dumb tool | No | wiki/2026-05-02 only |
| reproduce.sh IoC handoff | Yes (AGENTS.md) | ADR + wiki for depth |
| CQRS scribe/onboarding | No | ADR only |
| POSSE also_link_to | No | ADR only |
| Combo evolution story | No | 2 ADRs |
| Task→deck mapping | Yes (AGENTS.md) | Now also in deck SKILL.md |

## Next steps for site

1. Select site generator (VitePress evaluation)
2. Create one page per pattern above, prioritizing "buried" patterns
3. Each page: pull representative quotes from ADRs/wiki, add context, link to source
4. Landing page: Agent-First framing as the first paragraph
5. Deploy as static site alongside npm packages
