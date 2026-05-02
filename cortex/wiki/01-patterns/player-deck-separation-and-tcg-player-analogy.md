# Player-Deck 分离模型与 TCG 牌手类比

> 同一个 deck 交给 Claude Code、Kimi、Codex，就像同一副牌交给三个牌手打。
> 效果不同，不是牌的问题，是牌手的问题 —— 或者更准确地说，是**牌手与牌组的匹配问题**。

---

## 核心分离

```
Player（牌手）              Deck（牌组）
├─ 平台: claude-code        ├─ max_cards
├─ 模型: claude-opus-4-6    ├─ skills[]
├─ 并发: 4 subagents        └─ combos[]
├─ tool_set
└─ 原生能力
```

**Player 回答"谁在打"，Deck 回答"用什么打"。**

---

## 为什么 Deck 边界不能越过 Skills

### 1. 变更频率不同

| 文件 | 变更频率 | 原因 |
|------|---------|------|
| `player.toml` | 极低 | 你换了模型或平台才会改 |
| `skill-deck.toml` | 高 | 每次迭代都可能增减 skills |

如果把 player 信息塞进 deck，每次改 skills 都要看到一堆不变的 agent 配置，产生噪音。

### 2. 组合复用需要分离

假设你有 3 个 player 和 3 个 deck：

- 不分离：需要 `3 × 3 = 9` 个组合文件（或每次手动改）
- 分离：只需 `3 + 3 = 6` 个文件，arena 自动组合

### 3. 责任归属清晰

| 问题 | 责任方 |
|------|--------|
| "这个 skill 怎么没有生效？" | Deck（skills 声明） |
| "为什么并发执行报错？" | Player（平台能力） |
| "combo 技能没有协同？" | Deck（combo 定义）或 Player（并发支持） |

---

## TCG 类比全景

| 卡牌游戏概念 | lythoskill 对应物 | 说明 |
|-------------|------------------|------|
| **牌手（Player）** | `player.toml` | 谁在打 — 平台、模型、并发能力 |
| **牌组（Deck）** | `skill-deck.toml` | 用什么打 — skills、max_cards、combos |
| **单卡（Card）** | `SKILL.md` | 技能本体 — 意图、触发词、流程 |
| **对局（Match）** | Arena 任务 | 给特定 player + deck 一个任务，看表现 |
| **套牌对比（Duel）** | `--decks A,B` | 同一 player 拿不同 deck 对决 |
| **牌手对比** | `--players X,Y` | 同一 deck 给不同 player 对决 |
| **组合技（Combo）** | `[combo]` section | 多张卡协同产生 1+1>2 效果 |
| **禁限卡表** | `deny-by-default` | 没声明的 = 不存在 |

---

## 矩阵测试：Arena 的扩展

分离后，arena 从 "deck 对决" 扩展为 "(player, deck) 矩阵"：

```bash
# 2 个牌手 × 2 副牌 = 4 种组合
bunx @lythos/skill-arena \
  --task "设计 auth 流" \
  --players "claude-opus.toml,kimi-swarm.toml" \
  --decks "minimal.toml,rich.toml" \
  --criteria "quality,token,stability"
```

输出不是 "哪副牌赢"，而是 **Pareto 前沿上的 (player, deck) 组合**：

| 组合 | quality | token | stability | 前沿? |
|------|---------|-------|-----------|-------|
| (claude, minimal) | 4.2 | 低 | 高 | ✅ |
| (claude, rich) | 4.8 | 高 | 高 | ✅ |
| (kimi, minimal) | 3.5 | 极低 | 中 | ❌ |
| (kimi, rich) | 4.5 | 中 | 低 | ❌ |

Claude + minimal 便宜够用，Claude + rich 贵但最强 — 两者都在前沿上，看你愿意 trade-off 什么。Kimi 的组合被支配，不在前沿上。

---

## Player 的自我识别与能力验证

### "嗯？这在说我吗？"

Agent 读取 `player.toml` 时，可能发生**自我识别**：

```
player.toml:
  platform = "claude-code"
  model = "claude-opus-4-6"
  concurrent = 4

Agent 自省：
  → 我在 Claude Code 里运行？是。
  → 我的模型是 Opus 4.6？是。
  → 我能创建 subagent？让我试一个……成功，4 个稳定。
  → 系统有 custom instructions / persona 功能？菜单里没看到，不确定。
```

### 声明层 vs 验证层

player 的能力分两层：

| 层级 | 来源 | 可信度 | 例子 |
|------|------|--------|------|
| **声明层** | `player.toml` 静态配置 | 高（用户明确写的） | `concurrent = 4` |
| **验证层** | Agent 运行时自我探测 + memo 记录 | 更高（实际测过） | `persona_switching = false`（测过，菜单里没有） |

有些能力**无法静态声明**，只能运行时验证：
- 系统是否支持 persona / custom instructions
- 实际并发是否稳定（声明 4 个，但第 4 个经常超时）
- 特定 model 对某类 prompt 的响应质量

### Memo：Player 的能力指纹

验证结果不覆盖 `player.toml`，而是追加到 `player.memo`（或 curator 的 `PLAYER-<hash>.json`）：

```toml
# player.toml — 声明层（期望）
[player]
platform = "claude-code"
model = "claude-opus-4-6"
concurrent = 4

# player.memo — 验证层（观测）
[verified.2026-04-29]
concurrent = 4                    # ✅ 压测通过，4 个稳定
persona_switching = false         # ❌ 系统无此功能
session_isolation = true          # ✅ subagent 上下文隔离正常

dependencies.bun = true           # ✅ bun --version 成功
dependencies.zod_available = true # ✅ import('zod') 成功
```

### 搭配 Deck 时的决策

Deck 和 evaluator 不只看声明，而是取**保守交集**：

```
deck 需要:  concurrent >= 4（combo 技能需要 4 路并发）
player 声明: concurrent = 4
player memo: concurrent = 4 ✅（实测稳定）
→ 可以运行

deck 需要:  persona_switching = true（评价者人格切换）
player 声明: （未声明，默认为未知）
player memo: persona_switching = false ❌
→ 降级方案：串行 session 轮转，手动切换人格
```

### 与 Evaluator Swarm 的关系

Evaluator 的调度策略不再检测平台身份，而是读取 player 的声明 + memo：

```
player.concurrent = 8  → 并行启动 6 个评价者
player.concurrent = 1  → 串行退化：人格切换 + session 轮转
```

当 agent 发现 "player.toml 描述的就是我" 时，它会主动验证并更新 memo。这让 player 配置从静态文件变成了**活的状态机**——每次运行都可能修正自己的能力画像。

---

## Deck 边界判定法则

如果你犹豫"这个配置该放进 deck 还是 player"，用这条法则：

> **如果换一个 player（比如从 Claude 换到 Kimi），这个配置还成立吗？**
>
> - **成立** → 放进 Deck（skills, max_cards, combos）
> - **不成立** → 放进 Player（platform, model, concurrent, tool_set）

示例：

| 配置 | 换 player 后 | 归属 |
|------|-------------|------|
| `skills = ["github.com/anthropics/skills/skills/pdf"]` | 任何 player 都能加载 | Deck |
| `max_cards = 8` | 任何 player 都受这个限制 | Deck |
| `concurrent = 4` | Kimi 可以 8，Web Chat 只能 1 | Player |
| `model = "claude-opus"` | Kimi 不支持 | Player |
| `tool_set = ["agent"]` | Web Chat 没有 agent tool | Player |

---

## 常见误解

### "Player 和 Deck 总是 1:1？"

不是。一个项目可以有多个 player 配置用于测试，但生产环境只用一个。就像你测试时可能用"快牌手"和"慢牌手"对比，但比赛只上一个。

### "Player 需要纳入 deck link 吗？"

不需要。`deck link` 只管理 `.claude/skills/` 的内容（即 skills 的物理存在）。Player 配置是 arena 和 evaluator 的输入，不影响 working set 的构成。

### "没有 player.toml 就不能用 deck？"

可以。`player.toml` 是 arena 的增强特性，不是 deck 的必要依赖。日常使用时，deck 只声明 skills 就够了。

---

*与 ADR-20260424120936541 对应：deck 边界划分的决策记录*
