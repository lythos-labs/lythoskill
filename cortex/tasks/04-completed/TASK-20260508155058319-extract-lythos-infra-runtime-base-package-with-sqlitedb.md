# TASK-20260508155058319: Extract @lythos/infra runtime base package with SqliteDb

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-08 | Created |
| completed | 2026-05-08 | Closed via trailer |

## 背景与目标

通用能力已在多个业务包中自然重复出现：
- **DB**: `SqliteDb`（lazy-open、migrations、helpers）当前在 `@lythos/cold-pool`，curator 也想用
- **Fetch**: URL config fetch 散落在 `deck` 和 `arena` CLI 中，各自内联实现

这不是"新建一个包"的远景规划，而是**已发生的散落需要自然沉淀**。`@lythos/infra` = 前端 `@company/shared` 模式：零依赖运行时基座，被多个业务包共享。

## 需求详情

- [ ] 新建 `packages/lythoskill-infra/` 包（零运行时依赖，除 better-sqlite3）
- [ ] 从 cold-pool 提取 `SqliteDb` 基类（lazy-open、connection lifecycle、migrations runner）
- [ ] 从 cold-pool 提取 `exec`/`queryOne`/`queryAll` 等数据库辅助方法
- [ ] 从 deck + arena 提取通用 `fetchConfigFromUrl(url, { cacheDir, timeout })`（GitHub raw 转换、本地缓存）
- [ ] `@lythos/cold-pool` 改为依赖 `@lythos/infra`，迁移 `MetadataDB` 继承 `SqliteDb`
- [ ] `@lythos/deck` 和 `@lythos/arena` 复用 infra 的 config fetch，删除内联 fetch 代码
- [ ] 保持 API 完全兼容：现有测试无需改动即可通过

## 技术方案

- ADR-20260508075913360 已 accepted，作为决策依据
- 前端 `@company/shared` 模式：infra = 被多个业务包共享的运行时基座
- `SqliteDb` 基类保留 `lazyOpen()`、`migrate()`、`exec()`、`queryOne<T>()`、`queryAll<T>()` 签名
- cold-pool 的 `MetadataDB` 改为 `class MetadataDB extends SqliteDb`，保留业务 schema 和 migration
- 发布顺序：infra 先 publish，cold-pool 更新依赖后 publish

## 验收标准

- [ ] `@lythos/infra` 包创建并 publish（v0.9.36+）
- [ ] `SqliteDb` 在 infra 中完整可用，API 与 cold-pool 中一致
- [ ] `@lythos/cold-pool` 所有测试通过（131 pass / 0 fail）
- [ ] 无功能回退：metadata DB 的 schema、migrations、查询行为不变
- [ ] `packages/lythoskill-infra/src/index.ts` 导出 `SqliteDb` + 基础类型

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件

- 参考: `ADR-20260508075913360`
- 修改: `packages/lythoskill-cold-pool/src/metadata-db.ts`
- 修改: `packages/lythoskill-cold-pool/src/db-helpers.ts`
- 修改: `packages/lythoskill-deck/src/resolve-deck.ts`（复用统一 fetch）
- 修改: `packages/lythoskill-arena/src/cli.ts`（复用统一 fetch）
- 新增: `packages/lythoskill-infra/` 目录及 package.json、src/index.ts、src/sqlite-db.ts、src/config-fetch.ts
- 修改: `scripts/publish.sh`（加入 infra 包）

## Git 提交信息建议

```
feat(infra): extract @lythos/infra runtime base package with SqliteDb (TASK-20260508155058319)

- New package: zero runtime deps except better-sqlite3
- SqliteDb base class: lazy-open, migrations, exec/queryOne/queryAll
- cold-pool MetadataDB migrates to extend SqliteDb
- All cold-pool tests pass without changes

Closes: TASK-20260508155058319
```

## 备注

此 task 是**自然沉淀**而非远景规划。DB 和 fetch 的散落在日常开发中已实际发生，infra 只是给这个趋势一个正式的包边界。推荐与 curator 迁移（TASK-20260508155059504）在同一轮 release 中完成，避免中间态。
