# @lythos/skill-deck

![Coverage](https://img.shields.io/badge/coverage-82%25-brightgreen) ![CI](https://img.shields.io/badge/CI-71%20unit%20%2B%2021%20CLI%20BDD-brightgreen) ![Agent BDD](https://img.shields.io/badge/Agent%20BDD-5%20local-blue) ![Intent/Plan](https://img.shields.io/badge/arch-intent%2Fplan%2Fexecute-8A2BE2)

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

[tool.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
```

### skill-deck.toml (full reference)

```toml
[deck]
max_cards = 10              # Hard limit on total skills
working_set = ".claude/skills"      # Where symlinks are created
cold_pool = "~/.agents/skill-repos" # Where skills are downloaded

[innate.skills.lythoskill-deck]     # Always-loaded skills
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[tool.skills.tdd]                   # Auto-triggered skills
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.gstack]
path = "github.com/garrytan/gstack"

[combo.skills.pdf]                  # Multi-skill bundles
path = "github.com/anthropics/skills/skills/pdf"

[transient.handoff]                 # Temporary skills with expiry
path = "./skills/handoff" # Local path (not cold pool)
expires = "2026-05-01"    # ISO date; warns at ≤14 days
```

### When to invoke

| Situation | Command |
|-----------|---------|
| Sync working set with `skill-deck.toml` | `bunx @lythos/skill-deck link` |
| Validate `skill-deck.toml` before committing | `bunx @lythos/skill-deck validate` |
| Download a skill to cold pool and add to deck | `bunx @lythos/skill-deck add owner/repo` |
| Pull latest versions of declared skills | `bunx @lythos/skill-deck refresh` |
| Refresh a single skill by alias | `bunx @lythos/skill-deck refresh tdd` |
| Remove a skill from deck and working set | `bunx @lythos/skill-deck remove tdd` |
| GC unreferenced repos from cold pool | `bunx @lythos/skill-deck prune` |
| Use a custom deck file or working dir | `bunx @lythos/skill-deck link --deck ./my-deck.toml --workdir /path/to/project` |

### Commands

| Command | Args | Description |
|---------|------|-------------|
| `link` | `[--deck <path>] [--workdir <dir>]` | Sync working set. Removes undeclared skills (deny-by-default). |
| `validate` | `[deck.toml] [--workdir <dir>]` | Validate deck config without modifying files. |
| `add` | `<locator> [--via <backend>] [--as <alias>] [--type <type>] [--deck <path>]` | Download skill to cold pool and append to skill-deck.toml. |
| `refresh` | `[<fq|alias>] [--deck <path>]` | Pull latest versions of declared skills from upstream git repos. Pass a name to refresh one skill. |
| `remove` | `<fq|alias> [--deck <path>]` | Remove skill from deck.toml and working set. Cold pool untouched. |
| `prune` | `[--yes] [--deck <path>]` | GC cold pool repos no longer referenced. Interactive confirm (skip with `--yes`). |

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--deck <path>` | Path to skill-deck.toml | Find upward from cwd |
| `--workdir <dir>` | Working directory | cwd |
| `--via <backend>` | Download backend for `add`: `git` or `skills.sh` | `git` |
| `--as <alias>` | Explicit alias for the skill (default: basename of path) | — |
| `--type <type>` | Target section for `add`: `innate`, `tool`, or `combo` | `tool` |

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

[tool.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
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

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `❌ Skill not found: <name>` | Skill declared in deck but not in cold pool | `bunx @lythos/skill-deck add github.com/owner/repo/skill` or clone manually into cold pool |
| `link` skips entries with warnings | Real files/directories exist in working set (not symlinks) | Delete the real directories in `working_set` and re-run `link`. Never create directories manually there |
| `refresh` reports "Not a git repository" | Skill was copied (not cloned) into cold pool | Re-clone with `git clone` or use `deck add` which clones by default |
| `deck update` prints deprecation warning | `update` was renamed to `refresh` in v0.8+ | Use `deck refresh` instead |
| `link` refuses with "budget exceeded" | Declared skills > `max_cards` | Increase `max_cards` in `skill-deck.toml` or remove unused skills |
| `link` refuses with "unsafe working_set" | `working_set` resolves to `~` or `/` | Check `skill-deck.toml` has correct relative path (e.g. `.claude/skills/`) |
| Agent doesn't see skills after `link` | `working_set` path doesn't match agent's scan location | Claude Code: `.claude/skills/`; Cursor: `.cursor/skills/`; Kimi: check your platform docs. Set `working_set` correctly |
| Broken symlinks in working set | Skill moved or deleted from cold pool | Re-run `link` — it recreates symlinks automatically |
| `deck add` fails with 404 | Locator format wrong or repo doesn't exist | Format: `github.com/owner/repo/skill-name` (path to skill directory inside repo) |
| `skill-deck.toml not found` | Running `link` outside project tree | Run from project root, or use `--deck ./path/to/skill-deck.toml` |

## Architecture: Intent / Plan / Execute

Deck commands separate pure logic from IO:

```
deck.toml  →  RefreshPlan / PrunePlan (pure)  →  execute with injectable IO
```

- **Plan**: `buildRefreshPlan()`, `buildPrunePlan()` — pure functions, unit-testable
- **Execute**: `executeRefreshPlan(plan, io)`, `executePrunePlan(plan, io)` — IO injected (`gitPull`, `delete`, `log`)
- **Config**: `workdir`, `coldPool`, `deckPath` all accept explicit overrides, defaults are fallback

This enables testing without real git operations — inject mock `gitPull`, capture `log` output, assert expected behavior.

## Test Coverage

| Layer | Count | CI | Notes |
|-------|-------|----|-------|
| Unit tests | 71 | ✅ | Plan generation, link, add, remove, schema |
| CLI BDD | 21 | ✅ | End-to-end via real CLI invocations in tmpdir |
| Agent BDD | 5 | ❌ | Requires `claude -p` CLI; `.agent.test.ts` convention |

Coverage is honest — no gate, no inflation. Agent BDD scenarios run locally only.

## More Documentation

- **Skill layer** (agent-facing instructions):  
  [`packages/lythoskill-deck/skill/SKILL.md`](https://github.com/lythos-labs/lythoskill/blob/main/packages/lythoskill-deck/skill/SKILL.md)
- **Full project README** (ecosystem overview, cold pool setup):  
  [`README.md`](https://github.com/lythos-labs/lythoskill#readme)
- **Architecture** (thin-skill pattern, three-layer separation):  
  [`AGENTS.md`](https://github.com/lythos-labs/lythoskill/blob/main/AGENTS.md)

## License

MIT
