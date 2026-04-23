# lythoskill

> **Curate your AI agent skills into focused decks.**
>
> lythoskill turns a chaotic pile of skills into a declarative, version-controlled working set — so your agent knows exactly which tools to use, and which to ignore.

[![npm](https://img.shields.io/npm/v/@lythos/skill-deck)](https://www.npmjs.com/package/@lythos/skill-deck)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## The Problem

Your `.claude/skills/` is a zoo.

You installed 50+ skills from GitHub, skill hubs, and blog posts. Now every time the agent starts, it scans everything — descriptions fight for context space, similar skills silently conflict, and you have no idea which ones are actually helping.

**lythoskill fixes this at the filesystem level.**

---

## One-Minute Demo

```bash
# 1. Declare which skills this project needs
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 8

[tool]
skills = ["web-search", "docx", "design-doc-mermaid"]
EOF

# 2. Sync — only these skills become visible to the agent
bunx @lythos/skill-deck link

# 3. Agent sees a clean working set, nothing else
ls .claude/skills/
# web-search  docx  design-doc-mermaid
```

**Everything else stays in the cold pool** — stored, but invisible. Add or remove skills by editing `skill-deck.toml` and running `link` again.

---

## Why Deck Governance

| Without lythoskill | With lythoskill |
|---|---|
| Agent scans 50+ skills, picks randomly | Agent sees exactly what you declared |
| Similar skills silently conflict | `deny-by-default`: undeclared = invisible |
| No record of which skills were active | `skill-deck.lock` tracks every session's deck |
| Context window wasted on irrelevant descriptions | `max_cards` budget enforces focus |
| Skill overlap corrupts files undetected | `managed_dirs` overlap warnings |

---

## Curate from Anywhere

Your cold pool can grow without bound — hundreds or thousands of skills from skill hubs, GitHub repos, and your own creations. lythoskill curates the right subset for each project:

```
~/.agents/skill-repos/          # Cold pool: everything you ever collected
  ├── github-ops/
  ├── web-search/
  ├── docx/
  ├── design-doc-mermaid/
  └── ... (hundreds more)

skill-deck.toml                  # Declaration: this project uses these

.claude/skills/                  # Working set: symlinks, agent scans here
  ├── web-search -> ~/.agents/skill-repos/web-search
  ├── docx -> ~/.agents/skill-repos/docx
  └── design-doc-mermaid -> ~/.agents/skill-repos/design-doc-mermaid
```

Future: Connect to skill hubs and registries — curate from the entire ecosystem, not just your local disk.

---

## Also: Build Your Own Skills

lythoskill includes a scaffolding tool for authoring professional skills:

```bash
# Scaffold a skill with TypeScript, testing, and dependency management
bunx @lythos/skill-creator init my-skill

# Develop in packages/my-skill/src/ (full dev experience)
# Describe intent in packages/my-skill/skill/SKILL.md

# Build — generates thin SKILL.md + scripts for agents
bunx @lythos/skill-creator build my-skill
```

**Thin Skill Pattern**: Keep implementation heavy (TypeScript, npm deps, tests) while keeping the agent-facing surface minimal (SKILL.md + thin scripts). Full details in [cortex/wiki/01-patterns/thin-skill-pattern.md](cortex/wiki/01-patterns/thin-skill-pattern.md).

---

## Available Skills

| Skill | What it does |
|---|---|
| **lythoskill-deck** | Declarative skill deck governance (`link`, working set, deny-by-default) |
| **lythoskill-creator** | Scaffold and build thin-skill packages |
| **lythoskill-curator** | Index cold pool, discover combos, recommend decks |
| **lythoskill-arena** | Benchmark skill effectiveness with controlled-variable decks |
| **lythoskill-project-cortex** | GTD-style project governance (tasks, epics, ADRs, wiki) |
| **lythoskill-project-scribe** | Write project memory: handoffs, daily notes, pitfalls |
| **lythoskill-project-onboarding** | Read project memory with structured layer loading |

---

## Quick Reference

```bash
# Deck governance
bunx @lythos/skill-deck link                    # Sync toml -> working set
bunx @lythos/skill-deck link --deck ./my-deck.toml

# Skill scaffolding
bunx @lythos/skill-creator init my-project
bunx @lythos/skill-creator add-skill my-new-skill
bunx @lythos/skill-creator build my-skill

# Project governance
bunx @lythos/project-cortex task "Fix auth flow"
bunx @lythos/project-cortex list
bunx @lythos/project-cortex index

# Cold pool curation
bunx @lythos/skill-curator --recommend "Document a feature"
```

---

## Architecture

### Deck Governance Model

```
Cold Pool (storage)          Declaration (intent)         Working Set (runtime)
  ~/.agents/skill-repos/       skill-deck.toml              .claude/skills/
  ├── web-search/                [deck]                       ├── web-search ->
  ├── docx/                      max_cards = 8                ├── docx ->
  └── ... (unbounded)            [tool]                       └── design-doc-mermaid ->
                                   skills = ["web-search",
                                             "docx",
                                             "design-doc-mermaid"]
```

### Thin Skill Pattern

```
Starter (packages/<name>/)       → npm publish → implementation + CLI
Skill   (packages/<name>/skill/) → lythoskill build → SKILL.md + thin scripts
Output  (skills/<name>/)         → committed to Git → agent-visible skill
```

### Project Governance (Cortex)

```
cortex/
├── adr/        Architecture Decision Records
├── epics/      Requirement tracking
├── tasks/      Execution cards
└── wiki/       Reusable patterns
```

---

## Install

### Via skills.sh (Vercel)

```bash
npx skills add lythos-labs/lythoskill -g --all
```

### Via GitHub (skills branch — pure output, no build needed)

```bash
git clone -b skills https://github.com/lythos-labs/lythoskill.git ~/.claude/skills/lythoskill
```

### Via git clone (full repo with source)

```bash
git clone https://github.com/lythos-labs/lythoskill.git
```

---

## Development

```bash
# Direct execution (Bun runs TypeScript natively)
bun packages/lythoskill-deck/src/cli.ts link
bun packages/lythoskill-creator/src/cli.ts init my-test

# Run tests
bun packages/lythoskill-deck/test/runner.ts
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | **Bun** (native TypeScript) |
| Language | **TypeScript** |
| Module System | **ESM-only** (`"type": "module"`) |
| Package Manager | **pnpm** workspaces |
| External Deps | **Zero** for core |

---

## Project Documents

| Document | Purpose |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Guidance for Claude Code |
| [AGENTS.md](./AGENTS.md) | 中文版项目说明 |
| [cortex/INDEX.md](./cortex/INDEX.md) | Governance system entry |
| [skill-deck.toml](./skill-deck.toml) | This repo's active skill deck |
| [cortex/wiki/01-patterns/](./cortex/wiki/01-patterns/) | Reusable patterns and conventions |

---

## License

MIT
