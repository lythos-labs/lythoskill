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
| active | 2026-05-11 | Created |

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
| TASK-20260511235656113 | backlog | cold-pool: fetch-plan git checkout failure silently returns wrong status |
| TASK-20260511235909747 | backlog | cold-pool: walk() bare catch drops subtree (cold-pool.ts:131) |
| TASK-20260511235909780 | backlog | cold-pool: collectRecursive() bare catch drops subtree (cold-pool.ts:157) |
| TASK-20260511235909808 | backlog | cold-pool: calculateDirSize() returns 0 on error (prune-plan.ts:64) |
| TASK-20260511235909835 | backlog | cortex: post-commit git() helper ignores exit code (post-commit.ts:16) |
| TASK-20260511235909866 | backlog | cortex: pre-commit git() helper ignores exit code (pre-commit.ts:16) |
| TASK-20260511235909913 | backlog | deck: refresh-plan bare catch misclassifies timeout as not-git (refresh-plan.ts:81) |

### Medium (4)

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260512000201440 | backlog | arena: narrow 4 catch/log patterns (cli.ts:174,284,309,313) |
| TASK-20260512000201473 | backlog | deck: return error indicators from metadata ops (link/add/remove) |
| TASK-20260512000201505 | backlog | curator: narrow 2 catch patterns (cli.ts:508,873) |
| TASK-20260512000201534 | backlog | cortex: fix 5 medium patterns (dispatch/ADR/config/coupling) |

### Low/Info (deferred)

6 low + 3 info findings in `generate-index.ts`, `id-guard.ts`, `flow.ts`, `fs.ts`, `guard.ts`.
Not task-tracked individually — fix opportunistically when touching those files.

## 经验沉淀

## 归档条件
- [ ] 所有任务完成
- [ ] 验证通过
