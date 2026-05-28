# Judge Criteria — Deck Add/Remove reproduce.sh

> Task agent never sees this file. Only the judge agent reads it.
> This is the separation that arena already has (arena.toml judge field)
> and that Agent BDD needs (ADR-20260518024500631).

## Task Context (what the agent was asked to do)

Verify deck add → link → remove → link end-to-end:
1. Setup cold pool with valid skills
2. Create skill-deck.toml with one skill
3. Run `deck link` to establish working set symlinks
4. Add a second skill to skill-deck.toml
5. Run `deck link` to sync new skill
6. Verify lock file has both skills
7. Run `deck remove skill-a` to remove one skill
8. Run `deck link` to sync after remove
9. Verify working set is consistent

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `cold_pool_setup` | Cold pool created with valid SKILL.md files | 1 | Check cold-pool directory has skills with YAML frontmatter |
| `link_initial` | deck link creates symlinks for declared skills | 1 | `.claude/skills/skill-a` is a symlink pointing to cold-pool source |
| `add_skill` | Adding skill to toml + link creates new symlink | 1 | `skill-b` appears in skill-deck.toml and `.claude/skills/skill-b` is symlink |
| `preserve_existing` | Link does not break existing symlinks | 1 | `skill-a` symlink still valid after adding skill-b |
| `lock_file` | skill-deck.lock tracks all declared skills | 1 | Lock file exists and has entries for both skills |
| `remove_toml` | deck remove deletes entry from skill-deck.toml | 1 | `skill-a` section removed from toml |
| `remove_symlink` | deck remove deletes working set symlink | 1 | `.claude/skills/skill-a` no longer exists |
| `remove_preserve` | deck remove does NOT delete cold pool source | 1 | Cold pool source for skill-a still exists |
| `remove_others` | deck remove does not affect other skills | 1 | `skill-b` symlink still valid after removing skill-a |
| `sync_after_remove` | deck link after remove keeps working set consistent | 1 | Only skill-b symlink exists, no orphaned entries |

## Verdict

- **PASS**: all 1-weight criteria met
- **PARTIAL**: 7+ criteria met
- **FAIL**: <7 criteria met
