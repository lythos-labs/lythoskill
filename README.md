# lythoskill

> **Govern your AI agent skills. Prevent skill ecosystem rot.**
>
> lythoskill is a governance layer for the agent skill ecosystem. It does not define skill standards — it provides governance infrastructure on top of existing standards, so your agent stays focused and conflict-free as your skill collection grows from 10 to 100+.

[![npm](https://img.shields.io/npm/v/@lythos/skill-deck)](https://www.npmjs.com/package/@lythos/skill-deck)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## The Silent Blend Problem

You installed **gstack** for project management and **superpowers** for writing workflows. Both are high-assertiveness skills — they define *how* work should be done. They don't just help you write code; they impose a workflow, a style, a philosophy.

You put both in `.claude/skills/`. The agent sees both. It doesn't crash, it doesn't complain. But half your tasks run with gstack rules and half with superpowers rules. Outputs are unpredictable. Bugs are silent.

**This is the silent blend** — the worst kind of failure mode in skill ecosystems. It happens when two skills that *must* be mutually exclusive are both visible to the agent.

lythoskill-deck solves this with **deny-by-default**: undeclared skills are physically absent from `.claude/skills/`. Not "disabled". Not "deprioritized". **Gone.** The agent cannot see, consider, or be confused by them.

```toml
# Project A: only gstack
[tool]
skills = ["gstack"]

# Project B: only superpowers
[tool]
skills = ["superpowers"]
```

Run `deck link` → each project sees exactly one "how". No silent blend. No chaos.

---

## Do I need this?

Governance is only useful when complexity reaches a threshold. Before that, it is unnecessary abstraction.

```
How many skills do you have?
│
├─ 0–3, no conflicts
│   → You don't need lythoskill. Put them in .claude/skills/ manually.
│
├─ 5–10, starting to see conflicts or choice paralysis
│   → You need deck governance only. Install lythoskill-deck.
│
├─ 10+, and you author your own skills
│   ├─ Simple skills (SKILL.md + light bash)
│   │   → Deck governance only
│   └─ Complex skills (dependencies, tests, types, multi-skill teamwork)
│       → Deck + Thin Skill Pattern (full lythoskill)
│
└─ Managing a skill ecosystem across teams/projects/sources
    → Full lythoskill (deck + creator + curator + arena)
```

**You do NOT need lythoskill if:**
- You have ≤3 skills that never conflict
- Your skill set never changes across projects
- Your skills are pure SKILL.md files with no build step
- You are a solo developer with one skill and no release cycle

---

## Quick Start

Zero install — works with `npx` or `bunx`:

```bash
# 1. Declare which skills this project needs
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 8

[tool]
skills = ["web-search", "project-scribe", "design-doc-mermaid"]
EOF

# 2. Sync — only these skills become visible to the agent
npx @lythos/skill-deck link
# or: bunx @lythos/skill-deck link

# 3. Agent sees a clean working set. Everything else is physically absent.
ls .claude/skills/
# web-search  project-scribe  design-doc-mermaid
```

That's it. No daemon, no background process. Just a TOML file and a symlink command.

To add a new skill, clone it to your [cold pool](#cold-pool-convention) (one-time per source), add its name to `skill-deck.toml`, and run `link` again.

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
| No record of which skills were active | `skill-deck.lock` tracks every session's deck |
| Context window wasted on irrelevant descriptions | `max_cards` budget enforces focus |
| Skill overlap corrupts files undetected | `managed_dirs` overlap warnings |

**Multi-role decks**: A curator agent sees only curator skills. An arena agent sees only arena skills. A scribe agent sees only scribe skills. Each agent gets a tailored deck — no cross-contamination, no bloated context.

**Key principle**: lythoskill-deck is a governor, not a package manager. It makes sure the *right* skills are visible — but it doesn't download them for you. The good news: your agent can do that in one shot.

For example, to start using a new skill:

```bash
# 1. Agent downloads the skill to your cold pool (one-time setup)
git clone https://github.com/lythos-labs/lythoskill.git \
  ~/.agents/skill-repos/github.com/lythos-labs/lythoskill

# 2. You declare which skills this project needs
echo 'skills = ["lythoskill-deck"]' >> skill-deck.toml

# 3. Deck takes over — manages symlinks, budgets, overlaps
npx @lythos/skill-deck link
# or: bunx @lythos/skill-deck link
```

Step 1 is a one-time cost per skill source. After that, `deck link` handles everything. You can also use `skills.sh`, `bunx`, or any other method — deck doesn't care how skills got into the cold pool, only which ones are active.

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

## Arena: Skill Comparison

Not sure which skill to use? Arena runs the same task under different skill configurations and scores the results. No guesswork.

| Question | How to test |
|---|---|
| A or B? | `--skills "A,B"` — single-skill comparison |
| Does C improve my deck? | `--decks "v1.toml,v1+C.toml"` — full deck comparison |
| Is D dead weight? | `--decks "v1.toml,v1-D.toml"` — full deck comparison |
| E instead of F? | `--decks "v1.toml,v1-E+F.toml"` — full deck comparison |
| Which deck config wins? | `--decks "minimal.toml,rich.toml"` — full deck comparison |

**Multi-dimensional scoring, not winner-takes-all**: When comparing full decks, the judge outputs scores across multiple dimensions (quality, token efficiency, maintainability). A cheap but medium-quality deck and an expensive but high-quality deck can both be good choices — just for different trade-offs. You decide what you value.

```bash
# Compare three full deck configurations
bunx @lythos/skill-arena \
  --task "Generate auth flow diagram" \
  --decks "./decks/minimal.toml,./decks/rich.toml,./decks/superpowers.toml" \
  --criteria "quality,token,maintainability"
```

**Unexpected synergies**: During comparison, the judge may discover that three skills together produce a 1+1+1>3 effect that no individual skill can achieve. These discoveries are written to the project's knowledge base and inform future deck building.

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

**Adding skills to the cold pool** — this is a one-time setup per skill source. You can do it manually, or ask your agent to run it:

```bash
# Install any skill repo into the cold pool
git clone https://github.com/<owner>/<repo>.git \
  ~/.agents/skill-repos/github.com/<owner>/<repo>

# Real examples:
git clone https://github.com/lythos-labs/lythoskill.git \
  ~/.agents/skill-repos/github.com/lythos-labs/lythoskill

git clone https://github.com/PrimeRadiant/superpowers.git \
  ~/.agents/skill-repos/github.com/PrimeRadiant/superpowers
```

After that, declare the skill in your project's `skill-deck.toml` and run `deck link`. Deck takes over from there.

**Why this structure**: Global uniqueness (`github.com/lythos-labs/lythoskill/lythoskill-deck` vs `github.com/anthropic/lythoskill-deck`), source traceability, and natural multi-host support (GitHub, GitLab, self-hosted).

**Local development**: Set `cold_pool = "."` in your `skill-deck.toml`. Your project root becomes a cold pool entry, and `./skills/` is scanned just like `~/.agents/skill-repos/github.com/.../skills/`.

---

## Ecosystem Tools

| Tool | Focus | What it does |
|---|---|---|
| **lythoskill-deck** | Governance | Declarative skill deck governance (`link`, deny-by-default, max_cards) |
| **lythoskill-creator** | Pattern | Scaffold and build thin-skill packages |
| **lythoskill-curator** | Governance | Index cold pool, output REGISTRY.json + catalog.db for agent reasoning |
| **lythoskill-arena** | Governance | Benchmark skill/deck effectiveness with controlled-variable comparisons |
| **lythoskill-project-cortex** | Both | GTD-style project governance (tasks, epics, ADRs, wiki) |
| **lythoskill-project-scribe** | Both | Write project memory: handoffs, daily notes, pitfalls |
| **lythoskill-project-onboarding** | Both | Read project memory with structured layer loading |
| **lythoskill-red-green-release** | Both | Heredoc migration patch workflow: plan → patch → user approval → git tag |

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

---

## Quick Reference

```bash
# Deck governance (npx or bunx)
npx @lythos/skill-deck link                       # Sync toml -> working set
bunx @lythos/skill-deck link --deck ./my-deck.toml

# Skill scaffolding
npx @lythos/skill-creator init my-project
npx @lythos/skill-creator build my-skill

# Project governance
npx @lythos/project-cortex task "Fix auth flow"
npx @lythos/project-cortex list
npx @lythos/project-cortex index

# Cold pool curation
npx @lythos/skill-curator ~/.agents/skill-repos
# → outputs ~/.agents/lythos/skill-curator/REGISTRY.json + catalog.db

# Arena single-skill comparison
npx @lythos/skill-arena \
  --task "Generate auth flow" \
  --skills "design-doc-mermaid,mermaid-tools"

# Arena full deck comparison
npx @lythos/skill-arena \
  --task "Generate auth flow" \
  --decks "./decks/minimal.toml,./decks/rich.toml" \
  --criteria "quality,token,maintainability"
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
| [AGENTS.md](./AGENTS.md) | Project guidance for Codex, Kimi, Copilot, Gemini |
| [cortex/INDEX.md](./cortex/INDEX.md) | Governance system entry |
| [cortex/adr/](./cortex/adr/) | Architecture Decision Records |
| [skill-deck.toml](./skill-deck.toml) | This repo's active skill deck |
| [cortex/wiki/01-patterns/](./cortex/wiki/01-patterns/) | Reusable patterns and conventions |

---

## License

MIT
