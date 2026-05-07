# ADR-20260507190157540: Cold-pool project isolation: snapshot (default) vs sync dual-mode with guided intent switch

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-07 | Created from cold-pool + metadata layer architecture discussion |

## 背景

### 核心问题

不同项目对同一 skill 的版本要求不一样。当前 symlink 模式意味着所有项目始终看到 cold pool 的最新版本——一个 `git pull` 更新上游，所有项目立刻受影响：

1. **Project A** 依赖 `skill-x` v1 行为，**Project B** 需要 v2 新功能。更新 cold pool → Project A 突然行为变化。
2. **回归调试**：想回退到"上周那个版本"时，symlink 没有历史锚点。
3. **CI 可复现性**：CI 环境 clone 不同版本的 cold pool，行为不一致。

### 但另一面

也有用户希望统一更新——"所有项目都用最新 tdd skill，不要每个项目单独管版本"。这个需求同样合法。

### 矛盾

- Symlink = 始终最新（跨项目一致，但惊喜变化）
- Snapshot = 定在某版（项目隔离，但版本分裂需手动管理）

**结论**：不是选一个，而是两个都提供。默认安全（snapshot），显式意图切换（sync）。

## 决策驱动

1. **默认安全优先**（用户语："不同项目可能对版本要求不一样"）：`deck add` 自动获得版本锁定的工作副本
2. **显式意图切换**：想统一更新的用户通过 `deck sync` 表达意图
3. **Metadata DB 已有基础设施**：`repos.head_ref` 是版本凭证，`deck_refs` 记录引用关系
4. **Ref-counting 两种模式都适用**：snapshot 和 symlink 都需要引用计数来安全 GC

## 选项

### 方案 A: 永远 symlink（现状）

- **优点**：disk 最省，实现简单
- **缺点**：上游更新 = 所有项目同时变化，无版本隔离。已被 user feedback 多次质疑。— **Rejected**

### 方案 B: 永远 snapshot

- **优点**：彻底隔离，CI 可复现
- **缺点**：disk 冗余；需要统一更新的用户每个项目手动维护。— **Rejected**

### 方案 C: Snapshot 默认 + sync 可选，metadata-driven 引导切换 — Selected

```bash
deck add <locator>          # 默认 snapshot（cp 到 working set，pin 当前 head_ref）
deck add <locator> --sync   # symlink 模式（始终跟随 cold pool）
deck sync <name>            # snapshot → symlink（切换意图）
deck freeze <name>          # symlink → snapshot（pin 当前版本）
```

**Snapshot 模式**：
- `cp -r <cold-pool>/<locator> <working-set>/<name>`
- metadata 记录 `git_head_ref` + `mode: snapshot`
- `deck refresh` 仅 report："Snapshot at abc1234 (3 commits behind). `deck sync` to update."

**Sync 模式**：
- `ln -s <cold-pool>/<locator> <working-set>/<name>`（现状行为）
- metadata 记录 `mode: sync`
- `deck refresh --apply` 直接 `git pull`，所有 sync 项目立刻感知

**引导式意图切换**：
- `deck refresh` 发现 cold pool HEAD 变化时，对 snapshot 模式只报告、不操作
- 对 sync 模式，`--apply` 直接更新
- 用户不会"不知不觉"被更新，但随时可以 opt in 到 sync 模式

## 影响

### 正面
- 新用户默认安全，不担心上游更新破坏
- 高级用户保留灵活：`--sync` 切到实时模式
- metadata DB 的 ref-counting 两种模式都适用
- CI 可复现：snapshot 固定 commit

### 负面
- Disk 用量增加（每项目一份 repo 副本）
- link.ts 实现需分支处理 cp vs ln
- `deck refresh` 语义分裂：snapshot 模式只 report，sync 模式可 apply

### 后续
1. ADR accept 后拆分 task：`deck add --sync` / `deck sync` / `deck freeze` / link.ts cp-vs-ln 分支
2. snapshot 存储位置待定：`<working-set>/<name>/` 还是 `<project>/.lythos/snapshots/<name>/`
3. `deck prune` 的快照清理：snapshot 不再被任何 deck 引用时标记为可清理

## 相关
- 关联 ADR: `ADR-20260507021957847` (ColdPool as dedicated resource holder)
- 关联 ADR: `ADR-20260507143241493` (metadata layer — git-native hash + SQLite)
- 关联 memory: `project_cold_pool_metadata_layer_research.md`
- 关联 wiki: `cold-pool-unified-facility-design.md`
