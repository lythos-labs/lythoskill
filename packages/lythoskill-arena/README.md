# @lythos/skill-arena

> Skill comparison benchmark tool. Run control-variable decks against the same task to compare skill effectiveness.

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) meta-skill ecosystem.

## What it does

Creates an arena directory with isolated decks for each skill under test, generates task cards for subagent dispatch, and produces a structured output for judge evaluation. Core principle: **control variables** — only the tested skill differs between decks.

## Install

```bash
bun add -d @lythos/skill-arena
# or
bunx @lythos/skill-arena <args>
```

## Commands

```bash
# Initialize an arena with 2-5 skills
bunx @lythos/skill-arena \
  --task "Generate user auth flow diagram" \
  --skills "design-doc-mermaid,mermaid-tools" \
  --criteria "syntax,context,token"

# Options
# --task, -t     Task description (required)
# --skills, -s   Comma-separated skill list, min 2, max 5
# --criteria, -c Evaluation criteria (default: syntax,context,logic,token)
# --control      Control variable skill (default: project-scribe)
# --dir, -d      Arena parent directory (default: tmp)
# --project, -p  Project root (default: .)
```

## Output

```
tmp/arena-<timestamp>-<slug>/
├── arena.json       # metadata + config
├── decks/           # one control-variable deck per skill
├── runs/            # subagent output (you fill this)
└── TASK-arena.md    # task card with subagent instructions
```

## Architecture

This is the **Starter** layer of the thin-skill pattern. The agent-visible **Skill** layer is in `packages/lythoskill-arena/skill/`.

## License

MIT
