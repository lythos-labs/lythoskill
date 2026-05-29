# TASK-20260529132734903: deck refresh: behind count accuracy + monorepo report clarity

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-29 | Created from external agent report (playground/lythoskill-improvement-proposal.md) |

## 背景与目标

External agent (Kimi · Practice, design-sample2 workspace) reported two UX issues in `deck refresh`:

1. **Behind count overestimation**: `probeBehindCount` uses `git fetch --depth=1` + `git rev-list HEAD...@{upstream} --count`. The shallow fetch changes the shallow boundary, causing the count to include the boundary itself. Real scenario: 1 new commit reported as "2 behind".

2. **Monorepo report confusion**: `deck refresh --exec` pulls per git root but reports per skill. In a monorepo with 3 skills from 1 repo, only the first skill shows "Updated", the other 2 show "Up-to-date" — users may think those 2 were skipped.

Source: `playground/lythoskill-improvement-proposal.md` (2026-05-28)

## 需求详情

- [ ] Fix behind count accuracy (P1)
  - Option A: `--left-only` flag on `rev-list` (verify shallow-clone behavior)
  - Option B: Remove `--depth=1` (performance impact)
  - Option C: UI approximation `~N behind` (lowest risk, short-term)
- [ ] Improve monorepo report clarity (P2)
  - Group output by git root (repo)
  - Show "repo updated → N skills synced" instead of per-skill "Up-to-date" for monorepo siblings
- [ ] Add reproduce.sh for refresh (plan-only or mock-git, NEVER touch user's real cold pool)
- [ ] Update `probeBehindCount` tests to cover shallow-clone scenario

## 技术方案

### Behind count

```typescript
// Current (refresh.ts:27-38)
execSync("git fetch --depth=1 origin", ...);
const count = execSync("git rev-list HEAD...@{upstream} --count", ...);

// Option A (to verify):
const count = execSync("git rev-list --left-only HEAD...@{upstream} --count", ...);

// Option C (UI-only, immediate):
const behindStr = t.behind === undefined ? '?' : t.behind > 0 ? `~${t.behind} behind` : 'up to date';
```

### Monorepo report

Group `plan.targets` by `gitRoot` before executing/reporting:

```
📦 Skill Refresh Report — 8 skill(s) in 4 repo(s)
   Repos updated: 4 | Skills synced: 8 | Skipped: 0 | Failed: 0

   lythos-labs/lythoskill (3 skills): 🔄 Updated
     └─ lythoskill-deck, lythoskill-curator, lythoskill-coach
```

### Reproduce.sh

Use `git init` + `git commit` in TMPDIR to create isolated repos. NEVER use `~/.agents/skill-repos`.

## 验收标准

- [ ] `deck refresh` (plan-only) shows `~N behind` or accurate count for shallow-cloned repos
- [ ] `deck refresh --exec` groups monorepo skills under repo header
- [ ] `bun --filter='*' run test` all green
- [ ] reproduce.sh for refresh: plan-only mode, mock git repos, no user cold pool touched
- [ ] ZK validation: external agent reads output and self-reports understanding

## 进度记录

<!-- 执行时更新，带时间戳 -->

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
