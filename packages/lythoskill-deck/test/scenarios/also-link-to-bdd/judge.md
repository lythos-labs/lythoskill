# Judge Criteria — also_link_to multi-target POSSE fan-out

> Task agent never sees this file. Only judge reads it.
> Per ADR-20260518024500631 (judge separation) + ADR-20260514050300.

## Task Context

Agent was asked to verify `also_link_to` fan-out across 3 targets (`.claude/skills`, `.agents/skills`, `.kimi/skills`) through a full lifecycle: initial link → remove skill-a → re-add skill-a → restore.

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `initial_claude_a` | After link, .claude/skills/skill-a is a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `initial_claude_b` | After link, .claude/skills/skill-b is a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `initial_agents_a` | After link, .agents/skills/skill-a is a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `initial_agents_b` | After link, .agents/skills/skill-b is a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `initial_kimi_a` | After link, .kimi/skills/skill-a is a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `initial_kimi_b` | After link, .kimi/skills/skill-b is a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `toml_removed` | After remove, skill-deck.toml does NOT contain skill-a | 1 | grep → no [tool.skills.skill-a] |
| `toml_preserved` | After remove, skill-deck.toml still contains skill-b | 1 | grep → [tool.skills.skill-b] present |
| `claude_a_removed` | After remove, .claude/skills/skill-a does NOT exist | 1 | `lstat` → ENOENT |
| `agents_a_removed` | After remove, .agents/skills/skill-a does NOT exist | 1 | `lstat` → ENOENT |
| `kimi_a_removed` | After remove, .kimi/skills/skill-a does NOT exist | 1 | `lstat` → ENOENT |
| `claude_b_preserved` | After remove, .claude/skills/skill-b is still a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `agents_b_preserved` | After remove, .agents/skills/skill-b is still a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `kimi_b_preserved` | After remove, .kimi/skills/skill-b is still a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `claude_a_restored` | After re-add + link, .claude/skills/skill-a is a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `agents_a_restored` | After re-add + link, .agents/skills/skill-a is a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `kimi_a_restored` | After re-add + link, .kimi/skills/skill-a is a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `cold_pool_intact` | cold-pool skills untouched by remove | 1 | Both SKILL.md files exist with original content |
| `decision_log` | decision-log.jsonl has valid entries | 1 | ≥6 lines with step/decision/reason/ts |
| `foreign_dir_preserved` | A real directory deck never created, placed inside `.agents/skills`, still exists after re-link | 1 | `lstat` → isDirectory() = true |
| `foreign_symlink_preserved` | A symlink into another project, placed inside `.agents/skills`, still exists after re-link | 1 | `lstat` → isSymbolicLink() = true; `readlink` unchanged |
| `foreign_reported` | Both foreign entries are reported as left untouched, with a why + a concrete `rm -r` suggestion | 1 | link stderr mentions both names + "left untouched" + a `rm -r` line |
| `foreign_target_intact` | The foreign symlink's target file is untouched (nothing recursed into it) | 1 | target `SKILL.md` exists with original content |

## Verdict

- **PASS**: all 1-weight criteria met
- **PARTIAL**: 17+ criteria met
- **FAIL**: <17 criteria met

## Notes

- The `foreign_*` criteria pin the **ownership** boundary (`TASK-20260910111600389`,
  ADR-20260910112404500): deck removes only what it can prove it created. Criteria
  `claude_a_removed` / `agents_a_removed` / `kimi_a_removed` are **not** in tension with it —
  those entries are symlinks into this deck's own cold pool, i.e. deck created them.
- `decision_log`: `ts` values must all come from one clock source. It is provenance, not a
  timeline — do not compare it against file mtimes or commit times
  (`reproduce-sh-bdd-contract.md`).
