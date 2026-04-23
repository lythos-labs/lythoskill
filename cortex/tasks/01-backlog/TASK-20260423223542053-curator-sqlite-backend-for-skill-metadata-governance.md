# TASK-20260423223542053: Curator SQLite backend for skill metadata governance

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-04-23 | Created |

## 背景与目标

当前 curator 产出 markdown catalog 作为人类可读索引卡（存放于 playground/，个人冷池扫描结果），以及 REGISTRY.json 作为 LLM 消费格式。但文件 grep 查询效率远低于 SQL 索引。

SQL 版 curator 提供程序级查询能力（JOIN、WHERE、INDEX），和 markdown CATALOG 互补：
- SQL → 程序消费（agent 快速查询）
- MD → 人类消费（阅读、编辑）

## 需求详情
- [ ] 设计 SQLite schema（skills / conflicts / tags / combos 表）
- [ ] 实现 `curator index` CLI → scan 冷池 → 写入 catalog.db
- [ ] 实现 `curator query "<sql>"` CLI → 查询并格式化输出
- [ ] 实现 `curator recommend "task"` → 自然语言 → SQL → 推荐
- [ ] 实现 `curator audit` → 安全检查报告（依赖审计、权限审计）
- [ ] 支持 `dao_shu_qi_yong` 字段的过滤和聚合查询
- [ ] 和现有 curator 的 REGISTRY.json 格式保持兼容

## 技术方案

```sql
-- skills 表：核心元数据
CREATE TABLE skills (
  name TEXT PRIMARY KEY,
  ecosystem TEXT,
  type TEXT,
  assertiveness TEXT,
  conflict_risk TEXT,
  niche TEXT,
  dao_shu_qi_yong TEXT,  -- 道/术/器/用
  trust_level TEXT,       -- audited/self-declared/unverified
  description TEXT,
  path TEXT,
  has_scripts BOOLEAN,
  has_examples BOOLEAN
);

-- conflicts 表：冲突矩阵
CREATE TABLE conflicts (
  skill_a TEXT,
  skill_b TEXT,
  risk_level TEXT,
  reason TEXT,
  PRIMARY KEY (skill_a, skill_b)
);

-- tags 表：扩展元数据
CREATE TABLE tags (
  skill_name TEXT,
  key TEXT,
  value TEXT,
  PRIMARY KEY (skill_name, key)
);
```

CLI 设计：
```bash
bun packages/lythoskill-curator/src/cli.ts index         # scan → catalog.db
bun packages/lythoskill-curator/src/cli.ts query "SELECT * FROM skills WHERE assertiveness = 'high'"
bun packages/lythoskill-curator/src/cli.ts recommend "web scraping with PDF output"
bun packages/lythoskill-curator/src/cli.ts audit          # security report
```

## 验收标准
- [ ] `curator index` 能在 5 秒内完成冷池全量扫描和入库（典型规模 30-100 skills）
- [ ] `curator query` 支持任意 SQL，结果格式化输出为 markdown 表格
- [ ] `curator recommend` 能返回 tiered 推荐（Core/Force Multiplier/Optional）
- [ ] `curator audit` 标记所有 unverified ecosystem-bundle 的安全风险
- [ ] SQL 查询速度比 grep CATALOG.md 快 10x 以上

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260423223542053)

- Detail 1
- Detail 2
```

## 备注
