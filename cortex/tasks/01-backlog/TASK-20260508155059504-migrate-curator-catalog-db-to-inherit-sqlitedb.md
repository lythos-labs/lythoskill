# TASK-20260508155059504: Migrate curator catalog DB to inherit SqliteDb

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-08 | Created |

## 背景与目标

curator 的 catalog DB 当前独立实现数据库操作，没有复用 `SqliteDb` 基类。随着 `@lythos/infra` 的落地，curator 应该继承统一的数据库抽象，获得 lazy-open、migrations、helper methods 等能力，同时减少重复代码。

目标： curator catalog DB 迁移到使用 `@lythos/infra` 的 `SqliteDb`，保持现有 schema 和功能完整。

## 需求详情

- [ ] `@lythos/curator` 添加对 `@lythos/infra` 的依赖
- [ ] curator catalog DB 类继承 `SqliteDb` 而非直接操作 better-sqlite3
- [ ] 迁移现有 migration 逻辑到 `SqliteDb` 的 migration 框架
- [ ] 保留现有 schema：registry 表、catalog 表、索引
- [ ] 所有 curator 测试通过

## 技术方案

- curator 的 catalog DB 当前直接 `new Database()`，改为 `class CatalogDb extends SqliteDb`
- 与 infra 提取（TASK-20260508155058319）同一轮 release 完成，避免中间态
- `SqliteDb.migrate()` 支持版本化 migration，curator 的 schema init 逻辑可以拆分为 migration scripts
- 查询方法从手写 `db.prepare().all()` 改为 `this.queryAll<T>()`

## 验收标准

- [ ] curator 依赖 `@lythos/infra` 而非直接依赖 better-sqlite3（或两者都依赖，但数据库操作通过 infra）
- [ ] curator 所有测试通过（现有测试套件）
- [ ] 无 schema 破坏：现有 catalog DB 文件能正常打开和查询
- [ ] 代码行数减少（去除了重复的 connection management 和 helper 方法）

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件

- 同批完成: `TASK-20260508155058319`
- 修改: `packages/lythoskill-curator/src/`（catalog DB 相关文件）
- 参考: `packages/lythoskill-infra/src/sqlite-db.ts`
- 参考: `packages/lythoskill-cold-pool/src/metadata-db.ts`（迁移参考）

## Git 提交信息建议

```
refactor(curator): catalog DB inherits SqliteDb from @lythos/infra (TASK-20260508155059504)

- Replace direct better-sqlite3 usage with SqliteDb base class
- Migrate schema init to versioned migrations
- All curator tests pass

Closes: TASK-20260508155059504
```

## 备注

当前 curator 的 catalog DB 功能正常，此迁移是代码质量改进而非紧急修复。推荐与 infra 提取同一轮 release 完成，避免中间态（同时改两个包的依赖关系）。
