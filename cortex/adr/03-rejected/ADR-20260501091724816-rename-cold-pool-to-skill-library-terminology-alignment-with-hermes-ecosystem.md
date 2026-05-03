# ADR-20260501091724816: Rename cold pool to skill_library terminology alignment with Hermes ecosystem

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-01 | Created after Hermes Agent source inspection |
| rejected | 2026-05-03 | Rejected — cold pool and skill library are fundamentally different concepts; alignment would cause more confusion than it solves |

## Context

lythoskill-deck 使用 **cold pool** 作为术语，指代"所有已下载但未被激活的技能存储目录"。这个术语是本项目自创的，在 Agent Skills 社区中没有先例。

与此同时，**Hermes Agent**（Nous Research, 2026）作为自主进化技能的领先实现，其源码和文档中大量使用 **skill library** 概念：
- `~/.hermes/skills/` 被称为 skill storage，文档描述为 "skill library"
- 自主创建的 skill 写入用户级 skill library
- Skills Hub 作为"远程 skill library"的发现层
- Curator 功能对 skill library 进行生命周期治理（active → stale → archived）

## 决策驱动

- 是否与新兴生态（Hermes, OpenClaw 等）的术语互操作
- 是否降低新用户的认知门槛
- 是否保持 lythoskill 概念模型的精确性

## 选项

### 方案A：全面替换 cold pool → skill_library（Breaking Change）

将所有 `cold_pool` 配置字段、变量名、文档中的 "cold pool" 替换为 `skill_library` / "skill library"。

**优点**:
- 术语与 Hermes、agentskills.io 社区完全对齐

**缺点**:
- **破坏性变更**：所有现有 `skill-deck.toml` 的 `cold_pool = "..."` 字段失效
- "skill library" 在 Hermes 中是一个**运行时可见**的目录（`~/.hermes/skills/` 包含 active 和 archived skills），而 lythoskill 的 cold pool 是**Agent 不可见**的隔离层。术语相同但语义相反，会造成更深的混淆。
- 丢失 "cold pool" 所强调的"默认不激活"这一核心设计意图

### 方案B：保留 cold_pool，增加别名 skill_library（Backward Compatible）

配置层面允许 `skill_library` 作为 `cold_pool` 的别名，两者等价。

**优点**:
- 向后兼容

**缺点**:
- 两套术语并存，长期维护负担
- 没有解决核心问题：lythoskill 的 cold pool 与 Hermes 的 skill library 在**架构语义上并不等同**

### 方案C：引入分层术语，cold_pool 降级为 implementation detail（曾考虑）

将 "Skill Library" 定义为总集（用户拥有的全部 skill），"Cold Pool" 定义为子集（未被激活的物理存储）。

**缺点**:
- 方案 C 的本质是**以"保留"之名行"消灭"之实**：将 `cold_pool` 字段重命名为 `library`，并从所有用户文档中移除 "cold pool" 术语
- 强行把 cold pool 说成 "library 的一个分区"，掩盖了两者在架构上的根本差异

## 决策

**选择**: Rejected — 全部方案均不接受

**原因**:

1. **概念本质不同，不应混用**
   - Hermes 的 `~/.hermes/skills/`：**运行时全可见**的总集，Agent 直接扫描
   - lythoskill 的 `~/.agents/skill-repos/`：**运行时完全不可见**的物理隔离层，Agent 无法扫描
   - 这是两种**相反的安全模型**，不是同一概念的不同命名

2. **cold pool 是刻意为之的设计术语**
   - "cold" 强调**低温/休眠/默认不激活**
   - "pool" 强调**存储容器**
   - 合在一起精确传达了"物理隔离 + 默认不可见"的架构意图
   - 如果叫 "library"，用户会误以为这是 Agent 的"藏书"——默认可见、随时可调用

3. **真正对齐 skill library 的是 deck / working set**
   - Hermes 的 skill library = 用户拥有的全部 skill 集合，**运行时可见**
   - lythoskill 中，**deck**（声明）+ **working set**（`.claude/skills/` 中的 symlinks）= Agent **当前可见**的 skill 集合
   - 这才是语义上的真正对应：运行时可见的 skill 集合
   - cold pool 在 Hermes 中**完全没有对应物**——它是 lythoskill 独有的**归档沙盒 / 准入隔离层**

4. **cold pool 有精确的外部类比：Maven `~/.m2/repository`**
   - Maven `.m2/repository`：存储所有下载过的依赖，但**不会自动进入项目 classpath**
   - 只有 `pom.xml` 声明的依赖，Maven 才会从 `.m2` 解析并放入 classpath
   - lythoskill 的 cold pool 完全同构：`cold pool` ≈ `.m2/repository`，`skill-deck.toml` ≈ `pom.xml`，`deck link` ≈ 依赖解析
   - 这个类比精准传达了"本地缓存/存储层，默认不激活"的概念，而 "skill library" 没有这样的类比

5. **混淆概念所以特别起名**
   - 之所以不直接借用 "skill library"，正是因为看到了混淆的风险
   - 如果用同一个词描述两种相反的可见性模型，社区讨论时会产生系统性误解
   - 保持术语差异 = 保持架构差异的可见性

## 影响

### 正面
- `cold_pool` 字段和术语保持不变，现有用户零迁移成本
- 概念模型更加精确：cold pool ≠ library，它们是互补而非包含关系
- 对外提供术语对照表即可，无需自我消解核心设计

### 负面
- 新用户需要多理解一个术语（但避免了"以为懂了实则误解"的隐性成本）
- 与 Hermes 文档互译时需要显式标注概念差异

### 后续
1. **保留 `cold_pool` 字段**：永不被重命名为 `library`
2. **文档策略**：在跨生态对接文档中，明确标注 "cold pool（lythoskill 独有的物理隔离层，Agent 不可见）≠ skill library（通用术语，Agent 可见的 skill 总集）"
3. **术语对照表**： Hermes `~/.hermes/skills/` → lythoskill `deck` / `working set`；Hermes 无对应物 → lythoskill `cold pool`
4. **相关 ADR 修正**：ADR-20260502012643244、ADR-20260502012643344、ADR-20260502012643544 中引用本 ADR 的联动表述需更新

## 相关
- 关联 ADR: ADR-20260423101938000（Thin Skill Pattern，三层分离概念）
- 关联 wiki: [hermes-agent-skill-evolution-and-deck-governance](../wiki/03-lessons/hermes-agent-skill-evolution-and-deck-governance.md)
