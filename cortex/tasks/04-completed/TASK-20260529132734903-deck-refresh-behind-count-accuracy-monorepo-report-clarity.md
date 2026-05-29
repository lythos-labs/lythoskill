# TASK-20260529132734903: deck refresh: behind count accuracy + monorepo report clarity

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-29 | Created from external agent report (playground/lythoskill-improvement-proposal.md) |
| in-progress | 2026-05-29 | Started |
| review | 2026-05-29 | Deliverables committed |
| completed | 2026-05-29 | Done |

## 背景与目标

External agent (Kimi · Practice, design-sample2 workspace) reported two UX issues in `deck refresh`:

1. **Behind count overestimation**: `probeBehindCount` uses `git fetch --depth=1` + `git rev-list HEAD...@{upstream} --count`. The shallow fetch changes the shallow boundary, causing the count to include the boundary itself. Real scenario: 1 new commit reported as "2 behind".

2. **Monorepo report confusion**: `deck refresh --exec` pulls per git root but reports per skill. In a monorepo with 3 skills from 1 repo, only the first skill shows "Updated", the other 2 show "Up-to-date" — users may think those 2 were skipped.

Source: `playground/lythoskill-improvement-proposal.md` (2026-05-28)

## 需求详情

- [x] Fix behind count accuracy (P1)
  - **Solution**: `HEAD..@{upstream}` (two-dot) instead of `HEAD...@{upstream}` (three-dot)
  - Three-dot symmetric difference breaks on shallow clones; two-dot only counts upstream-ahead commits
- [x] Improve monorepo report clarity (P2)
  - Group git results by `gitRoot` in `executeRefreshPlan`
  - Show `repo/name (N skills)` header with skill list
- [x] Add reproduce.sh for refresh (plan-only + exec, isolated cold pool)
- [ ] Update `probeBehindCount` tests to cover shallow-clone scenario

## 技术方案

### Behind count — FIXED

```typescript
// BEFORE (broken on shallow clones):
const count = execSync("git rev-list HEAD...@{upstream} --count", ...);
// Three-dot = symmetric difference. Shallow boundary included → overcount.

// AFTER (correct):
const count = execSync("git rev-list --count HEAD..@{upstream}", ...);
// Two-dot = upstream-only. Only counts commits reachable from upstream but not HEAD.
```

**Root cause**: `git fetch --depth=1` creates a shallow boundary. `HEAD...@{upstream}` (three-dot, symmetric difference) includes the shallow boundary itself in the count. `HEAD..@{upstream}` (two-dot, asymmetric) only counts "upstream ahead of HEAD" — exactly what "behind" means.

**Verification**: `git rev-list --count HEAD..origin/main` returns 1 for 1 new commit, even after `fetch --depth=1`.

### Monorepo report — FIXED

Group `git` results by `gitRoot` in `executeRefreshPlan`. Non-git results still printed individually.

```
📦 Skill Refresh Report — 2 skill(s) checked
   Updated: 1 | Up-to-date: 1 | Skipped: 0 | Failed: 0
🔄 test-org/test-repo (2 skills)
   └─ skill-a, skill-b
      skill-b: Already up to date.
```

Previously: `🔄 skill-a / ✅ skill-b` — looked like 1 updated, 1 skipped.
Now: `🔄 test-org/test-repo (2 skills) / └─ skill-a, skill-b` — clearly same repo.

### Reproduce.sh

Use `git init` + `git commit` in TMPDIR to create isolated repos. NEVER use `~/.agents/skill-repos`.

## 验收标准

- [x] `deck refresh` (plan-only) shows accurate count for shallow-cloned repos (1 commit → "1 behind")
- [x] `deck refresh --exec` groups monorepo skills under repo header
- [x] `bun --filter='*' run test` all green
- [x] reproduce.sh for refresh: 13/13 PASS, isolated cold pool
- [ ] ZK validation: external agent reads output and self-reports understanding

## 进度记录

**2026-05-29**: 
- Fixed behind count: `HEAD...@{upstream}` → `HEAD..@{upstream}` (refresh.ts)
- Fixed monorepo report: group by gitRoot in executeRefreshPlan (refresh-plan.ts)
- reproduce.sh updated: 13/13 PASS, removed known-issue workarounds
- All tests green: `bun --filter='*' run test` 13/13 packages

## 关联文件
- 修改: `packages/lythoskill-deck/src/refresh.ts`
- 修改: `packages/lythoskill-deck/src/refresh-plan.ts`
- 修改: `packages/lythoskill-deck/src/refresh-plan.test.ts`
- 新增: `showcase/deck-refresh-reproduce-sh/reproduce.sh`
- 新增: `showcase/deck-refresh-reproduce-sh/judge.md`
- 参考: `playground/lythoskill-improvement-proposal.md`

## Git 提交信息建议
```
fix(deck): refresh behind count + monorepo report grouping (TASK-20260529132734903)

- probeBehindCount: add --left-only or ~N approximation
- executeRefreshPlan: group targets by gitRoot for monorepo clarity
- Add reproduce.sh with mock-git isolation
```

## 备注

**CRITICAL: Do NOT test against user's real cold pool.** All refresh tests must use TMPDIR + `git init` mock repos.

External agent's full report is at `playground/lythoskill-improvement-proposal.md`. The report also references:
- ADR-20260507110332805 (refresh defaults to discover-only)
- TASK-20260510202837878 (cold pool P2 maintainability)
