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
| TASK-20260513033254695 | backlog | Restore refresh apply-mode (plan-first guardrail) — implementation regressed from documented design |
| TASK-20260513033256305 | backlog | Wire probeConnectivity into plan→apply boundary for deck add/refresh — env probe insertion point |
| TASK-20260513033455974 | backlog | Restore CLI subcommand `--help` per ADR-20260423182606313 — cortex/refresh treat `--help` as positional arg |
| TASK-20260513035226597 | backlog | Evaluate `bun publish` vs `npm publish` + rewrite (Bun ≥1.3 may auto-rewrite workspace:*; verify via dry-run before any switch) |
| TASK-20260513035228296 | backlog | CI E2E publish-validation gate — spawn clean `bunx <pkg>@<new-version>` after publish to catch workspace:* and other manifest bugs |

## 经验沉淀

## 归档条件
- [ ] 所有任务完成
- [ ] 验证通过
