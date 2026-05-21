---
layout: home

hero:
  name: "lythoskill"
  text: "Skill governance, not a skill collection"
  tagline: Declarative deck management · Arena validation · Curator discovery · K8s-style reconciliation
  actions:
    - theme: brand
      text: Read the Philosophy
      link: /philosophy
    - theme: alt
      text: In Action Guide
      link: /guide/

features:
  - icon: 🃏
    title: Deck Governance
    details: Declare which skills your project uses. Undeclared = physically absent. Deny-by-default.
    link: /architecture#deck-declarative-governance
  - icon: ⚔️
    title: Arena Validation
    details: A/B test skills on real tasks. Zero-knowledge subagents, judge scores outputs. No faith required.
    link: /architecture#arena-empirical-validation
  - icon: 📚
    title: Curator Discovery
    details: "Scan cold pools, index metadata, query with SQL. Three-layer trust: description &gt; ecosystem &gt; your results."
    link: /architecture#curator-discovery-with-trust
  - icon: 🔗
    title: Pipeline Combos
    details: Compose skills into workflows with [combo.&lt;name&gt;]. Prompt orchestrates, agent executes. No new code.
    link: /architecture#combo-epistemology

---

## The Problem

You install skills from GitHub. Then from Superpowers. Then a few manual `cp -R`. Your working set grows to 50+ skills. Some are symlinks from old tooling, some are broken, some silently conflict. **Your agent sees everything** — and behaves inconsistently because nobody governs what's active.

[Why governance beats installation →](/philosophy)

## How Lythoskill Works

A **cold pool** is a directory of skill repos — git-cloned, filesystem-native. A **deck** is a `skill-deck.toml` that declares which skills are active. `deck link` reconciles the **working set** to match exactly — undeclared skills are removed.

```
Cold Pool                     Deck                      Working Set
(git repos)        →    (skill-deck.toml)    →    (.claude/skills/)
Everything exists        Selects what's active        Only what's declared
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

This isn't a gimmick. It's proof that the governance model works: if agents couldn't reliably build and maintain this project using the very tools it provides, the tools would be broken.

## Validated by Agents, Not Just Ours

A zero-knowledge Kimi agent independently ran through the quick start — installed bun, created a deck, executed arena single-deck test with frontend-design, and performed 4 multi-deck switches. Clean install, clean results. No prior context, no hand-holding.

[Read the agent's handoff →](https://rfdk364izj6ca.ok.kimi.link/)

> "deny-by-default 和防火墙默认拒绝策略一样——安全来自最小权限" — Kimi agent, 2026-05-20

## Start Here

1. **[Philosophy](/philosophy)** — Why declarative governance exists
2. **[Architecture](/architecture)** — Deck, Arena, Curator: the three pillars
3. **[In Action Guide](/guide/)** — 6-level tour from chaos to governance
4. **[Ecosystem](/ecosystem)** — The bigger picture: Web SEO replay, combo economy, ZK agents

::: tip Beyond the Site
Deep technical content lives in [`cortex/wiki/`](https://github.com/lythos-labs/lythoskill/tree/main/cortex/wiki) — architecture decisions, patterns, lessons learned, and competitive analysis. The site is the narrative layer; the wiki is the reference layer.
:::
