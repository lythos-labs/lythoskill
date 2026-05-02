# TASK-20260423223542053: Curator SQLite backend for skill metadata governance

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-04-23 | Created |
| in-progress | 2026-05-02 | Started |
| review | 2026-05-02 | query + audit CLI implemented, tests pass |

## 背景与目标

当前 curator 产出 REGISTRY.json（结构化 JSON）和 catalog.db（SQLite）作为 agent 消费格式。CLI 已实现扫描+索引，但缺少交互式查询和审计能力。

SQL 版 curator 提供程序级查询能力（JOIN、WHERE、INDEX）：
- catalog.db → 程序消费（agent 快速查询、人类 SQL 查询）
- REGISTRY.json → LLM 消费（agent 推理推荐时读取）

## 需求详情
- [ ] 设计 SQLite schema（skills / conflicts / tags / combos 表）
- [x] 实现 `curator index` CLI → scan 冷池 → 写入 catalog.db（已实现：REGISTRY.json + catalog.db 双输出）
- [ ] 实现 `curator query "<sql>"` CLI → 查询 catalog.db 并格式化输出
- [ ] ~~实现 `curator recommend`~~ → 推荐由 agent (LLM) 读取 REGISTRY.json/catalog.db 后推理完成，CLI 不做推荐（见 ADR-20260424000744041）
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
bun packages/lythoskill-curator/src/cli.ts index         # scan → catalog.db + REGISTRY.json
bun packages/lythoskill-curator/src/cli.ts query "SELECT * FROM skills WHERE type = 'flow'"
bun packages/lythoskill-curator/src/cli.ts audit          # security report
```

## 验收标准
- [ ] `curator index` 能在 5 秒内完成冷池全量扫描和入库（典型规模 30-100 skills）
- [ ] `curator query` 支持任意 SQL，结果格式化输出为 markdown 表格
- [ ] ~~`curator recommend`~~ → 由 agent (LLM) 推理完成，不在 CLI 实现（见 ADR-20260424000744041）
- [ ] `curator audit` 标记所有 unverified ecosystem-bundle 的安全风险
- [ ] SQL 查询速度比 grep REGISTRY.json 快 10x 以上

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
