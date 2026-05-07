# Cold-pool CLI boundary: status, prune, reconcile vs deck refresh

**Date:** 2026-05-07  
**Status:** design consensus  
**Related:** ADR-20260507021957847, ADR-20260507190157540, EPIC-20260507191713917

---

## 问题

`@lythos/cold-pool` 有独立的 metadata DB、git 原语、plan/execute 基础设施，但 CLI 入口寄生于 `@lythos/skill-deck`（`deck prune`、`deck refresh`）。随着 reconcile、snapshot/sync dual-mode 的设计推进，"寄生"导致语义模糊——用户不知道这是 deck 操作还是 cold-pool 操作。

## 决策

`@lythos/cold-pool` 获得独立 CLI，不寄生在 deck 里。两个包各有清晰的命令边界：

```
@lythos/skill-deck              @lythos/cold-pool
  add <locator>                    status       对比 cold pool HEAD vs upstream + lock（plan-first，只 report）
  link                             status --fix 收敛版本漂移（git pull + 更新 metadata）
  remove                           prune        GC 孤立 repo（ref-counting 安全，全量）
  refresh                          prune --deck <path>  只清理本 deck 关联的（别名 = 全量场景的子集）
  validate
```

### 命令语义

| 命令 | 范围 | 作用 |
|------|------|------|
| `deck add` | deck | 下载到冷池 + 写 toml + link（桥接操作） |
| `deck link` | deck | toml ↔ 工作集收束 |
| `deck remove` | deck | 从 toml + 工作集移除 |
| `deck refresh` | deck | 拉平本 deck 声明的 skill 到 upstream latest（含 snapshot 模式的 cp 更新 + validate） |
| `deck validate` | deck | 检查 toml 语法 + skill 路径有效性 |
| `cold-pool status` | pool | 对比 HEAD vs upstream + lock 记录（全量或 --deck 筛选） |
| `cold-pool prune` | pool | GC 孤立 repo（heredoc 审计，不自动删） |

### refresh 为什么留在 deck

`deck refresh` 不是单纯的 `git pull` 语法糖。它做了 cold-pool 不知道的事：

1. **Snapshot 模式**：更新冷池 → 重新 cp 到工作集 → 自动 `deck validate` 验证路径没坏
2. **Sync 模式**：更新冷池 → symlink 自然跟随 → 同样 validate
3. **范围**：只管本 deck 声明的 skill，不碰别人的

这是 deck 级的安全更新——"确保我的卡组用最新版且没坏"。

### prune 为什么移到 pool

Prune 是冷池空间回收，靠 metadata DB 的 `deck_refs` 引用计数来判断"这个 repo 还有人用吗"。这是 pool 级操作——和 pool 的 metadata 直接相关，和 deck 的 toml 间接相关。

### 0.10.x breaking changes

- `deck prune` 删除（用 `cold-pool prune`）
- `deck refresh` 保留（语义从"cold pool 更新"升级为"卡组安全拉平"）
- `cold-pool status` 新增
- `cold-pool prune` 新增

## 原则

- **不寄生**：每个包的 CLI 只操作自己管辖的资源
- **语义糖有意义**：即使底层是同一个 git pull，deck 层加了 validate，就是 deck 特有的价值
- **用户按对象名就能猜到**：`deck` 操作的是卡组，`cold-pool` 操作的是冷池

## 关联

- ADR-20260507021957847: ColdPool as dedicated resource holder
- ADR-20260507190157540: Snapshot vs sync dual-mode
- ADR-20260507110332770: Prune as audit heredoc
- ADR-20260507110332805: Refresh discover-then-apply
- EPIC-20260507191713917: Cold-pool reconcile + dual-mode
- wiki: `cold-pool-unified-facility-design.md`
