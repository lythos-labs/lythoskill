---
created: 2026-06-15
updated: 2026-06-15
category: pattern
---

# ZK Review 的认知科学基础

> ZK Review 不是"让 agent 帮忙看文档"的权宜之计，而是认知偏差、评审连续性和注意力经济三个独立原理的必然推论。

## Context

为什么自审（self-review）不可靠？为什么换 reviewer 每轮都换也不行？为什么"不麻烦人类"不是偷懒而是效率？

这三个问题分别对应三个已有充分实验支持的认知科学/工程学概念。ZK Review 的实践设计恰好与这些概念的推论一致——这不是巧合，说明实践是从第一性原理推导出来的，而不是从热门词汇出发找用例。

## Details

### 1. 知识诅咒（Curse of Knowledge）—— 自审的不可克服性

**认知心理学实验支持**：一旦你知道某件事，就无法真正模拟"不知道"的状态。你的大脑会自动填补你没写出来的隐性知识，让你以为"这很明显"。

**在 ZK Review 中的体现**：
- 任务作者知道"我打算复用那个函数"，但描述里没写 → 自审永远发现不了这个 gap
- 文档作者知道"cold pool 在 ~/.agents/skill-repos/"，但引用路径时省略了 → 自审认为"路径很清楚"

**为什么 agent 的无记忆性是优势**：
- 传统团队做不到 reset 一个人的全部 context 从零审查
- Agent 的天然无记忆性 = 完美的零知识 reviewer，成本几乎为零
- 这不是妥协，是**约束产生纪律**：无记忆性强制了外化（把隐性知识显式写出）

**类比**：Immutable data 强制你显式管理状态变化。约束不是缺陷，是设计工具。

### 2. 评审连续性（Review Continuity）—— 为什么 fork 优于换新

**学术评审的常识**：答辩是同一批评委看修改稿，不是每次换人。因为新 reviewer 无法判断"你是真的修了还是绕过了"。

**在 ZK Review 中的体现**：
- Round 1 reviewer 发现 6 个 gaps
- Round 2 同一 reviewer（fork）检查：fix 是否解决了原问题？有没有引入新问题？
- Round 3 如果还换新人，reviewer 会重新发现 Round 1 的 gaps，造成无限循环

**Fork 语义的设计**：
- 保留 review context 跨轮次（知道上一轮 gaps 是什么）
- 优于 API 层面的 fork（原生 fork vs 手动传递 log）
- 收敛标准：新 gap < 2 且全低优 —— 这是基于"评审连续性"的实证标准

### 3. 注意力经济（Attention Economy）—— 为什么"不麻烦人类"是正确分工

**经济学原理**：人类判断力是稀缺资源，应该用在价值判断和方向设定上，不应该用在形式化可验证的逻辑检查上。

**在工程中的先例**：
- Linter → 把代码风格检查从人类认知负担剥离
- Type checker → 把类型一致性检查剥离
- Compiler → 把语法正确性检查剥离
- **ZK agent → 把"任务可执行性检查"剥离**

**它们做的事情本质相同**：
- 都是"可形式化的正确性检查"
- 都是"如果失败，原因明确、可修复"
- 都不需要人类的价值判断，只需要逻辑判断

**人类的正确位置**：
- "这个任务值得做吗？"（价值判断）
- "方向 A 还是方向 B？"（战略判断）
- "ZK agent 发现的 gap 是真的 blocker 还是探索友好的？"（经验判断）

### 4. 约束产生纪律（Constraint Produces Discipline）—— 为什么"利用限制"优于"补偿限制"

**传统假设**：agent 的无记忆性是缺陷，需要补偿（更长的 context window、更好的 RAG、session 记忆）。

**这个项目的调整**：把无记忆性当作**约束条件来设计**——约束产生纪律：

- **因为 agent 每次都是 freshman，所有重要信息必须外化** → cortex task/ADR/AGENTS.md gotcha 不是"好习惯"，是**必要条件**
- **因为 agent 不能靠记忆传递意图，goal 必须是声明式的** → WHAT/WHY/HOW task card、ADR，而不是命令式（"你上次说要做 X，接着做"）
- **因为 agent 不能靠上下文积累判断"现在在哪"，状态必须是可查询的** → cortex probe、daily ground truth，而不是隐式

**SSOT 三轴模型**是这个设计的显式表达：外化（写下来）、压缩（蒸馏到刚好够）、清零（利用空白状态）。三轴里唯一"利用"无记忆性而不是"补偿"它的是**清零轴**（ZK Review/ZK Validation）。

**副产品**："人员流动大"从风险变成了**中性事实**。传统项目里人员流动导致知识流失，因为知识在人脑里。这个项目里知识在 git 里，人员流动不影响——因为每个"人员"（agent）本来就是 freshman。

**并发优势**：传统团队里"老人"是稀缺资源，不能并发。freshman 可以并发，只要基础设施足够好。arena（多 agent 并行评估）、ZK Review（同时跑多个 ZK agent）都是在利用这个特性。

**类比**：Immutable data 强制显式状态管理 → 无记忆性强制显式知识管理。约束不是缺陷，是设计工具。

## When to Apply / When Not to Apply

**适用**：
- Task 设计审查（WHAT/WHY/HOW/gaps）
- 文档可读性验证（Level 1 ZK Validation）
- 输出层 UX 测试（Level 2 Trial Usage）
- 任何"作者已经知道答案，但需要验证描述是否自足"的场景

**不适用**：
- 需要领域深度知识的审查（ZK agent 没有领域知识，只能发现"信息缺失"）
- 价值判断（"这个功能重要吗？"——ZK agent 无法判断）
- 创造性工作（ZK agent 是传感器，不是灵感来源）

## Related

- [ZK Review reference](../../packages/lythoskill-project-cortex/skill/references/zk-review.md) — 操作指南
- [ADR-20260614131433088](../../adr/02-accepted/ADR-20260614131433088-zk-review-methodology-upgrade-parallel-validation-and-task-chain-signals.md) — 方法论升级
- [daily/2026-06-14.md](../../../daily/2026-06-14.md) — ZK Review meta-learning 实践记录
- [daily/2026-06-15.md](../../../daily/2026-06-15.md) — ZK 执行测试验证
- [weekly/2026-W24.md](../../../weekly/2026-W24.md) — "1000+ commits 之后瓶颈在记忆"

---

**一句话总结**：ZK Review 的三个设计选择（零知识 reviewer、fork 连续性、不麻烦人类）分别对应三个独立成立的原理（知识诅咒、评审连续性、注意力经济）。它们只是没有被包装成热门词汇，但这反而说明它们是从实际问题出发推导出来的。