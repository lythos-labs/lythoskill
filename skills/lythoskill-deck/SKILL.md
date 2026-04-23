---
name: lythoskill-deck
version: 0.1.0
deck_niche: meta.governance.deck
type: standard
description: |
  项目级 Skill Working Set 的声明式管理器。解决"下载了 50+ 个 skill 堆在系统目录里导致 agent 选择困难、同类 skill 静默冲突、context 被无关 description 污染"的问题。

  核心机制：
  - **冷池（Cold Pool）**: 个人全量 skill 仓库（~/.agents/skill-repos/），纯存储，agent 不扫描
  - **工作集（Working Set）**: 项目级 skills 目录（.claude/skills/），只有 symlink，agent 实际扫描
  - **skill-deck.toml**: 显式声明"本项目只用这些 skill"
  - **deny-by-default**: 未声明的 skill 从文件系统层面不可见
  - **max_cards 预算**: 硬约束，超预算拒绝同步
  - **managed_dirs 重叠检测**: 两个 skill 管理同一目录时告警

  当用户提到"同步 skill""初始化 deck""working set""skill 冲突""同类 skill 太多""冷池""deck"时激活。
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

```
~/.agents/skill-repos/            ← 冷池：个人全量仓库（45+ skills）
  ├── cocoon-ai/
  ├── git-workflow/
  ├── lythoskill-deck/               ← 包含 scripts/、SKILL.md
  ├── skill-arena/
  ├── report-generation-combo/
  └── ... 其他仓库和自定义 skills

<project>/
  ├── skill-deck.toml              ← 声明文件（人类编辑）
  │     [deck]
  │     max_cards = 30
  │     [tool]
  │     skills = ["skill-arena", "project-scribe", ...]
  │     [combo]
  │     skills = ["project-arena-combo", "report-generation-combo"]
  │
  ├── skill-deck.lock              ← 锁定文件（机器生成）
  │     记录：链接状态、内容哈希、目录归属、约束报告
  │
  └── .claude/skills/              ← 工作集：只有 symlink（agent 扫描这里）
        ├── skill-arena → ~/.agents/skill-repos/skill-arena
        ├── project-scribe → ~/.agents/skill-repos/skills_repo/project-scribe
        └── ...（未声明的 skill 不存在于这里）
```

### 四个核心概念

| 概念 | 类比 | 本质 |
|------|------|------|
| **冷池（Cold Pool）** | 游戏库 / 卡组收藏 | 你的全部 skill，agent 看不到 |
| **skill-deck.toml** | 卡组构筑清单 | 人类编辑的"本次出战名单" |
| **.claude/skills/** | 战场 / 当前手牌 | agent 能扫描到的唯一位置 |
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

## Deck 生命周期

### 1. 初始化

```bash
# 方式一：冷池已就绪，直接创建 toml
cd <project-root>
cat > skill-deck.toml << 'EOF'
[deck]
working_set = ".claude/skills"
cold_pool   = "~/.agents/skill-repos"
max_cards   = 10

[tool]
skills = ["lythoskill-deck"]
EOF

# 方式二：从现有 .claude/skills/ 迁移
bash ~/.agents/skill-repos/lythoskill-deck/deck-migrate.sh
```

### 2. 日常同步（唯一操作）

```bash
# 编辑 skill-deck.toml（增删 skill）
# 然后同步：
bunx @lythos/skill-deck link
# 或直接在 skill 目录下：
# ./scripts/link.sh

# 输出示例：
#   🗑️  移除: old-skill
#   🔗 skill-arena
#   🔗 report-generation-combo
#   ⚠️  目录重叠: wiki/01-patterns/ ← project-arena-combo, report-generation-combo
#   ✅ 同步完成: 28/30 skill
```

### 3. 诊断（只读）

```bash
bash ~/.agents/skill-repos/lythoskill-deck/deck-status.sh
# 报告：哪些 skill 在冷池但不在 deck、哪些 transient 即将过期、managed_dirs 归属
```

### 4. 恢复（换 agent / 换机器）

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
