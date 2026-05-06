# lythoskill

> **Govern your AI agent skills. Prevent skill ecosystem rot.**
>
> **Use this when:** you have 5+ skills, see conflicts, or want per-project skill control.  
> **Not when:** you have ≤3 skills and no conflicts — put them in `.claude/skills/` manually.

[![npm](https://img.shields.io/npm/v/@lythos/skill-deck)](https://www.npmjs.com/package/@lythos/skill-deck)
[![BDD Tests](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml/badge.svg)](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml)
[![Bun](https://img.shields.io/badge/Bun-1.3+-000?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![ESM](https://img.shields.io/badge/ESM-only-blue)](https://nodejs.org/api/esm.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/lythos-labs/lythoskill)
[中文](./README.zh.md)

**👤 Skill user?** → [Quick Start](#quick-start) — install Bun, run one command, done.  
**🤖 AI agent?** → [For Agents](#for-agents) — your 4-step checklist.  
**🛠️ Developer?** → [Development](#development) — clone, install, contribute.

<details>
<summary>📋 Table of Contents</summary>

- [Do I need this?](#do-i-need-this)
- [What lythoskill Provides](#what-lythoskill-provides)
- [For Agents](#for-agents)
- [Quick Start](#quick-start)
- [skill-deck.toml Reference](#skill-decktoml-reference)
- [Real-World Example](#real-world-example-deck-governed-nextjs-project)
- [Arena: Skill Comparison](#arena-skill-comparison)
- [Cold Pool Convention](#cold-pool-convention)
- [Ecosystem Tools](#ecosystem-tools)
- [Architecture](#architecture)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

</details>

---

## The Problem

When two conflicting skills are both visible to your agent, outputs become unpredictable. **lythoskill-deck** solves this with **deny-by-default**: undeclared skills are **physically absent** from `.claude/skills/`. Not "disabled". Not "deprioritized". **Gone.**

```toml
[deck]
max_cards = 10

[tool.skills.my-skill]
path = "github.com/owner/repo"
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

**Decision tree:**

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

---

## What lythoskill Provides

lythoskill serves two distinct audiences. You can use either independently.

### Deck Governance — For Skill Users

**The problem**: Your `.claude/skills/` is a zoo. 50+ skills from GitHub, skill hubs, and blog posts. Every time the agent starts, it scans everything — descriptions fight for context space, similar skills silently conflict, and you have no idea which ones are actually helping.

**The solution**: Declare which skills this project needs. Everything else disappears.

| Without deck governance | With deck governance |
|---|---|
| Agent scans 50+ skills, picks randomly | Agent sees exactly what you declared |
| Similar skills silently conflict | `deny-by-default`: undeclared = invisible |
| Context window wasted on irrelevant descriptions | `max_cards` budget enforces focus |

**Key principle**: lythoskill-deck is a declarative package manager *and* a governor. `deck add` downloads skills from GitHub into your cold pool, appends them to `skill-deck.toml`, and runs `link` — all in one shot. You get both dependency management (like Maven) and runtime governance (like Kubernetes RBAC).

### Thin Skill Pattern — For Skill Authors

You are building a team-internal skill library or a public skill ecosystem. You need version control, CI, testing, and a clean separation between "development experience" and "agent-facing surface."

```bash
bunx @lythos/skill-creator@0.9.22 init my-skill
cd my-skill
bunx @lythos/skill-creator@0.9.22 build my-skill
```

**Three-Layer Separation**:

```
Starter (packages/<name>/)       → npm publish → implementation + CLI
Skill   (packages/<name>/skill/) → build → SKILL.md + thin scripts
Output  (skills/<name>/)         → committed to Git → agent-visible skill
```

## 🤖 For Agents

If you are an AI agent reading this README:

1. Check `bun --version` — if missing, install Bun (see [Quick Start](#quick-start))
2. Run `bunx @lythos/skill-deck@0.9.22 add <owner>/<repo>` to add a skill
3. Run `bunx @lythos/skill-deck@0.9.22 link` to sync the working set
4. Skills are now in `.claude/skills/` — read them and follow their instructions

## Quick Start

> 💡 **Just cloned this repo?** Jump to the [Development](#development) section for contributor setup.

**Prerequisites** (replace `0.9.19` with the latest version from the npm badge above):

1. **Bun** (required) — TypeScript runtime for `bunx`:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   # After install: restart your shell or run `source ~/.bashrc`
   ```

2. **Kimi CLI** (optional) — only needed for [Arena](#arena-skill-comparison):
   ```bash
   uv tool install kimi-cli && kimi login
   # Docs: https://github.com/MoonshotAI/kimi-cli
   ```

> **This tool requires Bun, not Node.** `bunx` is the correct runner.

### 30-Second Trial (curl, zero install beyond prerequisites)

```bash
# Deck + prompt → agent executes + judge scores → output. No files touched in your project.
# Each run creates ./agent-output-<timestamp>/ — no overwrites.

# ── Pure text (fast, no web search) ──
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/quick-agent.sh | bash -s -- documents "Write Hello World in Python, JavaScript, Rust, Go, and Bash. Add a one-line comment per language explaining what makes it idiomatic."

curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/quick-agent.sh | bash -s -- documents "Write a recipe for the perfect chocolate chip cookie. Include ingredient ratios, technique notes, and the science behind each step."

# ── Web research (uses web-search skill) ──
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/quick-agent.sh | bash -s -- documents "Create a 3-day Tokyo itinerary for a first-time visitor who loves food and design. Include neighborhood walks and one underrated spot per day."

curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/quick-agent.sh | bash -s -- engineering "Research the current state of WebAssembly in 2026. Write a 3-paragraph summary covering browser support, language ecosystem, and one surprising use case."
```

Output lands in `./agent-output/`. The agent gets a temporary deck (PDF + DOCX + web-search), does the work, produces output — your workspace is untouched. See [`quick-agent.sh`](./examples/quick-agent.sh) for how it works.

<details>
<summary>🔧 Unstable GitHub connection?</summary>

If `raw.githubusercontent.com` is slow or blocked, prefix the deck URL with a ghproxy:

```bash
# Built-in deck via proxy (use ghfast.top or gh-proxy.com)
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/quick-agent.sh | bash -s -- \
  "https://ghfast.top/https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/documents.toml" \
  "Write a recipe for the perfect chocolate chip cookie"
```

Any public GitHub raw URL works the same way — just prepend the proxy prefix.
</details>

### Install for Real Use

```bash
# 1. Add a skill (downloads to cold pool + updates deck + links)
bunx @lythos/skill-deck@0.9.22 add <owner>/<repo>

# 2. Agent sees the skill. Everything else is physically absent.
ls .claude/skills/
```

That's it. `deck add` clones the repo to your [cold pool](#cold-pool-convention), appends the skill to `skill-deck.toml`, and runs `link`.

### Or start with a pre-built deck (30 seconds)

Not sure which skills to pick? One command installs a scenario-tuned deck:

```bash
# Default: document processing deck (PDF + DOCX + web search)
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/install-deck.sh | bash

# Pick a different scene
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/install-deck.sh | bash -s engineering
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/install-deck.sh | bash -s full-stack
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/install-deck.sh | bash -s governance
```

Or copy a deck manually and link:

```bash
# Document processing: PDF + DOCX + web search
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/documents.toml > skill-deck.toml
bunx @lythos/skill-deck@0.9.22 link
```

| Deck | Skills | Scene |
|------|--------|-------|
| [documents](./examples/decks/documents.toml) | PDF, DOCX, web-search | Document processing |
| [engineering](./examples/decks/engineering.toml) | TDD, to-PRD, design-doc-mermaid | Engineering workflow |
| [full-stack](./examples/decks/full-stack.toml) | React, composition, TDD, PDF, diagrams | Full-stack development |
| [governance](./examples/decks/governance.toml) | deck, cortex, scribe, onboarding | Project governance |

> `link` only activates skills already in your cold pool. Missing skills report "Skill not found" — add them with `deck add <path>` or clone manually.

For monorepo skills (multiple skills in one repo), include the full path:

```bash
# Monorepo: specify the skill path inside the repo
bunx @lythos/skill-deck@0.9.22 add github.com/owner/repo/skills/my-skill

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

### Managing Your Deck

**Remove a skill:** Delete its entry from `skill-deck.toml` and run:
```bash
bunx @lythos/skill-deck@0.9.22 link
```

**Update a skill:** Pull the latest code from its source and re-link:
```bash
cd ~/.agents/skill-repos/github.com/<owner>/<repo> && git pull
bunx @lythos/skill-deck@0.9.22 link
```

`skill-deck.lock` tracks the resolved working set. Commit it to version control so teammates get the exact same skill links.

---

## skill-deck.toml Reference

| Section | Key | Required | Default | Description |
|---------|-----|----------|---------|-------------|
| `[deck]` | `max_cards` | No | `10` | Max skills active in the working set |
| `[deck]` | `cold_pool` | No | `~/.agents/skill-repos` | Root directory for cloned skill repos |
| `[deck]` | `working_set` | No | `.claude/skills` | Directory where symlinks are created |
| `[innate]` | `skills.<name>.path` | Yes* | — | Always loaded; agent cannot override |
| `[tool]` | `skills.<name>.path` | Yes* | — | Available for agent to invoke |
| `[transient]` | `skills.<name>.path` | Yes* | — | Time-bounded skills (auto-expire) |

\* Required when that section is used.

**Skill types:**

| Type | Behavior | max_cards? |
|------|----------|------------|
| **`[innate]`** | Eager — loaded at session start, agent cannot remove | Yes |
| **`[tool]`** | Lazy — agent invokes on demand (default) | Yes |
| **`[transient]`** | Lazy + expiry — agent can try, auto-expires | Yes |

**`[combo]`** is not a skill type — it's a meta-declaration. It does NOT count against `max_cards`:

```toml
[combo.report-generation]
skills = ["web-search", "docx", "mermaid"]
prompt = "Search for latest info, then generate professional document with diagrams"
```

Combo = named group + coordination prompt. Agent reads the prompt as natural-language instructions for how skills work together. If coordination is genuinely complex, fork a single skill instead.

> **Other agent platforms?** Set `working_set = ".kimi/skills/"` or `.cursor/skills/` in `skill-deck.toml`.

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

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[innate.skills.project-cortex]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-project-cortex"

[innate.skills.project-onboarding]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-project-onboarding"

[innate.skills.project-scribe]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-project-scribe"

[tool.skills.pdf]
path = "github.com/anthropics/skills/skills/pdf"

[tool.skills.docx]
path = "github.com/anthropics/skills/skills/docx"

[tool.skills.to-prd]
path = "github.com/mattpocock/skills/skills/engineering/to-prd"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.gstack]
path = "github.com/garrytan/gstack"

[tool.skills.design-doc-mermaid]
path = "github.com/SpillwaveSolutions/design-doc-mermaid"
EOF

# 4. Sync the deck
bunx @lythos/skill-deck@0.9.22 link
```

**What the agent does**:
1. Reads every SKILL.md in `.claude/skills/` to understand capability boundaries
2. Creates a task via `bunx @lythos/project-cortex@0.9.22 task "Build Todo List page"`
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
bunx @lythos/skill-deck@0.9.22 link                       # Sync toml -> working set
bunx @lythos/skill-deck@0.9.22 add owner/repo             # Download skill + add to deck
bunx @lythos/skill-deck@0.9.22 link --deck ./my-deck.toml

# Skill scaffolding
bunx @lythos/skill-creator@0.9.22 init my-project
bunx @lythos/skill-creator@0.9.22 build my-skill

# Project governance
bunx @lythos/project-cortex@0.9.22 task "Fix auth flow"
bunx @lythos/project-cortex@0.9.22 list
bunx @lythos/project-cortex@0.9.22 index

# Cold pool curation
bunx @lythos/skill-curator@0.9.22 ~/.agents/skill-repos
# → outputs ~/.agents/lythos/skill-curator/REGISTRY.json + catalog.db

# Arena single-skill comparison
bunx @lythos/skill-arena@0.9.22 \
  --task "Generate auth flow" \
  --skills "design-doc-mermaid,mermaid-tools"

# Arena full deck comparison
bunx @lythos/skill-arena@0.9.22 \
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

## Testing

BDD scenarios in this repo are **LLM-readable contracts** — Given/When/Then in plain Markdown (or TypeScript), driven by a tiny custom runner. No Cucumber, no plugin layer, so an agent can author and read them without framework knowledge.

| Category | In CI? | Where it lives |
|----------|--------|----------------|
| **Unit** | yes | (introduce as needed; Vitest / `bun:test` are fine) |
| **CLI integration BDD** | yes | `packages/*/test/scenarios/` |
| **Agent BDD** | **no** — relies on LLM inference, no LLM in CI | not yet authored; will use a `*.agent.md` suffix |

Run everything locally:
```bash
bun run test:all     # 12 cortex + 21 deck scenarios
```

### Test Reports (per-commit)

Capture full test output + coverage to a timestamped file:

```bash
bun scripts/test-report.ts
# → test-results/<YYYYMMDD-HHMMSS>-<short-hash>.txt
```

CI uploads the report as an artifact on every push. [Latest →](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml)

Full scenario index: [`packages/lythoskill-test-utils/SCENARIOS.md`](./packages/lythoskill-test-utils/SCENARIOS.md).

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

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Skill not found` after `deck link` | Skill missing from cold pool | `bunx @lythos/skill-deck@0.9.22 add <owner>/<repo>` or clone manually |
| `bunx: command not found` | Bun not installed or shell not restarted | Run `source ~/.bashrc` or open a new terminal |
| Symlink creation fails | Permissions or non-standard filesystem | Ensure `working_set` directory exists and is writable |
| `quick-agent.sh` fails with `Deck fetch failed` | `raw.githubusercontent.com` unreachable | Prefix deck URL with `https://ghfast.top/` or `https://gh-proxy.com/` (see [network note](#quick-start)) |
| `deck link` hangs or fails | `github.com` unreachable during skill clone | Clone skills manually to cold pool, or use a git proxy |

---

## License

MIT
