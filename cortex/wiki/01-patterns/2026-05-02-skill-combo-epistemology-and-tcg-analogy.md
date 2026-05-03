# Skill Combo 认识论与 TCG 类比

> 为什么 lythoskill 需要三种不同的 combo 机制？因为知识的产生方式不止一种。

---

## 核心洞察

lythoskill 的 arena 和 curator 不是简单的工具——它们是**认识论装置**（epistemological apparatus）。它们帮助系统（和人类）理解 skill 组合的知识，方式类似于科学方法论中的不同研究手段。

同时，这三种 combo 机制完全符合 TCG（集换式卡牌游戏）玩家的直觉。TCG 玩家每天都在做 combo 发现：先看卡牌描述（显式 combo），再分析牌库（curator），最后实战测试（arena）。

---

## 三层 Combo 认识论

```
┌─────────────────────────────────────────────────────────────┐
│                    知识产生方式                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 3: 显式 Combo        演绎知识 (a priori)              │
│  "设计者知道这两张卡一起用很强"                               │
│                                                             │
│  Layer 2: Curator           归纳知识 (inductive)             │
│  "扫描牌库发现这两张卡关键词重叠 87%"                         │
│                                                             │
│  Layer 1: Arena             实证知识 (empirical)             │
│  "实战对局 10 场，这个 combo 胜率 80%"                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Layer 3: 显式 Combo（设计者定义）

**认识论位置**：演绎知识。设计者基于经验确信某个组合会产生特定效果。

**实现方式**：`lythoskill-combo-xxx` skill，SKILL.md 中用 Mermaid 流程图定义编排规则。

**TCG 类比**：卡牌描述上的 "当这张卡和 [某卡] 同时在场时..."

**例子**：
- `lythoskill-combo-report-generation` 定义：web-search → design-doc-mermaid → docx 的报告生成链路
- 设计者知道这三张卡在一起能产生 1+1+1>3 的效果

### Layer 2: Curator（先验归纳）

**认识论位置**：归纳知识。通过分析冷池中的 skill 元数据，发现潜在的关联和组合可能。

**实现方式**：`lythoskill-curator` 扫描冷池，生成 REGISTRY.json + catalog.db，供 agent LLM 推理时参考。

**TCG 类比**：牌库扫描器——分析所有卡牌的关键词、属性、费用曲线，推荐 "你可能想把这些卡放在同一个卡组里"。

**输出**：
```json
{
  "skill": "design-doc-mermaid",
  "related": ["web-search", "docx"],
  "overlap_score": 0.87,
  "reason": "都涉及 'report' 和 'document' 关键词"
}
```

**关键洞察**：curator 不做判断，只提供**可解释的相关性数据**。最终的组合决策由 agent 的 LLM 推理完成——这是"人机协作的归纳"。

### Layer 1: Arena（后验实验）

**认识论位置**：实证知识。通过控制变量的对比实验，验证某个组合的实际效果。

**实现方式**：`lythoskill-arena` 生成临时 deck，启动 subagent，收集输出，Pareto 分析。

**TCG 类比**：测试场——"我用这套卡组打了 10 局，胜率 80%，但 mana curve 有问题"。

**输出**：
- 不是 "Winner"，而是 Pareto 前沿
- 每个 deck 配置的评分向量（quality, token, maintainability）
-  Emergent combo 发现："这三张卡在一起时产生了未在 SKILL.md 中声明的协同效应"

---

## 为什么需要三层？

单一层级无法覆盖所有知识场景：

| 场景 | 需要哪层 |
|------|---------|
| "我确定这个组合有效" | 显式 combo |
| "我不知道哪些 skill 可以组合" | Curator（发现可能性） |
| "我不确定这个组合是否真的更好" | Arena（验证效果） |
| "我发现了一个从未声明过的 emergent combo" | Arena → 反馈到显式 combo |

**知识流动方向**：

```
Arena 发现 emergent combo
        ↓
Curator 索引到 catalog（"这个 combo 已被验证"）
        ↓
显式 Combo 吸收为正式 SOP（写入 SKILL.md）
        ↓
Arena 下一轮测试新的变量...
```

这是一个**知识生产的飞轮**：实验发现 → 索引归档 → 沉淀为规范 → 新一轮实验。

---

## TCG 玩家的完整直觉

TCG 玩家构筑卡组的完整流程，对应 lythoskill 的完整 combo 发现流程：

```
1. 读卡牌描述
   "这张卡在场时，所有龙族攻击力 +500"
      ↓
   对应：显式 combo（SKILL.md 中的协作声明）

2. 扫描牌库
   "我有 12 张龙族卡，其中 3 张有 combo 潜力"
      ↓
   对应：Curator（冷池扫描 + 相关性分析）

3. 组卡测试
   "这套卡组理论很强，但实战 mana 不够"
      ↓
   对应：Arena（控制变量对比 + Pareto 分析）

4. 调整优化
   "去掉 2 张高费，加入 1 张滤抽，胜率从 60% → 75%"
      ↓
   对应：Deck 迭代（--decks 参数比较不同配置）
```

TCG 玩家不会只用其中一层——他们会同时用三层来优化卡组。lythoskill 的用户也应该如此。

---

## 对 Skill 作者的启示

### 如果你写了一个 Standard skill

- 在 SKILL.md 中写清楚 "相关 Skill" 章节（提供 Layer 3 基础）
- 但不要写死 combo 关系——让 curator 和 arena 有机会发现你没想到的组合

### 如果你写了一个 Combo skill

- 命名必须用 `combo-` 前缀
- SKILL.md 中只写编排逻辑，不写业务逻辑
- 明确触发条件（"当 deck 中同时存在 A 和 B 时激活"）

### 如果你写了一个 Flow skill

- 用 Mermaid 图定义流程节点
- 每个节点对应调用一个 standard skill 的 CLI
- Flow 本身不实现逻辑，只做"按图索骥"

---

## 相关

- [thin-skill-pattern.md](./thin-skill-pattern.md) — 三层分离模式
- [skill-selection-pipeline.md](./skill-selection-pipeline.md) — Skill 选择管道
- `cortex/adr/01-proposed/ADR-20260424114401090-combo-skill-as-orchestration-layer-naming-and-emergence-strategy.md` — Combo skill 设计决策
