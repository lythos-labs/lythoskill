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
# 1. Add a skill from GitHub (downloads to cold pool + updates deck + links)
npx @lythos/skill-deck add mattpocock/skills

# 2. Agent sees the skill. Everything else is physically absent.
ls .claude/skills/
# skills
```

That's it. `deck add` clones the repo to your [cold pool](#cold-pool-convention), appends the skill to `skill-deck.toml`, and runs `link`.

Prefer a different download method? Use `--via skills.sh` or clone manually — deck doesn't care how skills got into the cold pool.

```bash
# Alternative: Vercel skills.sh
npx @lythos/skill-deck add mattpocock/skills --via skills.sh

# Alternative: manual clone
git clone https://github.com/mattpocock/skills.git \
  ~/.agents/skill-repos/github.com/mattpocock/skills
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

**Key principle**: lythoskill-deck is a governor, not a package manager. It makes sure the *right* skills are visible — but it doesn't download them for you. The good news: your agent can do that in one shot.

**Declarative sync, like Kubernetes**: `deck link` doesn't just "create links" — it makes the working set match your `skill-deck.toml`. If you remove a skill from the toml and run `link` again, it disappears from `.claude/skills/`. No `unlink` command needed — just change the declaration and re-sync.

For example, to start using a new skill manually:

```bash
# 1. Clone the skill repo to your cold pool (one-time setup)
git clone https://github.com/lythos-labs/lythoskill.git \
  ~/.agents/skill-repos/github.com/lythos-labs/lythoskill

# 2. Declare which skills this project needs
echo 'skills = ["lythoskill-deck"]' >> skill-deck.toml

# 3. Sync — deck reconciles working set with declaration
npx @lythos/skill-deck link
# or: bunx @lythos/skill-deck link
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
# Deck governance (npx or bunx)
npx @lythos/skill-deck link                       # Sync toml -> working set
npx @lythos/skill-deck add owner/repo             # Download skill + add to deck
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
| External Deps | **Skill layer**: zero-install via bunx/npx. **Starter layer**: npm deps as needed |

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
