# TASK-20260510202837878: cold-pool P2 maintainability — dedup prune, O(N²) hasSkillMd, behind semantics, untyped lock, timestamp consistency, type drift, locator guards

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-10 | Created |
| completed | 2026-05-10 | Completed — commits bdd8069 + 4d2eecf + 83696ac |

## 背景与目标

Cold-pool 在维护性和代码健康度上有七处可改进点：

1. **Prune dedup** — prune 计划未去重，可能重复处理同一 skill
2. **O(N²) hasSkillMd** — 每次检查都用 `.some()` 遍历全部条目
3. **Behind 语义模糊** — `behind` 数组的含义未文档化
4. **Untyped lock** — lock 文件解析无类型约束
5. **Timestamp 不一致** — 同一事务中多次调用 `this.now()` 可能产生不同值
6. **Type drift** — DB 读出的字符串未显式 cast 到 union type
7. **Locator guards** — GitHub owner/repo/skill 无输入校验

## 需求详情

- [x] Prune 计划通过 DB 查询 active locators 去重
- [x] `hasSkillMd` 预计算 `Set` 实现 O(1) 查询
- [x] `behind` 字段添加 JSDoc 说明
- [x] Metadata DB schema 升级到 v6，lock 表加类型约束
- [x] 事务内 `now()` 只计算一次
- [x] DB read 时显式 `as DeckRefState | null`
- [x] 添加 `validateGitHubOwner`/`validateGitHubRepo`/`validateSkillSegment` guards

## 技术方案

| 修复项 | 实现 | 文件 |
|--------|------|------|
| Dedup prune | `pool.findSkillDirectories()` + `pool.metadata.getAllActiveLocators()` 交集 | `prune-plan.ts:85-109` |
| O(1) hasSkillMd | `const skillMdPaths = new Set(...)` | `cold-pool.ts:47-48` |
| Behind 语义 | JSDoc: "HEAD hasn't been verified against upstream" | `reconcile-plan.ts:38` |
| Untyped lock | Schema v6: `mode TEXT DEFAULT 'symlink'`，`migrateSchema()` v1→v6 | `metadata-db.ts:55` |
| Timestamp 一致性 | `const now = this.now()` 在事务前计算一次 | `metadata-db.ts:329` |
| Type drift | `state: r.state as DeckRefState | null` | `metadata-db.ts:266` |
| Locator guards | 长度/字符/保留名/路径遍历校验 | `github-naming.ts` |

## 验收标准

- [x] `prune-plan.ts` 使用 DB 查询去重
- [x] `cold-pool.ts:47` 使用 `Set` 存储 skillMd 路径
- [x] `reconcile-plan.ts:38` 有 behind 字段 JSDoc
- [x] `metadata-db.ts` schema version = 6
- [x] 事务内无多次 `this.now()` 调用
- [x] `metadata-db.ts:266` 有显式类型 cast
- [x] `github-naming.ts` 有 guard 函数并被 `parse-locator.ts` 消费

## 进度记录

- 2026-05-10: 七项修复合并入 sweep commit `bdd8069`
- 2026-05-10: Prune FSM  refinement in `4d2eecf`
- 2026-05-10: GitHub naming guards in `83696ac`

## 关联文件

- 修改: `packages/lythoskill-cold-pool/src/prune-plan.ts`
- 修改: `packages/lythoskill-cold-pool/src/cold-pool.ts`
- 修改: `packages/lythoskill-cold-pool/src/reconcile-plan.ts`
- 修改: `packages/lythoskill-cold-pool/src/metadata-db.ts`
- 新增: `packages/lythoskill-cold-pool/src/github-naming.ts`
- 修改: `packages/lythoskill-cold-pool/src/parse-locator.ts`

## Git 提交信息建议
```
fix(cold-pool): P2 maintainability — dedup, O(1) hasSkillMd, guards, schema v6 (TASK-20260510202837878)
```
