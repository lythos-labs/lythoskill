# Problem: Enumerate the skills loaded into your context

## Context

You are an agent operating inside a project that has already been set up
to use **lythoskill-deck**. The working set under `.claude/skills/` has
been pre-populated with symbolic links to skill source directories.
Each skill directory contains a `SKILL.md` file with YAML frontmatter
describing the skill (name, description).

## Your task

Inspect the `.claude/skills/` directory in your current working directory
and produce a JSON report listing every skill you find there.

For each skill directory:

1. Read its `SKILL.md` file (follow the symlink).
2. Extract the `name` and `description` fields from the YAML frontmatter.
3. Use the directory name (the symlink alias) as the canonical `alias`
   for that skill — this is what the deck uses to address it.

## Submission format

Use the `Write` tool to create `../OUTPUT.json` (one level above your
current working directory, next to `brief.md`). The file must be a
single JSON array, no surrounding prose, with this exact shape:

```json
[
  {"alias": "<directory-name>", "description": "<from SKILL.md frontmatter>"},
  {"alias": "<directory-name>", "description": "<from SKILL.md frontmatter>"}
]
```

Order does not matter. Include every skill in `.claude/skills/`.
Do not invent skills that aren't in the directory. Do not include any
field other than `alias` and `description`.

## Acceptance (a hidden judge will verify)

- `OUTPUT.json` exists and parses as a JSON array
- Every element is an object with string fields `alias` and `description`
- The set of `alias` values equals exactly the set of skill directories
  found in `.claude/skills/` of the seeded project
- The manifest `skill-deck.toml` is unchanged
