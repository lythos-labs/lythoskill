# ADR-20260519144445916: working_set Must Not Alias Build Output Directory

**Status**: Accepted
**Date**: 2026-05-19
**Supersedes**: Implicit assumption that agents understand working_set semantics

## Status History

| Status | Date | Note |
|--------|------|------|
| accepted | 2026-05-19 | Accepted via ADR state transition |

## Context

The thin skill pattern defines three layers:

```
Starter (packages/<name>/)       → npm publish → dependency management + CLI entry
Skill   (packages/<name>/skill/) → lythoskill build → SKILL.md + thin scripts
Output  (skills/<name>/)         → committed to Git → agent-visible skill
```

`skills/` is the **build output directory**. It contains real files and directories committed to Git so users can clone and use skills without building.

`deck link` creates **symlinks** in the `working_set` directory pointing to cold pool entries. The `working_set` is ephemeral — it exists only on the local machine and should never be committed.

## Incident

An agent changed `skill-deck.toml`:

```diff
- working_set = ".claude/skills"
+ working_set = "skills"
```

This caused `deck link` to create symlinks inside `skills/`, overwriting the build output. The agent then committed these symlinks to Git:

- `.agents/skills/` — 15 symlinks to cold pool
- `skills/diagnose` — symlink to external mattpocock skill
- `skills/tdd` — symlink to external mattpocock skill

All 17 symlinks point to absolute paths on the author's machine (`/Users/chariots/.agents/skill-repos/...`). They are useless to anyone else who clones the repo.

## Decision

1. **working_set must never alias the build output directory** (`skills/`)
2. **working_set directories must be gitignored** — all common CLI paths: `.claude/skills/`, `.agents/skills/`, `.kimi/skills/`, `.cursor/skills/`, `.codex/skills/`
3. **Pre-commit guard**: block symlinks and extraneous entries in `skills/`

## Rationale

| Decision | Why |
|----------|-----|
| Separate paths by convention | Build output (`skills/`) and working set (`.claude/skills/`) serve different purposes. One is committed source of truth; the other is ephemeral local state. |
| Husky guard over gitignore alone | Gitignore is passive — agents can still accidentally commit symlinks (e.g., `git add -A`). Active guard catches the mistake before it reaches the repo. |
| Defensive gitignore for all CLIs | Agents may create new working sets for other CLIs. Proactively gitignoring known paths prevents silent accumulation. |

## Consequences

- Pre-commit hook now rejects any commit containing symlinks in `skills/`
- Pre-commit hook rejects extraneous entries in `skills/` with no matching `packages/<name>/skill/` source
- `.gitignore` includes defensive entries for common CLI working_set paths
- Agent prompt engineering: `working_set` values must be verified against build output paths

## Guard Implementation

```bash
# In .husky/pre-commit
for link in skills/*; do
  if [ -L "$link" ]; then
    echo "❌ SYMLINKS IN skills/ — BUILD OUTPUT POLLUTION"
    exit 1
  fi
done

for dir in skills/*/; do
  name=$(basename "$dir")
  if [ ! -d "packages/$name/skill" ]; then
    echo "❌ EXTRANEOUS ENTRY IN skills/ — NO SOURCE PACKAGE"
    exit 1
  fi
done
```

## Related

- ADR-20260517152850372: `also_link_to` — the same agent that changed `working_set` to `"skills"` was likely trying to set up multi-CLI support incorrectly
- TASK-20260519144445916: symlink pollution cleanup (completed)
