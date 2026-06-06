# TASK-20260606200108703: Update AGENTS.md task-design section to link ZK Review pattern as mandatory pre-assignment gate

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-06 | Created |
| in-progress | 2026-06-06 | Started |
| completed | 2026-06-06 | Closed via trailer |

## 背景与目标

外部项目验证了 ZK Review 对任务设计的价值：4 类结构性反馈（路径缺失、参数未给、范围模糊、依赖遗漏），以及最意外的发现——功能重叠（旧 `_encode_pcm_tts()` 已有平滑逻辑，新 task 没说明是复用还是重写）。

AGENTS.md 是项目 SSOT，已有 "Task = Subagent Bootloader" 概念（`:1104-1106`），但缺 **如何验证 task card 是否够自包含** 的操作步骤。当前的任务设计段只说 "task card 应该 self-contained"，没给验证方法。

**目标**：在 AGENTS.md 的任务设计段落新增 ZK Review 方法论 subsection，作为 writing task → assign to subagent 之间的强制性检查步骤。

## 前置知识

- **AGENTS.md 完整路径**: `AGENTS.md`（1250 行）
- **要修改的位置**: `:1104-1106` — "Task = Subagent Bootloader" 段落（## Cortex Granularity 的子节），当前仅 3 行
- **已有相关模式**: `AGENTS.md:112-118` "ZK Validation Pattern (first-class)" — 验证文档可读性（Level 1: subagent self-report, Level 2: kimi cross-model），与本次新增的 ZK Review（验证任务可执行性）是互补关系，不是替代
- **cortex SKILL.md 修改**: 同步于 TASK-20260606200107286，AGENTS.md 侧重方法论+操作步骤，SKILL.md 侧重 trigger keywords
- **用户约束**: ZK agents 暴露 gap，不是提供真理——agent 指出的问题需要人工判断（是真的缺失还是 agent 的知识盲区），不是每条反馈都接受

## 接口契约

- **插入位置**: AGENTS.md `:1106` 之后（"Task = Subagent Bootloader" 段落末尾），新增一个 `#### ZK Review Gate` subsection
- **新增内容**:
  - 4 步操作：写 task → 自审 → ZK Review → 补缺口
  - 4 类必补内容：前置知识（路径+行号+数据结构）、接口契约（函数签名）、基线数据（对比锚点）、范围声明（必达 vs 可选）
  - 反馈表格模板（反馈 / 价值 / 修复）
  - **边界判定**：ZK agent 不是 oracle——它暴露 gap，但不意味着每个建议都对。判断标准：gap 是否导致 subagent 无法独立执行？是 → 补；否 → 记录但不阻塞
  - 与现有 ZK Validation Pattern 的关系：Validation = 文档可读性（Level 1/2），Review = 任务可执行性（新增 Level 0）

## 需求详情

- [ ] 在 `:1106` 之后插入 `#### ZK Review Gate` subsection（约 30-40 行）
- [ ] 包含操作步骤（写→自审→ZK Review→补缺口）
- [ ] 包含 4 类必补内容的说明 + 示例
- [ ] 包含反馈表格（4 真实案例）
- [ ] 包含功能重叠发现案例（`_encode_pcm_tts`）
- [ ] 包含边界判定：ZK 暴露 gap，不是提供真理
- [ ] 与现有 ZK Validation Pattern (`:112-118`) 建立交叉引用

## 技术方案

纯文本编辑。在 AGENTS.md 的 "Task = Subagent Bootloader" 段落后新增 subsection。

**位置判断**：`:1104-1106`:
```
**Task = Subagent Bootloader:**
A task card should be self-contained: frontmatter metadata + concise body + external references to ADRs/Epics/sibling tasks. A subagent reading only the task card + AGENTS.md should have enough context to implement the work. If the card needs to invent migrations not pre-decided by the user, that is a signal the card is incomplete.
```

在这段之后、`**ADR Immutability Rule:**` 之前插入新 subsection。

**注意**：AGENTS.md 很热（1250 行，最常修改的 doc）——本次插入约 30-40 行，不会显著增加 token 消耗，且 ZK Review 的方法论密度高（每行都有操作性信息）。

## 验收标准

- [ ] AGENTS.md 的 Task = Subagent Bootloader 段落后能看到 `#### ZK Review Gate` subsection
- [ ] 4 类必补内容每类都有 1 行示例
- [ ] 反馈表格中有至少 3 条真实案例（来自用户 sample）
- [ ] 边界判定段落包含 "ZK agents 暴露 gap，不是提供真理" 语义
- [ ] 与 ZK Validation Pattern (`:112-118`) 有双向引用（Validation 段也指回 ZK Review Gate）
- [ ] grep "ZK Review Gate" AGENTS.md → 1 match
- [ ] grep "ZK Review" AGENTS.md → ≥ 2 matches（Validation + Gate）
- [ ] 不改写 AGENTS.md 的其他段落

## 范围声明

- **必达**：新增 ZK Review Gate subsection（在 `:1106` 之后）
- **必达**：包含 4 类必补内容 + 操作步骤 + 边界判定
- **必达**：与现有 ZK Validation Pattern 建立双向引用——在 `:112-118` 段末加 1 行 "For task-executability verification, see § ZK Review Gate below."（这是 1 行 pointer，不是 rewrite——不动 ZK Validation 段落的其他内容）
- **必达**：澄清与 ZK Validation 的层次关系：Validation 验证文档可读性，Review 验证任务可执行性——不发明新的 Level 术语
- **可选**：是否把 ZK Review 提升到与 ZK Validation Pattern 同级的 `###` section（当前建议用 `####` 作为 Task 设计的子节，保持结构层次合理——不膨胀 AGENTS.md 的 TOC 深度）
- **不做**：不重写 ZK Validation 段落、不重写任务生命周期描述、不修改 Release & Auth Workflow
- **依赖**：TASK-20260606200104214（reference doc 内容作为 AGENTS.md 段落的素材来源），但两者可并行——AGENTS.md 写方法论框架，reference doc 写完整案例

## 进度记录

## 关联文件

- 修改: `AGENTS.md`（`:1104-1106` 之后插入）
- 参考: `.claude/skills/lythoskill-project-cortex/references/zk-review.md`（由 TASK-20260606200104214 创建）

## Git 提交信息建议
```
docs(agents): add ZK Review Gate — task pre-assignment verification methodology (TASK-20260606200108703)

- 4-step operation: write → self-review → ZK Review → fill gaps
- 4 required content types: prereq knowledge, interface contracts, baseline data, scope declaration
- Boundary: ZK agents expose gaps, not provide truth
- Cross-reference with existing ZK Validation Pattern
```

## 备注

- ZK Review 的边界判定是这个方法论的核心——如果不加 "ZK agent 不是 oracle" 约束，agent 会盲目接受所有 ZK 反馈，包括误判。这个约束来自用户本次对话的强调
- 与 TASK-20260606200104214 的关系：AGENTS.md 写操作框架，reference doc 写完整案例+模板——AGENTS 是入口，reference 是深度阅读
