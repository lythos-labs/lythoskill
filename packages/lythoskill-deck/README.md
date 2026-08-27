# @lythos/skill-deck

![Coverage](https://img.shields.io/badge/coverage-82%25-brightgreen) ![CI](https://img.shields.io/badge/CI-71%20unit%20%2B%2021%20CLI%20BDD-brightgreen) ![Agent BDD](https://img.shields.io/badge/Agent%20BDD-5%20local-blue) ![Intent/Plan](https://img.shields.io/badge/arch-intent%2Fplan%2Fexecute-8A2BE2)

> Declarative skill deck governance. Declare which skills a project needs in `skill-deck.toml`, run `deck link`, and the working set becomes an exact mirror. Undeclared skills are physically removed — deny-by-default.

## Quick Start

```bash
# Add a skill from skills.sh syntax (owner/repo, no conversion needed)
bunx @lythos/skill-deck@0.17.8 add vercel-labs/agent-skills

# Or with @skill filter:
bunx @lythos/skill-deck@0.17.8 add mattpocock/skills@tdd

# Or full-qualified locator:
bunx @lythos/skill-deck@0.17.8 add github.com/anthropics/skills/skills/frontend-design

# Sync working set (creates symlinks, removes undeclared skills):
bunx @lythos/skill-deck@0.17.8 link
```

## Commands

| Command | Args | Description |
|---------|------|-------------|
| `link` | `[--deck <path>] [--workdir <dir>]` | Sync working set. Removes undeclared skills. |
| `add` | `<locator> [--alias] [--type] [--deck]` | Add skill to cold pool + deck.toml. Accepts skills.sh syntax and FQ locators. |
| `refresh` | `[<alias>] [--deck] [--exec]` | Scan declared skills for upstream updates. Plan-only by default; add `--exec` to pull. |
| `validate` | `[--deck <path>] [--workdir] [--remote]` | Validate deck config. Cold-pool-missing skills warn (not error) with HATEOAS next-step suggestions. Use `--remote` to verify paths on GitHub. |
| `remove` | `<alias> [--deck]` | Remove skill from deck.toml and working set. Cold pool untouched. |
| `to-symlink` | `<alias> [--deck] [--workdir]` | Switch a skill to symlink mode (live link, follows cold pool). |
| `to-snapshot` | `<alias> [--deck] [--workdir]` | Switch a skill to snapshot mode (pinned copy of current HEAD). |
| `migrate-schema` | `[--dry-run]` | Convert legacy string-array deck.toml to alias-as-key dict. |

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--deck <path>` | Path to skill-deck.toml | Find upward from cwd |
| `--workdir <dir>` | Working directory | cwd |
| `--alias <name>` | Explicit alias (default: basename of path) | — |
| `--type <type>` | Target section for `add`: `innate`, `tool`, `transient` | `tool` |
| `--mode <mode>` | Link mode: `symlink` (default) or `snapshot` | `symlink` |
| `--no-backup` | Skip tar backup when removing non-symlink entries | — |
| `--dry-run` | Show plan without executing | — |
| `--exec` | For `refresh`: execute git pull instead of plan-only | — |

## Safety guards

`link` refuses to operate if `working_set` resolves to your home directory or root (`/`).

**Snapshot mode** (`--mode snapshot`): copies the source directory into the working set instead of symlinking. Snapshots are pinned to the cold pool version at link time. Use `deck to-symlink <alias>` to switch back.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Validation failed, deck not found, or budget exceeded |

## Why

When an AI agent has access to 50+ skills, context window pollution and silent conflicts become real problems. Two skills claiming the same niche, redundant descriptions, incompatible assumptions — all invisible until the agent hallucinates.

`skill-deck.toml` solves this by declaring *exactly* which skills the agent should see. `deck link` creates symlinks from the cold pool to the working set and **removes everything else**. Deny-by-default means undeclared skills physically do not exist in the agent's view.

## Key Concepts

| Concept | One-liner |
|---------|-----------|
| **Cold Pool** | All downloaded skills (`~/.agents/skill-repos/`). Agent cannot see here. |
| **skill-deck.toml** | Declares desired state: "this project uses these skills." |
| **`deck link`** | Reconciler. Makes the working set match the declaration. |
| **Working Set** | Where symlinks are created. Default: `.claude/skills/`. |
| **deny-by-default** | Undeclared skills are physically absent from the working set. |

## Platform Quick Reference

Different agents scan different directories. Set `working_set` in `skill-deck.toml` to match your agent:

| Agent | Default path | Notes |
|-------|-------------|-------|
| Claude Code | `.claude/skills/` | Default. No config needed. |
| Cursor | `.cursor/skills/` | Set `working_set` before `link`. |
| OpenClaw | `.agents/skills/` | Project-level deck recommended. See [POSSE syndication](https://github.com/lythos-labs/lythoskill/blob/main/cortex/wiki/01-patterns/2026-05-05-multi-agent-posse-syndication.md). |
| Hermes | `.hermes/skills/` | Use `external_dirs` in `~/.hermes/config.yaml` to point to project path. |

> **If you are an agent**: verify where your platform scans for skills, then set `working_set` before running `deck link`.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `❌ Skill not found: <name>` | Skill declared but not in cold pool | `deck add github.com/owner/repo/skill` or clone manually |
| `link` skips entries with warnings | Real files/directories exist in working set | Delete real directories in `working_set` and re-run `link` |
| `refresh` reports "Not a git repository" | Skill was copied (not cloned) into cold pool | Re-clone or use `deck add` |
| `link` refuses with "budget exceeded" | Declared skills > `max_cards` | Increase `max_cards` or remove unused skills |
| `link` refuses with "unsafe working_set" | `working_set` resolves to `~` or `/` | Use a relative path (e.g. `.claude/skills/`) |
| Agent doesn't see skills after `link` | `working_set` path doesn't match agent's scan location | Verify platform docs and set `working_set` correctly |
| Broken symlinks in working set | Skill moved or deleted from cold pool | Re-run `link` — recreates symlinks automatically |
| `deck add` fails with 404 | Locator format wrong or repo doesn't exist | Format: `github.com/owner/repo/skill-name` |
| `skill-deck.toml not found` | Running `link` outside project tree | Run from project root, or use `--deck ./path/to/skill-deck.toml` |

## Architecture

Deck separates pure logic from IO:

```
deck.toml → RefreshPlan / PrunePlan (pure) → execute with injectable IO
```

- **Plan**: `buildRefreshPlan()`, `buildPrunePlan()` — pure functions, unit-testable
- **Execute**: `executeRefreshPlan(plan, io)`, `executePrunePlan(plan, io)` — IO injected (`gitPull`, `delete`, `log`)

This enables testing without real git operations. Full pattern: [Intent / Plan / Execute](https://github.com/lythos-labs/lythoskill/blob/main/cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md).

## Test Coverage

| Layer | Count | CI |
|-------|-------|----|
| Unit tests | 71 | ✅ |
| CLI BDD | 21 | ✅ |
| Agent BDD | 5 | local only |

## More Documentation

- **Skill layer** (agent-facing): [SKILL.md](https://github.com/lythos-labs/lythoskill/blob/main/packages/lythoskill-deck/skill/SKILL.md)
- **Project README** (ecosystem overview): [README.md](https://github.com/lythos-labs/lythoskill#readme)
- **Architecture**: [AGENTS.md](https://github.com/lythos-labs/lythoskill/blob/main/AGENTS.md)

## License

MIT
