# ADR-20260423130348396: Port skill-manager into lythoskill ecosystem as deck governance

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-23 | Created |
| accepted | 2026-04-23 | Approved: named lythoskill-deck, deck_ prefix, skill-layer zero deps

## 背景

当前 agent skill 生态的默认行为是**隐式发现**——agent 扫描 `~/.claude/skills/` 下所有 `SKILL.md`，自行决定是否激活。当 skill 增长到几十个时，出现三个问题：

1. **选择困难**：同类 skill 描述互相竞争，agent 随机选一个，结果不稳定
2. **context 污染**：50+ 个 description 挤进 prompt，有效 context 被稀释
3. **静默冲突**：两个 skill 的指令互相矛盾，agent 混合执行，不报错但结果错

skill-manager（来自 `~/.agents/skill-repos/skill-manager/`）提供了一套声明式治理方案：
- **冷池（cold pool）**：`~/.agents/skill-repos/`，个人全量仓库，agent 不扫描
- **工作集（working set）**：`.claude/skills/`，只有 symlink，agent 实际扫描
- **skill-deck.toml**：显式声明"本项目只用这些 skill"
- **deny-by-default**：未声明的 skill 从文件系统层面不可见

本 ADR 决定如何将 skill-manager 移植到 lythoskill 生态，作为第三个核心组件。

## 决策驱动

1. **保留 deck 核心隐喻**：deck-link、deck-status、deck-migrate、skill-deck.toml 等概念已经自洽，不应为了"通用化"而抹除标识度。
2. **命名标识度**：需要与 lythoskill 品牌一致，同时保留 deck 概念。
3. **依赖分层**：从 Skill 层（agent 视角）看，必须是零依赖——用户安装 skill 时不需要装任何 npm 包。重逻辑放在 Starter 包（npm 可发布），Skill 层只通过 `bunx` 薄调用。
4. **front-matter 前缀规范**：lythoskill 生态自制的 skill，其私有 front-matter 字段需要统一前缀，避免与 Agent Skills 标准冲突。
5. **多平台兼容**：Claude Code 用 `.claude/skills/`，OpenAI Codex 用 `.agents/skills/`，工作集路径需要可配置。

## 选项

### 命名：lythoskill-deck vs lythoskill-skill-manager

| 方案 | 标识度 | 隐喻清晰度 |
|------|--------|-----------|
| lythoskill-deck | ✅ 强（deck = 卡组，一眼记住） | ✅ 直接对应核心概念 |
| lythoskill-skill-manager | ⚠️ 泛（manager 太通用） | ❌ 丢失了 deck 隐喻 |

**结论**：保留 deck 隐喻，命名为 **lythoskill-deck**。

### front-matter 前缀：deck_ vs sm_

skill-manager 原版使用 `sm_` 前缀（skill-manager 的缩写）。在 lythoskill 生态中，自制 skill 的私有字段需要统一前缀：

| 原字段 | 新字段 | 用途 |
|--------|--------|------|
| `sm_niche` | `deck_niche` | 技能定位标签 |
| `sm_triggers` | `deck_triggers` | 激活触发词 |
| `sm_dependencies` | `deck_dependencies` | 运行时依赖 |
| `sm_managed_dirs` | `deck_managed_dirs` | 管理的目录列表 |
| `sm_delegates` | `deck_delegates` | combo 路由规则 |

**结论**：统一为 `deck_` 前缀，与 skill 名称一致。

### 依赖策略

| 层级 | 形态 | 能否有外部依赖 | 原因 |
|------|------|---------------|------|
| **Skill 层**（skills/lythoskill-deck/） | SKILL.md + scripts | ❌ 零依赖 | agent 用户直接读取，不能要求预装库 |
| **Starter 包**（packages/lythoskill-deck/） | npm 包 + CLI | ✅ 可以有 | 用户显式 `bunx @lythos/deck` 安装，依赖自动解析 |

**关键原则**：从 skills/ 视角看，零依赖。scripts 中只有 `bunx @lythos/deck <command>` 这种薄调用。

### 工作集路径

| 平台 | 默认路径 |
|------|----------|
| Claude Code | `.claude/skills/` |
| OpenAI Codex | `.agents/skills/` |
| 其他 | 可配置 |

skill-deck.toml 中保留 `working_set` 字段，默认 `.claude/skills/`，允许覆盖。

## 决策

**选择**：
1. **命名**：`lythoskill-deck`
2. **Starter 包名**：`@lythos/deck`
3. **front-matter 前缀**：`deck_`
4. **依赖策略**：Skill 层零依赖，Starter 包允许依赖 `zod` + `@iarna/toml`
5. **工作集路径**：默认 `.claude/skills/`，通过 `skill-deck.toml` 配置

**原因**：

- deck 隐喻已经成熟（cold pool、working set、deny-by-default、max_cards），抹除它是浪费认知资产。
- `lythoskill-deck` 比 `lythoskill-skill-manager` 更有标识度——听到 deck 就知道是"卡组治理"。
- `deck_` 前缀比 `sm_` 更自解释：看到 `deck_niche` 就知道是 deck 相关的 niche，不需要知道"sm = skill-manager"。
- Skill 层零依赖是 thin-skill 模式的底线。如果用户为了用一个 skill 要先装 zod，整个模式就崩了。
- `bunx @lythos/deck link` 一一对应：Starter 包的 CLI 入口 = Skill 层的 scripts 调用目标。

## 影响

### 正面
- lythoskill 生态补齐"元治理"层：creator（创建）→ project-cortex（管理项目）→ deck（管理 skill）
- deck 治理解决 skill 膨胀问题，使 lythoskill 生态在长期可维护
- `deck_` 前缀统一后，未来所有 lythoskill 自制 skill 的 front-matter 都有规范可循

### 负面
- Starter 包引入外部依赖（zod + toml），打破了"lythoskill 核心零依赖"的纯洁性
  - 缓解：这是扩展包，不是核心包。核心包（lythoskill）仍保持零依赖。
- skill-deck.toml 的 schema 需要维护，与 skill-manager 原版保持兼容或明确分叉

### 后续
- [ ] 创建 `packages/lythoskill-deck/` Starter 包
- [ ] 创建 `packages/lythoskill-deck/skill/` Skill 源码
- [ ] 运行 `build lythoskill-deck` 生成 `skills/lythoskill-deck/`
- [ ] 在 AGENTS.md 中补充 deck 治理规范
- [ ] 创建 `cortex/wiki/01-patterns/skill-deck-governance.md`

## 相关
- 关联 ADR: ADR-20260423101938000-thin-skill-pattern.md（三层架构定义）
- 关联 ADR: ADR-20260423124812645-should-dist-be-committed-to-git-or-ignored.md（skills/ 作为 build 产物提交）
- 关联 Epic: EPIC-20260423102000000-lythoskill-bootstrap.md
