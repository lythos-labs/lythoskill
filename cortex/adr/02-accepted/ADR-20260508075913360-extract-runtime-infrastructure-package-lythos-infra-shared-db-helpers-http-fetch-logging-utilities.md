# ADR-20260508075913360: Extract runtime infrastructure package (@lythos/infra)

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-08 | Created — SqliteDb in cold-pool, fetch in deck pointed to same pattern |
| accepted | 2026-05-08 | Accepted |

## 背景

当前两个通用基础设施组件寄宿在业务包里：

| 组件 | 当前位置 | 消费者若想用 |
|------|----------|-------------|
| `SqliteDb` (lazy-open, migrations, exec/queryOne/queryAll) | `@lythos/cold-pool` | curator 需依赖整个 cold-pool |
| HTTP fetch (timeout, ghproxy, retry) | `@lythos/skill-deck` (link.ts) | curator discover、arena 需各自实现 |

这是"前端很清楚我在说什么"的 `@company/shared` 模式——运行时通用基座不应寄宿在任何业务包里。

## 决策驱动

1. **SqliteDb 已经在 cold-pool 里，但它不是 cold-pool 特有的**：lazy-open pattern、schema migrations、DRY wrappers 是任何 SQLite 消费者的通用需求
2. **HTTP fetch 下沉避免重复**：curator 的 feed adapter 也在做 HTTP 请求，arena 也需要。目前各自手写
3. **类比前端 `common/utils` 包**：fetch wrapper、logger、retry、timeout 是基础设施，业务代码不应关心实现细节

## 选项

### 方案 A: 保留现状（基础设施寄宿在业务包）

- **优点**: 零迁移成本
- **缺点**: curator 依赖 cold-pool 只为拿 SqliteDb；fetch 重复实现。— **Rejected**

### 方案 B: 新建 @lythos/infra — Selected

```
@lythos/infra
  ├── src/db-helpers.ts        ← SqliteDb（从 cold-pool 迁出）
  ├── src/fetch.ts              ← fetchWithTimeout, fetchWithRetry, ghproxy
  ├── src/logger.ts             ← 后续可加（结构化日志）
  └── package.json              ← 零外部依赖（仅 Bun 内置）
```

- `@lythos/cold-pool` 依赖 `@lythos/infra`，删 `db-helpers.ts`
- `@lythos/skill-curator` 依赖 `@lythos/infra`，catalog DB 继承 `SqliteDb`
- `@lythos/skill-deck` 依赖 `@lythos/infra`，URL fetch 走 `infra/fetch`

### 方案 C: 不建新包，放到 @lythos/agent-adapter

- **缺点**: agent-adapter 语义不匹配；DB helper 和 agent 无关。— **Rejected**

## 决策

**选择**: 方案 B。`@lythos/infra` 作为零依赖运行时基座。

## 影响

- 正面: curator 不再需要依赖 cold-pool 只为拿 SqliteDb；fetch 统一实现（proxy、retry、timeout）
- 负面: 新增一个 workspace package；迁移 cold-pool 的 db-helpers.ts（向后兼容 re-export 可过渡）
- 后续: 0.10.x window 内迁移，旧路径保留 re-export 一个版本后删除

## 相关
- 关联 ADR: `ADR-20260507143241493` (metadata layer — SqliteDb 的发源地)
- 关联: `packages/lythoskill-cold-pool/src/db-helpers.ts`
- 关联: `packages/lythoskill-deck/src/link.ts` (fetch URL deck)
