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
| Sync working set with `skill-deck.toml` | `bunx @lythos/skill-deck link` |
| Validate `skill-deck.toml` before committing | `bunx @lythos/skill-deck validate` |
| Download a skill to cold pool and add to deck | `bunx @lythos/skill-deck add owner/repo` |
| Use a custom deck file or working dir | `bunx @lythos/skill-deck link --deck ./my-deck.toml --workdir /path/to/project` |

### Commands

| Command | Args | Description |
|---------|------|-------------|
| `link` | `[--deck <path>] [--workdir <dir>]` | Sync working set. Removes undeclared skills (deny-by-default). |
| `validate` | `[deck.toml] [--workdir <dir>]` | Validate deck config without modifying files. |
| `add` | `<locator> [--via <backend>] [--deck <path>]` | Download skill to cold pool and append to skill-deck.toml. |

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--deck <path>` | Path to skill-deck.toml | Find upward from cwd |
| `--workdir <dir>` | Working directory | cwd |
| `--via <backend>` | Download backend for `add`: `git` or `skills.sh` | `git` |

### Safety guards

`link` refuses to operate if `working_set` resolves to your home directory or root (`/`). It also only removes **symlinks** from the working set — real files or directories are skipped with a warning.

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
| **`deck link`** | Reconciler. Makes the working set match the declaration. |
| **Working Set** | Symlinks only. Default: `.claude/skills/` — where agents scan for skills. |
| **deny-by-default** | Undeclared skills are physically absent from the working set. |

### Agent skill scan locations

Different agents look for skills in different directories. `skill-deck.toml` configures the working set to match your agent:

| Agent | Default skills directory |
|-------|--------------------------|
| Claude Code | `.claude/skills/` |
| Cursor | `.cursor/skills/` |
| Generic / custom | Configure `working_set` in `skill-deck.toml` |

> **If you are an agent**: verify where your platform scans for skills, then set `working_set` to that path before running `deck link`.

## More Documentation

- **Skill layer** (agent-facing instructions):  
  [`packages/lythoskill-deck/skill/SKILL.md`](https://github.com/lythos-labs/lythoskill/blob/main/packages/lythoskill-deck/skill/SKILL.md)
- **Full project README** (ecosystem overview, cold pool setup):  
  [`README.md`](https://github.com/lythos-labs/lythoskill#readme)
- **Architecture** (thin-skill pattern, three-layer separation):  
  [`AGENTS.md`](https://github.com/lythos-labs/lythoskill/blob/main/AGENTS.md)

## License

MIT
