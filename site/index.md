---
layout: home

hero:
  name: "lythoskill"
  text: "Declarative skill governance for AI agents"
  tagline: One file declares what's active. Undeclared skills are invisible. Like a gist for your agent's toolkit — share it, version it, switch it.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: How It Works
      link: /architecture

features:
  - title: Deck
    details: Declare your skills in one TOML file. Share it. Version it. Switch contexts with a single command.
    link: /architecture#deck-declarative-governance
  - title: Arena
    details: A/B test skills on real tasks. Zero-knowledge subagents, judge scores outputs. No faith required.
    link: /architecture#arena-empirical-validation
  - title: Curator
    details: "Scan cold pools, index metadata, query with SQL. Three-layer trust: description &gt; ecosystem &gt; your results."
    link: /architecture#curator-discovery-with-trust

---

## The Joy of Discovery

You find a skill on GitHub. Maybe it's `frontend-design` from [anthropics/skills](https://github.com/anthropics/skills) — drop it into your agent's skills directory and it's there. Maybe it's a TDD workflow from a colleague's gist. You try a prompt, and it works. You're delighted.

Then you find another. And another. Your collection grows — a PDF reader here, a research pipeline there, a document formatter from a colleague's repo. Each one works. Each one makes your agent smarter.

**This is good.** Collecting skills is not a problem to be solved. It's a behavior to be encouraged. The entire ecosystem — Anthropic's built-in installer, Vercel's `skills add`, the growing constellation of skill hubs — is converging on one insight: skills are valuable, so installation should be frictionless. Everyone is racing to make skill installation one-click. This is correct.

But frictionless installation accelerates the real bottleneck: **governance**. When you can install any skill with one command, the question shifts from "how do I get skills" to "how do I organize what I have."

## You Collect Skills. Now What?

Every collector hits the same organizational challenges. Here's what people do — and where each approach reaches its natural limit:

| Approach | Works until... |
|----------|---------------|
| **Global skills directory** — the most natural starting point. Drop skills into `.claude/skills/` (Claude Code) or `.agents/skills/` (community standard, 14+ agents). Install everything, let the agent see it all. | ...your collection grows beyond what fits comfortably in context. Different projects need different skills, but one directory holds only one state. |
| **`cp -R` per project** — when you start wanting to reuse, you naturally copy. Pick the skills you need, drop them into a project folder. | ...you want to share your setup with a teammate, or keep a skill updated across 10 projects. Manual copy works fine — until it doesn't. |
| **Shell scripts / `npx` installs** — you probably already do this. `npx skills add a && npx skills add b` thrown into a script. **You are already thinking like a deck.** You have declared what should be active; you just haven't formalized it into a file. | ...you want version control, team sharing, or the ability to switch contexts without editing scripts. A shell script is a deck waiting to be formalized. |
| **Plugin marketplaces** — curated, convenient, one-click. Lowering the barrier to installation is valuable work. | ...you find the perfect skill on GitHub but it's not listed in any marketplace. Most skills live in open repositories, not walled gardens. You need skills from wherever they happen to be. |

## A Gist for Your AI Toolkit

试试看？ A deck (`skill-deck.toml`) is a single file that declares exactly which skills are active — portable, shareable, reproducible.

::: code-group

```bash [Claude Code]
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
EOF

bunx @lythos/skill-deck@latest link
```

```bash [Codex]
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = ".agents/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
EOF

bunx @lythos/skill-deck@latest link
```

```bash [Cursor]
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = ".cursor/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
EOF

bunx @lythos/skill-deck@latest link
```

:::

That's it. Copy, paste, run. The `cold_pool` field tells the system where your skills live — a directory of git-cloned repos. The `working_set` field tells it where your agent looks. `bunx @lythos/skill-deck link` reconciles the working set to match the declaration exactly: undeclared skills are removed, declared skills are linked. The file is self-documenting — no external commentary needed to understand what it does.

Give this file to a teammate — same setup. Switch to a different deck for a different project — one command. No cleanup, no leftovers, no "I forgot I installed that."

## How It Works

You have two needs that default tools collapse into one directory: **storage** (a place to keep all skills you might use) and **selection** (which skills are active for *this* project). When one directory serves both, every skill you have ever collected loads into every session — context window fills, triggers conflict, behavior becomes unpredictable.

Lythoskill separates them:

- A **cold pool** is where skills live — a directory of git-cloned repos. Store everything. Nothing here is automatically active.
- A **deck** (`skill-deck.toml`) declares what is active. `bunx @lythos/skill-deck link` reconciles the **working set** (default `.claude/skills/`, configurable per platform) to match exactly — undeclared skills are removed.

```
Cold Pool                     Deck                      Working Set
(git repos)        ->    (skill-deck.toml)    ->    (.<agent>/skills/)
Store everything          Select what's active         Only what's declared
```

**Three pillars** operate on this foundation:

| Pillar | Question | How (via `bunx`) |
|--------|----------|------|
| **Deck** | What's active? | `bunx @lythos/skill-deck link` reconciles working set |
| **Arena** | Does it work? | `bunx @lythos/skill-arena vs` runs A/B tests with judge |
| **Curator** | What's out there? | `bunx @lythos/curator find` — your personal index of discovered skills |

[Full architecture ->](/architecture)

## Real Decks, Real Projects

These are working configurations from the [examples directory](https://github.com/lythos-labs/lythoskill/tree/main/examples/decks) — 22 decks and growing. Each one is a single file you can fetch and use immediately:

- **Engineering** — TDD + PRD + architecture diagrams for disciplined development
- **Design Studio** — frontend taste, theme factory, brand guidelines. Kills AI slop.
- **Deep Research** — structured pipeline: outline -> parallel deep agents -> report
- **Documents** — PDF and DOCX read/write with zero design overhead
- **Scout** — investigate a repo before deciding to adopt it

Each file is self-documenting: the header comment tells you what it's for, how to fetch it, and how to link it. No manual required. The deck is the documentation.

```bash
# Try one now:
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/engineering.toml > skill-deck.toml
bunx @lythos/skill-deck@latest link
```

[Browse all 22 example decks ->](https://github.com/lythos-labs/lythoskill/tree/main/examples/decks)

## Built by AI Agents

Agent-driven from day one. Every line — 13 packages, 600+ tests, all CLI tools — written by AI agents under human architecture and review. We dogfood our own governance: lythoskill's development uses lythoskill-deck to manage the skills that build lythoskill.

This is not a gimmick. It is proof that the governance model works: if agents could not reliably build and maintain this project using the very tools it provides, the tools would be broken. The human sets direction; the agents execute with guardrails.

## Validated by Agents, Not Just Ours

We validate documentation the same way — **zero-knowledge (ZK) subagents** verify that a fresh reader can follow every instruction. A ZK Kimi agent independently ran through the quick start — installed bun, created a deck, executed arena single-deck test with frontend-design, and performed 4 multi-deck switches. Clean install, clean results. No prior context, no hand-holding.

[Read the agent's handoff ->](https://rfdk364izj6ca.ok.kimi.link/)

> "deny-by-default 和防火墙默认拒绝策略一样——安全来自最小权限" — Kimi agent, 2026-05-20

## Start Here

1. **[Get Started](/guide/)** — A 6-level tour: from your first deck to governing skills at scale
2. **[Architecture](/architecture)** — Deck, Arena, Curator: the three pillars
3. **[Ecosystem](/ecosystem)** — The bigger picture: Web SEO replay, combo economy, ZK agents
4. **[Philosophy](/philosophy)** — Design decisions for people already using the tool

::: tip Beyond the Site
Deep technical content lives in [`cortex/wiki/`](https://github.com/lythos-labs/lythoskill/tree/main/cortex/wiki) — architecture decisions, patterns, lessons learned, and competitive analysis. The site is the narrative layer; the wiki is the reference layer.
:::
