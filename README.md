# lythoskill

> **Govern your AI agent skills. Prevent skill ecosystem rot.**
>
> lythoskill is an anti-corruption layer for the agent skill ecosystem. It does not define skill standards — it provides governance infrastructure on top of existing standards, so your agent stays focused and conflict-free as your skill collection grows from 10 to 100+.

[![npm](https://img.shields.io/npm/v/@lythos/skill-deck)](https://www.npmjs.com/package/@lythos/skill-deck)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Two Value Propositions

lythoskill serves two distinct audiences. You can use either layer independently.

### Layer A: Deck Governance — For Every Skill User

You have 50+ skills. Your agent scans all of them, descriptions fight for context space, similar skills silently conflict, and you have no idea which ones are actually helping.

**lythoskill-deck fixes this at the filesystem level** with a Kubernetes-inspired declarative model:

```bash
# 1. Declare which skills this project needs
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 8

[tool]
skills = ["web-search", "project-scribe", "design-doc-mermaid"]
EOF

# 2. Sync — only declared skills become visible to the agent
bunx @lythos/skill-deck link

# 3. Agent sees a clean working set. Everything else is physically absent.
ls .claude/skills/
# web-search  project-scribe  design-doc-mermaid
```

| Without deck governance | With deck governance |
|---|---|
| Agent scans 50+ skills, picks randomly | Agent sees exactly what you declared |
| Similar skills silently conflict | `deny-by-default`: undeclared = invisible |
| No record of which skills were active | `skill-deck.lock` tracks every session's deck |
| Context window wasted on irrelevant descriptions | `max_cards` budget enforces focus |
| Skill overlap corrupts files undetected | `managed_dirs` overlap warnings |

**Key principle**: lythoskill-deck does not download skills. It governs skills that already exist in your [cold pool](#cold-pool-convention). Filling the cold pool is your job (git clone, Vercel skills.sh, manual copy — whatever you prefer).

### Layer B: Thin Skill Pattern — For Skill Ecosystem Developers

You are building a team-internal skill library or a public skill ecosystem. You need version control, CI, testing, and a clean separation between "development experience" and "agent-facing surface."

**lythoskill-creator provides the scaffolding**:

```bash
# Scaffold a skill with TypeScript, testing, and dependency management
bunx @lythos/skill-creator init my-skill
cd my-skill

# Develop in packages/my-skill/src/ (full dev experience: TypeScript, tests, npm deps)
# Describe intent in packages/my-skill/skill/SKILL.md (agent reads this)

# Build — generates thin output: SKILL.md + thin scripts for agents
bunx @lythos/skill-creator build my-skill
```

**The Three-Layer Separation**:

```
Starter (packages/<name>/)       → npm publish → implementation + CLI entry
Skill   (packages/<name>/skill/) → lythoskill build → SKILL.md + thin scripts
Output  (skills/<name>/)         → committed to Git → agent-visible skill
```

- **Starter**: Heavy logic, dependencies, CLI. Agents do not read this.
- **Skill**: Intent description + thin routers. `bunx @lythos/<package> <command>`.
- **Output**: Built artifact committed to Git. Platforms (Vercel, GitHub) consume directly.

Full pattern documentation: [cortex/wiki/01-patterns/thin-skill-pattern.md](./cortex/wiki/01-patterns/thin-skill-pattern.md)

---

## Cold Pool Convention

Your cold pool is where skills live when they are **not** active. It can grow without bound.

lythoskill uses a **Go module-style directory structure** for the cold pool:

```
~/.agents/skill-repos/              ← Global cold pool
├── github.com/
│   ├── lythos-labs/
│   │   └── lythoskill/             ← git clone https://github.com/lythos-labs/lythoskill.git
│   │       └── skills/
│   │           ├── lythoskill-deck/
│   │           └── lythoskill-creator/
│   ├── PrimeRadiant/
│   │   └── superpowers/
│   │       └── skills/
│   │           └── writing-plans/
│   └── someone/
│       └── standalone-skill/       ← Non-monorepo: repo root = skill
│           └── SKILL.md
└── localhost/                      ← Local skills without remote origin
    └── my-experiment/
        └── SKILL.md
```

**Why this structure**: Global uniqueness (`github.com/lythos-labs/lythoskill/lythoskill-deck` vs `github.com/anthropic/lythoskill-deck`), source traceability, and natural multi-host support (GitHub, GitLab, self-hosted).

**Local development**: Set `cold_pool = "."` in your `skill-deck.toml`. Your project root becomes a cold pool entry, and `./skills/` is scanned just like `~/.agents/skill-repos/github.com/.../skills/`.

---

## Ecosystem Tools

| Tool | Layer | What it does |
|---|---|---|
| **lythoskill-deck** | A | Declarative skill deck governance (`link`, deny-by-default, max_cards) |
| **lythoskill-creator** | B | Scaffold and build thin-skill packages |
| **lythoskill-curator** | A | Index cold pool, output REGISTRY.json + catalog.db for agent reasoning |
| **lythoskill-arena** | A | Benchmark skill effectiveness with controlled-variable decks |
| **lythoskill-project-cortex** | Both | GTD-style project governance (tasks, epics, ADRs, wiki) |
| **lythoskill-project-scribe** | Both | Write project memory: handoffs, daily notes, pitfalls |
| **lythoskill-project-onboarding** | Both | Read project memory with structured layer loading |

---

## Architecture

### Deck Governance Model

```
Cold Pool (storage)          Declaration (intent)         Working Set (runtime)
  ~/.agents/skill-repos/       skill-deck.toml              .claude/skills/
  ├── github.com/.../            [deck]                       ├── web-search ->
  └── localhost/.../             max_cards = 8                ├── docx ->
                                 [tool]                       └── design-doc-mermaid ->
                                   skills = ["web-search",
                                             "docx",
                                             "design-doc-mermaid"]
```

### Anti-Corruption Layer Positioning

```
Agent Platforms (Claude Code, Kimi, Codex)
        ↑  ← 定义 SKILL.md 标准
   .claude/skills/  ← 工作集（deck 管理）
        ↑
  lythoskill-deck  ← 声明式治理（防腐层）
        ↑
  skill-deck.toml  ← 人类声明期望状态
        ↑
   Cold Pool       ← 用户自行填充（git clone, skills.sh, etc.）
        ↑
Skill Sources (GitHub, Vercel, npm, internal repos)
```

lythoskill sits **between** skill sources and agent platforms — it does not replace either. It prevents the mess that naturally accumulates when skills grow from 10 to 100+.

---

## Quick Reference

```bash
# Deck governance
bunx @lythos/skill-deck link                    # Sync toml -> working set
bunx @lythos/skill-deck link --deck ./my-deck.toml

# Skill scaffolding
bunx @lythos/skill-creator init my-project
bunx @lythos/skill-creator build my-skill

# Project governance
bunx @lythos/project-cortex task "Fix auth flow"
bunx @lythos/project-cortex list
bunx @lythos/project-cortex index

# Cold pool curation
bunx @lythos/skill-curator ~/.agents/skill-repos
# → outputs ~/.agents/lythos/skill-curator/REGISTRY.json + catalog.db
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
| External Deps | **Zero** for core packages |

---

## Project Documents

| Document | Purpose |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Guidance for Claude Code |
| [AGENTS.md](./AGENTS.md) | 中文版项目说明 |
| [cortex/INDEX.md](./cortex/INDEX.md) | Governance system entry |
| [cortex/adr/](./cortex/adr/) | Architecture Decision Records |
| [skill-deck.toml](./skill-deck.toml) | This repo's active skill deck |
| [cortex/wiki/01-patterns/](./cortex/wiki/01-patterns/) | Reusable patterns and conventions |

---

## License

MIT
