# TASK-20260518130210081: Remove frontmatter niche extraction + add tag command — agent-enriched metadata

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| completed | 2026-05-18 | Closed via trailer |

Refs: EPIC-20260518125955940 | See ADR-20260518123403810 §Decision items 1-2

## 背景与目标

ADR 决策：niche 不再从 SKILL.md frontmatter 提取（L1 卖家秀），改为 agent-enriched metadata（L3 买家秀/策展人备注）。当前代码在 `curator-core.ts` 和 `cli.ts` 中有双路径 niche 提取逻辑：`buildSkillMeta()` 读 `frontmatter.niches`，`scanSkill()` 读 `frontmatter.deck_niche`。两条路径需要移除，替换为 `tag` 子命令写入。

## 需求详情
- [ ] 移除 `curator-core.ts` `buildSkillMeta()` 中的 `niches: arr(frontmatter.niches ?? [])` 行
- [ ] 移除 `cli.ts` `scanSkill()` 中的 `deck_niche` 提取逻辑（第 116-117 行：`const niches = frontmatter.deck_niche ? [frontmatter.deck_niche] : []`）
- [ ] 移除 `cli.ts` 中 niche 合并逻辑（第 123 行：`niches: Array.isArray(niches) ? niches : [niches].filter(Boolean)`）
- [ ] 新增 `curator tag <skill-name>` 子命令：
  - `--niche "meta.governance.deck"` — 写入 niche 标签
  - `--qa '{"source_type":"self/arena","source_name":"...","signal_type":"score","signal_value":8}'` — 写入 QA 数据
  - 写入 SQLite `niches` 列（JSON array），不覆盖 scan 写入的 name/description/path
- [ ] 设计 merge 策略：`curator scan` 只 UPDATE name, description, path, source, updated_at — 不动 niches 列
- [ ] REGISTRY.json 的 `byNiche` 索引改为从 agent-enriched niche 构建（scan 后 rebuild index 时使用当前 SQLite niches 列）
- [ ] 更新 `catalog-db.ts` 的 `insertSkill`：scan 时 niches 列初始化为 `[]`（空数组），后续由 `tag` 命令填充
- [ ] 保留 SQLite `niches` 列 schema（TEXT, JSON array string）——数据来源变，存储不变

## 技术方案

**修改文件**:
- `packages/lythoskill-curator/src/curator-core.ts`: 移除 `buildSkillMeta()` 中 niche 提取
- `packages/lythoskill-curator/src/cli.ts`: 移除 `scanSkill()` 中 deck_niche 提取 + 合并；新增 `tag` 子命令
- `packages/lythoskill-curator/src/catalog-db.ts`: `insertSkill` niches 默认 `[]`

**tag 命令实现**:
```
curator tag <skill-name> --niche "xxx" [--niche "yyy"] [--qa '{"source_type":"...","signal_value":...}']
```
- 查询 SQLite `SELECT niches FROM skills WHERE name = ?`
- JSON.parse → 数组 → push new niche → JSON.stringify → UPDATE
- QA 数据同样 append 到 niches 数组，以 `qa:` 前缀区分

**merge 策略**:
- `scanSkill()` → `insertSkill()`: INSERT OR UPDATE (name, description, path, source, updated_at)，niches 列使用 `COALESCE((SELECT niches FROM skills WHERE name = ?), '[]')` 保留已有值

## 验收标准
- [ ] `curator scan` 后新技能 niches = `[]`
- [ ] `curator tag <name> --niche "meta.governance"` 写入成功
- [ ] `curator scan` 重新扫描不覆盖已写入的 niche
- [ ] `curator query` 可按 niche 过滤
- [ ] 代码中无 `deck_niche` / `frontmatter.niches` 提取残留
- [ ] 现有 curator 测试仍通过（或更新后通过）

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-curator/src/curator-core.ts`
- 修改: `packages/lythoskill-curator/src/cli.ts`
- 修改: `packages/lythoskill-curator/src/catalog-db.ts`
- 修改: `packages/lythoskill-curator/src/types.ts` (如有 niche 相关类型)

## Git 提交信息建议
```
feat(curator): replace frontmatter niche extraction with agent-enriched tag command (TASK-20260518130210081)

- Remove deck_niche/niches extraction from buildSkillMeta and scanSkill
- Add 'tag' subcommand for agent-assigned niche and QA data
- Scan preserves existing niches column on UPDATE (merge strategy)
- REGISTRY.json byNiche index now built from agent-enriched data
```

## 备注
- 与主题D（legacy cleanup）有关联：legacy cleanup 也会涉及 `deck_niche` 引用清理
- tag 命令的 QA 参数是 curator QA 体系的第一步——后续事实检查/置信度评估依赖这个基础设施
