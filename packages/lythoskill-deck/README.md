# @lythos/skill-deck

> Declarative skill deck governance. Reconcile declared skills against your cold pool via symlinks — deny-by-default, max-cards budgeting, transient expiry.

## For AI Agents

This package exposes a **CLI**. Invoke via:

```bash
bunx @lythos/skill-deck <command> [options]
```

No installation required. `bunx` auto-downloads the package.

### skill-deck.toml (minimal)

```toml
[deck]
max_cards = 10

[tool]
skills = ["lythoskill-deck"]
```

### skill-deck.toml (full reference)

```toml
[deck]
max_cards = 10              # Hard limit on total skills
working_set = ".claude/skills"      # Where symlinks are created
cold_pool = "~/.agents/skill-repos" # Where skills are downloaded

[innate]                    # Always-loaded skills
skills = ["lythoskill-deck"]

[tool]                      # Auto-triggered skills
skills = ["skill-a", "skill-b"]

[combo]                     # Multi-skill bundles
skills = ["report-generation-combo"]

[transient]                 # Temporary skills with expiry
  [transient.handoff]
  path = "./skills/handoff" # Local path (not cold pool)
  expires = "2026-05-01"    # ISO date; warns at ≤14 days
```

### When to invoke

| Situation | Command |
|-----------|---------|
| Sync `.claude/skills/` with `skill-deck.toml` | `bunx @lythos/skill-deck link` |
| Validate `skill-deck.toml` before committing | `bunx @lythos/skill-deck validate` |
| Use a custom deck file or working dir | `bunx @lythos/skill-deck link --deck ./my-deck.toml --workdir /path/to/project` |

### Commands

| Command | Args | Description |
|---------|------|-------------|
| `link` | `[--deck <path>] [--workdir <dir>]` | Sync working set. Removes undeclared skills (deny-by-default). |
| `validate` | `[deck.toml] [--workdir <dir>]` | Validate deck config without modifying files. |

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--deck <path>` | Path to skill-deck.toml | Find upward from cwd |
| `--workdir <dir>` | Working directory | cwd |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Validation failed, deck not found, or budget exceeded |

---

## For Humans

### Why

When an AI agent has access to 50+ skills, context window pollution and silent conflicts become real problems. Two skills claiming the same niche, redundant descriptions, incompatible assumptions — all invisible until the agent hallucinates.

`skill-deck.toml` solves this by declaring *exactly* which skills the agent should see. `deck link` creates symlinks from the cold pool to `.claude/skills/` and **removes everything else**. Deny-by-default means undeclared skills physically do not exist in the agent's view.

### Quick Start

```bash
# 1. Create a skill-deck.toml
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10

[tool]
skills = ["lythoskill-deck"]
EOF

# 2. Link — creates symlinks in .claude/skills/
bunx @lythos/skill-deck link
```

### Key Concepts

| Concept | One-liner |
|---------|-----------|
| **Cold Pool** | All downloaded skills (`~/.agents/skill-repos/`). Agent cannot see here. |
| **skill-deck.toml** | Declares desired state: "this project uses these skills." |
| **`deck link`** | Reconciler. Makes `.claude/skills/` match the declaration. |
| **Working Set** | `.claude/skills/` — symlinks only. What the agent actually scans. |
| **deny-by-default** | Undeclared skills are physically absent from the working set. |

## Skill Documentation

This package is the **Starter** layer (CLI implementation).  
The agent-visible **Skill** layer documentation is here:  
[packages/lythoskill-deck/skill/SKILL.md](../../packages/lythoskill-deck/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem — the thin-skill pattern separates heavy logic (this npm package) from lightweight agent instructions (SKILL.md).

```
Starter (this package) → npm publish → bunx @lythos/skill-deck ...
Skill   (packages/<name>/skill/)     → build → SKILL.md + thin scripts
Output  (skills/<name>/)             → git commit → agent-visible skill
```

## License

MIT
