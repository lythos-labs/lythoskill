---
name: lythoskill-deck
version: 0.1.4
deck_niche: meta.governance.deck
type: standard
description: |
  项目级 Skill Working Set 的声明式管理器。解决"下载了 50+ 个 skill 堆在系统目录里导致 agent 选择困难、同类 skill 静默冲突、context 被无关 description 污染"的问题。

  核心机制（类似 Kubernetes 声明式配置）：
  - **冷池（Cold Pool）**: 个人全量 skill 仓库（~/.agents/skill-repos/），纯存储，agent 不扫描
  - **工作集（Working Set）**: 项目级 skills 目录（.claude/skills/），只有 symlink，agent 实际扫描
  - **skill-deck.toml**: 声明期望状态（"本项目只用这些 skill"），类似 K8s Deployment
  - **deck link**: 调谐器（reconciler），让实际 working set 收敛到声明状态
  - **deny-by-default**: 未声明的 skill 从文件系统层面不可见
  - **max_cards 预算**: 硬约束，超预算拒绝同步
  - **managed_dirs 重叠检测**: 两个 skill 管理同一目录时告警

cooperative_skills:
  - lythoskill-curator  # 扫描冷池生成 REGISTRY.json，辅助 deck 决策

deck_triggers:
  - "同步 working set / sync skills"
  - "初始化 skill deck"
  - "skill-deck.toml 变更后"
deck_dependencies:
  runtime: [bash]
  optional: [bun]
deck_managed_dirs:
  - .claude/skills/
  - skill-deck.lock
---

# lythoskill-deck: 声明式 Skill Deck 治理

> **一句话：你有多少 skill 不重要，agent 在同一时间能稳定激活几个才重要。**

## 解决什么问题

Agent Skills 的默认行为是**隐式发现**——agent 扫描 `.claude/skills/` 下所有 SKILL.md，自行决定是否激活。

当 skill 增长到几十个时，出现三个问题：

| 问题 | 表现 | 后果 |
|------|------|------|
| **选择困难** | 同类 skill（3 个报告生成器、5 个搜索工具）描述互相竞争 | agent 随机选一个，结果不稳定 |
| **context 污染** | 50+ 个 description 挤进 prompt | 有效 context 被稀释，无关描述干扰判断 |
| **静默冲突** | 两个 skill 的指令互相矛盾 | agent 混合执行，不报错但结果错 |

**lythoskill-deck 的解法**：显式声明 "本项目只用这些 skill"，未声明的 skill 从文件系统层面移除（不是"禁用"，是"不存在"）。

## 架构：冷池 → Deck → 工作集

冷池采用 **Go module 式目录结构** ——host 作为顶层，路径即来源：

```
~/.agents/skill-repos/              ← 全局冷池
├── github.com/
│   ├── lythos-labs/
│   │   └── lythoskill/             ← git clone 下来的 repo
│   │       └── skills/
│   │           ├── lythoskill-deck/
│   │           ├── lythoskill-creator/
│   │           └── lythoskill-project-cortex/
│   ├── PrimeRadiant/
│   │   └── superpowers/
│   │       └── skills/
│   │           └── writing-plans/
│   └── someone/
│       └── standalone-skill/       ← 非 monorepo，直接放 SKILL.md
│           └── SKILL.md
└── localhost/                      ← 无远程 origin 的本地 skill
    └── my-experiment/
        └── SKILL.md

<project>/                          ← 本地开发时 cold_pool = "."
├── skill-deck.toml                 ← 声明文件（人类编辑）
│     [deck]
│     max_cards = 10
│     cold_pool = "."               ← 项目根 = 冷池条目
│     [tool]
│     skills = ["lythoskill-deck", "lythoskill-project-cortex"]
│
├── skill-deck.lock                 ← 锁定文件（机器生成）
│
├── skills/                         ← 项目本地的 skills/ 目录
│   ├── lythoskill-deck/
│   └── lythoskill-project-cortex/
│
└── .claude/skills/                 ← 工作集：只有 symlink（agent 扫描这里）
      ├── lythoskill-deck → ./skills/lythoskill-deck
      └── lythoskill-project-cortex → ./skills/lythoskill-project-cortex
```

### 冷池目录约定

| 结构 | 例子 | 含义 |
|------|------|------|
| `host.tld/owner/repo/skills/skill-name/` | `github.com/lythos-labs/lythoskill/skills/lythoskill-deck/` | monorepo 中的 skill |
| `host.tld/owner/repo/` | `github.com/someone/standalone-skill/` | 独立 skill（repo 根即 skill） |
| `localhost/name/` | `localhost/my-experiment/` | 无远程 origin 的本地 skill |

### 四个核心概念

| 概念 | 类比 | 本质 |
|------|------|------|
| **冷池（Cold Pool）** | `$GOPATH/pkg/mod/` | 你的全部 skill，agent 看不到 |
| **skill-deck.toml** | K8s Deployment / `go.mod` | 声明期望状态 + 依赖来源 |
| **deck link** | K8s Controller / `go mod tidy` | 调谐器：让实际状态收敛到期望状态 |
| **.claude/skills/** | 编译产物 / 当前加载的模块 | agent 能扫描到的唯一位置（实际状态） |
| **skill-deck.lock** | `go.sum` / 锁定文件 | 记录链接状态、哈希、约束，换 agent 可恢复 |

### 四个核心概念

| 概念 | 类比 | 本质 |
|------|------|------|
| **冷池（Cold Pool）** | 游戏库 / 卡组收藏 | 你的全部 skill，agent 看不到 |
| **skill-deck.toml** | K8s Deployment / 卡组构筑清单 | 声明期望状态："最终应该是这样" |
| **deck link** | K8s Controller / `kubectl apply` | 调谐器：让实际状态收敛到期望状态 |
| **.claude/skills/** | 战场 / 当前手牌 | agent 能扫描到的唯一位置（实际状态） |
| **skill-deck.lock** | 战斗记录 / 公证文件 | 记录链接状态、哈希、约束，换 agent 可读 |

### deny-by-default

未在 `skill-deck.toml` 中声明的 skill，**在文件系统层面就不存在于 `.claude/skills/`**。agent 扫描时看不到，从根本上消除选择困难和静默冲突。

> 不是"禁用"，不是"优先级降低"，是**不存在**。

## Skill Type：标准 vs 自定义

### Kimi CLI 的 type 校验

Kimi CLI 扫描 SKILL.md 时，会读取 front matter 中的 `type` 字段：

```python
# Kimi CLI 源码（~/.local/share/uv/tools/kimi-cli/.../skill/__init__.py）
skill_type = frontmatter.get("type") or "standard"
if skill_type not in ("standard", "flow"):
    raise ValueError(f'Invalid skill type "{skill_type}"')
```

**结论：SKILL.md 的 `type` 字段只接受 `standard` 或 `flow`**。任何其他值（如 `innate`、`tool`、`combo`）都会触发 ValueError，导致 skill 被静默跳过。

| type | 含义 | 适用场景 |
|------|------|---------|
| `standard` | 普通 skill，SKILL.md 作为 prompt 加载 | 工具 skill、胶水 skill、路由 skill |
| `flow` | 流程 skill，SKILL.md 中嵌入 Mermaid 流程图 | 需要多步骤编排的工作流（如 arena） |

### Deck 治理语义（不属于 SKILL.md）

`innate` / `tool` / `combo` / `transient` 是 **skill-deck.toml 的 section 名**，不是 SKILL.md 的 `type`：

```toml
[deck]
max_cards = 30

[tool]
skills = ["deep-research", "web-search", ...]    # ← tool section

[combo]
skills = ["report-generation-combo"]              # ← combo section

[transient.fix-encoding]
path = ".claude/skills/_fix-encoding"
expires = "2026-05-01"
```

这些 section 只影响 `lythoskill-deck link` 的同步行为，不影响 Kimi CLI 对单个 skill 的识别。

## 自定义字段：deck_ 前缀规则

lythoskill-deck 需要在 SKILL.md front matter 中携带私有元数据（niche、triggers、managed_dirs 等），但这些字段不是 Agent Skills 标准的一部分。

为避免与官方标准或未来平台扩展冲突，**所有私有字段必须加 `deck_` 前缀**：

| 旧字段 | 新字段 | 用途 |
|--------|--------|------|
| `niche` | `deck_niche` | 技能定位标签（如 `meta.governance.deck`） |
| `triggers` | `deck_triggers` | 激活触发词 |
| `dependencies` | `deck_dependencies` | 运行时依赖 |
| `managed_dirs` | `deck_managed_dirs` | 管理的目录列表 |
| `delegates` | `deck_delegates` | combo 路由规则 |

> 若需完全标准兼容，可将所有自定义字段收敛到 `metadata` 命名空间下。

## 前置条件：冷池填充

**deck 不负责下载 skill**。冷池的填充由用户自行完成，可使用任何成熟工具：

| 工具 | 命令示例 | 适用场景 |
|------|---------|---------|
| git clone | `git clone https://github.com/owner/repo ~/.agents/skill-repos/github.com/owner/repo` | 任何 git repo |
| Vercel skills.sh | `npx skills add owner/repo -g --skill skill-name` | 支持 skills.sh 的 repo |
| 手动复制 | `cp -r /path/to/skill ~/.agents/skill-repos/localhost/my-skill` | 本地开发 |

### 冷池目录约定（Go module 式）

```
~/.agents/skill-repos/
├── github.com/<owner>/<repo>/          ← git clone 自然映射
│   └── skills/                        ← monorepo 的 skill 目录
│       └── <skill-name>/
├── gitlab.com/<owner>/<repo>/          ← 同上
└── localhost/<name>/                   ← 无远程 origin 的本地 skill
    └── SKILL.md
```

deck 只关心冷池目录下是否存在 `SKILL.md`，不关心 skill 如何到达冷池。

## Deck 生命周期

### 1. 初始化

```bash
# 方式一：全局冷池已就绪
cd <project-root>
cat > skill-deck.toml << 'EOF'
[deck]
working_set = ".claude/skills"
cold_pool   = "~/.agents/skill-repos"
max_cards   = 10

[tool]
skills = ["github.com/lythos-labs/lythoskill/lythoskill-deck"]
EOF

# 方式二：本地开发（项目自身就是冷池条目）
cd <project-root>
cat > skill-deck.toml << 'EOF'
[deck]
working_set = ".claude/skills"
cold_pool   = "."                    # ← 项目根目录 = 冷池
max_cards   = 10

[tool]
skills = ["lythoskill-deck"]         # ← 解析为 ./skills/lythoskill-deck/
EOF

# 方式三：从现有 .claude/skills/ 迁移
bash ~/.agents/skill-repos/github.com/lythos-labs/lythoskill/skills/lythoskill-deck/scripts/deck-migrate.sh
```

### 2. 日常同步（唯一操作）

```bash
# 编辑 skill-deck.toml（增删 skill）
# 然后同步：
bunx @lythos/skill-deck link
# 或直接在 skill 目录下：
# ./scripts/link.sh

# deck 文件放在子目录（如 playground/decks/），但 working_set 锚定当前目录：
bunx @lythos/skill-deck link --deck playground/decks/arena.toml --workdir .

# 输出示例：
#   🗑️  移除: old-skill
#   🔗 skill-arena
#   🔗 report-generation-combo
#   ⚠️  目录重叠: wiki/01-patterns/ ← project-arena-combo, report-generation-combo
#   ✅ 同步完成: 28/30 skill
```

### 3. 异常状态修复（Reconciler 自愈）

deck link 是 **K8s Controller 式的 reconciler**：只关心 "desired state → actual state" 的收敛，不关心 actual state 是如何进入异常状态的。用户永远只需要执行同一个命令——`link`——它会自动修复以下异常：

| 异常状态 | 表现 | link 行为 | 类比（K8s） |
|----------|------|-----------|-------------|
| **断链 symlink** | Symlink 指向不存在的路径（冷池中的 skill 被删除/移动） | `lstatSync` 检测存在 → `rmSync` 删除 → 重新创建正确 symlink | Pod 引用的镜像不存在 → 重新拉取 |
| **自引用/循环 symlink** | Symlink 指向自身或形成循环（文件系统层面的逻辑死锁） | `lstatSync` 不跟随 symlink 仍能检测到文件实体 → 删除重建 | 节点上的容器运行时死锁 → 重启容器 |
| **非 symlink 实体** | `.claude/skills/` 下出现真实目录或文件（用户手动复制、subagent 误写） | 删除实体 → 重建 symlink | 期望是 Pod 但节点上有同名文件 → 清理后重建 |
| **幽灵 skill** | 在 working set 中但不在 skill-deck.toml 声明中 | 直接删除（deny-by-default） | 期望 3 个 Pod 但实际 4 个 → 终止多余 Pod |
| **缺失 skill** | 在 toml 中声明但 working set 中不存在 | 从冷池创建 symlink | 期望 3 个 Pod 但实际 2 个 → 创建缺失 Pod |

> **关键设计**：检测存在性时使用 `lstatSync`（不跟随 symlink），而非 `existsSync`（跟随 symlink）。后者对断链/循环 symlink 返回 `false`，导致跳过删除步骤，随后 `symlinkSync` 报 `EEXIST`。`lstatSync` 能正确识别 symlink 实体本身的存在，确保幂等删除在任何异常状态下都有效。

用户不需要知道 working set 里具体发生了什么异常。执行 `link`，等它收敛到绿色即可。

### 4. 诊断（只读）

```bash
bash ~/.agents/skill-repos/github.com/lythos-labs/lythoskill/skills/lythoskill-deck/scripts/deck-status.sh
# 报告：哪些 skill 在冷池但不在 deck、哪些 transient 即将过期、managed_dirs 归属
```

### 5. 恢复（换 agent / 换机器）

```bash
# 新 agent 读 lock 文件即可理解当前 deck 状态
cat skill-deck.lock | jq '.skills[] | {name, type, deck_niche, deck_managed_dirs}'
# 然后执行 lythoskill-deck link 重建 symlink
```

## Arena 集成：Deck Isolation 原则

`skill-arena`（type: flow）用于评测 skill 效果。它的核心依赖是 **lythoskill-deck 的 deck 隔离能力**：

```
父 deck（skill-deck.toml）: 28 skills
        │
        ▼  arena 开始
生成临时 deck（arena-run-01.toml）: 2 skills
  ├── 变量：1 个被测 skill（如 design-doc-mermaid）
  └── 控制变量：1 个辅助 skill（如 project-scribe）
        │
        ▼  subagent 执行
完成 → 收集输出
        │
        ▼  恢复父 deck
回到 28 skills
```

**控制变量原则**：输出差异必须收敛到**唯一变量**（被测 skill）。其余所有条件（prompt、context、judge persona、辅助 skill）必须完全一致。

**必须恢复父 deck**：每个 subagent 完成后必须执行 `--deck ./skill-deck.toml`，否则后续工作会在精简 deck 上执行。

## Skill 厚度分层

不是所有 skill 都该把重逻辑写在 markdown 里。合理的分层：

| 层级 | 形态 | 存放位置 | 例子 |
|------|------|----------|------|
| **重资产** | npm / pip / cli 工具 | 外部包管理器 | 架构图生成器、代码格式化器 |
| **调度者** | thin skill（Flow / Combo） | `.claude/skills/` | 工作流编排、语义路由 |
| **胶水/运维** | light skill（SKILL.md + `scripts/`） | `.claude/skills/` | lythoskill-deck link、ADR 模板初始化 |

### Flow 与 Combo 的相似性

- **Flow**（Kimi CLI 的 `type: flow`）：用 Mermaid/D2 图做步骤编排，agent 按节点自动推进。
- **Combo**（deck 的 section）：用条件匹配表做语义路由，决定把任务委托给哪个专精 skill。

两者都是**调度者**，都不应该包含厚重的业务逻辑。真正的算法应下沉到外部工具；skill 只负责**在正确的时机调用正确的组件**。

## 与 Agent Skills 标准的关系

lythoskill-deck **不修改** Agent Skills 标准。每个 skill 仍然是包含 SKILL.md 的目录，格式完全遵循标准。

lythoskill-deck 管理的是**哪些 skill 目录出现在 agent 能扫描到的位置**。

不用 lythoskill-deck 时，skill 可以手动放到 `.claude/skills/` 下正常使用。

## Working Set 铁律

**从不手动创建 `.claude/skills/` 目录下的子目录。**

只通过 `lythoskill-deck link` 管理 symlink。手动创建的目录会导致：
- deck-link 无法识别（不是 symlink）
- 换 agent 后这些 skill 不会出现在 lock 文件中
- 形成"幽灵 skill"——存在但不受治理

唯一例外：transient skill 可以手动放在 `.claude/skills/_xxx/`（下划线前缀会被 lythoskill-deck link 忽略）。

## 完整命令参考

| 命令 | 用途 | 依赖 |
|------|------|------|
| `bunx @lythos/skill-deck link` | toml → symlink 同步（reconciler） | bun |
| `bunx @lythos/skill-deck link --deck /path/to/deck.toml` | 指定非默认 toml | bun |
| `bunx @lythos/skill-deck link --deck ./decks/arena.toml --workdir .` | 子目录中的 toml，但 working_set 锚定当前目录 | bun |
| `./scripts/link.sh` | 同上（直接调用 skill 脚本） | bash, bun |
| `bash deck-migrate.sh` | 从肥胖目录迁移到 deck 治理 | 纯 bash |
| `bash deck-status.sh` | 一致性诊断（只读） | 纯 bash |

## Constraints

- **deny-by-default**: 未声明 = 不可见
- **max_cards**: 超预算 = 拒绝同步
- **transient expires**: 过期 = 警告
- **managed_dirs 重叠**: 两个 skill 声明管理同一目录 = 警告（非阻断）
- **type 严格校验**: `standard` 或 `flow` 之一，其他值导致 skill 被跳过
- **deck_ 前缀**: 所有私有 front matter 字段必须加前缀
