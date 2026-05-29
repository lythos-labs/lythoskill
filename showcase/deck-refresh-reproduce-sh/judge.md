# Judge Criteria — Deck Refresh reproduce.sh

> Task agent never sees this file. Only the judge agent reads it.

## Task Context

Verify `deck refresh` behavior with isolated cold pool:
1. Setup mock git remote with 2 skills
2. Clone to test cold pool
3. Create skill-deck.toml pointing to test cold pool
4. `deck link` to establish working set
5. Add commit to remote
6. `deck refresh` (plan-only) — observe behind count
7. `deck refresh --exec` — apply updates
8. Verify working set still valid
9. Second `deck refresh` — should show up-to-date

## Known Issues (documented, not failures)

| Issue | Current Behavior | Expected | Tracking |
|-------|-----------------|----------|----------|
| Behind count overcount | "2 behind" for 1 commit | "1 behind" | TASK-20260529132734903 |
| Monorepo report | 1 Updated + 1 Up-to-date for same repo | Both Updated or repo-level grouping | TASK-20260529132734903 |

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `setup` | Mock remote repo created with 2 skills + SKILL.md | 1 | `git log` shows initial commit |
| `clone` | Cold pool cloned from remote | 1 | Cold pool directory has `.git` |
| `link` | `deck link` creates both symlinks | 1 | `.claude/skills/skill-a` and `skill-b` are symlinks |
| `plan_output` | Plan-only refresh shows skills with behind count | 1 | Output contains "Refresh Plan" and skill lines |
| `behind_documented` | Behind count discrepancy is documented (not hidden) | 1 | Output or comments reference TASK-20260529132734903 |
| `exec_pull` | Exec refresh performs git pull | 1 | Output shows "Updated:" count >= 1 |
| `exec_link` | Exec refresh triggers deck link | 1 | Output contains "Running deck link" |
| `ws_preserved` | Working set symlinks valid after refresh | 1 | Both symlinks still resolve after exec |
| `idempotent` | Second refresh shows up-to-date | 1 | Output contains "up to date" |
| `isolation` | No file in `~/.agents/skill-repos` modified | 1 | cold_pool path is TMPDIR subdir |

## Verdict

- **PASS**: all 1-weight criteria met
- **PARTIAL**: 7+ criteria met
- **FAIL**: <7 criteria met
