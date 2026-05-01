# Contributing to lythoskill

Thanks for your interest in contributing! This project is small but opinionated — the best way to start is to use it, then fix the friction you feel.

## Prerequisites

- **Bun** ≥1.0 — [bun.sh](https://bun.sh)
- **pnpm** ≥8.0 — `npm install -g pnpm`

## Quick Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Sync the local skill deck
bun packages/lythoskill-deck/src/cli.ts link

# 3. Verify environment
bun packages/lythoskill-project-cortex/src/cli.ts stats
bun packages/lythoskill-deck/test/runner.ts   # should pass 5/5
```

## Code Conventions

See [`AGENTS.md`](./AGENTS.md) § Code Conventions for the full list. Key rules:

- **ESM-only** — `import`, never `require()`
- **`node:` prefix** — `import { readFileSync } from 'node:fs'`
- **CLI style** — parse `process.argv.slice(2)`, route with `switch`
- **Skill layer zero deps** — scripts call `bunx @lythos/<pkg>`, no local npm deps
- **Unified version** — all packages share one version number (root `package.json`)

## Commit Messages

Follow conventional commits:

```
feat(deck): add status subcommand
fix(creator): correct align.ts ESM import
docs(readme): clarify Bun install for new users
chore(skills): rebuild after doc changes
```

Scope is the package/skill name (`deck`, `creator`, `cortex`, etc.).

## Build & Test

```bash
# Run deck tests
bun packages/lythoskill-deck/test/runner.ts

# Build a skill after editing its skill/ source
bun packages/lythoskill-creator/src/cli.ts build <skill-name>

# Rebuild all skills
bun packages/lythoskill-creator/src/cli.ts build --all
```

The pre-commit hook auto-runs `build --all` when `packages/**/skill/` files change.

## Adding a New Skill

```bash
# Scaffold
bun packages/lythoskill-creator/src/cli.ts init my-skill

# Edit
packages/my-skill/skill/SKILL.md        # agent-facing documentation
packages/my-skill/src/cli.ts            # CLI entry
packages/my-skill/src/index.ts          # core logic

# Build & commit
bun packages/lythoskill-creator/src/cli.ts build my-skill
git add skills/my-skill/ packages/my-skill/
```

## PR Checklist

- [ ] `bun packages/lythoskill-deck/test/runner.ts` passes
- [ ] If you edited `packages/<name>/skill/`, run `build --all` and commit `skills/`
- [ ] If you changed ADR/Epic/Task, run `bun packages/lythoskill-project-cortex/src/cli.ts index`
- [ ] If you changed README, check `README.zh.md` for sync needs

## Questions?

Open an issue or read [`AGENTS.md`](./AGENTS.md) for architecture decisions and common commands.
