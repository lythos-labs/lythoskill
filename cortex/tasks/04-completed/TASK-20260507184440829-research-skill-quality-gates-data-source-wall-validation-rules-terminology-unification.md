# TASK-20260507184440829: Research skill quality gates — data source wall, validation rules, terminology unification

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-07 | Created from research-documents experiment audit |

## 背景与目标

`research-documents` deck 实验产出了结构优秀的 AI Agent Skills Ecosystem 2026 报告（wiki: `02-research/2026-05-07-ai-agent-skills-ecosystem.md`），但外部评估暴露了 deep research skill 链路的三个系统性问题：

1. **数据无法溯源**：报告包含大量精确数字（341 malicious skills、36.82% flaws、$242B Q1 VC）但无任何来源链接。LLM 在缺乏约束时倾向生成"精确但虚构"的数据。
2. **无质量控制**：`outline.yaml` 未定义验证规则，7 个并行 Agent 各写各的，术语不统一。
3. **缺乏整合策略**：去重、统一数据口径、交叉验证均缺失。

**目标**：将 audit 反馈吸收到 research skill 设计本身，让下一轮 deep research 自动产生可信度更高的输出。

**参考**：
- wiki: `02-research/2026-05-07-research-quality-audit.md` — 完整评估报告
- wiki: `02-research/2026-05-07-ai-agent-skills-ecosystem.md` — 被评估的研究报告
- playground: `2026-05-07-research-documents/` — 原始实验产物

## 需求详情

### P0 — fields.yaml 加 source 必填字段
- [ ] 每个 research item 的 fields 定义增加 `source_url: required` 字段
- [ ] `source_name` 字段（publication name, report title, etc.）
- [ ] `confidence` 字段（confirmed / estimated / projected）
- [ ] 无 source 的数据点自动标记为 `uncertain`

### P1 — outline.yaml 加 validation_rules
- [ ] 验证规则定义：每个数据点需附 URL 或来源名称
- [ ] 估值数据需交叉比对 ≥2 信源
- [ ] 自动区分 "已发生" 与 "预测/估算"

### P2 — 术语表 + 整合策略
- [ ] 在 research-report 输出时自动插入术语定义表（Skill / MCP Server / Agent / Plugin 边界）
- [ ] 多 Agent 结果合并时的去重 + 统一数据口径规则

### P3 — 报告模板改进
- [ ] 自动生成 References 章节（从各 result JSON 的 source 字段汇聚）
- [ ] 数据点标注置信度（✅ confirmed / ⚠️ estimated / ❓ projected）
- [ ] 可选中文 Executive Summary

## 技术方案

改动范围：`github.com/Weizhena/Deep-Research-skills/skills/research-en/` 下的 skill SKILL.md 文件。

关键决策：
- 不 fork research skills（保持上游兼容），通过 `fields.yaml` 模板和 `outline.yaml` 模板的默认值传导约束
- 如果上游不接受 PR，再考虑 fork 到 `localhost/me/research-gated`

## 验收标准
- [ ] 用改进后的 deck 重跑同一主题，对比新旧报告的 source 标注率
- [ ] 新报告的数据可信度评分从 3/5 提升到 ≥4/5
- [ ] 每项数据点可追溯到来源（URL 或 publication name）

## 关联文件
- 修改: `skills/research-en/*/SKILL.md`（上游 Weizhena/Deep-Research-skills）
- 参考: `cortex/wiki/02-research/2026-05-07-research-quality-audit.md`
- 实验: `examples/decks/research-documents.toml`
