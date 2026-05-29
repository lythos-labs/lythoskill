# TASK-20260529132806774: deck refresh reproduce.sh with mock-git isolation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-29 | Created as sub-task of refresh UX improvements |
| completed | 2026-05-29 | Closed via trailer |

## 背景与目标

Replace stale `deck-refresh.agent.md` (deleted in commit 5af9240) with a `reproduce.sh` that validates `deck refresh` behavior without touching the user's real cold pool.

**Why mock-git**: `deck refresh --exec` performs `git pull` on repos in `~/.agents/skill-repos`. Running this in a test would mutate the user's actual skill collection. The reproduce.sh must create isolated git repos in TMPDIR.

## 需求详情

- [ ] Create mock git repo(s) in TMPDIR with commit history
- [ ] Create skill-deck.toml pointing to mock cold pool
- [ ] Run `deck refresh` (plan-only) and verify behind count output
- [ ] Run `deck refresh --exec` and verify pull + report
- [ ] Verify monorepo scenario: 2 skills from 1 repo, both reflect same pull result
- [ ] Cleanup: trap removes TMPDIR on exit

## 技术方案

```bash
# Setup mock remote repo
REMOTE="$TMPDIR/remote"
mkdir -p "$REMOTE/skills/skill-a" "$REMOTE/skills/skill-b"
git init "$REMOTE" && cd "$REMOTE"
git config user.name "test" && git config user.email "test@test.com"
# Write SKILL.md files, git add, git commit
git commit -m "initial"

# Setup cold pool as clone of remote
COLD="$TMPDIR/cold-pool"
git clone "$REMOTE" "$COLD/github.com/test-org/test-repo"

# Add new commit to remote
cd "$REMOTE" && echo "update" >> README.md && git add . && git commit -m "update"

# Now cold pool is 1 commit behind → deck refresh should report "1 behind"
```

## 验收标准

- [ ] `bash reproduce.sh` exits 0 with all PASS
- [ ] No file in `~/.agents/skill-repos` is modified
- [ ] Plan-only mode shows expected behind count
- [ ] Exec mode shows "Updated" for skills whose repo has new commits
- [ ] Monorepo skills (same repo) show consistent status
- [ ] judge.md has criteria for plan output, exec output, and monorepo grouping

## 进度记录

<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增: `showcase/deck-refresh-reproduce-sh/reproduce.sh`
- 新增: `showcase/deck-refresh-reproduce-sh/judge.md`
- 参考: `showcase/deck-add-reproduce-sh/reproduce.sh` (template)
- 参考: `playground/lythoskill-improvement-proposal.md`
- 父任务: TASK-20260529132734903

## Git 提交信息建议
```
feat(deck): refresh reproduce.sh with mock-git isolation (TASK-20260529132806774)

- Mock git remote + clone in TMPDIR, never touch ~/.agents/skill-repos
- Validates plan-only behind count + exec pull + monorepo grouping
- Replaces stale deck-refresh.agent.md
```

## 备注

**Parent**: TASK-20260529132734903 (deck refresh behind count + monorepo report)
**Blocked by**: Parent task's design decision on behind count fix (Option A/C)
**Can start independently**: Mock-git scaffold and basic reproduce.sh structure
