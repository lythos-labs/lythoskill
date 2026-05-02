# ADR-20260502110308316: Arena TOML Schema — Player as Facade 与对决声明

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-02 | Context: arena CLI 当前使用命令行标志，缺乏可复现的声明式配置 |

## Context

Arena 当前通过 CLI 标志运行：

```bash
bunx @lythos/skill-arena \
  --task "Generate auth flow diagram" \
  --skills "design-doc-mermaid,mermaid-tools" \
  --criteria "syntax,context,token"
```

这种方式存在三个结构性限制：

1. **不可复现**：CLI 标志是一次性输入，无法版本化、无法 diff、无法 code review
2. **环境与能力耦合**：task 描述和 skill 列表混在同一行，环境准备（如容器、依赖安装）无声明位置
3. **两方隐含**：`--skills` 和 `--decks` 的对比语义是"A vs B"，但"对决方"本身没有显式抽象——当需要对比"不同 persona 使用同一 deck"或"同一 persona 使用不同 deck"时，语义模糊

### Player 不是配置项，是 Facade

ADR-20260424120936541 (accepted) 已声明 **Player = Facade**，identity 让位给 Hermes / OpenClaw。但这只是"不做什么"的边界声明。本 ADR 提出"Player 是什么"的正面定义：

**Player = Hermes agent + 内置提示词 + soul + identity + memory**

- **Hermes agent**：自主进化的 agent 实例（或代理它的 commercial CLI）
- **内置提示词**：player 的 system prompt / persona 定义——"你是谁、你倾向什么风格、你的知识边界"
- **soul**：长期偏好、价值观、审美判断——超越单次对话的 persistent judgment
- **identity**：跨平台可识别的身份标识（ Hermes / OpenClaw 层承载）
- **memory**：历史 arena 实战日志、个人化 trust 评分、曾经的决策后悔

Player 不是 `skill-deck.toml` 里的一个字段，也不是 cortex 的一个 task card。**Player 是一个完整的 agent 实例**——只是通过 facade 接口与 lythoskill 交互。Arena 对比的不是"skill A vs skill B"，而是"player X 装备 deck A 后的完整表现 vs player Y 装备 deck B 后的完整表现"。

## Decision

### 1. 引入 `arena.toml` 作为对决声明文件

Arena 从 CLI 标志驱动迁移到 **声明式 TOML 驱动**。`arena.toml` 是 Infrastructure-as-Code 风格的对决配置——可版本化、可复现、可 code review。

### 2. 核心抽象：`[[side]]` = 对决方

> **N 元 = 选手拿着指定卡组到指定场地跑指定项目，用自己的风格。**

每一方由 **player（选手/心智）+ deck（卡组/能力）+ env（场地/环境）** 三元组构成：

```toml
# arena.toml — 对决声明
[arena]
task = "Generate auth flow diagram"
criteria = ["syntax", "context", "logic", "token"]
runs_per_side = 3          # 每方跑几轮，减少方差

# ── Side 1 ──
[[side]]
name = "minimal"
player = "standard-coder"           # 指向 cortex/players/standard-coder.toml
deck = "./decks/minimal.toml"

# ── Side 2 ──
[[side]]
name = "rich"
player = "expert-architect"
deck = "./decks/rich.toml"

# ── Side 3: 对照组 ──
[[side]]
name = "baseline"
player = "standard-coder"
deck = "./decks/baseline.toml"
control = true                      # 对照组，不参与 Pareto 前沿计算
```

### 3. Player 外置与复用

Player 定义外置为独立的 `cortex/players/<name>.toml`：

```toml
# cortex/players/standard-coder.toml
[player]
name = "Standard Coder"
persona = "你是一个务实的全栈开发者，优先可读性和可维护性..."

[player.soul]
preferences = ["explicit over implicit", "composition over inheritance"]
aesthetic = "clean architecture, minimal abstraction"

[player.identity]
hermes_id = "std-coder-01"          # Hermes / OpenClaw 层标识
memory_source = "cortex/memory/standard-coder/"

[player.memory]
arena_logs = "cortex/arena-logs/"
trust_index = "cortex/curator/trust-standard-coder.json"
```

Player 与 deck **解耦**：同一 player 可以装备不同 deck，同一 deck 可以被不同 player 装备。Arena 的核心对比维度因此分为两类：

| 对比类型 | 变量 | 控制变量 |
|---------|------|---------|
| Deck 评测 | `deck` 不同 | `player` 相同 |
| Player 评测 | `player` 不同 | `deck` 相同 |
| 综合评测 | `player` + `deck` 都不同 | 无（纯 Pareto 前沿分析） |

### 4. 环境隔离（IaC + 容器）

Side 可声明执行环境，确保复现：

```toml
[[side]]
name = "node-20"
player = "standard-coder"
deck = "./decks/minimal.toml"

[side.env]
container = "node:20-alpine"
pre_run = ["npm ci", "npm run build"]
working_dir = "/workspace"
env_vars = { NODE_ENV = "test" }
```

环境声明遵循 IaC 原则：**arena.toml 描述"期望环境"，arena CLI 负责收敛到实际环境**（类似 deck link 的 reconciler 逻辑）。

### 5. 多方的自然延伸

默认两方对决，但 `[[side]]` 数组天然支持 2~N 方：

```toml
[[side]]
name = "A"
[[side]]
name = "B"
[[side]]
name = "C"
[[side]]
name = "D"
```

- 2~5 方：直接 Pareto 前沿分析
- >5 方：CLI 拒绝，提示拆分为多个 arena（防止 context window 在 judge 阶段爆炸）

### 6. Host-Side 执行边界：Arena 编排 ≠ Side 执行

Arena 目录（`arena.json`、`decks/`、`report/`）位于 **Host（组织者）侧**，负责对决声明解析、结果聚合、评价与可视化。

每个 Side 的实际任务执行发生在 **独立的 Side 环境** 中，该环境与 Host 文件系统隔离：

- Side 环境已预装对应 deck，`.claude/skills/` 处于正确状态（无论什么形式：容器、远程 agent、临时目录）
- Side **只接收 task card**（任务描述 + 输出格式要求），看不到其他 Side 的配置与输出
- Side **不访问 Host 项目文件**，包括 Host 的 `.claude/skills/`、`skill-deck.toml`、源代码
- Side 执行完成后，仅将产物（`runs/*.md`）回传 Host

**为什么必须隔离**：

若 Side 默认 cwd 就是 Host 项目本身，subagent 执行 `deck link` 会直接修改 Host 的 `.claude/skills/`，导致：
1. Side A 与 Side B 互相覆盖 working set（串信息）
2. Host 原始 deck 状态被破坏，arena 结束后无法恢复
3. Side 可能意外读取 Host 的源代码、配置、密钥，引入不可控变量

> 此问题与 deck link 的 CWD 设计直接相通：`deck link --workdir` 要求明确指定工作目录以正确解析 `skill-deck.toml` 中的相对路径。若 Side 在 Host cwd 执行，不仅串改 Host 的 working set，还会因 cwd 语义导致 deck 路径解析错误——arena 的 Side 隔离是 deck CWD 治理在分布式/多租户场景下的自然延伸。

正确的执行模型：

```
Host（arena 组织者）          Side A（隔离环境）            Side B（隔离环境）
───────────────               ───────────────              ───────────────
arena.json                    预装 deck A                  预装 deck B
report.json                   .claude/skills/ 就绪         .claude/skills/ 就绪
TASK-arena.md ──task card──→  接收任务描述                 接收任务描述
                              产出 runs/run-01.md ──→      产出 runs/run-02.md ──→
                                                        回传 Host 聚合
```

> **当前实现尚未达成此隔离。** 现有 CLI 生成的 TASK-arena.md 指令默认在 Host 项目目录执行 `deck link`，这是已知缺陷，需在后续迭代中通过容器化或临时工作目录解决。详见 Consequences → Negative。

## Consequences

### Positive

- **可复现**：`arena.toml` + `deck.toml` + `player.toml` 构成完整复现包，`git clone` 即可重跑
- **player 显式化**：把"谁在测"从隐含参数提升为一等公民，player 的演进（soul 成熟、memory 积累）成为可观测变量
- **环境即声明**：容器化 side 消除"在我机器上能跑"类 arena 污染
- **与 deck 治理统一**：`arena.toml` 引用 deck 的方式与 `skill-deck.toml` 引用 skill 的方式一致——都是声明 + 路径引用

### Negative / Risks

- **Player 定义尚未成熟**：当前没有 `cortex/players/` 目录规范，player.toml 的 schema 需要单独 ADR
- **容器化增加冷启动时间**：每个 side 拉取镜像、安装依赖会显著增加 arena 总耗时
- **N-side 组合爆炸**：如果 player 有 3 种、deck 有 4 种，全组合 = 12 方，超出 `max_participants = 5`。需要显式声明对比矩阵，而非隐式笛卡尔积
- **当前 CLI 尚未实现 Side 隔离**：现有实现生成的 TASK-arena.md 指令默认在 Host cwd 执行 `deck link`，Side 之间会串改 `.claude/skills/`。需后续通过容器化或临时工作目录解决（参见 Decision §6）

### Migration Path

CLI 标志模式保留为快捷方式，内部转换为内存中的 `arena.toml` 等价结构：

```bash
# 旧方式（仍支持）
--skills a,b --control scribe

# 内部等价于
[[side]]
name = "a"
deck = "generated-a.toml"
[[side]]
name = "b"
deck = "generated-b.toml"
# control = "scribe" 隐式注入到每个 deck
```

## Related

- ADR-20260424120936541 (accepted): Player = Facade，Identity 让位给 Hermes / OpenClaw
- ADR-20260424115621494 (accepted): Virtual Evaluator Swarm — arena 的 judge 层设计
- ADR-202605011600 (proposed): desc-preference-learning-arena — arena 的 pilot 结果
