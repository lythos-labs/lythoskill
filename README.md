# lythoskill

> **Govern your AI agent skills. Prevent skill ecosystem rot.**
>
> **Use this when:** you have 5+ skills, see conflicts, or want per-project skill control.  
> **Not when:** you have ≤3 skills and no conflicts — put them in `.claude/skills/` manually.

[![npm](https://img.shields.io/npm/v/@lythos/skill-deck)](https://www.npmjs.com/package/@lythos/skill-deck)
[![test](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml/badge.svg)](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/lythos-labs/lythoskill)
[中文](./README.zh.md)

**👤 Skill user?** → [Quick Start](#quick-start) — install Bun, run one command, done.  
**🤖 AI agent?** → [For Agents](#for-agents) — your 4-step checklist.  
**🛠️ Developer?** → [Development](#development) — clone, install, contribute.

---

## The Problem

When two conflicting skills are both visible to your agent, outputs become unpredictable. **lythoskill-deck** solves this with **deny-by-default**: undeclared skills are **physically absent** from `.claude/skills/`. Not "disabled". Not "deprioritized". **Gone.**

```toml
[tool]
skills = ["github.com/owner/repo"]
```

Run `deck link` → only declared skills are visible. No silent blend. No chaos.

---

## Do I need this?

Governance is only useful when complexity reaches a threshold.

| Skills | State | Action |
|--------|-------|--------|
| 0–3, no conflicts | Simple | Don't use lythoskill. Put them in `.claude/skills/` manually. |
| 5–10, some conflicts | Growing | **Install lythoskill-deck** — declare which skills this project needs. |
| 10+, you author skills | Ecosystem | Use **deck + creator** — thin-skill pattern for maintainable skills. |

<details>
<summary>Detailed decision tree (click to expand)</summary>

```
10+, and you author your own skills
├─ Simple skills (SKILL.md + light bash)
│   → Deck governance only
└─ Complex skills (dependencies, tests, types, multi-skill teamwork)
    → Deck + Thin Skill Pattern (full lythoskill)

Managing a skill ecosystem across teams/projects/sources
→ Full lythoskill (deck + creator + curator + arena)
```

**You do NOT need lythoskill if:**
- You have ≤3 skills that never conflict
- Your skill set never changes across projects
- Your skills are pure SKILL.md files with no build step
- You are a solo developer with one skill and no release cycle
</details>

---

## Quick Start

> 💡 **Just cloned this repo?** Jump to the [Development](#development) section for contributor setup.

**Prerequisite — Bun runtime** (needed for `bunx`):
```bash
# Install Bun (one-time, macOS/Linux/WSL)
curl -fsSL https://bun.sh/install | bash
# Windows: powershell -c "irm bun.sh/install.ps1 | iex"
```
After install, restart your shell or run `source ~/.bashrc`.

> **This tool requires Bun, not Node.** `bunx` is the correct runner. `npx` will fail unless Bun is also installed — the package shebang calls `env bun`. If you only have Node/npm, install Bun first.

```bash
# 1. Add a skill (downloads to cold pool + updates deck + links)
#    Replace <owner>/<repo> with a real skill you want to use
bunx @lythos/skill-deck add <owner>/<repo>

# 2. Agent sees the skill. Everything else is physically absent.
ls .claude/skills/
```

That's it. `deck add` clones the repo to your [cold pool](#cold-pool-convention), appends the skill to `skill-deck.toml`, and runs `link`.

For monorepo skills (multiple skills in one repo), include the full path:

```bash
# Monorepo: specify the skill path inside the repo
bunx @lythos/skill-deck add github.com/owner/repo/skills/my-skill

# Alternative: Vercel skills.sh
bunx @lythos/skill-deck add owner/repo --via skills.sh

# Alternative: manual clone
git clone https://github.com/owner/repo.git \
  ~/.agents/skill-repos/github.com/owner/repo
# then edit skill-deck.toml and run `deck link`
```

### Naming cheat sheet

```
lythoskill           ← the project / ecosystem
skill-deck.toml      ← the config file you edit
@lythos/skill-deck   ← the npm package you install
deck                 ← the CLI command (short for lythoskill-deck)
link                 ← the subcommand that syncs working set to toml
```

### For Agents

If you are an AI agent reading this:
1. Check `bun --version` — if missing, install Bun first (see Quick Start above)
2. Run `bunx @lythos/skill-deck add <owner>/<repo>` to add a skill
3. Run `bunx @lythos/skill-deck link` to sync the working set
4. Skills are now in `.claude/skills/` — read them and follow their instructions

---

## Two Value Propositions

lythoskill serves two distinct audiences. You can use either independently.

### Deck Governance — For Every Skill User

**The problem**: Your `.claude/skills/` is a zoo. 50+ skills from GitHub, skill hubs, and blog posts. Every time the agent starts, it scans everything — descriptions fight for context space, similar skills silently conflict, and you have no idea which ones are actually helping.

**The solution**: Declare which skills this project needs. Everything else disappears.

| Without deck governance | With deck governance |
|---|---|
| Agent scans 50+ skills, picks randomly | Agent sees exactly what you declared |
| Similar skills silently conflict | `deny-by-default`: undeclared = invisible |
| Context window wasted on irrelevant descriptions | `max_cards` budget enforces focus |

**Multi-role decks**: A curator agent sees only curator skills. An arena agent sees only arena skills. A scribe agent sees only scribe skills. Each agent gets a tailored deck — no cross-contamination, no bloated context.

**Key principle**: lythoskill-deck is a declarative package manager *and* a governor. `deck add` downloads skills from GitHub/skills.sh into your cold pool, appends them to `skill-deck.toml`, and runs `link` — all in one shot. `deck link` then reconciles the working set so only declared skills are visible. You get both dependency management (like Maven) and runtime governance (like Kubernetes RBAC).

**Declarative sync, like Kubernetes**: `deck link` doesn't just "create links" — it makes the working set match your `skill-deck.toml`. If you remove a skill from the toml and run `link` again, it disappears from `.claude/skills/`. No `unlink` command needed — just change the declaration and re-sync.

For example, to start using a new skill manually:

```bash
# 1. Clone the skill repo to your cold pool (one-time setup)
git clone https://github.com/lythos-labs/lythoskill.git \
  ~/.agents/skill-repos/github.com/lythos-labs/lythoskill

# 2. Create skill-deck.toml — copy this exact block:
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10

[tool]
skills = ["github.com/lythos-labs/lythoskill/skills/lythoskill-deck"]
EOF

# 3. Sync — deck reconciles working set with declaration
bunx @lythos/skill-deck link
# or: npx @lythos/skill-deck link
```

Or use `deck add` to automate steps 1–3 in one command. You can also use `skills.sh`, `bunx`, or any other method — deck doesn't care how skills got into the cold pool, only which ones are active.

### Thin Skill Pattern — For Skill Ecosystem Developers

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

## Real-World Example: Deck-Governed Next.js Project

Here's how a subagent works under deck governance in practice.

**Scenario**: Initialize a Next.js project, let the agent discover skills in the cold pool, assemble its own deck, and complete a development task.

```bash
# 1. Initialize the project
npx create-next-app@latest my-app --default --use-bun
cd my-app

# 2. Clone community skills to the cold pool (one-time global setup)
git clone https://github.com/anthropics/skills.git \
  ~/.agents/skill-repos/github.com/anthropics/skills

git clone https://github.com/vercel-labs/agent-skills.git \
  ~/.agents/skill-repos/github.com/vercel-labs/agent-skills

# 3. Agent self-assembles the deck by reading SKILL.md files
#    and deciding which skills the project needs.
#    Example result (agent's own decision):
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate]
skills = [
  "github.com/lythos-labs/lythoskill/skills/lythoskill-deck",
  "github.com/lythos-labs/lythoskill/skills/lythoskill-project-cortex",
  "github.com/lythos-labs/lythoskill/skills/lythoskill-project-onboarding",
  "github.com/lythos-labs/lythoskill/skills/lythoskill-project-scribe",
]

[tool]
skills = [
  "github.com/anthropics/skills/skills/pdf",
  "github.com/anthropics/skills/skills/docx",
  "github.com/mattpocock/skills/skills/engineering/to-prd",
  "github.com/mattpocock/skills/skills/engineering/tdd",
  "github.com/garrytan/gstack",
  "github.com/SpillwaveSolutions/design-doc-mermaid",
]
EOF

# 4. Sync the deck
bunx @lythos/skill-deck link
```

**What the agent does**:
1. Reads every SKILL.md in `.claude/skills/` to understand capability boundaries
2. Creates a task via `bunx @lythos/project-cortex task "Build Todo List page"`
3. Absorbs best practices from multiple skills while coding:
   - **react-best-practices** → `useReducer`, `React.memo`, `useCallback`
   - **frontend-design** → zinc palette, `rounded-2xl`, dark mode
   - **composition-patterns** → Context Provider + barrel exports
   - **webapp-testing** → Playwright, accessibility checks
4. Records a session handoff to `daily/YYYY-MM-DD.md` when done

**Outcome**: The agent does not code blindly. It reads skills first, follows governance workflow, and blends best practices from multiple skills into the codebase — all autonomously, without human micromanagement.

---

## Arena: Skill Comparison

Not sure which skill to use? Arena runs the same task under different skill configurations and scores the results. No guesswork.

| Question | How to test |
|---|---|
| A or B? | `--skills "A,B"` — single-skill comparison |
| Does C improve my deck? | `--decks "v1.toml,v1+C.toml"` — full deck comparison |
| Is D dead weight? | `--decks "v1.toml,v1-D.toml"` — full deck comparison |

**Multi-dimensional scoring**: The judge outputs scores across quality, token efficiency, and maintainability. No single "winner" — you choose based on what you value.

See [SKILL.md](skills/lythoskill-arena/SKILL.md) for full arena workflow documentation.

---

## Cold Pool Convention

Your cold pool is where skills live when they are **not** active. It can grow without bound.

lythoskill uses a **Go module-style directory structure** for the cold pool, with natural `owner/repo` traceability:

```
~/.agents/skill-repos/              ← Global cold pool (recommended default)
├── github.com/
│   ├── lythos-labs/
│   │   └── lythoskill/             ← git clone https://github.com/lythos-labs/lythoskill.git
│   │       └── skills/
│   │           ├── lythoskill-deck/
│   │           └── lythoskill-creator/
│   ├── vercel-labs/
│   │   └── agent-skills/           ← git clone https://github.com/vercel-labs/agent-skills.git
│   │       └── skills/
│   │           ├── react-best-practices/
│   │           └── composition-patterns/
│   └── someone/
│       └── standalone-skill/       ← Non-monorepo: repo root = skill
│           └── SKILL.md
└── localhost/                      ← Local skills without remote origin
    └── my-experiment/
        └── SKILL.md
```

**Why `~/.agents/skill-repos` is recommended**:
- It is **global** — all projects share one cold pool; skills are downloaded once
- It is **structured** — `github.com/<owner>/<repo>` provides source traceability and prevents name collisions
- It is **extensible** — supports GitHub, GitLab, self-hosted, and local experiments; the path *is* the provenance

**Adding skills to the cold pool** — this is a one-time setup per skill source. You can do it manually, or ask your agent to run it:

```bash
# Install any skill repo into the cold pool
git clone https://github.com/<owner>/<repo>.git \
  ~/.agents/skill-repos/github.com/<owner>/<repo>

# Real examples:
git clone https://github.com/lythos-labs/lythoskill.git \
  ~/.agents/skill-repos/github.com/lythos-labs/lythoskill

git clone https://github.com/garrytan/gstack.git \
  ~/.agents/skill-repos/github.com/garrytan/gstack
```

After that, declare the skill in your project's `skill-deck.toml` and run `deck link`. Deck takes over from there.

**Why this structure**: Global uniqueness (`github.com/lythos-labs/lythoskill/lythoskill-deck` vs `github.com/anthropic/lythoskill-deck`), source traceability, and natural multi-host support (GitHub, GitLab, self-hosted).

**Path resolution in skill-deck.toml**:
- Short name `lythoskill-deck` → deck recursively scans the cold pool for a matching directory name
- Qualified name `github.com/lythos-labs/lythoskill/lythoskill-deck` → direct lookup, avoids name collisions
- Monorepo sub-skill `owner/repo/skills/skill-name` → `skills/` subdirectory is automatically recognized

**Local development**: Set `cold_pool = "."` in your `skill-deck.toml`. Your project root becomes a cold pool entry, and `./skills/` is scanned just like `~/.agents/skill-repos/github.com/.../skills/`.

---

## Ecosystem Tools

| Tool | npm | Focus | What it does |
|---|---|---|---|
| **lythoskill-deck** | [`@lythos/skill-deck`](https://www.npmjs.com/package/@lythos/skill-deck) | Governance | Declarative skill deck governance (`link`, deny-by-default, max_cards) |
| **lythoskill-creator** | [`@lythos/skill-creator`](https://www.npmjs.com/package/@lythos/skill-creator) | Pattern | Scaffold and build thin-skill packages |
| **lythoskill-curator** | [`@lythos/skill-curator`](https://www.npmjs.com/package/@lythos/skill-curator) | Governance | Index cold pool, output REGISTRY.json + catalog.db for agent reasoning |
| **lythoskill-arena** | [`@lythos/skill-arena`](https://www.npmjs.com/package/@lythos/skill-arena) | Governance | Benchmark skill/deck effectiveness with controlled-variable comparisons |
| **lythoskill-project-cortex** | [`@lythos/project-cortex`](https://www.npmjs.com/package/@lythos/project-cortex) | Both | GTD-style project governance (tasks, epics, ADRs, wiki) |
| **lythoskill-project-scribe** | — | Both | Write project memory: handoffs, daily notes, pitfalls |
| **lythoskill-project-onboarding** | — | Both | Read project memory with structured layer loading |
| **lythoskill-red-green-release** | — | Both | Heredoc migration patch workflow: plan → patch → user approval → git tag |

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

### Governance Layer Positioning

```
Agent Platforms (Claude Code, Kimi, Codex)
        ↑  ← define SKILL.md standard
   .claude/skills/  ← working set (deck manages)
        ↑
  lythoskill-deck  ← declarative governance (governance layer)
        ↑
  skill-deck.toml  ← human declares desired state
        ↑
   Cold Pool       ← user fills (git clone, skills.sh, etc.)
        ↑
Skill Sources (GitHub, Vercel, npm, internal repos)
```

lythoskill sits **between** skill sources and agent platforms — it does not replace either. It prevents the mess that naturally accumulates when skills grow from 10 to 100+.

**Analogy**: If you're familiar with Java/Maven, the mental model is similar:
- `skill-deck.toml` ≈ `pom.xml` — declares what you need
- `deck add` ≈ `mvn dependency:get` — downloads to local storage
- cold pool ≈ `~/.m2/repository` — local cache of everything you've downloaded
- `deck link` ≈ making dependencies available to the project — but with symlinks, not copies
- `.claude/skills/` ≈ project's classpath — only what's declared is visible

---

## Quick Reference

```bash
# Deck governance (bunx only — requires Bun runtime)
bunx @lythos/skill-deck link                       # Sync toml -> working set
bunx @lythos/skill-deck add owner/repo             # Download skill + add to deck
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

# Arena single-skill comparison
bunx @lythos/skill-arena \
  --task "Generate auth flow" \
  --skills "design-doc-mermaid,mermaid-tools"

# Arena full deck comparison
bunx @lythos/skill-arena \
  --task "Generate auth flow" \
  --decks "./decks/minimal.toml,./decks/rich.toml" \
  --criteria "quality,token,maintainability"
```

---

## Development

> For contributors and developers working **inside this repo**.

**Prerequisites:** Bun ≥1.0.

```bash
# Install Bun (if missing)
curl -fsSL https://bun.sh/install | bash

# 1. Install workspace dependencies
bun install

# 2. Sync the local skill deck
bun packages/lythoskill-deck/src/cli.ts link

# 3. Verify environment
bun packages/lythoskill-project-cortex/src/cli.ts stats

# Run all BDD scenarios (cortex + deck)
bun run test:all
```

All set? See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for commit conventions and PR workflow.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | **Bun** (native TypeScript) |
| Language | **TypeScript** |
| Module System | **ESM-only** (`"type": "module"`) |
| Package Manager | **Bun** workspaces |
| External Deps | **Skill layer**: zero-install via `bunx` (Bun runtime required). **Starter layer**: npm deps as needed |

---

## Project Documents

| Document | Purpose |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Guidance for Claude Code |
| [AGENTS.md](./AGENTS.md) | Project guidance for Codex, Kimi, Copilot, Gemini |
| [cortex/INDEX.md](./cortex/INDEX.md) | Governance system entry |
| [cortex/adr/](./cortex/adr/) | Architecture Decision Records |
| [skill-deck.toml](./skill-deck.toml) | This repo's active skill deck |
| [cortex/wiki/01-patterns/](./cortex/wiki/01-patterns/) | Reusable patterns and conventions |

---

## License

MIT
