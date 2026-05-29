# TASK-20260519224912252: bare name to full path lookup for deck add

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-19 | Created |
| completed | 2026-05-29 | Closed via trailer |

## 背景与目标

用户从网络/社区发现一个 skill 的 bare name（如 "lythoskill-writer"），想知道它的完整 path 以便 `deck add`。目前 `deck add` 要求完整 locator（`github.com/owner/repo/path`），bare name 无法直接使用。

**典型场景**: 看到别人推荐 "用 lythoskill-writer 审查文档" → 想知道 full path → 目前只能手动去 GitHub 搜。

Curator 已扫描冷池并索引了 SKILL.md，但这是本地已有技能。对于"刚听说还没 clone"的技能，存在信息断层。

## 需求详情

- [ ] 给定 bare name，返回匹配的完整 locator（path）和 `deck add` 命令
- [ ] 优先查本地冷池（curator index/catalog.db），命中即返回
- [ ] 本地未命中时，给出查询建议（WebSearch / `gh search` / agentskill 公共索引）
- [ ] 输出格式：直接可用的 `deck add` 命令 + `skill-deck.toml` 片段

## 技术方案

**Phase 1 — 本地查询（curator 扩展）**:
- curator 已索引所有 SKILL.md 的 `name` 字段
- 添加 `curator find <bare-name>` 子命令：查 catalog.db → 输出 full path + deck add 命令
- 纯本地操作，秒级响应

**Phase 2 — 远程 fallback（agent 侧）**:
- 本地未命中时，agent 用 WebSearch / `gh search` 补搜
- Curator 本身不 wrap 外部 API（per `project_curator_no_feed_adapters`），搜索由 agent 执行

## 验收标准

- [ ] `curator find lythoskill-writer` 返回完整 path 和 deck add 命令
- [ ] 本地冷池有该 skill 时命中（已 clone 过的）
- [ ] 本地未命中时给出明确提示 + 搜索建议
- [ ] 输出可直接复制粘贴到 `skill-deck.toml`

## 进度记录

## 关联文件
- 修改: `packages/lythoskill-curator/` — 新增 find 子命令
- 新增:

## Git 提交信息建议
```
feat(curator): find subcommand — bare name to full path lookup (TASK-20260519224912252)

- Query catalog.db by skill name, return full locator + deck add command
- Local-first, with search hints on miss
```

## 备注
