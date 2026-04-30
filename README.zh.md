# lythoskill

> **治理你的 AI agent 技能。防止技能生态腐烂。**
>
> lythoskill 是 agent skill 生态的治理层。它不重新定义技能标准——而是在现有标准之上搭一套治理基础设施，让你的 agent 在技能从 10 个膨胀到 100+ 个时，依然保持专注、互不冲突。

[![npm](https://img.shields.io/npm/v/@lythos/skill-deck)](https://www.npmjs.com/package/@lythos/skill-deck)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[English](./README.md)

---

## 静默混合（Silent Blend）

你同时装了 **gstack**（项目管理）和 **superpowers**（写作工作流）。两者都是高主张性技能——它们不只帮你写代码，而是各自强加一套 workflow、一种风格、一种哲学。

你把两者都丢进 `.claude/skills/`。Agent 看到了，不崩溃，也不抱怨。结果呢？一半任务按 gstack 的规则跑，另一半按 superpowers 的规则跑。输出飘忽不定，Bug 悄无声息地埋进去。

**这就是静默混合**——技能生态里最隐蔽的失效模式。两个本就该互斥的技能，同时暴露在 agent 面前。

lythoskill-deck 用 **deny-by-default** 终结它：未声明的技能从 `.claude/skills/` 里**物理消失**。不是"禁用"，不是"降权"，**是直接没了**。Agent 看不到、想不到、更不会被迷惑。

```toml
# 项目 A：只用 gstack
[tool]
skills = ["github.com/garrytan/gstack"]

# 项目 B：只用 superpowers
[tool]
skills = ["github.com/obra/superpowers"]
```

运行 `deck link` → 每个项目只看到一个"方法论"。没有静默混合，没有混乱。

---

## 我真的需要这个吗？

治理只在复杂度越过阈值时才有价值。没到那个点，它就是多余的抽象。

```
你有多少个技能？
│
├─ 0–3 个，无冲突
│   → 不需要 lythoskill。手动丢进 .claude/skills/ 就行。
│
├─ 5–10 个，开始打架或选择困难
│   → 只需要 deck 治理。装个 lythoskill-deck。
│
├─ 10+ 个，而且你开始自己写技能
│   ├─ 简单技能（SKILL.md + 轻量 bash）
│   │   → 只需要 deck 治理
│   └─ 复杂技能（有依赖、测试、类型、多技能协作）
│       → Deck + Thin Skill Pattern（完整 lythoskill）
│
└─ 跨团队/项目/来源管理技能生态
    → 完整 lythoskill（deck + creator + curator + arena）
```

**以下情况你不需要 lythoskill：**
- 技能 ≤3 个，从不冲突
- 技能集跨项目一成不变
- 技能是纯 SKILL.md，没有构建步骤
- 你是 solo 开发者，只有一个技能，没有发布周期

---

## 快速开始

零安装——只需要 Bun 运行时（`bunx`）。`npx` 只有在同时装了 Bun 时才可用（shebang 调用的是 `env bun`）：

```bash
# 1. 从 GitHub 添加一个技能（自动下载到 cold pool + 更新 deck + 链接）
bunx @lythos/skill-deck add mattpocock/skills

# 2. Agent 只看到它。其余技能物理上不存在。
ls .claude/skills/
# skills
```

就这些。`deck add` 会把仓库 clone 进你的 [cold pool](#cold-pool-约定)，追加到 `skill-deck.toml`，然后跑 `link`。

想换种方式下载？用 `--via skills.sh` 或手动 clone——deck 不关心技能怎么进 cold pool 的，只关心谁在活跃。

```bash
# 替代方案：Vercel skills.sh
bunx @lythos/skill-deck add mattpocock/skills --via skills.sh

# 替代方案：手动 clone
git clone https://github.com/mattpocock/skills.git \
  ~/.agents/skill-repos/github.com/mattpocock/skills
# 然后编辑 skill-deck.toml 并运行 `deck link`
```

### 命名速查

```
lythoskill           ← 项目 / 生态系统
skill-deck.toml      ← 你编辑的配置文件
@lythos/skill-deck   ← 你安装的 npm 包
deck                 ← CLI 命令（lythoskill-deck 的简称）
link                 ← 同步 toml 到 working set 的子命令
```

---

## 两层价值主张

lythoskill 服务两个不同的受众，你可以独立使用任意一层。

### Deck 治理 —— 面向每一位技能使用者

**问题**：你的 `.claude/skills/` 是个动物园。50+ 个技能来自 GitHub、技能中心、博客文章。每次 agent 启动都要扫一遍——描述争夺上下文空间，相似技能静默冲突，你根本不知道哪些真的在起作用。

**解决方案**：声明这个项目需要什么。其他的全部消失。

| 没有 deck 治理 | 有 deck 治理 |
|---|---|
| Agent 扫描 50+ 技能，随机挑 | Agent 精确看到你声明的 |
| 相似技能静默冲突 | `deny-by-default`：未声明 = 不可见 |
| 上下文窗口浪费在无关描述上 | `max_cards` 预算强制聚焦 |

**多角色 deck**：Curator agent 只看到 curator 技能。Arena agent 只看到 arena 技能。Scribe agent 只看到 scribe 技能。每个 agent 拿一套定制 deck——无交叉污染，无膨胀上下文。

**核心原则**：lythoskill-deck 既是声明式包管理器，也是治理者。`deck add` 从 GitHub/skills.sh 下载技能到 cold pool，追加到 `skill-deck.toml`，并自动跑 `link`——一步搞定。`deck link` 再把 working set 调和到声明状态，只有声明过的技能才可见。你同时拿到了依赖管理（类似 Maven）和运行时治理（类似 Kubernetes RBAC）。

比如，开始使用一个新技能：

```bash
# 1. 把技能仓库 clone 到 cold pool（一次性设置）
git clone https://github.com/lythos-labs/lythoskill.git \
  ~/.agents/skill-repos/github.com/lythos-labs/lythoskill

# 2. 创建 skill-deck.toml——直接复制这段：
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10

[tool]
skills = ["github.com/lythos-labs/lythoskill/lythoskill-deck"]
EOF

# 3. 同步——deck 把 working set 调和到声明状态
bunx @lythos/skill-deck link
# 或：npx @lythos/skill-deck link
```

用 `deck add` 可以把步骤 1–3 自动化成一条命令。你也可以用 `skills.sh`、`bunx` 或任何其他方式——deck 不关心技能怎么进 cold pool 的，只关心哪些在活跃状态。

### Thin Skill Pattern —— 面向技能生态开发者

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
Starter (packages/<name>/)       → npm 发布 → 实现 + CLI 入口
Skill   (packages/<name>/skill/) → lythoskill build → SKILL.md + 薄脚本
Output  (skills/<name>/)         → 提交到 Git → agent 可见的技能
```

- **Starter**：重逻辑、依赖、CLI。Agent 不直接读这里。
- **Skill**：意图描述 + 薄路由。`bunx @lythos/<package> <command>`。
- **Output**：构建产物提交到 Git。平台（Vercel、GitHub）直接消费。

完整模式文档：[cortex/wiki/01-patterns/thin-skill-pattern.md](./cortex/wiki/01-patterns/thin-skill-pattern.md)

---

## 实际案例：用 Deck 管理 Next.js 项目

下面是一个真实的使用场景，展示 subagent 如何在 deck 治理下自主工作。

**场景**：初始化一个 Next.js 项目，让 agent 自己从 cold pool 挑技能、组 deck、并完成开发任务。

```bash
# 1. 初始化项目
npx create-next-app@latest my-app --default --use-bun
cd my-app

# 2. 把社区技能 clone 到 cold pool（一次性的全局准备）
git clone https://github.com/anthropics/skills.git \
  ~/.agents/skill-repos/github.com/anthropics/skills

git clone https://github.com/vercel-labs/agent-skills.git \
  ~/.agents/skill-repos/github.com/vercel-labs/agent-skills

# 3. Agent 自己组 deck——读取 cold pool 里的所有 SKILL.md，
#    根据项目需求决策选哪些技能，然后写 skill-deck.toml
#    示例结果（agent 自主决策）：
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate]
skills = [
  "github.com/lythos-labs/lythoskill/skills/lythoskill-deck",
  "github.com/lythos-labs/lythoskill/skills/lythoskill-project-cortex",
  "github.com/lythos-labs/lythoskill/skills/lythoskill-project-onboarding",
  "github.com/lythos-labs/lythoskill/skills/lythoskill-project-scribe",
]

[tool]
skills = [
  "github.com/anthropics/skills/skills/pdf",
  "github.com/anthropics/skills/skills/docx",
  "github.com/mattpocock/skills/write-a-prd",
  "github.com/mattpocock/skills/tdd",
  "github.com/obra/superpowers",
  "github.com/SpillwaveSolutions/design-doc-mermaid",
]
EOF

# 4. 同步 deck
bunx @lythos/skill-deck link
```

**Agent 的工作流**：
1. 读取 `.claude/skills/` 下的每个 SKILL.md，理解能力边界
2. 用 `bunx @lythos/project-cortex task "实现 Todo List 页面"` 创建任务
3. 编码时吸收多个技能的优点：
   - **react-best-practices** → `useReducer` + `React.memo` + `useCallback`
   - **frontend-design** → zinc 配色、rounded-2xl、暗色模式
   - **composition-patterns** → Context Provider + barrel export
   - **code-reviewer** → TypeScript 严格类型、输入校验
4. 任务完成后自动记录 session handoff 到 `daily/YYYY-MM-DD.md`

**效果**：agent 不会盲目编码。它会先读 skill、按 governance 流程组织工作、并把多个技能的最佳实践融入代码——全程自主，无需人工指定每一步。

---

## Arena：Skill 对比

不确定该用哪个技能？Arena 在不同 skill 配置下跑相同任务并打分。不用猜。

| 问题 | 测试方式 |
|---|---|
| A 还是 B？ | `--skills "A,B"` —— 单技能对比 |
| C 能改善我的 deck 吗？ | `--decks "v1.toml,v1+C.toml"` —— 完整 deck 对比 |
| D 是死重吗？ | `--decks "v1.toml,v1-D.toml"` —— 完整 deck 对比 |

**多维度评分**：裁判输出质量、token 效率、可维护性三个维度的分数。没有单一"赢家"——你根据自己的价值观选择。

完整 Arena 工作流文档：[SKILL.md](skills/lythoskill-arena/SKILL.md)

---

## Cold Pool 约定

Cold pool 是你的技能**不活跃时**住在哪里。它可以无限增长。

lythoskill 用 **Go module 风格的目录结构**，天然带有 `owner/repo` 可追溯性：

```
~/.agents/skill-repos/              ← 全局 cold pool（推荐默认值）
├── github.com/
│   ├── lythos-labs/
│   │   └── lythoskill/             ← git clone https://github.com/lythos-labs/lythoskill.git
│   │       └── skills/
│   │           ├── lythoskill-deck/
│   │           └── lythoskill-creator/
│   ├── vercel-labs/
│   │   └── agent-skills/           ← git clone https://github.com/vercel-labs/agent-skills.git
│   │       └── skills/
│   │           ├── react-best-practices/
│   │           └── composition-patterns/
│   └── someone/
│       └── standalone-skill/       ← 非 monorepo：仓库根 = 技能
│           └── SKILL.md
└── localhost/                      ← 无远程来源的本地技能
    └── my-experiment/
        └── SKILL.md
```

**为什么推荐 `~/.agents/skill-repos`**：
- 它是**全局的**——所有项目共享同一个 cold pool，技能只需下载一次
- 它是**结构化的**——`github.com/<owner>/<repo>` 天然带有来源可追溯性，不会混淆同名技能
- 它是**可扩展的**——支持 GitHub、GitLab、自建主机、本地实验，路径即来源

**添加技能到 cold pool** —— 这是每个技能源的一次性设置。你可以手动做，也可以让 agent 帮你跑：

```bash
# 把任意技能仓库安装到 cold pool
git clone https://github.com/<owner>/<repo>.git \
  ~/.agents/skill-repos/github.com/<owner>/<repo>

# 真实示例：
git clone https://github.com/lythos-labs/lythoskill.git \
  ~/.agents/skill-repos/github.com/lythos-labs/lythoskill

git clone https://github.com/vercel-labs/agent-skills.git \
  ~/.agents/skill-repos/github.com/vercel-labs/agent-skills
```

之后，在项目的 `skill-deck.toml` 里声明该技能，然后运行 `deck link`。Deck 从此接管。

**skill-deck.toml 中的路径解析**：
- 短名 `lythoskill-deck` → deck 会在 cold pool 中递归扫描同名目录
- 限定名 `github.com/lythos-labs/lythoskill/lythoskill-deck` → 直接定位，避免同名冲突
- Monorepo 子技能 `owner/repo/skills/skill-name` → 自动识别 `skills/` 子目录

**本地开发**：在 `skill-deck.toml` 中设置 `cold_pool = "."`。项目根变成 cold pool 入口，`./skills/` 会被扫描，就像 `~/.agents/skill-repos/github.com/.../skills/` 一样。

---

## 生态工具

| 工具 | npm | 层级 | 功能 |
|---|---|---|---|
| **lythoskill-deck** | [`@lythos/skill-deck`](https://www.npmjs.com/package/@lythos/skill-deck) | A | 声明式 skill deck 治理（`link`、deny-by-default、max_cards） |
| **lythoskill-creator** | [`@lythos/skill-creator`](https://www.npmjs.com/package/@lythos/skill-creator) | B | 脚手架和构建 thin-skill 包 |
| **lythoskill-curator** | [`@lythos/skill-curator`](https://www.npmjs.com/package/@lythos/skill-curator) | A | 索引 cold pool，输出 REGISTRY.json + catalog.db 供 agent 推理 |
| **lythoskill-arena** | [`@lythos/skill-arena`](https://www.npmjs.com/package/@lythos/skill-arena) | A | 控制变量对比 skill/deck 效果 |
| **lythoskill-project-cortex** | [`@lythos/project-cortex`](https://www.npmjs.com/package/@lythos/project-cortex) | Both | GTD 风格项目治理（tasks、epics、ADRs、wiki） |
| **lythoskill-project-scribe** | — | Both | 写项目记忆：handoffs、日报、踩坑记录 |
| **lythoskill-project-onboarding** | — | Both | 结构化分层加载读取项目记忆 |
| **lythoskill-red-green-release** | — | Both | Heredoc 迁移补丁工作流：plan → patch → 用户验收 → git tag |

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

### 治理层定位

```
Agent 平台（Claude Code、Kimi、Codex）
        ↑  ← 定义 SKILL.md 标准
   .claude/skills/  ← working set（deck 管理）
        ↑
  lythoskill-deck  ← 声明式治理（治理层）
        ↑
  skill-deck.toml  ← 人类声明期望状态
        ↑
   Cold Pool       ← 用户填充（git clone、skills.sh 等）
        ↑
Skill 来源（GitHub、Vercel、npm、内部仓库）
```

lythoskill 位于 skill 来源和 agent 平台之间——它不替换任何一方。它防止技能从 10 增长到 100+ 时自然积累的混乱。

**类比**：如果你熟悉 Java/Maven，心智模型类似：
- `skill-deck.toml` ≈ `pom.xml` —— 声明你需要什么
- `deck add` ≈ `mvn dependency:get` —— 下载到本地存储
- cold pool ≈ `~/.m2/repository` —— 本地缓存，下载过的一切都在这里
- `deck link` ≈ 让依赖对项目可用——但用 symlink 而非复制
- `.claude/skills/` ≈ 项目的 classpath —— 只有声明过的才可见

---

## 快速参考

```bash
# Deck 治理（bunx；npx 仅在安装了 Bun 时可用）
bunx @lythos/skill-deck link                       # 同步 toml -> working set
bunx @lythos/skill-deck add owner/repo             # 下载技能 + 添加到 deck
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

# Arena 单技能对比
bunx @lythos/skill-arena \
  --task "Generate auth flow" \
  --skills "design-doc-mermaid,mermaid-tools"

# Arena 完整 deck 对比
bunx @lythos/skill-arena \
  --task "Generate auth flow" \
  --decks "./decks/minimal.toml,./decks/rich.toml" \
  --criteria "quality,token,maintainability"
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
