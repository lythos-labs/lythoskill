---
lane: emergency
checklist_completed: false
checklist_skipped_reason: "Non-interactive — findings from arena single scan, 35 items in findings.jsonl"
---
# EPIC-20260511235648324: QA sweep: empty catch hardening across core packages

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: emergency`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> QA sweep: empty catch hardening across core packages

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-11 | Created — arena single scan found 35 findings |
| done | 2026-05-11 | 11/11 tasks narrowed (not fully resolved) per commits dc5661d + 449696a + 19514d8 |

## 背景故事

2026-05-11 arena single + qa-sweep deck scan of 5 core packages (deck, arena, cold-pool, curator, cortex)
produced 35 findings: 7 high, 12 medium, 6 low, 3 info. Primary anti-patterns:
empty catch blocks (16), log-and-continue errors (7), spawnSync exit code suppression (6).

Source: `playground/qa-sweep-2026-05-11/findings.jsonl` + `report.md`

## 需求树

### 主题A #backlog
- **触发**:
- **需求**:
- **实现**:
- **产出**:
- **验证**:

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|

## 关联任务

### High (7)

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260511235656113 | completed | cold-pool: fetch-plan checkout logs e.message but still falls through to "already-present" — not returning checkout-failed status |
| TASK-20260511235909747 | completed | cold-pool: walk() narrowed — distinguishes ENOENT vs other errors, logs warn, but still silently returns on EACCES/EIO |
| TASK-20260511235909780 | completed | cold-pool: collectRecursive() narrowed — same pattern as walk() |
| TASK-20260511235909808 | completed | cold-pool: calculateDirSize() narrowed — logs unexpected errors but still returns 0 |
| TASK-20260511235909835 | completed | cortex: post-commit git() helper now returns {ok,stdout,stderr}, checks status === 0 |
| TASK-20260511235909866 | completed | cortex: pre-commit git() helper now checks spawnSync status |
| TASK-20260511235909913 | completed | deck: refresh-plan detectGitRoot narrowed — distinguishes "not a git repo" from real failures |

### Medium (4)

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260512000201440 | completed | arena: URL parse catch narrowed — only silences ERR_INVALID_URL, debug-logs others |
| TASK-20260512000201473 | completed | deck: metadata ops return error indicators (link/add/remove) — empty catches documented |
| TASK-20260512000201505 | completed | curator: empty catches documented with non-fatal intent comments |
| TASK-20260512000201534 | completed | cortex: dispatch/pre-commit/post-commit spawnSync status checks added |

### Low/Info (deferred)

6 low + 3 info findings in `generate-index.ts`, `id-guard.ts`, `flow.ts`, `fs.ts`, `guard.ts`.
Not task-tracked individually — fix opportunistically when touching those files.

## 经验沉淀

## 归档条件
- [ ] 所有任务完成
- [ ] 验证通过
