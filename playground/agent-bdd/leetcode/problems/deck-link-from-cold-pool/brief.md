# Problem: Materialize a deck's working set

## Context

You are inside a project that uses **lythoskill-deck**, a tool for managing
"agent skills" via a TOML manifest. Your task is to bring the working set
in `.claude/skills/` into alignment with what the manifest declares.

## What's in this directory

- `skill-deck.toml` — the manifest (declares which skills the project wants)
- `.demo-cold-pool/` — a local pool of skill source directories
- `.claude/skills/` — does not yet exist; you will populate it indirectly

You may inspect these files; do not modify them.

## Tooling

A `deck` command is available on your `PATH`. Useful subcommands:

```bash
deck link        # materialize the working set from skill-deck.toml
deck validate    # read-only sanity check
deck --help      # full reference
```

## Task

Use the `deck` command to populate `.claude/skills/` so that the skill(s)
declared in `skill-deck.toml` appear there as symbolic links pointing into
`.demo-cold-pool/`.

## Submission

Write your final report to `../OUTPUT.md` (one level up from your current
working directory, so it lands next to `brief.md`). Include:

1. The exact command(s) you ran
2. A brief summary of what changed in `.claude/skills/`
3. Any errors or warnings you saw

Do not write anywhere outside this run directory. Do not modify
`skill-deck.toml` or any file under `.demo-cold-pool/`.

## Acceptance (a hidden judge will verify)

- `.claude/skills/pdf` exists and is a symbolic link
- That symlink resolves to a directory containing `SKILL.md` somewhere
  inside `.demo-cold-pool/`
- `OUTPUT.md` exists and is non-empty
- `skill-deck.toml` has not been modified
