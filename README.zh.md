# lythoskill

> **治理你的 AI agent 技能。防止技能生态腐烂。**
>
> lythoskill 是 agent skill 生态系统的防腐败层。它不定义技能标准——而是在现有标准之上提供治理基础设施，让你的 agent 在技能从 10 个增长到 100+ 个的过程中始终保持专注、无冲突。

[![npm](https://img.shields.io/npm/v/@lythos/skill-deck)](https://www.npmjs.com/package/@lythos/skill-deck)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 静默混合问题（Silent Blend）

你安装了 **gstack** 做项目管理，又安装了 **superpowers** 做写作工作流。两者都是高主张性技能——它们定义了工作*应该怎么做*。它们不只是帮你写代码，而是强加了一套 workflow、一种风格、一种哲学。

你把两者都放进 `.claude/skills/`。Agent 看到了两者。它不崩溃，也不抱怨。但一半任务按 gstack 规则跑，另一半按 superpowers 规则跑。输出不可预测。Bug 是静默的。

**这就是静默混合**——技能生态系统中最隐蔽的失效模式。它发生在两个*必须互斥*的技能同时被 agent 看到时。

lythoskill-deck 用 **deny-by-default** 解决这个问题：未声明的技能从 `.claude/skills/` 中**物理消失**。不是"禁用"，不是"降权"。**是没了。** Agent 看不到、想不到、不会被它们迷惑。

```toml
# 项目 A：只用 gstack
[tool]
skills = ["gstack"]

# 项目 B：只用 superpowers
[tool]
skills = ["superpowers"]
```

运行 `deck link` → 每个项目只看到一个"方法论"。没有静默混合。没有混乱。

---

## 我需要这个吗？

防腐败层只有在复杂度达到阈值时才有价值。在此之前，它是不必要的抽象。

```
你有多少个技能？
│
├─ 0–3 个，无冲突
│   → 不需要 lythoskill。手动放进 .claude/skills/ 即可。
│
├─ 5–10 个，开始出现冲突或选择困难
│   → 只需要 deck 治理。安装 lythoskill-deck。
│
├─ 10+ 个，且你开始自己写技能
│   ├─ 简单技能（SKILL.md + 轻量 bash）
│   │   → 只需要 deck 治理
│   └─ 复杂技能（有依赖、测试、类型、多技能协作）
│       → Deck + Thin Skill Pattern（完整 lythoskill）
│
└─ 跨团队/项目/来源管理技能生态
    → 完整 lythoskill（deck + creator + curator + arena）
```

**你不需要 lythoskill，如果：**
- 你的技能 ≤3 个且从不冲突
- 你的技能集跨项目从不变化
- 你的技能是纯 SKILL.md 文件，没有构建步骤
- 你是 solo 开发者，只有一个技能，没有发布周期

---

## 两层价值主张

lythoskill 服务两个不同的受众。你可以独立使用任意一层。

### 层 A：Deck 治理 —— 面向每一位技能使用者

**问题**：你的 `.claude/skills/` 是个动物园。50+ 个技能来自 GitHub、技能中心、博客文章。每次 agent 启动都要扫一遍——描述争夺上下文空间，相似技能静默冲突，你根本不知道哪些真的在起作用。

**解决方案**：声明这个项目需要什么。其他的全部消失。

```bash
# 1. 声明这个项目需要什么技能
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 8

[tool]
skills = ["web-search", "project-scribe", "design-doc-mermaid"]
EOF

# 2. 同步——只有这些技能对 agent 可见
bunx @lythos/skill-deck link

# 3. Agent 看到干净的工作集。其他的物理上不存在。
ls .claude/skills/
# web-search  project-scribe  design-doc-mermaid
```

| 没有 deck 治理 | 有 deck 治理 |
|---|---|
| Agent 扫描 50+ 技能，随机挑选 | Agent 精确看到你声明的 |
| 相似技能静默冲突 | `deny-by-default`：未声明 = 不可见 |
| 不知道哪些技能当时激活 | `skill-deck.lock` 追踪每次 session 的 deck |
| 上下文窗口浪费在无关描述上 | `max_cards` 预算强制聚焦 |
| 技能重叠腐蚀文件而不自知 | `managed_dirs` 重叠告警 |

**多角色 deck**：Curator agent 只看到 curator 技能。Arena agent 只看到 arena 技能。Scribe agent 只看到 scribe 技能。每个 agent 获得定制 deck——无交叉污染，无膨胀上下文。

**核心原则**：lythoskill-deck 是治理者，不是包管理器。它确保*正确*的技能可见——但它不帮你下载。好消息是：你的 agent 可以一步搞定。

比如，开始使用一个新技能：

```bash
# 1. Agent 把技能下载到 cold pool（一次性设置）
git clone https://github.com/lythos-labs/lythoskill.git \
  ~/.agents/skill-repos/github.com/lythos-labs/lythoskill

# 2. 你在项目里声明需要它
echo 'skills = ["lythoskill-deck"]' >> skill-deck.toml

# 3. Deck 接管——管理 symlink、预算、重叠
bunx @lythos/skill-deck link
```

第一步是每个技能源的一次性成本。之后，`deck link` 处理一切。你也可以用 `skills.sh`、`bunx` 或任何其他方式——deck 不关心技能怎么进 cold pool 的，只关心哪些在活跃状态。

### 层 B：Thin Skill Pattern —— 面向技能生态开发者

你在构建团队内部的技能库或公开的技能生态。你需要版本控制、CI、测试，以及"开发体验"和"agent 可见面"之间的清晰分离。

**lythoskill-creator 提供脚手架**：

```bash
# 用 TypeScript、测试、依赖管理来脚手架一个技能
bunx @lythos/skill-creator init my-skill
cd my-skill

# 在 packages/my-skill/src/ 开发（完整开发体验：TypeScript、测试、npm 依赖）
# 在 packages/my-skill/skill/SKILL.md 描述意图（agent 读这个）

# 构建——生成轻量输出：SKILL.md + 薄脚本
bunx @lythos/skill-creator build my-skill
```

**三层分离**：

```
Starter (packages/<name>/)       → npm 发布 → 依赖治理 + CLI 入口
Skill   (packages/<name>/skill/) → lythoskill build → SKILL.md + 薄脚本
Output  (skills/<name>/)         → 提交到 Git → agent 可见的技能
```

- **Starter**：重逻辑、依赖、CLI。Agent 不直接读这里。
- **Skill**：意图描述 + 薄路由。`bunx @lythos/<package> <command>`。
- **Output**：构建产物提交到 Git。平台（Vercel、GitHub）直接消费。

完整模式文档：[cortex/wiki/01-patterns/thin-skill-pattern.md](./cortex/wiki/01-patterns/thin-skill-pattern.md)

---

## 试玩：像卡牌游戏一样调优你的 Deck

lythoskill 的 deck 构建就像卡牌游戏。你不会在真空中评估单张卡——你在 deck 的上下文中测试它。

| 卡牌游戏操作 | Arena 等价物 |
|---|---|
| **选一张卡**：A 还是 B？ | `--skills "A,B"` —— 单技能对比 |
| **加一张卡**：C 能改善我的 deck 吗？ | `--decks "v1.toml,v1+C.toml"` —— 完整 deck 对比 |
| **减一张卡**：D 是死重吗？ | `--decks "v1.toml,v1-D.toml"` —— 完整 deck 对比 |
| **换一张卡**：E 代替 F？ | `--decks "v1.toml,v1-E+F.toml"` —— 完整 deck 对比 |
| **Deck 对决**：lythos vs superpowers？ | `--decks "lythos.toml,superpowers.toml"` —— 完整 deck 对比 |

**帕累托分析，不是赢家通吃**：对比完整 deck 时，裁判不会选出"赢家"。它输出跨维度的分数向量（质量、token 效率、可维护性），并识别**帕累托前沿**——对不同权衡最优的 deck。一个便宜但中等质量、和一个昂贵但高质量的 deck 都可以在前沿上。你根据自己的价值观选择。

```bash
# 对比三个完整 deck 配置
bunx @lythos/skill-arena \
  --task "Generate auth flow diagram" \
  --decks "./decks/minimal.toml,./decks/rich.toml,./decks/superpowers.toml" \
  --criteria "quality,token,maintainability"
```

**涌现 Combo**：试玩过程中，裁判可能发现三个技能一起产生了 1+1+1>3 的效果——这是任何单个 SKILL.md 都未声明的 combo。这些发现被写入项目知识库（wiki/ADR），并指导未来的 deck 构建。

---

## Cold Pool 约定

Cold pool 是你的技能**不活跃时**居住的地方。它可以无限增长。

lythoskill 使用 **Go module 风格的目录结构**：

```
~/.agents/skill-repos/              ← 全局 cold pool
├── github.com/
│   ├── lythos-labs/
│   │   └── lythoskill/             ← git clone https://github.com/lythos-labs/lythoskill.git
│   │       └── skills/
│   │           ├── lythoskill-deck/
│   │           └── lythoskill-creator/
│   ├── PrimeRadiant/
│   │   └── superpowers/
│   │       └── skills/
│   │           └── writing-plans/
│   └── someone/
│       └── standalone-skill/       ← 非 monorepo：仓库根 = 技能
│           └── SKILL.md
└── localhost/                      ← 无远程来源的本地技能
    └── my-experiment/
        └── SKILL.md
```

**添加技能到 cold pool** —— 这是每个技能源的一次性设置。你可以手动做，也可以让 agent 帮你跑：

```bash
# 把任意技能仓库安装到 cold pool
git clone https://github.com/<owner>/<repo>.git \
  ~/.agents/skill-repos/github.com/<owner>/<repo>

# 真实示例：
git clone https://github.com/lythos-labs/lythoskill.git \
  ~/.agents/skill-repos/github.com/lythos-labs/lythoskill

git clone https://github.com/PrimeRadiant/superpowers.git \
  ~/.agents/skill-repos/github.com/PrimeRadiant/superpowers
```

之后，在项目的 `skill-deck.toml` 里声明该技能，然后运行 `deck link`。Deck 从此接管。

**为什么这个结构**：全局唯一性（`github.com/lythos-labs/lythoskill/lythoskill-deck` vs `github.com/anthropic/lythoskill-deck`）、来源可追溯、天然支持多主机（GitHub、GitLab、自建）。

**本地开发**：在 `skill-deck.toml` 中设置 `cold_pool = "."`。项目根变成 cold pool 入口，`./skills/` 会被扫描，就像 `~/.agents/skill-repos/github.com/.../skills/` 一样。

---

## 愿景

这些尚未实现。它们展示 deck 治理可以走向何方。

**回放与可观测性**：每一个 agent 步骤——哪个技能激活、它看到了什么上下文、它做了什么决定——都被记录为 JSONL。像复盘棋局一样回放任何 session。分析为什么 agent 在这个任务选了 gstack 规则，在另一个任务选了 superpowers。

**从失败模式生成补丁技能**：Arena 发现 agent 在多个任务中重复犯同样的错误。一个补丁技能被自动生成——一个薄 shim，拦截有问题的模式并在到达主技能前纠正它。就像 agent 行为的"bug fix"。

**Agent 环境的基础设施即代码**：`skill-deck.toml` 不只是技能列表——它是完整的环境定义。提交到 git，CI 运行 `deck link`，agent 环境跨机器、跨时间、跨团队成员可复现。就像 agent 技能的 `docker-compose.yml`。

---

## 生态工具

| 工具 | 层 | 功能 |
|---|---|---|
| **lythoskill-deck** | A | 声明式 skill deck 治理（`link`、deny-by-default、max_cards） |
| **lythoskill-creator** | B | 脚手架和构建 thin-skill 包 |
| **lythoskill-curator** | A | 索引 cold pool，输出 REGISTRY.json + catalog.db 供 agent 推理 |
| **lythoskill-arena** | A | 控制变量对比 skill/deck 效果 |
| **lythoskill-project-cortex** | Both | GTD 风格项目治理（tasks、epics、ADRs、wiki） |
| **lythoskill-project-scribe** | Both | 写项目记忆：handoffs、日报、踩坑记录 |
| **lythoskill-project-onboarding** | Both | 结构化分层加载读取项目记忆 |
| **lythoskill-red-green-release** | Both | Heredoc 迁移补丁工作流：plan → patch → 用户验收 → git tag |

---

## 架构

### Deck 治理模型

```
Cold Pool（存储）              Declaration（意图）            Working Set（运行时）
  ~/.agents/skill-repos/       skill-deck.toml                .claude/skills/
  ├── github.com/.../            [deck]                         ├── web-search ->
  └── localhost/.../             max_cards = 8                  ├── docx ->
                                 [tool]                         └── design-doc-mermaid ->
                                   skills = ["web-search",
                                             "docx",
                                             "design-doc-mermaid"]
```

### 防腐败层定位

```
Agent 平台（Claude Code、Kimi、Codex）
        ↑  ← 定义 SKILL.md 标准
   .claude/skills/  ← working set（deck 管理）
        ↑
  lythoskill-deck  ← 声明式治理（防腐败层）
        ↑
  skill-deck.toml  ← 人类声明期望状态
        ↑
   Cold Pool       ← 用户填充（git clone、skills.sh 等）
        ↑
Skill 来源（GitHub、Vercel、npm、内部仓库）
```

lythoskill 位于 skill 来源和 agent 平台之间——它不替换任何一方。它防止技能从 10 增长到 100+ 时自然积累的混乱。

---

## 快速参考

```bash
# Deck 治理
bunx @lythos/skill-deck link                    # 同步 toml -> working set
bunx @lythos/skill-deck link --deck ./my-deck.toml

# Skill 脚手架
bunx @lythos/skill-creator init my-project
bunx @lythos/skill-creator build my-skill

# 项目治理
bunx @lythos/project-cortex task "Fix auth flow"
bunx @lythos/project-cortex list
bunx @lythos/project-cortex index

# Cold pool 整理
bunx @lythos/skill-curator ~/.agents/skill-repos
# → 输出 ~/.agents/lythos/skill-curator/REGISTRY.json + catalog.db

# Arena 试玩
bunx @lythos/skill-arena \
  --task "Generate auth flow" \
  --skills "design-doc-mermaid,mermaid-tools"

# Arena 完整 deck 对比（帕累托分析）
bunx @lythos/skill-arena \
  --task "Generate auth flow" \
  --decks "./decks/minimal.toml,./decks/rich.toml" \
  --criteria "quality,token,maintainability"
```

---

## 安装

### 通过 skills.sh（Vercel）

```bash
npx skills add lythos-labs/lythoskill -g --all
```

### 通过 GitHub（skills 分支——纯输出，无需构建）

```bash
git clone -b skills https://github.com/lythos-labs/lythoskill.git ~/.claude/skills/lythoskill
```

### 通过 git clone（完整仓库，含源码）

```bash
git clone https://github.com/lythos-labs/lythoskill.git
```

---

## 开发

```bash
# 直接执行（Bun 原生运行 TypeScript）
bun packages/lythoskill-deck/src/cli.ts link
bun packages/lythoskill-creator/src/cli.ts init my-test

# 运行测试
bun packages/lythoskill-deck/test/runner.ts
```

---

## 技术栈

| 层级 | 选择 |
|---|---|
| 运行时 | **Bun**（原生 TypeScript） |
| 语言 | **TypeScript** |
| 模块系统 | **ESM-only**（`"type": "module"`） |
| 包管理器 | **pnpm** workspaces |
| Skill 层依赖 | **零感知** —— 消费者通过 `bunx`/`npx` 调用已发布包，无需本地安装 |
| Starter 层依赖 | 正常的 npm 依赖管理，由包管理器自动解析 |

---

## 项目文档

| 文档 | 用途 |
|---|---|
| [README.md](./README.md) | 英文版项目说明 |
| [AGENTS.md](./AGENTS.md) | 面向 Codex / Kimi / Copilot / Gemini 的项目指引 |
| [CLAUDE.md](./CLAUDE.md) | 面向 Claude Code 的项目指引 |
| [cortex/INDEX.md](./cortex/INDEX.md) | 治理系统入口 |
| [cortex/adr/](./cortex/adr/) | 架构决策记录 |
| [skill-deck.toml](./skill-deck.toml) | 本仓库的活跃 skill deck |
| [cortex/wiki/01-patterns/](./cortex/wiki/01-patterns/) | 可复用模式与约定 |

---

## License

MIT
