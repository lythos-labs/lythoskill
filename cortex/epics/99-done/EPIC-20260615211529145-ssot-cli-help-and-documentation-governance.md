---
lane: main
checklist_completed: false
checklist_skipped_reason: Non-interactive context
---
# EPIC-20260615211529145: SSOT CLI help and documentation governance

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> SSOT CLI help and documentation governance

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-06-15 | Created |
| done | 2026-07-09 | Done |

## 背景故事

### 触发事件

TASK-20260614125634946（probe output UX）的 ZK trial 暴露了一个深层问题：ZK agent 不理解 cortex 是什么，导致无法评判 probe 的 UX。

具体表现：
- ZK agent 不知道 "directory = source of truth" 是 cortex 的核心设计
- ZK agent 不理解 empty shell 是 "template created but never filled" 的治理问题
- ZK agent 不理解 `--active-only` 是 "quick scan" 而 default 是 "full check" 的设计意图
- 结果：ZK agent 同时抱怨 "default 太长" 和 "`--active-only` 太短" — 矛盾的期望说明没理解领域

### 问题描述

当前 onboarding 流程假设用户已经理解 cortex 的基本概念（task/epic/adr 状态机、directory = source of truth、empty shell 等）。但零知识 agent 没有这些前置知识。

从信息论角度：probe 的输出是**条件信息**（conditional on understanding cortex）。如果用户不理解 cortex，probe 的输出无论怎么优化都是困惑的。

### 目标价值

1. **降低认知门槛**：让零知识 agent 能在不理解 cortex 的情况下，先理解 probe 的基本用途
2. **SSOT 化 CLI help**：`probe --help` 应该自解释，不依赖外部文档
3. **文档治理**：区分 "onboarding 必读"（cortex 概念）和 "工具参考"（probe 用法）

## 需求树

### 主题A：CLI help 自解释 #backlog
- **触发**: ZK agent 运行 `probe --help` 时无法获得足够信息
- **需求**: `probe --help` 输出包含：
  - probe 是什么（一句话）
  - 三个模式的区别（一句话 each）
  - 每个模式检查什么（checklist）
  - 输出示例（when consistent / when issues found）
- **实现**: 在 `probe.ts` 或 `cli.ts` 中添加 `--help` 输出
- **产出**: `--help` 输出不依赖 SKILL.md 即可理解
- **验证**: ZK agent 只读 `--help` 就能理解 probe 的用途和三个模式

### 主题B：Onboarding 概念前置 #backlog
- **触发**: ZK agent 不理解 "directory = source of truth" "empty shell" "stale" 等术语
- **需求**: Onboarding 流程（`lythoskill-project-onboarding` skill）在介绍 probe 之前，先介绍 cortex 核心概念
- **实现**: 在 onboarding SKILL.md 中添加 "Cortex Concepts" 章节
- **产出**: 零知识 agent 读完 onboarding 后能理解：
  - 什么是 task/epic/adr
  - 为什么 directory 是 source of truth
  - 什么是 empty shell / stale / drift
- **验证**: ZK agent 读完 onboarding 后，能用自己的话解释 probe 的设计意图

### 主题C：文档分层治理 #backlog
- **触发**: SKILL.md 同时承担 "快速参考" 和 "详细教程" 两种角色，导致信息过载
- **需求**: 文档分层：
  - **Layer 1**: CLI `--help`（快速参考，自解释）
  - **Layer 2**: SKILL.md 摘要（5分钟读完）
  - **Layer 3**: SKILL.md 详细章节 + references（按需深入）
- **实现**: 重构 SKILL.md 为 progressive disclosure 结构
- **产出**: 不同深度的用户都能找到合适的入口
- **验证**: ZK agent 能在 5 分钟内从 SKILL.md 找到所需信息

### 主题D：Task card 模板改进 #backlog
- **触发**: TASK-20260614125634946 的 ZK trial 中，agent 找不到 SKILL.md 或读错版本；agent 不知道 "cortex" 是什么，导致无法理解 probe 的设计意图
- **需求**: Task card 中明确标注：
  1. **领域上下文**："probe 是 cortex 的 drift detection 工具。cortex 是项目治理系统，管理 task/epic/adr 的状态。"
  2. **Skill 文件路径**：
     - Source 路径：`packages/<name>/skill/SKILL.md`（开发时编辑）
     - Build 输出路径：`skills/<name>/SKILL.md`（agent 读取）
     - References：`packages/<name>/skill/references/<ref>.md`
  3. **阅读顺序**：先读 onboarding → 再读 skill → 再运行命令
- **实现**: 更新 cortex task 模板（`assets/TASK-TEMPLATE.md`），添加 "ZK Review 输入" 章节
- **产出**: ZK agent 不需要猜测，直接按路径和顺序读取
- **验证**: ZK agent 能准确找到文件、理解领域上下文、按正确顺序阅读

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260519165746212 | cortex probe --suspicious 模式 | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260614125634946 | completed | probe output UX — 暴露了 onboarding 缺失问题 |

## 经验沉淀

- **ZK trial 的盲区**: 零知识 agent 不理解领域时，会给出矛盾的反馈（同时说 A 和 非 A）。这不是工具的问题，是认知门槛的问题。
- **Onboarding 是前置条件**: 任何工具的 UX 评判都必须建立在用户理解领域的基础上。否则优化是无意义的。
- **CLI help 是最后防线**: 当用户没读 onboarding 时，`--help` 是唯一能救场的文档。必须自解释。
- **类比加速**: 如果用户有 Jira 经验，可以用类比快速理解 cortex：
  - `directory` = Jira ticket 状态（In Progress / Done / Archived）
  - `Status History` = ticket 的 transition log（谁什么时候改了状态）
  - `probe` = 检查 "ticket 状态" 和 "transition log" 是否一致
  - `empty shell` = 创建了 ticket 但从来没填描述
  - `--active-only` = 只看 Open / In Progress 的 ticket，忽略 Closed 的
- **Skill 路径必须明确**: ZK agent 的 context 不默认加载 skill，task card 必须写出文件路径，否则 agent 找不到。

## 归档条件
- [ ] 所有任务完成
- [ ] `probe --help` 通过 ZK trial（零知识 agent 只读 `--help` 能理解 probe）
- [ ] Onboarding 通过 ZK trial（零知识 agent 读完 onboarding 能理解 cortex 概念）
- [ ] 文档分层验证通过（不同深度的用户都能找到合适入口）
