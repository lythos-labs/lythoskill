# lythoskill

> **Declarative coordination for agent skills.** You declare which skills a project needs in `skill-deck.toml`. `deck link` reconciles the working set — undeclared skills are absent from the agent's view. Configure `working_set` for Claude Code, Kimi, Codex, Cursor, Windsurf, or any agent that scans a skills directory.

[![npm](https://img.shields.io/npm/v/@lythos/skill-deck)](https://www.npmjs.com/package/@lythos/skill-deck)
[![CI](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml/badge.svg)](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml)
[![Bun](https://img.shields.io/badge/Bun-1.3+-000?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![ESM](https://img.shields.io/badge/ESM-only-blue)](https://nodejs.org/api/esm.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/lythos-labs/lythoskill)

**🌐 Languages:** [中文](./README.zh.md)

---

## Should I use this?

When two skills both describe how to write tests, your agent gets conflicting instructions. "Disabling" a skill doesn't remove it — the agent can still see it. And when something goes wrong, you can't tell which skill caused it without removing them one by one. **lythoskill enforces deny-by-default**: undeclared skills are absent from the working set. If a conflict surfaces, bisect your `skill-deck.toml` — the lockfile tells you exactly what was loaded.

But governance is only useful when complexity reaches a threshold. If you use `npx skills add` and have 3 skills that never conflict, you're fine — stay there.

| | `npx skills add` | lythoskill `deck link` |
|---|---|---|
| Install | `npx skills add <repo>` — imperative | Declare in `skill-deck.toml` — declarative |
| After install | Skill stays in scan path until `remove` | `deck link` reconciles — undeclared skills absent from working set |
| Multi-platform | `-a claude-code` / `-a cursor` per install | One TOML, configure `working_set` per platform |
| Discover | `npx skills find` → skills.sh directory | Curator scans local cold pool; agent uses WebSearch for discovery |
| Share | `skills-lock.json` | `skill-deck.lock` |

| Skills | State | Action |
|--------|-------|--------|
| 0–3, no conflicts | Simple | Skip lythoskill. Manage manually. |
| 5–10, some conflicts | Growing | Use **deck** — declare which skills this project needs. |
| 10+, you author skills | Ecosystem | Use **deck + creator** — thin-skill pattern. |
| Managing across teams/projects | Ecosystem | Full lythoskill: deck + creator + curator + arena. |

You do **not** need lythoskill if you have ≤3 skills that never change across projects.

Beyond conflict prevention, `skill-deck.lock` gives you a single source of truth for "what skills were active when this was built." Commit it. Teammates get identical working sets. CI is reproducible. When something breaks, bisect the toml — the lockfile tells you exactly what changed.

---

<details>
<summary>🤖 For Agents</summary>

If you are an AI agent reading this README:

1. Check `bun --version` — if missing, install Bun
2. Run `bunx @lythos/skill-deck@latest link --deck <url|path>` to activate the project's deck
3. Skills load from the `working_set` directory in `skill-deck.toml`

Agents use lythoskill to build real things. [`showcase/`](./showcase/) contains pages, reports, and tools built by agents using lythoskill-governed decks.

</details>

---

## Quick Start

### Give this to your agent

Copy the block below. Tell your agent: "Set up lythoskill for this project." The agent reads, installs Bun if needed, creates a deck, runs `deck link`, and verifies.

````
Read https://raw.githubusercontent.com/lythos-labs/lythoskill/main/README.md.
1. Check `bun --version` — if missing, install Bun.
2. Pick a skill from skills.sh or anthropics/skills.
3. Create a `skill-deck.toml`, run `bunx @lythos/skill-deck@latest link`.
4. Verify skills appeared in your working_set directory.
````

That's the agent-era quick start: tell your agent, not your terminal.

### Or run it yourself

```bash
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/quick-init.sh | bash
```

The script installs Bun, creates a `skill-deck.toml` with `frontend-design` (Anthropic's official design skill), runs `deck link`, and self-checks. One command, a skill appears, done.

It's the same feeling as `npm install` — declared manifest, one command, reproducible result on disk. The difference from `npx skills add`: `deck link` is declarative (like `package.json`), not imperative (like `brew install`).

To add more: `curl ... | bash -s -- --skill github.com/owner/repo/path`. Or edit `skill-deck.toml` and re-run `bunx @lythos/skill-deck@latest link`.

### Manual setup

```bash
# 1. Create your deck
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 5
cold_pool = "~/.agents/skill-repos"

[tool.skills.example]
path = "github.com/owner/repo"
EOF

# 2. Link
bunx @lythos/skill-deck@latest link
```

---

## How it works

A **deck** is a declarative skill manifest — a `skill-deck.toml` file that names which skills are active. That's the core. Everything else (curator, arena, creator, coach) is tooling around that file.

The design stays true to four principles: **declarative** (manifest, not imperative add/remove), **multi-platform** (one TOML, any agent), **deny-by-default** (undeclared = absent), **local-first** (git cache, no central server).

```
Sources (GitHub, localhost, etc.)
    │
    ▼ git clone / git pull
Cold Pool  (~/.agents/skill-repos/)
    │          github.com/lythos-labs/lythoskill/skills/lythoskill-deck/
    │          github.com/mattpocock/skills/skills/engineering/tdd/
    │          localhost/me/sober/
    │
    ▼ symlink (only declared skills)
Working Set (.claude/skills/ or .kimi/skills/ or .cursor/skills/ etc.)
    │
    ▼ agent startup scan
Agent sees only declared skills. No more. No less.
```

Skills live in a **cold pool** — a local git cache at `~/.agents/skill-repos/`, organized like Go modules (`github.com/owner/repo`). No central registry. No auth server. No daemon.

`deck link` writes a **lockfile** (`skill-deck.lock`) that pins each skill. Commit it — teammates get the exact same links.

Skills are authored using the **thin-skill pattern**: heavy logic in npm packages, agent-facing instructions in lightweight SKILL.md files ([details](./AGENTS.md)).

### Explore Pre-Built Decks

18+ decks for common tasks: documentation, research, architecture review, security audit. See [`examples/decks/INDEX.md`](./examples/decks/INDEX.md).

---

## Naming Cheat Sheet

```
lythoskill           ← the project / ecosystem
skill-deck.toml      ← the config file you edit
@lythos/skill-deck   ← the npm package
deck                 ← the CLI command
link                 ← subcommand: reconcile working set to toml
```

---

## Ecosystem Tools

| Tool | What it does |
|------|-------------|
| **deck** | Declare, link, and govern skills across projects |
| **creator** | Scaffold and build thin-skill packages |
| **curator** | Scan the cold pool, index skills, query by niche/type/source |
| **arena** | A/B test skills and deck configurations against real tasks |
| **coach** | Review SKILL.md quality against best practices |
| **cortex** | Project governance: ADR, Epic, Task, Wiki |

We govern this project with our own tools. Every skill in `packages/` is built with creator. Every decision goes through cortex ADRs. Every release uses deck to manage working sets.

---

## Real-World Example: Deck-Governed Next.js Project

See [`examples/`](./examples/) for a complete walkthrough of a deck-governed Next.js project: writing a rich-text editor, adding a PDF report generator, switching skills mid-development, and running an arena cross-review. The agent orchestrates skill composition autonomously — the deck provides the governance layer.

---

## Arena: A/B Test Skill Configurations

Arena isolates skills in `/tmp` worktrees and spawns independent agents to execute the same task. Compare deck A vs deck B, kimi vs claude, or validate a single skill. See [`references/comparisons.md`](./references/comparisons.md) for how this compares to benchmark suites.

---

## Cold Pool Convention

```
~/.agents/skill-repos/
  github.com/
    lythos-labs/lythoskill/skills/lythoskill-deck/
    mattpocock/skills/skills/engineering/tdd/
  localhost/              ← your own skills, not yet shared
    me/sober/
    me/my-project-skill/
```

No central registry. Just git repos in a directory tree. The convention makes skills addressable by path — `github.com/owner/repo` maps to `~/.agents/skill-repos/github.com/owner/repo`.

---

## Architecture

```
Starter (packages/<name>/)       → npm publish → implementation + CLI
Skill   (packages/<name>/skill/) → build → SKILL.md + thin scripts
Output  (skills/<name>/)         → committed → agent-visible skill
```

Three-layer separation: heavy logic lives in npm packages (Starter), agent-facing instructions live in lightweight SKILL.md files (Skill), and the agent sees only the output (committed symlinks).

See [`references/comparisons.md`](./references/comparisons.md) for how this compares to npm, Maven, and Kubernetes RBAC.

---

## Testing

```bash
bun --filter='*' run test          # all 661 tests across 44 files
bun run test:coverage              # coverage report
bun run test:bdd                   # BDD integration tests
```

---

## Troubleshooting

**"Command not found: deck"** → Use `bunx @lythos/skill-deck@latest <subcommand>` instead.

**"bun: command not found"** → Install Bun: `curl -fsSL https://bun.sh/install | bash`.

**Skill not visible to agent** → Check `working_set` in `skill-deck.toml` matches your agent's expected path:
- `.claude/skills/` — Claude Code
- `.agents/skills/` — Codex CLI, OpenClaw
- `.cursor/skills/` — Cursor
- `.kimi/skills/` — Kimi
- `.windsurf/skills/` — Windsurf
- `.github/skills/` — GitHub Copilot

**Lockfile merge conflict** → Run `deck link` — the lockfile is fully derived from `skill-deck.toml`. Delete it and re-link if needed.
