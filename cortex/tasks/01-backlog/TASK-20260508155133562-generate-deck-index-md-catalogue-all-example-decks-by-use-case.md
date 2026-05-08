# TASK-20260508155133562: Generate deck INDEX.md — catalogue all example decks by use-case

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-08 | Created |

## 背景与目标

`examples/decks/` 已有 11 个预组 deck（含 Codex 变体更多），覆盖 design、documents、engineering、full-stack、governance、research、scout、visual 等用例。但没有统一的索引文档，新用户难以快速找到适合自己的 deck。

目标：为 `examples/decks/` 生成 `INDEX.md`，按用例分类，包含每个 deck 的技能数、平台适配、验证状态。

## 需求详情

- [ ] 扫描 `examples/decks/*.toml`，提取元数据（deck 名、技能数、用例标签、platform 注释）
- [ ] 生成 `examples/decks/INDEX.md`，包含：
  - 按用例分类的表格（research / engineering / design / governance / visual / minimal）
  - 每行：deck 文件名、用例标签、技能数、跨平台适配（Claude/Cursor/Codex/Windsurf）、innate skills 数量
  - 快速选择指南（"我是研究员 → 选 deep-research.toml"）
- [ ] 提供 `cortex index` 或 `deck index` 风格的自动化生成命令（可选）
- [ ] 与 README 中的 deck 列表保持一致

## 技术方案

- 方案 A：手动撰写 INDEX.md（一次性的，deck 数量稳定）
- 方案 B：自动化脚本扫描 toml 文件生成 INDEX.md（可集成到 build/release 流程）
- 推荐方案 A + B 混合：先手动写出高质量 INDEX.md，后续用脚本保持同步
- 数据来源：
  - `deck validate --remote` 的结果（验证状态）
  - `parseDeck()` 解析每个 toml 文件（技能数、innate/tool 分类）
  - toml 文件头部的 usage 注释（用例说明）

## 验收标准

- [ ] INDEX.md 包含所有 example deck（11+ 个）
- [ ] 每个 deck 有明确的用例标签和适用人群
- [ ] 跨平台适配表（working_set 配置）清晰可查
- [ ] README 中的 deck 列表与 INDEX.md 一致（或互相链接）
- [ ] `deck validate --remote` 验证状态在 INDEX 中标注

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件

- 新增: `examples/decks/INDEX.md`
- 修改: `packages/lythoskill-deck/README.md`（deck 列表部分，添加 INDEX.md 链接）
- 参考: `examples/decks/` 目录下所有 `.toml` 文件
- 参考: handoff 第 6 节 "Example Deck 全量 Audit" 表格

## Git 提交信息建议

```
docs(examples): generate deck INDEX.md with use-case catalogue (TASK-20260508155133562)

- Categorize all 11+ example decks by use-case
- Cross-platform compatibility table
- Quick selection guide for new users

Closes: TASK-20260508155133562
```

## 备注

handoff 中已有完整的 deck audit 表格（10 个 deck、45 个 locator、验证状态），可直接作为 INDEX.md 的基础素材。
