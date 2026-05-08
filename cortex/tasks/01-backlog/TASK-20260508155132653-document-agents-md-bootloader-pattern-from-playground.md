# TASK-20260508155132653: Document AGENTS.md bootloader pattern from playground

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-08 | Created |

## 背景与目标

`playground/architecture-explainer/` 已完整验证 AGENTS.md bootloader 模式：
- 混合 deck（visual-explainer + design-studio + docx + pdf）
- AGENTS.md 作为 agent 的入口导航文档
- 产出：architecture.md（644行, 8 Mermaid 图）、architecture.docx（332KB）、architecture.pdf（353KB, 21页）

但此模式尚未文档化，只在 playground 中存在。新用户无法复用。

目标：将 playground 验证的模式提炼为正式文档，写入 wiki 或 references，让用户能按文档独立复现。

## 需求详情

- [ ] 撰写 AGENTS.md bootloader 使用指南
- [ ] 包含完整示例：deck toml 配置 + AGENTS.md 内容模板 + 预期产出
- [ ] 说明适用场景（新成员 onboarding、项目架构文档生成、跨团队知识同步）
- [ ] 说明不适用场景（避免滥用）
- [ ] 关联到 `examples/decks/architecture-explainer.toml`

## 技术方案

- 写入 `cortex/wiki/01-patterns/` 或 `packages/lythoskill-project-cortex/references/`
- 文档结构：
  1. 什么是 bootloader 模式（AGENTS.md 作为 agent 的第一入口）
  2. 为什么有效（agent 读 AGENTS.md → 理解项目结构 → 导航到具体文件）
  3. 最小复现步骤（deck 配置 + AGENTS.md 模板 + 运行命令）
  4. playground 产出的参考样本（截图或文件摘要）
- 与 `examples/decks/architecture-explainer.toml` 保持同步

## 验收标准

- [ ] 新用户通过文档即可独立配置并运行 AGENTS.md bootloader
- [ ] 文档包含可复制的 AGENTS.md 模板（含 frontmatter 和导航结构）
- [ ] 文档与 playground 实际产出一致（经过验证，非臆测）
- [ ] `examples/decks/architecture-explainer.toml` 中有注释指向此文档

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件

- 新增: `cortex/wiki/01-patterns/agents-md-bootloader.md`（或等效路径）
- 参考: `playground/architecture-explainer/`
- 参考: `examples/decks/architecture-explainer.toml`
- 参考: `cortex/wiki/01-patterns/2026-05-08-agent-adapter-as-actor-daemon-lifecycle-facade-pattern-for-multi-player-cli-backends.md`

## Git 提交信息建议

```
docs(wiki): AGENTS.md bootloader pattern documentation (TASK-20260508155132653)

- Extract verified playground pattern into reusable guide
- Complete example: deck config + AGENTS.md template + expected output
- Linked from architecture-explainer.toml

Closes: TASK-20260508155132653
```

## 备注

Playground 验证已完成（ PoC 产出正确）。此 task 纯文档工作，无代码风险。可与其他 task 并行。
