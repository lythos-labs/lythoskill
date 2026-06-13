---
lane: main
checklist_completed: true
checklist_skipped_reason: BDD scenarios validated PASS 2026-05-17, tasks recreated + completed
---
# EPIC-20260517121757041: Agent BDD 覆盖 — deck/arena skill 行为验证

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> Agent BDD 覆盖 — deck/arena skill 行为验证

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-17 | Created |
| active | 2026-05-17 | Tasks linked, body filled |
| done | 2026-05-17 | Done |

## 背景故事
Deck and arena skills had zero behavioral test coverage. Manual verification after each change. 5 BDD scenarios validated 2026-05-17 in session 9 — all PASS. Tests are scenario-based agent BDD (agent validates behavior via subagent execution), not CI-runnable unit tests.

## 需求树

### 主题A: Deck核心行为 #completed
- **产出**: 2 BDD scenarios, PASS
- **验证**: TASK-20260517193950675, TASK-20260517193950732

### 主题B: Snapshot + Arena BDD #completed
- **产出**: 3 BDD scenarios, PASS
- **验证**: TASK-20260517193950780, TASK-20260517193958181, TASK-20260517193958229

### 主题C: Remaining work #backlog
- **需求**: per-skill mode reconciler
- **实现**: TASK-20260517122556223

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260517142840955 | agent-adapter independent spawn | accepted |
| ADR-20260517152850372 | deck also_link_to multi-CLI POSSE | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260517193950675 | completed | Deck basics BDD — link/add/phase-switch/restore |
| TASK-20260517193950732 | completed | Innate eager-load vs tool lazy boundary BDD |
| TASK-20260517193950780 | completed | Snapshot symlink roundtrip BDD |
| TASK-20260517193958181 | completed | Arena single + cross-deck vs trigger stability BDD |
| TASK-20260517193958229 | completed | Map-reduce parallel critique cells BDD |
| TASK-20260517122556223 | backlog | Wire per-skill mode into deck link reconciler |

## 归档条件
- [x] 5 BDD scenarios validated PASS
- [ ] per-skill mode wired into reconciler (TASK-20260517122556223)
- [ ] CI-runnable test coverage where feasible
