# Judge Criteria — Deck Symlink/Snapshot reproduce.sh

> Task agent never sees this file. Only the judge agent reads it.

## Task Context

Verify `deck to-symlink` / `deck to-snapshot` mode switching with a real skill repo:
1. Sample a real repo (lythoskill) into TMPDIR test-cold-pool
2. Create skill-deck.toml pointing to test cold pool
3. `deck link` — establish working set (symlink mode)
4. Verify lock records `mode: symlink`
5. `deck to-snapshot` — convert to real directory
6. Verify content preserved, lock updated to `mode: snapshot`
7. Idempotency: second `to-snapshot` is no-op
8. `deck to-symlink` — convert back to symlink
9. Verify lock updated back to `mode: symlink`
10. Idempotency: second `to-symlink` is no-op
11. `deck link` — preserves current mode

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `sample` | Real repo cloned into test cold pool | 1 | `test-cold-pool/github.com/.../.git` exists |
| `link_symlink` | `deck link` creates symlink | 1 | `lstat` shows `.claude/skills/<alias>` is symlink |
| `lock_symlink` | Lock file records `mode: symlink` | 1 | `skill-deck.lock` JSON has `"mode": "symlink"` |
| `to_snapshot` | `deck to-snapshot` converts to real directory | 1 | `lstat` shows real dir (not symlink) |
| `snapshot_content` | Content preserved after snapshot | 1 | `SKILL.md` exists in snapshot dir |
| `lock_snapshot` | Lock file updated to `mode: snapshot` | 1 | `skill-deck.lock` JSON has `"mode": "snapshot"` |
| `idempotent_snap` | Second `to-snapshot` is no-op | 1 | Output contains "already" |
| `to_symlink` | `deck to-symlink` converts back to symlink | 1 | `lstat` shows symlink again |
| `lock_symlink2` | Lock file updated back to `mode: symlink` | 1 | `skill-deck.lock` JSON has `"mode": "symlink"` |
| `idempotent_link` | Second `to-symlink` is no-op | 1 | Output contains "already" |
| `link_preserve` | `deck link` preserves current mode | 1 | After link, entry remains in current mode |
| `isolation` | No file in `~/.agents/skill-repos` modified | 1 | cold_pool path is TMPDIR subdir |

## Verdict

- **PASS**: all 1-weight criteria met
- **PARTIAL**: 9+ criteria met
- **FAIL**: <9 criteria met
