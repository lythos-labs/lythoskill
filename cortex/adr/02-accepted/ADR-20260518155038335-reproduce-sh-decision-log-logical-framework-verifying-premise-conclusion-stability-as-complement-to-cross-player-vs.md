# ADR-20260518155038335: Reproduce.sh + decision-log + logical framework — verifying premise-conclusion stability

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-18 | Created |
| accepted | 2026-05-18 | Accepted |

## 背景

### 两种互补的验证模式

从 curator → journalist → arena 动线中，浮现出两种不同的验证需求：

1. **Cross-player vs**（kimi vs codex vs deepseek）：多 agent 独立评估同一命题，发现争议点取决于什么前提。重型——需要多 CLI runner、external player setup。

2. **Reproduce.sh × N + structured decision-log + CLI logic check**：**同 agent single 模式反复跑**，验证逻辑链稳定性——同样的前提是否总能导出同样的结论。轻量——只需一个 agent（kimi 或 claude 都可以，useAgent 稳定即可），reproduce.sh、decision-log.jsonl。

两者互补且**独立**：不需要 vs 也能做 reproduce 稳定性验证。Single × N 验证"如果你接受这些前提为真，就能得到和我一样的结论"。Vs 发现"不同 agent 在哪些前提上有分歧"。

### 为什么需要逻辑框架

单纯跑多次 reproduce.sh 可以验证一致性和发现脆弱性（同一判断是否会随机漂移），但没有解释脆弱性的**结构**——到底哪个前提被扰动时结论会翻转。

这需要一个机械的、可 CLI 化的逻辑框架：
- 命题分解为原子子命题（agent 做）
- 子命题之间的逻辑关系（AND/OR/IMPLIES）
- 置信度在逻辑结构上的传播规则
- 矛盾检测（A ∧ ¬A → flag）
- Leverage 分析（哪个前提的置信度变化对结论影响最大）

### 和现有 arena 的关系

Arena 已经确立了 reproduce.sh IoC 模式（EPIC-20260518024809887）。Decision-log.jsonl 已经在使用（curator reproduce.sh 验证中产出）。缺失的是：
1. 决策链和前提来源的**显式化**——不是隐在 agent 推理里，而是 structured trace
2. 逻辑框架的**机械层**——置信度传播、矛盾检测、leverage 计算的 CLI
3. Reproduce × N 的**统计稳定性**——不是一次通过，而是多次跑的一致性度量

## 决策驱动

- **Reproduce.sh 需要升级**：当前 reproduce.sh 验证"功能是否跑通"。需要扩展到"逻辑链是否稳定"——同样的前提是否总导出同样的结论。
- **Decision-log 需要结构化**：当前 decision-log 是自由格式 JSONL。需要支持逻辑关系标注（`premise_of`, `supports`, `contradicts`）和来源引用（`source_type`, `source_url`）。
- **CLI 需要机械检查**：agent 做语义判断（命题分解、证据搜索、前提确认）。CLI 做确定性计算（置信度传播、矛盾检测、leverage 分析）。这是 thin pattern 的延伸。
- **Cross-player vs 的互补**：vs 发现争议。Reproduce 验证稳定性。两者共用同一个 decision-log 格式和逻辑框架。

## 选项

### 方案 A：纯 agent 驱动（现状延续）

所有逻辑推理在 agent 侧完成。Reproduce.sh 只验证功能是否跑通。Decision-log 自由格式。不做结构化逻辑框架。

**优点**:
- 零新增 infra
- Agent 已经有推理能力

**缺点**:
- 无法做机械的稳定性分析（leverage、contradiction detection）
- Agent 推理是黑箱——结论为什么不一致，无法追溯
- 无法区分"随机漂移"和"结构性脆弱"
- 无法向第三方证明逻辑链自洽

### 方案 B：结构化 decision-log + CLI 逻辑框架

Structured decision-log 记录前提来源和逻辑关系。CLI 做确定性计算（置信度传播、矛盾检测、leverage）。Agent 做语义判断。Reproduce.sh × N 验证稳定性。

**优点**:
- 逻辑链可 replay 和审计
- 争议点追溯精确到前提级别
- "如果你接受这些前提为真，就能得到和我一样的结论"——可证明
- 机械层和语义层分离（thin pattern）
- Cross-player vs 和 reproduce 共用同一 framework

**缺点**:
- 需要定义 structured decision-log schema
- 需要 CLI 实现逻辑传播算法
- Agent 需要额外标注逻辑关系（增加 prompt 复杂度）

### 方案 C：完整逻辑证明框架（Lean4-style）

命题用严格形式化语言表述。充分必要条件精确声明。置信度用概率逻辑演算。矛盾检测不依赖排中律。

**优点**:
- 最严格——纯机械可验证
- 可以发展出反脆弱结构分析

**缺点**:
- 过度 formal——agent 写 Lean4 风格证明的可靠性存疑
- 大多数命题无法严格形式化（"这个 skill 质量好"怎么形式化？）
- 投入远超产出——是远期方向，不适合当前

## 决策

**选择**: 方案 B — Structured decision-log + CLI 逻辑框架。

**核心架构**:

```
proposition to verify
    ↓
agent: decompose → atomic sub-claims (premises)
agent: evidence search → sources with provenance
    ↓
agent: annotate logical relations
    ├─ supports(P, C)    — premise P supports conclusion C
    ├─ contradicts(A, B) — premise A contradicts premise B
    ├─ premise_of(P, C)  — P is a necessary premise for C
    └─ source(P, url)    — evidence provenance
    ↓
CLI: logical framework (deterministic)
    ├─ confidence_propagate(relations, confidences) → conclusion confidence
    ├─ detect_contradiction(relations) → [(A, ¬A)]
    ├─ leverage(premise, conclusion) → sensitivity score
    └─ missing_premises(conclusion, relations) → unsupported claims
    ↓
reproduce.sh × N
    ├─ same agent, same task, same premises → same conclusion?
    ├─ stability_score = consistency across N runs
    └─ fragility_map = premises ranked by leverage
    ↓
decision-log.jsonl — replayable, auditable
```

### 贝叶斯视角：先验 vs 证据的显式分离

快思慢想（Kahneman）指出人类概率直觉（System 1）和经典概率之间的偏差——不是概率论错了，而是"巧合"和"刻意/模式匹配"在贝叶斯框架下确实会影响真实概率。这对 verification 框架有直接含义：

1. **Agent 的先验不是噪音——是贝叶斯先验**。一个经验丰富的 curator 判断"这个 skill 大概率不可靠"和"这次测试偶然失败"是基于先验的合理推断。CLI 不应该消除先验，而应该**显式记录它**。

2. **"巧合"可以被 reproduce 检测**：如果 A 和 B 同时出现一次，可能是巧合（low prior, low evidence → LOW confidence pattern）。如果 N 次 reproduce 都出现，就是系统性模式（high evidence → HIGH confidence pattern）。

3. **先验强度 vs 证据强度的分离**：
```
confidence = bayesian_update(prior, evidence)
  prior: agent's System 1 judgment ("looks like X based on experience")
  evidence: structured sources with provenance (L1/L2/L3)
  
CLI checks:
  - prior_leverage: how much does prior affect conclusion?
  - evidence_sufficiency: is evidence alone enough to reach the same conclusion?
  - pattern_stability: does the pattern persist across N reproduce runs?
```

4. **Pattern-matching bias 检测**：如果 prior 强但 evidence 弱，agent 正在 pattern-match。CLI 标记为 `prior_dominated`——不是错误，是需要更多证据的信号。

**Structured decision-log 扩展**：
```jsonl
{"t":0,"phase":"prior","claim":"skill with vague desc is usually low quality","confidence":0.7,"basis":"experience"}
{"t":1,"phase":"evidence","claim":"this skill's desc has no when_to_use","confidence":"HIGH","source_type":"self/scan","source_url":"SKILL.md L1-L7"}
{"t":2,"phase":"conclusion","claim":"this skill is low quality","confidence":"HIGH","method":"bayesian_update(prior=0.7, evidence=HIGH)","prior_leverage":0.15}
```

这不是还原论——不要求把所有判断拆成原子命题。但在逻辑框架自洽和显式声明的前提下，可以做置信度的概率精算。矛盾检测甚至不依赖排中律（A 和 ¬A 可能在贝叶斯意义下共存于不同先验下）。

1. **Structured decision-log schema**：
```jsonl
{"t":0,"phase":"premise","id":"P1","claim":"skill X is fast","confidence":"LOW","source_type":"author","source_url":"SKILL.md L4"}
{"t":1,"phase":"premise","id":"P2","claim":"skill X completed task Y in 120ms","confidence":"HIGH","source_type":"self/arena","source_url":"arena-2026-05-18"}
{"t":2,"phase":"relation","type":"supports","from":"P2","to":"P1","note":"arena evidence confirms speed claim"}
{"t":3,"phase":"conclusion","id":"C1","claim":"skill X is suitable for latency-sensitive tasks","confidence":"MEDIUM","premises":["P1","P2"],"logic":"AND(P1,P2)"}
```

2. **CLI 机械层**（新子命令，或在 journalist/curator 中扩展）：
   - `verify-logic <decision-log.jsonl>` — 检查矛盾、缺失前提、置信度传播一致性
   - `leverage <premise-id> <conclusion-id>` — 计算单一前提翻转对结论的影响
   - `stability <reproduce-dir/*.jsonl>` — 多次跑的决策链一致性度量

3. **Reproduce.sh 升级**：不是 pass/fail，而是 N 次 single run 后报告 stability_score 和 fragility_map。Single 模式足够——useAgent 选稳定的 kimi 或 claude 即可。

4. **和 cross-player vs 共用**：vs 的每个 side 产出 structured decision-log。CLI 可以 diff 不同 player 的 decision-log——精确到前提级别的分歧分析。但 vs 不是 reproduce 的前提条件。

## 影响

- **正面**:
  - 逻辑链可 replay、可审计、可向第三方证明
  - 争议点追溯精确到前提级别
  - 机械检测结构脆弱性（哪个前提被扰动结论就翻转）
  - Thin pattern 延伸——CLI 做计算，agent 做判断
  - Cross-player vs 获得精确分歧分析能力

- **负面**:
  - Agent 需要额外标注逻辑关系（增加 prompt 复杂度和 token 成本）
  - Structured schema 定义需要迭代（初期可能不完整）
  - Reproduce × N 需要 N 次 agent run，成本 N 倍
  - 不是所有命题都适合这种分析——简单命题 overhead 过大

- **后续**:
  - 定义 structured decision-log schema（先做 MVP：premise + supports + contradicts）
  - 在 journalist skill 中集成 logical relation 标注 SOP
  - CLI 实现 `verify-logic` 子命令（contradiction detection 优先级最高——这是最硬的信号）
  - Arena reproduce.sh 升级支持稳定性验证
  - 长期：Lean4-style 严格形式化作为可选深度模式

## 相关
- 关联 ADR:
  - ADR-20260518024500631: BDD evolution to reproduce.sh IoC pattern
  - ADR-20260518123403810: Curator role re-derivation
  - ADR-20260509170343037: Self-healing error context (HATEOAS)
- 关联 Epic:
  - EPIC-20260518024809887 (closed): BDD evolution to reproduce.sh
