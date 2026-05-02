# ADR-20260501091724816: Rename cold pool to skill_library terminology alignment with Hermes ecosystem

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-01 | Created after Hermes Agent source inspection |

## Context

lythoskill-deck 当前使用 **cold pool** 作为术语，指代"所有已下载但未被激活的技能存储目录"。这个术语是本项目自创的，在 Agent Skills 社区中没有先例。

与此同时，**Hermes Agent**（Nous Research, 2026）作为自主进化技能的领先实现，其源码和文档中大量使用 **skill library** 概念：
- `~/.hermes/skills/` 被称为 skill storage，文档描述为 "skill library"
- 自主创建的 skill 写入用户级 skill library
- Skills Hub 作为"远程 skill library"的发现层
- Curator 功能对 skill library 进行生命周期治理（active → stale → archived）

随着自主进化 Agent 的普及，"skill library" 正在成为社区默认术语。继续使用自造语 "cold pool" 会造成：
1. 新用户认知摩擦（"cold pool 是什么？"）
2. 与 Hermes 等生态的文档/教程难以互通
3. 代码示例中需要额外注释解释术语映射

## 决策驱动

- 与新兴生态（Hermes, OpenClaw 等）的术语互操作性
- 降低新用户的认知门槛
- 保持 lythoskill 概念模型的精确性（"cold pool" 暗示"低温/未激活"，但 skill 在 cold pool 中仍可能被 curator/indexer 扫描）
- 不破坏现有配置文件的向后兼容性

## 选项

### 方案A：全面替换 cold pool → skill_library（Breaking Change）

将所有 `cold_pool` 配置字段、变量名、文档中的 "cold pool" 替换为 `skill_library` / "skill library"。

**优点**:
- 术语与 Hermes、agentskills.io 社区完全对齐
- 配置文件自解释：用户看到 `skill_library` 即可直觉理解用途
- 未来写跨平台教程时无需术语对照表

**缺点**:
- **破坏性变更**：所有现有 `skill-deck.toml` 的 `cold_pool = "..."` 字段失效
- 需要 major version bump（v0.6 → v1.0）或复杂的 deprecation shim
- "skill library" 在 Hermes 中是一个**运行时可见**的目录（`~/.hermes/skills/` 包含 active 和 archived skills），而 lythoskill 的 cold pool 是** Agent 不可见**的隔离层。术语相同但语义不同，可能造成更深的混淆。

### 方案B：保留 cold_pool，增加别名 skill_library（Backward Compatible）

配置层面允许 `skill_library` 作为 `cold_pool` 的别名，两者等价。文档中优先使用 `skill_library`，但代码内部保留 `cold_pool`。

**优点**:
- 向后兼容，现有配置不中断
- 新用户看到更熟悉的术语
- 迁移成本低

**缺点**:
- 代码和文档中存在两套术语，长期维护负担
- 用户可能在同一个生态中同时看到 "cold pool"（旧文档）和 "skill library"（新文档），造成"为什么同一个东西有两个名字"的困惑
- 没有解决核心问题：lythoskill 的 cold pool 与 Hermes 的 skill library 在**架构语义上并不等同**

### 方案C：引入分层术语，cold_pool 降级为 implementation detail（Selected）

重新梳理概念层次，使术语与架构一一对应：

| 层级 | 新术语 | 对应概念 | 说明 |
|------|--------|---------|------|
| 抽象 | **Skill Library** | 用户拥有的全部 skill 集合 | 与 Hermes 的 "skill library" 概念对齐 |
| 物理 | **Cold Pool** | `skill_library` 的**子集**：未被 deck 激活的技能 | 保留现有术语，但降级为 implementation detail |
| 运行时 | **Working Set** | `.claude/skills/` 中当前可见的技能 | 不变 |
| 治理 | **Deck** | 从 Library 中选择哪些进入 Working Set 的声明 | 不变 |

具体变更：
- `skill-deck.toml` 中的 `cold_pool` 字段**重命名为** `library`
- 文档中统一使用 **"Skill Library"** 指代用户的完整技能集合
- **"Cold Pool"** 仅在需要强调"未被激活的物理存储"时使用，逐渐从用户文档中淡出
- 内部代码变量 `coldPool` → `libraryPath`（或保留，因为代码变量对用户不可见）

**优点**:
- 精确的概念分层：Library ⊃ Cold Pool（冷池是库的一个分区）
- 与 Hermes 的 "skill library" 在抽象层对齐，但保留 lythoskill 独特的物理隔离设计
- 配置文件变更单一（仅一个字段名），deprecation shim 简单：`if (config.cold_pool) config.library = config.cold_pool`
- 为未来的 curator 功能（自动归档、使用统计）预留概念空间 —— 这些功能操作的是整个 Library，不只是 Cold Pool

**缺点**:
- 需要一次性更新所有文档和 SKILL.md
- 短期内在社区中可能同时听到两种说法

## 决策

**选择**: 方案C

**原因**:
1. **概念精确性优先**：Hermes 的 `~/.hermes/skills/` 包含 active、archived、hub-installed、bundled 所有技能，是一个完整的"图书馆"。lythoskill 的 cold pool 只是图书馆中"闭架书库"的一部分。直接用 "skill_library" 替换 "cold_pool" 会丢失这种精细的语义区分。
2. **面向未来**：lythoskill-curator 的路线图包含使用统计、自动归档、推荐淘汰 —— 这些功能需要操作"整个 Library"（包括 working set 中的 skills）。如果术语只到 "cold pool"，curator 的概念模型会缺少一个"总集"术语。
3. **迁移成本可控**：仅 `skill-deck.toml` 的一个字段更名，schema 校验层加 deprecation shim 即可。

## 影响

### 正面
- 与 Hermes/OpenClaw 生态的文档可互译
- 为新功能（curator 生命周期治理、usage tracking）提供清晰的概念基础
- 新用户直觉："library = 我的所有 skills"，"deck = 我当前带的牌组"，"working set = 桌上摊开的牌"

### 负面
- 现有用户需要更新 `skill-deck.toml`（单字段，可自动 shim）
- 内部代码的 `coldPool` 变量需逐步重构（非紧急，可随功能迭代自然替换）
- 短期内 Google 搜索 "lythoskill cold pool" 的旧链接会与新文档不一致

### 后续
1. **Deprecation shim**（v0.7.0）：`skill-deck.toml` 解析时，`cold_pool` 自动映射到 `library`，打印 warning
2. **文档迁移**（v0.7.0）：所有 SKILL.md、references、wiki 中的 "cold pool" 改为 "skill library" 或 "library"
3. **硬切换**（v1.0.0）：移除 `cold_pool` 别名，仅支持 `library`
4. **Curator 集成**（未来 Epic）：将 Hermes 的 `skill_usage.py` 中的 usage tracking、active/stale/archived 生命周期、.archive/ 目录机制，作为 curator 的参考实现纳入 lythoskill 生态

## 相关
- 关联 ADR: ADR-20260423101938000（Thin Skill Pattern，三层分离概念）
- 关联 Epic: 动态 Deck 治理（Hermes 调研报告中提出的前瞻性 Epic）
- 关联外部实现: [Hermes Agent `tools/skill_usage.py`](https://github.com/NousResearch/hermes-agent/blob/main/tools/skill_usage.py) — curator 生命周期与 provenance tracking 的参考实现
- 关联 wiki: [hermes-agent-skill-evolution-and-deck-governance](../wiki/03-lessons/hermes-agent-skill-evolution-and-deck-governance.md)
