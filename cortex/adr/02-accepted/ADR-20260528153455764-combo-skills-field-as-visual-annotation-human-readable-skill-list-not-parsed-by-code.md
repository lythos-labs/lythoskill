# ADR-20260528153455764: Combo `skills` field as visual annotation — human-readable, not parsed by code

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-28 | Created — ZK sweep found combo skills field inconsistent across docs/schema/code |
| accepted | 2026-05-28 | Accepted |

## 背景

2026-05-28 ZK sweep 发现 combo 的 `skills` 字段在三处不一致：

- **ADR + wiki pattern**：展示了 `skills = ["a", "b"]` + `prompt = "..."` 两个字段
- **toml-format reference**: 只有 `prompt` 字段
- **parse-deck.ts（代码）**：只解析 `prompt`，`skills` 是 ghost field
- **test schema**: 期望 `skills: z.array(z.string())`，但代码不支持

`skills` 字段在 ADR/wiki 中被展示但代码不解析它——导致 agent 看到文档以为有用，实际写了也不生效。

根本问题是：`skills` 到底是 (A) 该被代码消费的数据 还是 (B) 给人类看的注释？

## 决策驱动

- Combo 的本质是 prompt-driven orchestration（ADR-20260506103209293），不是 skill list
- `skills = [...]` 有帮助：让人类读者一眼看到哪些 skill 参与这个 combo
- 但 `skills` 不应该被代码消费——agent 通过读 prompt 文本理解要用哪些 skill
- 代码不应为纯展示字段增加复杂度

## 选项

### 方案A: 代码解析 `skills`，与 `prompt` 并列

**优点**: schema 干净，`skills` 有实际效果
**缺点**: 代码复杂化；`skills` 和 `prompt` 可能偏离（人改了 skills 但忘了改 prompt）；agent 应该从 prompt 文本推断使用哪些 skill，不需要显式列表

### 方案B: 从所有文档中删除 `skills`

**优点**: 零混淆
**缺点**: 失去人类可读的 combo 概览——看 prompt 文本才知道涉及哪些 skill

### 方案C: `skills` 作为注释字段 — 人类可读，代码忽略（Selected）

```toml
[combo.release]
# skills: changelog, github-release, version-bump  ← 人类看这里
prompt = """
1. Run changelog skill to collect commits
2. Version-bump skill to update package.json
3. GitHub-release skill to create the release
"""
```

**优点**:
- 人类一眼看到涉及哪些 skill
- 代码零复杂度——parser 忽略 `skills`
- Agent 通过 prompt 文本理解协调逻辑
- `skills` 和 `prompt` 的偏移可被 detection 工具发现

**缺点**:
- `skills` 是视觉约定，不是强制 schema——agent 可能忘写
- 需要文档约定这个字段的存在

## 决策

**选择**: 方案C — `skills` 作为注释字段，人类可读，parser 忽略。

代码改动：
- test schema: `skills` 从 required `z.array()` 改为 optional `z.array().optional()` 或移除
- ADR/wiki/toml-format: 统一展示 `skills` 为注释（`# skills: a, b`）
- Agent 指南：写 combo 时建议加 `# skills:` 注释行

## 影响

- 正面:
  - Combo toml 可读性提升
  - 代码零额外复杂度
  - 和 combo = prompt-driven orchestration 的心智一致
- 负面:
  - `skills` 和 `prompt` 的偏移需要工具检测（future: dreaming skill 可做）
- 后续:
  - Dreaming skill 可检查 `# skills:` 注释 vs prompt 文本是否一致
  - 更新 toml-format.md 的 combo 示例

## 相关

- 关联 ADR: ADR-20260506103209293 (combo redefinition), ADR-20260501160000000 (superseded combo rules)
- 关联 Epic: EPIC-20260527212032856 (site narrative)
- 发现来源: 2026-05-28 ZK sweep — combo format consistency audit
