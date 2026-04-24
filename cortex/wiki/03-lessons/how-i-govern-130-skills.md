# 我是如何治理超过 130 个 skill 的

> 类型: 实战经验 | 关联: [skill-selection-pipeline](../01-patterns/skill-selection-pipeline.md), lythoskill-deck, lythoskill-curator
>
> 背景: 作者冷池有 190+ skills，来自 Anthropic、Claude Code、Matt Pocock、Superpowers、AI Marketing 等多个来源。

---

## 问题

我的 `~/.claude/skills/` 里有 50+ 个 skill，来自不同时期、不同治理体系：

- **skill-manager 时代**: 用 `skill-deck.toml` 管理，但 working set 里还混着手动安装的真实目录
- **superpowers 时代**: `superpowers/skills/` 下的技能，与 skill-manager 同占 orchestrator 生态位，造成 silent blend
- **手动安装**: `gstack`、`my-writing-style`、`project-workflow` 等直接 `cp -R` 进 `~/.claude/skills/`
- **项目测试**: 各种 symlink 指向不同项目的 `skills/` 目录，有的是旧版本

结果：`~/.claude/skills/` 成了"最脏"的地方 —— agent 看到的不是精选牌组，而是一堆历史债务。

---

## 诊断

```bash
# 看看 working set 里有什么
ls -la ~/.claude/skills/

# 输出:
# DIR  _templates          # 保留（以 _ 开头，deck 忽略）
# DIR  gstack              # 手动安装，有 preamble，全局执行
# DIR  my-writing-style    # 手动安装
# DIR  project-workflow    # 手动安装
# LINK project-cortex -> ~/.agents/skill-repos/project-cortex    # 旧版 skill-manager 创建
# LINK skill-curator -> ~/.agents/skill-repos/skill-curator      # 旧版
# DIR  skill-manager       # 旧版治理工具，与 lythoskill-deck 冲突
```

**根本问题**: working set 和 cold pool 没有严格分离。技能被"装"进 working set，而不是"被 deck 选中"进入 working set。

---

## 方案: 两层治理

```
冷池 (~/.agents/skill-repos/)          全局 Deck              工作集 (~/.claude/skills/)
  ├── anthropic-skills/                  skill-deck.toml         ├── _templates/
  ├── claude-code-skills/                  max_cards = 5         ├── lythoskill-deck -> cold-pool/
  ├── superpowers/                         innate:                └── lythoskill-curator -> cold-pool/
  ├── ai-marketing-skills/                   - lythoskill-deck
  ├── gstack/ (迁移至此)                     - lythoskill-curator
  ├── my-writing-style/ (迁移至此)         tool: []
  ├── lythoskill-deck -> ~/lythoskill/...  combo: []
  ├── lythoskill-curator (cp 至此)
  └── ... 190+ skills

项目 A                               项目 B
  skill-deck.toml                      skill-deck.toml
    innate: gstack                       innate: my-writing-style
    tool: docx, design-doc-mermaid       tool: web-search, arxiv-research
```

**原则**: 全局只保留治理基础设施（deck + curator），所有业务 skill 下放项目级 deck。

---

## 执行步骤

### Step 1: 备份

```bash
# 把 working set 里的真实目录备份到冷池旁
mkdir -p ~/.agents/lythos/backups
tar czf ~/.agents/lythos/backups/claude-skills-$(date +%Y%m%d).tar.gz \
  -C ~/.claude/skills gstack my-writing-style project-workflow skill-manager
```

### Step 2: 迁移真实目录到冷池

```bash
# 把这些技能从 working set 移到 cold pool，成为"收藏"的一部分
cp -R ~/.claude/skills/gstack ~/.agents/skill-repos/
cp -R ~/.claude/skills/my-writing-style ~/.agents/skill-repos/
cp -R ~/.claude/skills/project-workflow ~/.agents/skill-repos/
# skill-manager 是旧治理工具，不需要保留
```

### Step 3: 确保种子技能在冷池

```bash
# lythoskill-deck 已经是 symlink（指向 lythoskill 项目）
ls -la ~/.agents/skill-repos/lythoskill-deck

# lythoskill-curator 需要复制到冷池（避免鸡蛋问题：lythoskill 项目移动则 symlink 断裂）
cp -R ~/Downloads/lythoskill/skills/lythoskill-curator ~/.agents/skill-repos/
```

### Step 4: 创建全局 deck

`~/.agents/lythos/skill-deck.toml`:

```toml
[deck]
working_set = "~/.claude/skills"
cold_pool = "~/.agents/skill-repos"
max_cards = 5

[innate]
skills = [
  "lythoskill-deck",
  "lythoskill-curator",
]

[tool]
skills = []
```

**为什么只放两个？**
- `lythoskill-deck`: 治理 working set 本身
- `lythoskill-curator`: 扫描冷池、发现可用技能
- 其他所有技能（gstack、writing-style、project-cortex 等）全部下放项目级 deck

### Step 5: 执行 link

```bash
lythoskill-deck link --deck ~/.agents/lythos/skill-deck.toml
```

**输出**:
```
🗑️  移除: skill-manager
🗑️  移除: gstack
🗑️  移除: my-writing-style
🗑️  移除: project-workflow
🗑️  移除: project-cortex
🗑️  移除: skill-curator
🔗 lythoskill-deck
🔗 lythoskill-curator

✅ 同步完成: 2/5 skill
```

**验证**:
```bash
ls -la ~/.claude/skills/
# lrwxr-xr-x lythoskill-deck -> ~/.agents/skill-repos/lythoskill-deck
# lrwxr-xr-x lythoskill-curator -> ~/.agents/skill-repos/lythoskill-curator
# drwxr-xr-x _templates
```

---

## 项目级使用

现在进入任何项目，流程是：

```bash
# 1. 扫描冷池，看看有什么可用
lythoskill-curator ~/.agents/skill-repos

# 2. Agent 读取 REGISTRY.json，结合项目需求推理推荐
#    "这个项目是 web scraping + 报告生成，推荐 docx + web-search"

# 3. 创建项目级 skill-deck.toml
cat > skill-deck.toml <<'EOF'
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"

[tool]
skills = ["docx", "web-search", "design-doc-mermaid"]
EOF

# 4. 同步项目 working set
lythoskill-deck link
```

**关键**: 项目 deck 的 `cold_pool` 指向同一个全局冷池。不同项目选不同的子集。

---

## 效果

| 指标 | 治理前 | 治理后 |
|------|--------|--------|
| `~/.claude/skills/` 数量 | 8 (混杂) | 2 (纯净) |
| 全局 agent 可见技能 | 50+ description | 2 个 governance tool |
| 技能安装方式 | cp -R / git clone 到 working set | 统一放 cold pool，deck 选择 |
| 项目间隔离 | 无 (所有项目看到同样的 skills) | 有 (每个项目自己的 deck) |
| silent blend 风险 | 高 (superpowers vs skill-manager) | 低 (deck deny-by-default) |

---

## 教训

### 1. Working set 不是收藏夹

`~/.claude/skills/` 不是"我拥有的技能"，而是"当前 agent 能看到的技能"。收藏在 cold pool，上桌的牌才在 working set。

### 2. 全局越薄越好

全局 deck 只放 governance 工具。每多一个全局 skill，所有项目都多一分 context 污染和冲突风险。

### 3. 种子技能用 cp，其他用 symlink

**比较**: `lythoskill-deck` 和 `lythoskill-curator` 应该以什么方式进入冷池？

| 方式 | 优点 | 缺点 | 适用 |
|------|------|------|------|
| **symlink** | 自动跟随源项目更新 | 源项目移动/删除则断裂 | 普通技能（deck link 自动重建） |
| **cp -R** | 自包含，无外部依赖 | 需要手动重新复制以更新 | 种子技能（deck、curator 等治理工具） |

**决策**: 种子技能用 `cp -R`，避免鸡蛋问题。普通技能由 deck 自动 symlink，断裂时重新 link 即可。

```bash
# 种子技能：cp（自举安全）
cp -R ~/lythoskill/skills/lythoskill-curator ~/.agents/skill-repos/

# 普通技能：symlink（deck 自动管理）
# deck link 会创建 ~/.claude/skills/docx -> ~/.agents/skill-repos/docx
```

### 4. 备份是迁移的前提

`tar czf` 备份 working set 里的真实目录，万一需要回滚可以快速恢复。

### 5. 旧治理工具要清理

`skill-manager` 与 `lythoskill-deck` 同占 `meta.governance.deck` 生态位。共存会导致 silent blend —— agent 同时看到两套治理指令，不知道该听谁的。

---

## 相关

- [Pattern: Skill Selection Pipeline](../01-patterns/skill-selection-pipeline.md) — 项目级技能选择流程
- `lythoskill-deck` — Deck 治理工具
- `lythoskill-curator` — 冷池扫描工具
- [Player-Deck Separation](../01-patterns/player-deck-separation-and-tcg-player-analogy.md) — 为什么 deck 边界在这里
