# ADR-20260424120936541: player-deck separation and deck boundary rationale

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-24 | Created |

## 背景

当 lythoskill 的 ecosystem 逐渐完善时，一个核心问题浮现：**`skill-deck.toml` 的边界应该在哪里？**

当前 deck 只声明 skills，但 agent 的实际表现不仅取决于 skills，还取决于谁在执行它们：
- Claude Code Opus 4.6 有 subagent 并发能力
- Kimi 有 agent swarm
- Web Chat 无任何并发
- Codex 可能有不同的 tool set

如果把 "agent 类型 + 模型 + 并发能力" 塞进 `skill-deck.toml`，deck 就会变成膨胀的 "agent 环境全定义"。但同一个 deck 应该可以交给不同的 agent 使用 — 就像同一副牌可以交给不同牌手打。

## 决策驱动

- **单一职责**：deck 管好 skills 就够了，不该去管平台特性
- **组合复用**：一个 deck 应该能在多个 player 上测试，一个 player 应该能测试多个 deck
- **TCG 心智延续**：卡牌游戏里，"牌组"和"牌手"本来就是分离的
- **平台无关**：deck 不绑定任何特定 agent 平台

## 选项

### 方案A：Player 信息内嵌在 deck.toml

在 `skill-deck.toml` 里增加 `[agent]` 或 `[player]` section：

```toml
[agent]
type = "claude-code"
model = "claude-opus-4-6"
```

**优点**:
- 单文件，方便复制粘贴
- 一眼看到完整配置

**缺点**:
- 同一个 deck 想换 player 测试时，必须改文件或复制一份 deck
- deck 和 player 的变更周期不同 — skills 经常变，player 基本不变
- 违背 "同副牌不同牌手" 的直觉

### 方案B：Player 与 Deck 完全分离（推荐）

Deck 只管 skills。Player 配置单独成 `player.toml`：

```toml
# player-claude-code-opus.toml
[player]
platform = "claude-code"
model = "claude-opus-4-6"
concurrent = 4
```

```toml
# deck-minimal.toml
[deck]
max_cards = 4
skills = ["web-search", "project-scribe"]
```

Arena 负责交叉组合：`--players A.toml,B.toml --decks X.toml,Y.toml`

**优点**:
- Deck 保持单一职责，边界清晰
- Player 可复用：同一个 player 配置测所有 deck
- Deck 可复用：同一个 deck 在不同 player 上跑矩阵测试
- 天然支持 "牌手 vs 牌组" 的 TCG 类比

**缺点**:
- 多一个文件概念，需要用户理解 player/deck 分离
- arena 的参数变复杂

## 决策

**选择**: 方案B（Player 与 Deck 完全分离）

**原因**:

1. **Deck 的边界就是 skills**：`skill-deck.toml` 的命名已经暗示了它的职责 — 它是一张"技能清单"。agent 类型、模型、并发能力不属于这个清单。

2. **涌现出的 TCG 类比**："同一副牌给不同牌手" 不是强行套用的类比，而是实际使用场景中自然浮现的模式。用户会直觉地想把 deck 交给 Claude、Kimi、Codex 分别试试效果。

3. **矩阵测试的必要性**：如果不分离，arena 的 `--decks` 对比只能回答 "哪副牌好"。分离后，arena 可以回答 "哪副牌在哪个牌手手里最好" — 这是更高维度的 Pareto 前沿。

## 影响

- 正面:
  - Deck 边界清晰化，不再膨胀
  - Arena 支持 (player × deck) 矩阵测试
  - Player 配置成为可复用 artifact
  - 与 evaluator swarm ADR 自然衔接：evaluator 检测宿主能力 → 对应到 player 的 `concurrent` 字段

- 负面:
  - 新增 `player.toml` 文件格式需要定义 schema
  - 用户需要理解两个文件的关系

- 后续:
  - 在 `cortex/wiki/` 中增加 player-deck 分离模型文档
  - 定义 `player.toml` schema（platform, model, concurrent, tool_set 等）
  - Arena CLI 扩展 `--players` 参数支持
  - 考虑 `player.toml` 是否纳入 deck link 的校验范围（如：检查 player 声明的 skills 是否在 deck 中）

## 相关

- 关联 ADR: ADR-20260424115621494-virtual-evaluator-swarm-adaptive-concurrency-skill-design.md（evaluator 检测宿主能力 → player 配置）
- 关联 ADR: ADR-20260424114401090-combo-skill-as-orchestration-layer-naming-and-emergence-strategy.md（combo 的并发依赖 player 能力）
- 关联 Wiki: [player-deck-separation-and-tcg-player-analogy](../wiki/01-patterns/player-deck-separation-and-tcg-player-analogy.md)
- 关联 Skill: lythoskill-arena（矩阵测试的实现方）
