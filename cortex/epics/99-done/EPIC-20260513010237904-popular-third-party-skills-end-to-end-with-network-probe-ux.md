---
lane: main
checklist_completed: false
checklist_skipped_reason: agent non-interactive session
---
# EPIC-20260513010237904: Popular third-party skills end-to-end with network probe UX

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> Popular third-party skills end-to-end with network probe UX

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-12 | Created |
| done | 2026-05-14 | 5/6 completed, 1 suspended (bun publish eval — publish.sh stable) |

## 背景故事
<!-- 填写需求来源:触发事件、问题描述、目标价值 -->

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

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260513010246527 | completed | probeConnectivity with concurrent racing + error collection (8b097c5) |
| TASK-20260513033254695 | completed | Restore refresh apply-mode — default plan-only, `--exec` triggers execution; ADR updated with scheme E |
| TASK-20260513033256305 | completed | Wire probeConnectivity into plan→apply boundary — deck add probes cloneUrl, deck refresh probes first git target |
| TASK-20260513033455974 | completed | Restore CLI subcommand `--help` — cortex + deck CLI check for `--help`/`-h` anywhere in args before positional processing |
| TASK-20260513035226597 | suspended | Evaluate `bun publish` — deferred; current publish.sh is stable enough |
| TASK-20260513035228296 | completed | CI E2E publish-validation gate — publish.sh spawns clean bunx + bun add in tmp dir to verify resolution |

## 经验沉淀

## 归档条件
- [ ] 所有任务完成
- [ ] 验证通过
