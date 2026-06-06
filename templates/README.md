# lythoskill consumer project templates

Drop-in `AGENTS.md` + `CLAUDE.md` for projects that want lythoskill governance without becoming skill authors.

## What you get

- `AGENTS.md` — generic consumer-project boot flow, daily rhythm, key commands, and gotchas
- `CLAUDE.md` — minimal redirect file for Claude Code
- Both files use `bunx @lythos/...` commands only (no local monorepo paths)

## Quick install

Replace `{{PROJECT_NAME}}` in `AGENTS.md` with your project name, then commit both files to your repo root.

### Download raw files

```bash
# AGENTS.md
curl -L -o AGENTS.md \
  https://raw.githubusercontent.com/lythos-labs/lythoskill/main/templates/AGENTS.md

# CLAUDE.md
curl -L -o CLAUDE.md \
  https://raw.githubusercontent.com/lythos-labs/lythoskill/main/templates/CLAUDE.md
```

### Or copy manually

1. Open the raw files in your browser:
   - `https://raw.githubusercontent.com/lythos-labs/lythoskill/main/templates/AGENTS.md`
   - `https://raw.githubusercontent.com/lythos-labs/lythoskill/main/templates/CLAUDE.md`
2. Save as `AGENTS.md` and `CLAUDE.md` in your project root.
3. Replace `{{PROJECT_NAME}}` in `AGENTS.md`.
4. Run the first-time activation steps in `AGENTS.md` §0.

## First-time activation

```bash
bun install
bunx @lythos/skill-deck link
bunx @lythos/project-cortex init
mkdir -p daily
```

Then write an initial `daily/YYYY-MM-DD.md` with current repo state, open questions, and next actions.

## Daily boot

```bash
bun install
bunx @lythos/skill-deck link
# read daily/YYYY-MM-DD.md (latest)
git status && git log --oneline -5
bunx @lythos/project-cortex probe
```

See `AGENTS.md` for the full Daily Rhythm (Boot / Incoming / Working / Closing).

## Verified npm packages

The templates reference these real published packages:

| Package | Purpose |
|---------|---------|
| `@lythos/skill-deck` | Skill working-set governance |
| `@lythos/skill-arena` | Skill test-play and subagent dispatch |
| `@lythos/project-cortex` | Task / ADR / epic governance |
| `@lythos/skill-curator` | Cold-pool skill indexer |

There is no `@lythos/skill-cortex`; use `@lythos/project-cortex`.
