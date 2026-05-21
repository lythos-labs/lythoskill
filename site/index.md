---
layout: home

hero:
  name: "lythoskill"
  text: "A shareable, reproducible skill collection"
  tagline: Like a gist for your AI agent's toolkit. One file, one command, works across projects and teams.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: How It Works
      link: /architecture

features:
  - icon: 🃏
    title: Deck
    details: Declare your skills in one TOML file. Share it. Version it. Switch contexts with a single command.
    link: /architecture#deck-declarative-governance
  - icon: ⚔️
    title: Arena
    details: A/B test skills on real tasks. Zero-knowledge subagents, judge scores outputs. No faith required.
    link: /architecture#arena-empirical-validation
  - icon: 📚
    title: Curator
    details: "Scan cold pools, index metadata, query with SQL. Three-layer trust: description &gt; ecosystem &gt; your results."
    link: /architecture#curator-discovery-with-trust
  - icon: 🔗
    title: Combos
    details: Compose skills into pipelines with [combo.&lt;name&gt;]. Prompt orchestrates, agent executes. No new code.
    link: /architecture#combo-epistemology

---

## You Collect Skills. Now What?

You have skills. Maybe from GitHub, from Superpowers, from a colleague's repo. You need different sets for different projects, want to share setups with your team, and need to know which ones actually work.

Here is what people do today — and where each approach breaks down:

| Approach | Works until... |
|----------|---------------|
| **Global `~/.claude/skills/`** — install everything, let the agent see all of it | ...context window overflows, triggers conflict, behavior becomes unpredictable |
| **`cp -R` per project** — copy skills into each project manually | ...you have 10 projects and 20 skills. Keeping them in sync is a part-time job. |
| **Shell scripts / `npx` installs** — script your way out of it | ...you need to share, version, or reproduce a setup. Scripts rot; decks do not. |
| **Plugin marketplaces** — use one vendor's curated set | ...you need skills from multiple sources. Marketplaces are walled gardens. |

**Deck is the answer.** A deck (`skill-deck.toml`) is a single file that declares exactly which skills are active — portable, shareable, reproducible. Think of it as a gist for your AI agent's toolkit.

```toml
# skill-deck.toml — share it, version it, reproduce it
[deck]
max_cards = 10

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
```

Run `deck link`. Your working set matches the declaration exactly. Give this file to a teammate — same setup. Switch to a different deck for a different project — one command. No cleanup, no leftovers, no "I forgot I installed that."

## How It Works

You have two needs that default tools collapse into one directory: **storage** (a place to keep all skills you might use) and **selection** (which skills are active for *this* project). When one directory serves both, every skill you have ever collected loads into every session — context window fills, triggers conflict, behavior becomes unpredictable.

Lythoskill separates them:

- A **cold pool** is where skills live — a directory of git-cloned repos. Store everything. Nothing here is automatically active.
- A **deck** (`skill-deck.toml`) declares what is active. `deck link` reconciles the **working set** (`.claude/skills/`) to match exactly — undeclared skills are removed.

```
Cold Pool                     Deck                      Working Set
(git repos)        →    (skill-deck.toml)    →    (.claude/skills/)
Store everything          Select what's active         Only what's declared
```

**Three pillars** operate on this foundation:

| Pillar | Question | Tool |
|--------|----------|------|
| **Deck** | What's active? | `deck link` reconciles working set |
| **Arena** | Does it work? | `arena vs` runs A/B tests with judge |
| **Curator** | What's out there? | `curator find` queries indexed cold pools |

[Full architecture →](/architecture)

## Built by AI Agents

Zero human-written code. Every line — 13 packages, 600+ tests, all CLI tools, all SKILL.md files — produced by AI agents under human direction. We dogfood our own governance: lythoskill's development uses lythoskill-deck to manage the skills that build lythoskill.

This is not a gimmick. It is proof that the governance model works: if agents could not reliably build and maintain this project using the very tools it provides, the tools would be broken.

## Validated by Agents, Not Just Ours

A zero-knowledge Kimi agent independently ran through the quick start — installed bun, created a deck, executed arena single-deck test with frontend-design, and performed 4 multi-deck switches. Clean install, clean results. No prior context, no hand-holding.

[Read the agent's handoff →](https://rfdk364izj6ca.ok.kimi.link/)

> "deny-by-default 和防火墙默认拒绝策略一样——安全来自最小权限" — Kimi agent, 2026-05-20

## Start Here

1. **[Get Started](/guide/)** — A 6-level tour: from your first deck to governing skills at scale
2. **[Architecture](/architecture)** — Deck, Arena, Curator: the three pillars
3. **[Ecosystem](/ecosystem)** — The bigger picture: Web SEO replay, combo economy, ZK agents
4. **[Philosophy](/philosophy)** — Design decisions for people already using the tool

::: tip Beyond the Site
Deep technical content lives in [`cortex/wiki/`](https://github.com/lythos-labs/lythoskill/tree/main/cortex/wiki) — architecture decisions, patterns, lessons learned, and competitive analysis. The site is the narrative layer; the wiki is the reference layer.
:::
