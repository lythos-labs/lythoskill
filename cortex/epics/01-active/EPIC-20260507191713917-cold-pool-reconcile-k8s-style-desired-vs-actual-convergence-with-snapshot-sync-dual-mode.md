---
lane: main
checklist_completed: false
checklist_skipped_reason: Follow-up to EPIC-20260507020846020; ADRs accepted, implementation scoped
---
# EPIC-20260507191713917: Cold-pool reconcile — k8s-style desired vs actual convergence with snapshot/sync dual-mode

> 前序 epic: EPIC-20260507020846020 (cold-pool foundation) — 已交付 core ColdPool manager + plan/execute 操作。
> 本 epic 交付 ADR-20260507021957847 的第 3 步后续: `cold-pool reconcile` 命令 + snapshot/sync dual-mode。

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-07 | Created as follow-up to EPIC-20260507020846020 |

## 背景故事

ColdPool manager 基础设施已交付（path + metadata + git IO + fetch/validate plan/execute），但 **reconcile 命令**（k8s-style desired ↔ actual 收敛）被划到了后续 epic。

同时讨论了"不同项目对版本要求不一样"的问题，ADR-20260507190157540 提出 snapshot（默认安全）+ sync（opt-in 统一更新）dual-mode。

此 epic 将 reconcile 命令与 dual-mode 一起交付。

## 需求树

### T1: `deck sync` / `deck freeze` CLI 命令 #backlog
- **触发**: ADR-20260507190157540 (snapshot vs sync dual-mode)
- **需求**: `deck sync <name>`（snapshot → symlink），`deck freeze <name>`（symlink → snapshot pin 当前 head_ref）
- **实现**: link.ts 分支处理 cp vs ln-s，metadata DB 记录 mode
- **产出**: CLI 子命令 + 测试
- **验证**: snapshot 模式 `deck refresh` 只 report，sync 模式 `--apply` 更新

### T2: `buildReconcilePlan` + `executeReconcilePlan` #backlog
- **触发**: ADR-20260507021957847 方案 C 的 reconcile 出口
- **需求**: 读取 skill-deck.lock（desired state），对比 cold pool filesystem（actual state），产出 diff plan
- **实现**: 纯函数 `buildReconcilePlan(coldPool, deckLock)` → `ReconcilePlan { missing, behind, extra }` + `executeReconcilePlan(plan, io)`
- **产出**: cold-pool/src/reconcile-plan.ts + 测试
- **验证**: 删除 cold pool 中某个 repo → reconcile 检测到 missing → 恢复

### T3: `deck reconcile` CLI 命令 #backlog
- **触发**: T2 完成 + ADR-20260507021957847
- **需求**: `deck reconcile [--apply]` 运行 reconcile plan，默认 plan-first（只显示，不操作）
- **实现**: 调用 buildReconcilePlan → 显示 diff → --apply 执行
- **产出**: deck/src/reconcile.ts + BDD 测试
- **验证**: CLI BDD 场景: cold pool drift → reconcile plan → --apply 收敛

### T4: snapshot 存储 + GC #backlog
- **触发**: ADR-20260507190157540 (snapshot 存储位置待定)
- **需求**: snapshot 存储位置（`<working-set>/<name>/` vs `<project>/.lythos/snapshots/<name>/`），`deck prune` 清理孤立快照
- **实现**: 决定存储位置 → 实现 → prune 扩展
- **产出**: ADR 补充 + 实现
- **验证**: 创建 snapshot → 删除 deck 引用 → prune 检测到孤立 snapshot

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260507021957847 | ColdPool as dedicated resource holder (k8s-style reconciliation) | accepted |
| ADR-20260507143241493 | Metadata layer — git-native hash + SQLite | accepted |
| ADR-20260507190157540 | Snapshot vs sync dual-mode with guided intent switch | proposed |
| ADR-20260507110332770 | Prune as audit heredoc | accepted |
| ADR-20260507110332805 | Refresh discover-then-apply | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|

## 经验沉淀

## 归档条件
- [ ] `buildReconcilePlan` + `executeReconcilePlan` 实现 + 测试
- [ ] `deck sync` / `deck freeze` CLI 命令
- [ ] `deck reconcile` CLI 命令
- [ ] snapshot 存储方案落地
- [ ] ADR-20260507190157540 accepted
