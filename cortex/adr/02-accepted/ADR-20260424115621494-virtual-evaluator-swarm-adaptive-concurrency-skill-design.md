# ADR-20260424115621494: virtual-evaluator-swarm adaptive concurrency skill design

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-24 | Created |
| accepted | 2026-04-24 | Approved by user |

## 背景

skill 评价目前依赖单一视角——要么是 arena 的 judge persona，要么是 curator 的 LLM 推理。但 skill 的价值是多维度的：同一个 skill，架构师关注边界设计，产品经理关注文档可读性，测试员关注稳定性，黑客关注安全隐患。

问题在于：
1. 单一评价者无法覆盖所有维度
2. 不同 agent 平台的并发能力不同（Kimi 有 agent swarm，Claude Code 有 subagent，Web Chat 无并发）
3. 评价应该是"影子"——虚拟化的、不依赖真实用户的

## 决策驱动

- **多维度评价**：单一视角的评价有盲区，需要多个虚拟人格从不同角度审视
- **平台无关**：不绑定特定 agent 平台，而是检测宿主能力后自适应调度
- **TCG 心智延续**：像卡牌游戏的"多评论家评分"，不同评论家关注不同维度
- **MBTI 人格化**：用虚拟人格（INTJ 架构师、ENFP 产品经理等）来模拟真实用户的不同关注点

## 选项

### 方案A：绑定特定平台的并发机制

为每个平台写独立的评价器：Kimi 版用 agent swarm，Claude Code 版用 subagent，Web Chat 版用串行。

**优点**:
- 每个平台可以充分利用原生并发能力

**缺点**:
- N 个平台就要维护 N 个实现
- 新增平台时需要新增实现
- 违背 lythoskill 的平台无关原则

### 方案B：自适应并发调度（推荐）

设计一个独立的 `lythoskill-skill-evaluator` skill，检测宿主 agent 的并发能力，然后自适应选择调度策略。

**核心设计**：

```
lythoskill-skill-evaluator
├── 检测宿主并发能力
│   ├── Kimi (agent swarm) → 并行调度 8 个评价者
│   ├── Claude Code (subagent) → 并行调度 4 个评价者
│   ├── Cursor/Windsurf (无并发) → 串行调度或提示用户手动运行
│   └── Web Chat (无并发) → 单评价者 + 维度轮询
│
├── 虚拟评价者影子军团
│   ├── INTJ 架构师 → 代码质量、边界设计、接口契约
│   ├── ENFP 产品经理 → 用户体验、文档可读性、上手难度
│   ├── ISTJ 测试员 → 边界条件、异常处理、稳定性
│   ├── ENTP 黑客 → 安全隐患、绕过可能、注入风险
│   ├── INFJ 技术写作者 → 文档完整性、示例质量、术语一致性
│   └── ESTP 运维工程师 → 部署复杂度、依赖管理、可维护性
│
└── 输出：多维度评分向量 → Pareto 前沿
```

**调度协议**：

```markdown
## 宿主并发能力检测

1. 检查环境变量或 API：
   - `KIMI_AGENT_SWARM_AVAILABLE` → 使用 swarm 模式
   - `CLAUDE_CODE_SUBAGENT_AVAILABLE` → 使用 subagent 模式
   - 无上述标志 → 降级为串行模式

2. 根据并发能力确定评价者数量：
   - swarm: 8 个并发评价者
   - subagent: 4 个并发评价者
   - 串行: 2 个评价者（用户可手动扩展）

3. 每个评价者接收：
   - 被测 skill 的 SKILL.md
   - 评价者人格 prompt（MBTI + 角色 + 关注点）
   - 输出格式：1-5 分评分 + 关键发现

4. 聚合结果：
   - 评分向量（每个维度一个分数）
   - Pareto 前沿识别
   - 冲突发现（不同评价者给出相反结论时标记）
```

**优点**:
- 平台无关：一个 skill 适配所有平台
- 充分利用宿主并发能力
- 评价维度可扩展（新增 MBTI 类型即可）
- 和 arena 的 Pareto 分析天然对接

**缺点**:
- 需要维护不同平台的检测逻辑
- 串行模式下体验较差

## 决策

**选择**: 方案B（自适应并发调度）

**原因**:

1. **平台无关是 lythoskill 的核心原则**：deck 治理本身就不绑定特定 agent 平台（Kimi、Claude Code、Cursor 都支持 `.claude/skills/`）。评价器也应该遵循同样原则。

2. **检测而非声明**：不让用户手动选择"我在用 Kimi"，而是通过环境检测自动判断。这符合"不重新发明 agent 社交网络，借鉴 indie web"的思路——indie web 的协议是能力协商式的（feature detection），不是平台识别式的（UA sniffing）。

3. **影子评价的真实性**：虽然评价者是虚拟人格，但它们代表的是**真实用户群体的关注点分布**。INTJ 架构师不是"假"的——它代表的是真实存在的架构师用户群体对 skill 的期望。

4. **和 arena 的关系**：arena 验证 deck 组合效果，evaluator 验证单个 skill 质量。两者都输出评分向量，共享 Pareto 分析框架。

## 影响

- 正面:
  - 评价覆盖度大幅提升（从单一视角到六维度）
  - 平台无关，所有 agent 用户都能使用
  - 发现的冲突（如"架构师给 5 分但产品经理给 2 分"）本身就是有价值的洞察
  - 虚拟评价者可以"训练"——根据真实用户反馈调整评分权重

- 负面:
  - 并发模式下 token 消耗大（8 个评价者同时读取 SKILL.md）
  - 需要维护不同平台的并发 API 适配
  - 串行模式下体验不够好

- 后续:
  - 在 `cortex/wiki/` 中增加"虚拟评价者人格设计指南"
  - 定义评价者 prompt 模板（MBTI + 角色 + 关注点 + 输出格式）
  - 和 arena 共享评分向量和 Pareto 分析代码
  - 考虑 evaluator 的缓存机制（同一 skill 在短时间内不重复评价）

## 相关

- 关联 ADR: ADR-20260424114401090-combo-skill-as-orchestration-layer-naming-and-emergence-strategy.md（combo 认识论）
- 关联 Skill: lythoskill-arena（共享 Pareto 分析框架）
- 关联概念: Kimi agent swarm、indie web feature detection、MBTI 人格化
