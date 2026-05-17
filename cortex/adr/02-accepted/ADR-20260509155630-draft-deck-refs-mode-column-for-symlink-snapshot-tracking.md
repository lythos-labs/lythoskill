# ADR-20260509155630-DRAFT: deck_refs mode column — track symlink/snapshot per reference

## Status
proposed（讨论草案，未实现）

## 背景

ADR-20260509144134332 在 deck_refs 表引入了 FSM（state = added/linked/removed），
解决了跨卡组引用计数的问题。但 deck_refs 当前只跟踪"有没有引用"（state），
不跟踪"用了什么模式引用的"（mode = symlink | snapshot）。

实际上 deck 的每个 skill 有 `mode: 'symlink' | 'snapshot'` 字段（schema.ts），
记录在 lock 文件里。但 metadata DB 的 deck_refs 没有 mode 列有以下代价：

1. **不能做 mode 级别的引用计数**。一个 skill 被 deck A 以 symlink 引用、被 deck B
   以 snapshot 引用 —— 合并后不知道哪个 mode 用了多少次
2. **prune 的决策不够精确**。mode 为 snapshot 的引用有"冻结版本"的语义，跟 symlink
   的"实时追踪"不同。但目前的 prune 一视同仁（只看有/无引用）
3. **不一致检测缺这个维度**。比如 link 后发现 lock 写的是 snapshot 但 metadata 记的
   是 symlink —— 目前没法检测这种不一致

## 相关设计

- `schema.ts`: `mode: z.enum(["symlink", "snapshot"]).default("symlink")` — 已有规范
- 现有的 `reconcileDeckReferences` 调用处（link.ts:560）已经拿到了
  `declaredSkills: Array<{locator, alias}>`，如果加 mode，参数类型改为
  `Array<{locator, alias, mode}>` 即可
- FSM 的 `state` 独立于 `mode`：同一行可以有 `state='linked', mode='symlink'` 或
  `state='linked', mode='snapshot'`

## 选项

### 方案 A：deck_refs 加 mode 列

**改动**：
- schema migration v6: `ALTER TABLE deck_refs ADD COLUMN mode TEXT DEFAULT 'symlink'`
- `addReference` / `reconcileDeckReferences` 接受可选 `mode` 参数
- `getReferencingDecks` 返回 mode 信息
- `getActiveLocators` 可以按 mode 过滤（例如：哪些是 symlink 模式的引用）

**优点**：
- deck_refs 成为完整的引用 + 模式状态快照
- 可以回答："这个 skill 有几个 deck 以 symlink 引用了它？"
- 继承 FSM 事务性

**缺点**：
- deck_refs 的写入方需要知道 mode（目前 link.ts 知道、但 remove.ts 不知道 —— 移除时 mode 已无关）
- 增加了 schema 复杂度

### 方案 B：mode 不从 deck_refs 读，从 lock 文件读

保持 deck_refs 纯粹做引用计数，mode 从 `skill-deck.lock` 读取。

**优点**：
- deck_refs 保持干净（引用层不耦合具体模式）
- mode 始终跟 lock 文件一致（唯一的权威来源）

**缺点**：
- prune 做 mode 级别决策时要去读 lock 文件，多一步跨模块调用
- lock 可能跟 metadata 不一致（不提供交叉验证能力）

## 决策
**未定** — 草案留待后续讨论。

个人倾向方案 A（加 mode 列），原因：
1. metadata DB 就是用来做交叉验证的，mode 是其自然维度
2. FSM 已奠定了事务性 upsert 模式，加 mode 的边际成本低
3. link.ts 的 `declaredSkills` 参数加 mode 是兼容的（扩展而非破坏）

## 实施状态（2026-05-09）
**schema-first**: metadata-db 的 `deck_refs` 表已在 v6 迁移加了 `mode TEXT DEFAULT 'symlink'` 列。
查询和更新方法暂未补全（`addReference`/`reconcileDeckReferences` 不带 mode 参数）。
等实际使用中发现 mode 级别区分需求时再补全。


| accepted | 2026-05-17 | Accepted |
