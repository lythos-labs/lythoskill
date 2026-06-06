# TASK-20260606200104214: Add ZK Review reference doc to cortex skill (WHAT/WHY/HOW methodology + 4 required content types)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-06 | Created |
| in-progress | 2026-06-06 | Started |
| completed | 2026-06-06 | Closed via trailer |

## 背景与目标

外部项目（pyworld 语音合成）的 ZK agent review 环节产出了 4 类结构性反馈，其中 "旧 encoder 已有 `_encode_pcm_tts()` 时域平滑逻辑" 这种 **功能重叠发现** 是自审无法捕捉的——自审者知道 "心里打算复用"，但任务描述里没写。

Lythoskill 自身也需要这套方法论：cortex task 设计给 subagent 执行时，如果 task 缺前置知识（文件在哪？行号？）、接口契约（上下游函数签名）、基线数据（对比锚点）、范围声明（必达 vs 可选），subagent 就会翻代码找定义、猜参数、scope creep。

**目标**：将 ZK Review 方法论写成 cortex skill 的 reference doc，供 task 设计者查阅。

## 前置知识

- **cortex skill 目录**: `.claude/skills/lythoskill-project-cortex/`
- **现有 references 列表**: `references/COMMANDS.md`, `example-workflow.md`, `milestone-protocol.md`, `session-handoff.md`, `state-machines.md`, `template-guide.md`, `wiki-workflow.md`, `writing-guide.md`
- **SKILL.md references 表**: `.claude/skills/lythoskill-project-cortex/SKILL.md:464-473` — 这是新增 reference 要挂载的位置
- **AGENTS.md ZK Validation Pattern**: `AGENTS.md:112-118` — 已有的 ZK 验证模式（文档可读性验证），新 ZK Review 专注任务设计验证，两者互补

## 接口契约

- **上游**: 无（纯知识文档，不被 CLI 调用）
- **下游消费者**:
  - SKILL.md 的 `## Supporting References` 表 → 新增一行指向本文件
  - AGENTS.md 的任务设计章节 → 引用 ZK Review 作为 pre-assignment gate
  - 人类 / agent 在写 task 描述时查阅
- **文件路径**: `.claude/skills/lythoskill-project-cortex/references/zk-review.md`（新建）

## 需求详情

- [ ] 创建 `references/zk-review.md`，包含以下章节：
  - **WHAT/WHY/HOW 三问**：ZK Review 的定义、为什么需要、怎么操作
  - **4 类必补内容**：前置知识（路径+行号+数据结构）、接口契约（函数签名）、基线数据（对比锚点）、范围声明（必达 vs 可选）
  - **操作步骤**：写 task → 自审 → ZK Review → 补缺口
  - **反馈模板**：表格格式（反馈 / 价值 / 修复），附带 4 个真实案例（用户 sample 中的表格）
  - **最意外的发现**：功能重叠检测案例（`_encode_pcm_tts` 故事）——ZK Review 不仅能发现缺了什么，还能发现哪里可能重复/冲突
  - **与现有 ZK Validation Pattern 的关系**：AGENTS.md:112-118 的 ZK 验证是文档可读性（Level 1/2），本 ZK Review 是任务可执行性——两者互补，不替代
- [ ] 文件命名：`zk-review.md`（kebab-case，与目录中其他 reference 一致）
- [ ] 语言：中文（与其他 reference doc 保持一致——`writing-guide.md` 等为中英混合）

## 技术方案

直接新建文件，不需要修改 CLI 代码。文件格式参考现有 `writing-guide.md` 和 `milestone-protocol.md` 的结构（## 章节 + 表格 + 代码块）。

内容来源：用户提供的 sample（本次对话中的反馈表格 + `_encode_pcm_tts` 案例）。

### 用户 Sample（内嵌，供 executor 直接使用）

**反馈表格**（4 条真实 ZK Review 发现）：

| 反馈 | 价值 | 修复 |
|------|------|------|
| `lpc_excit` 在哪里 | 避免翻代码找定义 | 前置知识里加了行号 |
| λ 权重未给 | 退火任务无法开始 | 给了初始建议值 |
| 多帧联合退火范围模糊 | 防止 scope creep | 加了「范围声明」章节 |
| `pyworld` 不在依赖里 | 集成时会踩坑 | TASK-5 里注明需添加 |

**功能重叠发现**（`_encode_pcm_tts` 案例）：

ZK agent 的原文反馈：

> "The old encoder already does some temporal smoothing in `_encode_pcm_tts()`. The task doesn't say whether V2 replaces, extends, or duplicates that logic."

翻译：旧 encoder 的 `_encode_pcm_tts()` 里已经有 pitch 中值滤波、K 滑动平均逻辑。TASK-5 的「时域平滑」步骤与这些功能重叠——没说明 V2 是复用旧逻辑还是重写。这会导致集成时的重复或冲突。

**边界判定约束**（用户强调）：

ZK agents 暴露 gap，不是提供真理。agent 指出的问题需要人工判断：是真的缺失（executor 无法独立执行）还是 agent 的知识盲区（它不了解架构约束就乱建议）。判断标准：是否导致 executor 无法独立执行？是 → 补；否 → 记录但不阻塞。

## 验收标准

- [ ] `references/zk-review.md` 存在且包含上述所有章节
- [ ] SKILL.md 的 `## Supporting References` 表中新增一行指向本文件
- [ ] ZK subagent 读完 zk-review.md 后能说出 ZK Review 的操作步骤（WHAT/WHY/HOW），不产生幻觉

## 范围声明

- **必达**：创建 zk-review.md + 在 SKILL.md references 表中挂载
- **必达**：包含用户 sample 中的真实案例表格（4 条反馈）
- **可选**：是否增加更多虚构案例（当前不需要——4 条真实案例已足够说明模式）
- **不做**：不修改 CLI 代码、不修改 AGENTS.md（那是 TASK-20260606200108703 的范围）

## 进度记录

## 关联文件

- 修改: `.claude/skills/lythoskill-project-cortex/SKILL.md`（新增一行 reference）
- 新增: `.claude/skills/lythoskill-project-cortex/references/zk-review.md`

## Git 提交信息建议
```
feat(cortex): add ZK Review reference doc — task design pre-review methodology (TASK-20260606200104214)

- New references/zk-review.md with WHAT/WHY/HOW + 4 required content types
- Real feedback cases from external project validation
- Add to SKILL.md Supporting References table
```

## 备注

- ZK Review 与现有 "ZK Validation Pattern" (AGENTS.md:112) 是不同层次：Validation 验证文档可读性，Review 验证任务可执行性
- 这是项目 dogfooding：用 ZK Review 方法论来设计 "加入 ZK Review 方法论" 的任务
