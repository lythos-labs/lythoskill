# lythoskill

> **声明式技能治理与编排。** 在 `skill-deck.toml` 中声明项目需要哪些技能，combo prompt 告诉 agent 如何组合它们，`deck link` 将 working set 调和到声明状态——未声明的技能从 agent 视野中物理消失。deck 本身就是编排器：技能清单 + 执行剧本 + 隔离纪律，全部写在一个文件里。项目由 AI agent 自主构建和治理。详见[生态工具](#生态工具)章节。

[![npm](https://img.shields.io/npm/v/@lythos/skill-deck)](https://www.npmjs.com/package/@lythos/skill-deck)
[![CI](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml/badge.svg)](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml)
[![Bun](https://img.shields.io/badge/Bun-1.3+-000?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![ESM](https://img.shields.io/badge/ESM-only-blue)](https://nodejs.org/api/esm.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/lythos-labs/lythoskill)

[English](./README.md)

---

## 解决什么问题

两个技能同时教 agent "怎么写测试"，agent 收到的指令就会冲突。"禁用"一个技能并不能真正移除它，agent 仍然看得见。出了问题，你只能逐个删除才能定位原因。

**lythoskill 实行 deny-by-default：** 未在 `skill-deck.toml` 中声明的技能，不会出现在 working set 目录里。未声明的技能从 working set 中**物理移除**，不是"禁用"或"降权"。如果冲突发生，二分查找你的 `skill-deck.toml` 即可——lockfile 精确记录了当时加载了什么。

| | `npx skills add` | lythoskill `deck link` |
|---|---|---|
| 安装方式 | `npx skills add <repo>` —— 命令式 | 在 `skill-deck.toml` 中声明 —— 声明式 |
| 安装后 | 技能一直留在扫描路径，直到手动 `remove` | `deck link` 调和后，未声明的技能从 working set 消失 |
| 多平台 | 每次安装都要指定 `-a claude-code` / `-a cursor` | 一个 TOML，按平台配置 `working_set` |
| 发现 | `npx skills find` → skills.sh 目录 | Curator 扫描本地 cold pool；agent 用 WebSearch 发现新技能 |
| 共享 | `skills-lock.json` | `skill-deck.lock` |

| 技能数量 | 状态 | 建议 |
|--------|------|------|
| 0–3，无冲突 | 简单 | **deck** 可用，但手动管理也完全没问题 |
| 5–10，偶有冲突 | 增长中 | 用 **deck** —— 声明本项目需要哪些技能 |
| 10+，自己编写技能 | 生态级 | 用 **deck + creator** —— thin-skill 模式 |
| 跨团队/项目管理 | 生态级 | 完整 lythoskill：deck + creator + curator + arena |

`skill-deck.lock` 是"构建时哪些技能处于活跃状态"的唯一真源。提交它，队友拿到完全一致的 working set，CI 可复现。出问题时二分 toml——lockfile 精确告诉你什么变了。

### 我真的需要这个吗？

治理只在复杂度达到阈值时才有价值。

<details>
<summary>详细决策树（点击展开）</summary>

```
10+，且你自己编写技能
├─ 简单技能（SKILL.md + 轻量 bash）
│   → 只需要 deck 治理
└─ 复杂技能（有依赖、测试、类型、多技能协作）
    → Deck + Thin Skill Pattern（完整 lythoskill）

跨团队/项目/来源管理技能生态
→ 完整 lythoskill（deck + creator + curator + arena）
```

**以下情况你不需要 lythoskill：**
- 技能 ≤3 个，从不冲突
- 技能集跨项目一成不变
- 技能是纯 SKILL.md，没有构建步骤
- 你是 solo 开发者，只有一个技能，没有发布周期
</details>

---

<details>
<summary>🤖 AI Agent 看这里</summary>

如果你是正在阅读此 README 的 AI agent：

1. 检查 `bun --version` —— 如果没有，先安装 Bun
2. 运行 `bunx @lythos/skill-deck@latest link --deck <url|path>` 激活项目 deck
3. 技能从 `skill-deck.toml` 中 `working_set` 指定的目录加载

Agent 用 lythoskill 构建真实产出。[`showcase/`](./showcase/) 收录了 agent 使用 lythoskill 治理的 deck 完成的页面、报告和工具。

</details>

---

## 快速开始

### 把这段丢给你的 agent

复制下面的内容，告诉你的 agent："给这个项目设置 lythoskill"。Agent 会阅读、安装 Bun（如需要）、创建 deck、运行 `deck link`、自我验证。

````
Read https://raw.githubusercontent.com/lythos-labs/lythoskill/main/README.md.
1. Check `bun --version` —— if missing, install Bun.
2. Pick a skill from skills.sh or anthropics/skills.
3. Create a `skill-deck.toml`, run `bunx @lythos/skill-deck@latest link`.
4. Verify skills appeared in your working_set directory.
````

这就是 agent 时代的快速开始：告诉 agent，不用自己敲命令。

### 或者自己跑

```bash
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/quick-init.sh | bash
```

脚本安装 Bun，创建一份带 `frontend-design`（Anthropic 官方设计技能）的 `skill-deck.toml`，运行 `deck link`，自我检查。一条命令，技能出现，搞定。

和 `npm install` 一样：先写清单，再跑命令，结果可复现。`npx skills add` 是命令式安装；`deck link` 是声明式调和。

继续添加：`curl ... | bash -s -- --skill github.com/owner/repo/path`。或者编辑 `skill-deck.toml` 后重新运行 `bunx @lythos/skill-deck@latest link`。

### 手动设置

```bash
# 1. 创建 deck
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 3
cold_pool = "~/.agents/skill-repos"

[tool.skills.frontend-design]
path = "github.com/anthropics/skills/skills/frontend-design"
EOF

# 2. 链接
bunx @lythos/skill-deck@latest link
```

这里用的是 Anthropic 官方 [`frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) 技能——真实可运行的示例。链接完成后检查 `.claude/skills/`（或你配置的 `working_set`），能看到技能文件在磁盘上。18+ 预组 deck 见 [`examples/decks/INDEX.md`](./examples/decks/INDEX.md)。

### 管理你的 Deck

**添加技能**：支持 skills.sh 语法（`owner/repo`）、FQ locator，或 `@skill` 过滤器：
```bash
bunx @lythos/skill-deck@latest add vercel-labs/agent-skills
bunx @lythos/skill-deck@latest add github.com/anthropics/skills/skills/frontend-design
```

**移除技能**：从 deck 和 working set 中移除（cold pool 不动）：
```bash
bunx @lythos/skill-deck@latest remove <alias>
```

**刷新技能**：检查 upstream 更新（默认仅 plan；加 `--exec` 才 pull）：
```bash
bunx @lythos/skill-deck@latest refresh           # 仅计划
bunx @lythos/skill-deck@latest refresh tdd --exec # 拉取单个技能
```

**验证 deck**：提交前检查 TOML 格式：
```bash
bunx @lythos/skill-deck@latest validate
```

`skill-deck.lock` 记录解析后的 working set。提交它，队友拿到完全一致的链接。

---

## skill-deck.toml 配置参考

| 段落 | 键 | 必需 | 默认值 | 说明 |
|---------|-----|----------|---------|-------------|
| `[deck]` | `max_cards` | 否 | `10` | working set 中最多同时激活多少技能 |
| `[deck]` | `cold_pool` | 否 | `~/.agents/skill-repos` | 技能仓库的本地缓存根目录 |
| `[deck]` | `working_set` | 否 | `.claude/skills` | 创建符号链接的目录（agent 扫描路径） |
| `[innate]` | `skills.<name>.path` | 是* | — | 始终加载；agent 无法覆盖 |
| `[tool]` | `skills.<name>.path` | 是* | — | agent 按需调用（默认） |
| `[transient]` | `skills.<name>.path` | 是* | — | 限时技能，到期自动失效 |

\* 使用该段落时必需。

**技能类型：**

| 类型 | 行为 | 占用 max_cards 配额？ |
|------|----------|---------------------------|
| **`[innate]`** | 主动加载——会话启动即加载，agent 无法移除 | 是 |
| **`[tool]`** | 懒加载——agent 按需调用（默认） | 是 |
| **`[transient]`** | 懒加载 + 到期自动失效 | 是 |

---

## 工作原理

**Deck 既是声明式技能清单，也是编排器**——`skill-deck.toml` 不仅指定哪些技能处于活跃状态，还用 combo prompt 告诉 agent 如何组合它们。Combo prompt 用自然语言描述编排逻辑（"如果 X 则 Y，把 A 的输出传给 B"）。deck 就是 agent 的执行剧本。

### 为什么 "deck = 编排器" 不是 buzzword

编排能力**按权重分布**在三层：

```
┌─ 编排层（按权重分布）────────────────────────┐
│                                              │
│  🎯 Combo Prompt                             │
│     轻量判断——"如果 X 则 Y，把 A 传给 B"     │
│     零成本，内联在 deck 中                   │
│                                              │
│  📄 SKILL.md                                 │
│     中等判断——复杂工作流，跨项目复用         │
│     版本控制，住在 cold pool 里              │
│                                              │
│  ⚙️ CLI (npm)                                │
│     重型机械——备份、符号链接、归档           │
│     笨、可靠、可测试                         │
│                                              │
└──────────────────────────────────────────────┘
         ↑
    🧠 Agent
       读取 deck → 推理 → 调度
       智能循环，不是工具

    skill-deck.toml
    声明技能 + combo prompt
    单文件，git 追踪
         ↓ deck link
    Working Set (.claude/skills/)
    只有声明的技能存在于此
         ↓ 启动时扫描
    Agent 只看见声明的技能
```

> **编排器不是单独组件。** 它按权重分散：轻量判断留在 combo prompt（deck 内联），中等判断下沉到 SKILL.md（版本化、可复用），重型机械下沉到 CLI npm（笨、可靠）。agent 是推理引擎——deck 是剧本。
>
> **Deck 把确定性委托给 CLI。** Prompt 描述意图；CLI 强制执行保证。"如果 `working_set` 是 `~` 就拒绝"——这不能是 prompt 指令，必须是硬 gate。"删除前备份 100MB"——这是 `tar` 命令，不是 agent 该记住的东西。deck 做出的设计决策是：**确定性约束 → CLI（npm，已测试）。判断调用 → SKILL.md（agent 推理）。轻量胶水 → combo prompt（内联，零成本）。** 权重决定层级。

**看实际效果：**
- [Seed bootstrap](./showcase/2026-05-17-vanilla-seed-bootstrap/)：Agent 从 1 个技能（`lythoskill-deck`）起步，自主扩展到 5 个——读取 deck 的 SKILL.md，理解架构，添加技能，自我修复网络错误
- [Combo orchestration](./showcase/2026-05-13-deep-research-baoyu-combo/)：来自 2 个无关仓库的 6 个技能组合成 single research→HTML 流水线——编排活在 deck 结构里，不是外部代码

设计坚守四条原则：声明式清单（先写再跑）、多平台兼容（一个 TOML 适配任意 agent）、deny-by-default（未声明即不可见）、本地优先（git 缓存，不依赖中心服务器）。

```
来源（GitHub、localhost 等）
    │
    ▼ git clone / git pull
Cold Pool (~/.agents/skill-repos/)
    │          github.com/lythos-labs/lythoskill/skills/lythoskill-deck/
    │          github.com/mattpocock/skills/skills/engineering/tdd/
    │          localhost/me/sober/
    │
    ▼ 符号链接（仅声明的技能）
Working Set (.claude/skills/ 或 .kimi/skills/ 或 .cursor/skills/ 等)
    │
    ▼ agent 启动扫描
Agent 只看见声明的技能。不多不少。
```

技能住在 **cold pool**，即本地 git 缓存（`~/.agents/skill-repos/`），按 Go module 风格组织（`github.com/owner/repo`）。没有中央注册表，没有认证服务器，没有守护进程。

`deck link` 生成 **lockfile**（`skill-deck.lock`）锁定每个技能。提交它，队友拿到完全一致的链接。

技能使用 **thin-skill 模式** 编写：重型逻辑放在 npm 包里，agent 可见的指令放在轻量 SKILL.md 文件中（[详情](./AGENTS.md)）。

### 探索预组 Deck

18+ 面向常见任务的 deck：文档处理、调研、架构评审、安全审计等。见 [`examples/decks/INDEX.md`](./examples/decks/INDEX.md)。

---

## Thin Skill Pattern

你在构建团队内部的技能库或公开的技能生态。你需要版本控制、CI、测试，以及"开发体验"和"agent 可见面"之间的清晰分离。

**lythoskill-creator 提供脚手架**：

```bash
# 用 TypeScript、测试、依赖管理来脚手架一个技能
bunx @lythos/skill-creator@latest init my-skill
cd my-skill

# 在 packages/my-skill/src/ 开发（完整开发体验：TypeScript、测试、npm 依赖）
# 在 packages/my-skill/skill/SKILL.md 描述意图（agent 读这个）

# 构建——生成轻量输出：SKILL.md + 薄脚本
bunx @lythos/skill-creator@latest build my-skill
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

完整模式文档：[cortex/wiki/01-patterns/2026-05-02-thin-skill-pattern.md](./cortex/wiki/01-patterns/2026-05-02-thin-skill-pattern.md)

---

## 为什么值得信任

项目尚处早期，还没有 Fortune 500 的背书。但我们有**自治理透明度**：

- **决策即 ADR。** 浏览 [`cortex/adr/02-accepted/`](./cortex/adr/02-accepted/) —— 30+ 架构决策，附完整推理、被拒绝的备选方案和置信度评分。没有"相信我们，我们更懂"。
- **发布前经 arena 测试。** Skill 发布前，在真实任务上跑控制变量对比。见 [`showcase/`](./showcase/) —— agent 使用 lythoskill 治理的 deck 完成的页面、报告和工具。
- **技能与实现分离。** Thin-skill 模式（`packages/<name>/skill/SKILL.md`）让你能精确审计 agent 看到了什么。
- **661 个测试，0 失败。** 71 个 plan 生成单元测试，21 个 CLI BDD 场景，5 个 agent BDD 场景。覆盖率诚实——没有 gate 膨胀。

这个项目是它自己的证明。我们用自己发布的工具治理自己。

---

## 命名速查

```
lythoskill           ← 项目 / 生态系统
skill-deck.toml      ← 你编辑的配置文件
@lythos/skill-deck   ← npm 包
deck                 ← CLI 命令
link                 ← 子命令：把 toml 调和到 working set
```

---

## 生态工具

| 工具 | npm | 对你的意义 |
|------|-----|----------------------|
| **deck** | [`@lythos/skill-deck`](https://www.npmjs.com/package/@lythos/skill-deck) | 一个文件声明哪些技能活跃。队友拿到相同配置。CI 可复现。 |
| **creator** | [`@lythos/skill-creator`](https://www.npmjs.com/package/@lythos/skill-creator) | 构建对 agent 轻量、对人类可维护的技能。避免 5000 行 SKILL.md 的维护负担。 |
| **curator** | [`@lythos/skill-curator`](https://www.npmjs.com/package/@lythos/skill-curator) | 停止囤积忘记用途的技能。按细分领域查询："我有哪些测试技能？" |
| **arena** | [`@lythos/skill-arena`](https://www.npmjs.com/package/@lythos/skill-arena) | 采用前证明技能有效。用控制变量对比替代"我这能跑"，输出可验证的证据。 |
| **coach** | [`@lythos/skill-coach`](https://www.npmjs.com/package/@lythos/skill-coach) | 在技能到达 agent 前拦截质量问题。像 linter，但针对 agent 指令。 |
| **cortex** | [`@lythos/project-cortex`](https://www.npmjs.com/package/@lythos/project-cortex) | GTD 风格项目治理：每个决策都是 ADR，每个任务都被追踪。 |

我们用这些工具治理这个项目。`packages/` 里的每个技能都用 creator 构建。每个决策都走 cortex ADR。每个发布都用 deck 管理 working set。

---

## Curator：索引你的 Cold Pool

技能_collection 增长后，你会忘记自己有什么、**为什么**有。Curator 扫描 cold pool，从每份 SKILL.md 提取元数据，构建可搜索索引。

```bash
# 索引 cold pool
bunx @lythos/skill-curator@latest ~/.agents/skill-repos

# 带决策记录添加技能
bunx @lythos/skill-curator@latest add github.com/foo/bar \
  --pool ~/.agents/skill-repos \
  --reason "Agent 推荐，覆盖 PDF 提取"

# 按细分领域或关键词查询
bunx @lythos/skill-curator@latest query \
  "SELECT name, description FROM skills WHERE niches LIKE '%testing%'"
```

Curator 提供数据；Arena 提供对比。完整文档见 [`packages/lythoskill-curator/README.md`](./packages/lythoskill-curator/README.md)。

---

## 实际案例：Deck 治理的 Next.js 项目

见 [`examples/`](./examples/)，完整 walkthrough 一个 deck 治理的 Next.js 项目：编写富文本编辑器、添加 PDF 报告生成器、开发中途切换技能、运行 arena 交叉评审。Agent 自主编排技能组合——deck 提供治理层。

---

## Arena：A/B 测试 Skill 配置

Arena 把技能隔离在 `/tmp` worktree 中，生成独立 agent 执行相同任务。

**测试单个 deck：**
```bash
bunx @lythos/skill-arena@latest single \
  --deck ./examples/decks/scout.toml \
  --brief "Generate auth flow diagram" \
  --out ./output
```

**对比两个 deck（agent 编排，默认）：**
```bash
bunx @lythos/skill-arena@latest vs --config ./arena.toml
```

**用特定 player 测试（跨平台）：**
```bash
bunx @lythos/skill-arena@latest single \
  --deck ./deck.toml --brief "task" --player kimi
```

跨平台需要安装目标 agent CLI（如 `uv tool install kimi-cli`、`npm i -g @openai/codex`）。`vs` 模式下每边的 player 在 `arena.toml` 中声明——不是通过 `--player`。完整协议见 [`packages/lythoskill-arena/skill/SKILL.md`](./packages/lythoskill-arena/skill/SKILL.md)。与 benchmark suite 的对比见 [`references/comparisons.md`](./references/comparisons.md)。

---

## Cold Pool 约定

```
~/.agents/skill-repos/
  github.com/
    lythos-labs/lythoskill/skills/lythoskill-deck/
    mattpocock/skills/skills/engineering/tdd/
  localhost/              ← 你自己的技能，尚未分享
    me/sober/
    me/my-project-skill/
```

没有中央注册表。就是目录树里的 git 仓库。约定让技能可通过路径寻址：`github.com/owner/repo` 映射到 `~/.agents/skill-repos/github.com/owner/repo`。

---

## 架构

```
Starter (packages/<name>/)       → npm publish → 实现 + CLI
Skill   (packages/<name>/skill/) → build → SKILL.md + 薄脚本
Output  (skills/<name>/)         → 提交到 Git → agent 可见的技能
```

三层分离：重型逻辑住在 npm 包（Starter）里，agent 可见的指令住在轻量 SKILL.md 文件（Skill）里，agent 只看到输出（提交的符号链接）。

与 npm、Maven、Kubernetes RBAC 的对比见 [`references/comparisons.md`](./references/comparisons.md)。

---

## 测试

```bash
bun --filter='*' run test          # 全部 661 个测试，44 个文件
bun run test:coverage              # 覆盖率报告
bun run test:bdd                   # BDD 集成测试
```

---

## 开发

> 面向在这个仓库内工作的贡献者和开发者。

**前置条件：** Bun ≥1.0。

```bash
# 安装 Bun（如缺失）
curl -fsSL https://bun.sh/install | bash

# 1. 安装 workspace 依赖
bun install

# 2. 同步本地 skill deck
bun packages/lythoskill-deck/src/cli.ts link

# 3. 验证环境
bun packages/lythoskill-project-cortex/src/cli.ts stats

# 运行全部 BDD 场景（cortex + deck）
bun run test:all
```

环境就绪？查看 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 了解 commit 规范和 PR 流程。

---

## 故障排除

| 症状 | 解决 |
|---------|-----|
| `Command not found: deck` | 用 `bunx @lythos/skill-deck@latest <subcommand>` |
| `bun: command not found` | 安装 Bun：`curl -fsSL https://bun.sh/install \| bash` |
| 安装 Bun 后 `bunx: command not found` | 重启终端或运行 `source ~/.bashrc` |
| `deck link` 后提示 `Skill not found` | 技能不在 cold pool 中：`bunx @lythos/skill-deck@latest add github.com/<owner>/<repo>` |
| Agent 看不见技能 | 检查 `working_set` 是否匹配 agent 的扫描路径（见下表） |
| 符号链接创建失败 | 确保 `working_set` 目录存在且可写 |
| `deck link` 卡住或失败 | `github.com` 可能不可达；见下方环境变量 |
| Lockfile 合并冲突 | 运行 `deck link` —— lockfile 完全由 `skill-deck.toml` 派生 |

**环境变量：**

| 变量 | 用途 | 示例 |
|----------|---------|---------|
| `LYTHOS_GH_MIRROR` | 受限网络的 GitHub 镜像 | `export LYTHOS_GH_MIRROR="https://mirror.example.com"` |
| `LYTHOS_SOCKS_PROXY` | git/fetch 操作的 SOCKS5 代理 | `export LYTHOS_SOCKS_PROXY="127.0.0.1:1080"` |
| `LYTHOS_GIT_PROTOCOL` | Git clone 协议（`https` 或 `ssh`） | `export LYTHOS_GIT_PROTOCOL="ssh"` |

`LYTHOS_GH_MIRROR` 把 `github.com` URL 重写到你的镜像。工具不会自动回落到第三方镜像（信任边界由你掌控）。`LYTHOS_SOCKS_PROXY` 通过 `curl --proxy socks5://` 路由连通性探测。`LYTHOS_GIT_PROTOCOL` 改变 clone URL 的 scheme（默认 `https`）。

**Agent `working_set` 路径：**
- `.claude/skills/` — Claude Code
- `.agents/skills/` — Codex CLI, OpenClaw
- `.cursor/skills/` — Cursor
- `.kimi/skills/` — Kimi
- `.windsurf/skills/` — Windsurf
- `.github/skills/` — GitHub Copilot

---

## 与熟悉系统的对比

如果你了解以下系统，这里是我们与它们的共享原则和刻意不共享的实现：

| 系统 | 我们共享什么 | 我们刻意不共享什么 |
|------|-------------|-------------------|
| **Maven** | 声明式清单、本地缓存、`owner/repo` 路径约定 | 制品仓库（Nexus/Central）、版本范围解析、传递依赖、构建生命周期、JAR 二进制制品 |
| **Kubernetes RBAC** | 声明式权限、deny-by-default、状态调和 | etcd、scheduler、controller、watch loop、网络层 |
| **npm** | 声明式 manifest、lockfile、install 命令 | 中央注册表、认证服务器、传递依赖解析、tarball CDN |

> 类比是手电筒，照亮局部，不绘制全局。我们共享原则层（声明式、获取、缓存、链接），但不共享实现层（二进制制品、传递解析、仓库服务器）。
>
> 完整对比见 [`references/comparisons.md`](./references/comparisons.md)。

---

## License

MIT。见 [LICENSE](./LICENSE)。
