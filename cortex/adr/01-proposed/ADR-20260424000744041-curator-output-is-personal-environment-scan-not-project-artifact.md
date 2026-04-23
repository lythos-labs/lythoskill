# ADR-20260424000744041: Curator output is personal environment scan, not project artifact

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-23 | Created |

## 背景
CATALOG.md 最初作为 curator 扫描冷池的「人类可读索引卡」被提交到项目仓库。它记录了 55 个 skill 的分类、冲突风险、道术器用层级等信息。但随着项目向外展示，这个数字和这份文件引发了严重误解：读者以为「lythoskill 生态 = 这 55 个 skill」，而实际上这只是一个特定开发者在特定时间点的个人冷池快照。

## 决策驱动
- 冷池内容高度个人化：A 有 55 个 skill，B 可能只有 12 个，C 可能有 200 个
- 将个人扫描结果提交到项目仓库会造成「伪权威」——看起来像官方 catalog
- 需要明确 curator 产出的归属：用户环境 vs 项目 artifact

## 实用场景推演

### 场景 1: 个人开发者单机构建
开发者运行 `curator index`（CLI 命令），扫描冷池下的 skill。冷池路径默认 `~/.agents/skill-repos/`，但可以在 skill-deck.toml 中指定 `cold_pool` 字段覆盖。

产出 catalog.db + REGISTRY.json。**期望**：这些 index 文件放在用户数据目录（如 `~/.lythos/curator/`），供后续 `curator query`（CLI 查询）和 agent 推荐推理消费。

**注意：index 文件不要放在 agent 默认扫描的位置**（如 `.claude/skills/`），否则会被当成普通 skill 加载，造成污染。

### 场景 2: 团队共享 Git 仓库
如果 CATALOG.md 被提交到 git，新 clone 的队友会看到「55 skills」并困惑：「我本地只有 12 个，剩下 43 个去哪下载？」**后果**：误导性文档，团队认知失调。

### 场景 3: CI / 无头环境
CI  runner 没有 `~/.agents/skill-repos/`。如果构建流程依赖 CATALOG.md，会直接失败或产出空结果。**结论**： curator 产出不能作为项目构建的硬依赖。

### 场景 4: 跨项目复用冷池
开发者同时维护 5 个项目，但只有一个冷池（`~/.agents/skill-repos/`）。每个项目的 skill-deck.toml 不同，但 curator 扫描的是同一批 skill。**结论**：扫描结果属于用户/环境，不属于任何特定项目。

### 场景 5: Agent 用 curator index 为当前项目推荐 deck
**这是 curator 的核心场景。**

Curator CLI 的职责很明确：
1. 按照 agent skills 规范扫描冷池（`~/.agents/skill-repos/`）
2. 提取每个 SKILL.md 的 frontmatter 元数据
3. 生成 `REGISTRY.json` / `catalog.db`（本地索引）

然后 **agent（Claude Code）**读取这个 index，结合项目上下文做 LLM 推理：
- 这个项目是什么类型？（web app、infra、开源维护...）
- 当前 deck 里有什么 skills？
- 冷池里还有什么 skills 可以补充？
- 哪些 skills 形成 Pipeline/Modality Stack/Orchestrator-Engine 协同？

**产出 tiered 推荐池（Core/Force Multiplier/Optional）是 agent 的推理结果，不是 curator CLI 算出来的。** Agent 可以直接修改 skill-deck.toml，然后执行 `deck link`。

**分工：**
| 角色 | 职责 |
|------|------|
| curator CLI | 扫描冷池 → 生成结构化 index |
| agent (LLM) | 读 index + 项目上下文 → 推理推荐 |

Curator SKILL.md 描述这个协作方式：CLI 做什么，agent 推理做什么。

### 场景 6: 团队 lead 的推荐结论分享
团队 lead 在 Spring Boot 项目上让 agent 跑完 curator 推荐，产出的 tiered 推荐池写入项目 wiki 或 ADR。**其他开发者 clone 项目后，可以直接用这个推荐初始化自己的 skill-deck.toml**——前提是他们冷池里有这些 skills。如果缺少，curator discover 会告诉他们去哪找。

**分享的是「推理结论」，不是「完整冷池扫描原始数据」。**

### 场景 7: 外部生态发现 — curator 定义的 workflow
Curator SKILL.md 描述当本地冷池缺少合适 skill 时的 workflow：

1. Agent 读取 curator SKILL.md 中的 discover 指引
2. **Agent 用自己已有的 web search 工具**（不是 curator 提供的）搜索 skill hub / GitHub / registry
3. 找到候选 skills，用 git clone 下载到冷池（`~/.agents/skill-repos/`）
4. 进入标准 pipeline：arena 评测 → ADR 决策 → deck 集成

**Curator 不实现 web search，也不提供 `discover` CLI 命令。** 它只是告诉 agent：「如果你冷池里没有合适的，去网上找，找到后 arena 测一下」。Agent 用自带工具执行。

## 选项

### 方案 A: 项目仓库根目录（已废弃）
将 CATALOG.md / REGISTRY.json 提交到项目仓库，作为「官方索引」。
**优点**:
- 版本控制，可追溯历史
- 新用户 clone 即可看到完整 skill 地图

**缺点**:
- 伪权威：读者误以为这是全球 catalog
- 与个人冷池脱节：commit 里的 55 个 skill 和用户实际拥有的可能完全不同
- 造成「生态 = 55 skills」的致命误解
- CI/无头环境无法生成或验证

### 方案 B: 用户级数据目录（推荐）
curator 产出默认写入用户级目录（如 `~/.lythos/curator/` 或 `~/.config/lythos/curator/`），可通过环境变量或 flag 覆盖。
**优点**:
- 与个人冷池一一对应
- 多项目共享同一份扫描结果
- 不会在 git 中制造伪权威
- 符合 XDG 规范

**缺点**:
- 无法通过 git 共享扫描结果（但本就不该共享）
- 新用户首次运行前没有现成 catalog（但 curator index 只需几秒）

### 方案 C: playground/ 目录（仅内部测试）
在开发 lyhtoskill 自身时，curator 产出写入 `playground/`（已 gitignored）。
**优点**:
- 方便核心团队本地测试和调试
- 不污染项目仓库

**缺点**:
- 不适合终端用户——他们需要持久化的、跨 session 的数据目录
- playground/ 通常会被清理

## 决策
**选择**: 方案 B 为默认，方案 C 为内部开发时的 override。

**关键区分: 原始扫描数据 vs 推荐结论**

| 产出类型 | 例子 | 归属 | 是否可共享 |
|---------|------|------|-----------|
| **原始扫描数据** | CATALOG.md, catalog.db, REGISTRY.json | 用户/环境 | ❌ 不可共享（你的冷池 ≠ 我的冷池） |
| **推荐结论** | Agent 读取 curator SKILL.md 后 LLM 推理产出的 tiered 推荐池 | 项目上下文 | ✅ 可共享（可写入 skill-deck.toml、ADR、项目 wiki） |
| **外部发现报告** | `curator discover` 的搜索结果摘要 | 探索过程 | ✅ 可共享（作为调研笔记） |

**原因**:
- curator 的 **index** 扫描的是**用户环境**，不是**项目代码**。原始扫描产出归属必须与环境对齐。
- 但 curator 的 **recommend**（agent 读取 SKILL.md 后的 LLM 推理）是**项目上下文驱动的**，其结论（「这个项目适合用哪些 skill」）完全可以、也应该被分享。
- 「冷池」概念本身就是用户级/团队级的：我的冷池 ≠ 你的冷池 ≠ 官方生态。但「推荐逻辑」是通用的。
- 项目仓库不应包含任何特定冷池的扫描原始数据，但可以包含基于 curator 推荐做出的 ADR 和 skill-deck.toml 决策。

## 影响
- 正面:
  - 消除「lythoskill 生态只有 55 个 skill」的误解
  - curator 设计从第一天就考虑多用户、多环境
  - 为 future「curator as a service」铺路（用户账号级 catalog 存储）
- 负面:
  - 已发布的 commit 历史仍包含 CATALOG.md（无法撤销已 push 的历史，除非 force push）
- 后续:
  - 确定默认数据目录路径（`~/.lythos/curator/`？`~/.config/lythos/curator/`？）
  - 支持 `--output` / `-o` flag 让用户自定义输出目录
  - 内部测试可使用 `CURATOR_OUTPUT_DIR=./playground` override
  - 文档中明确展示 curator 跨项目、跨技术栈、跨角色的使用案例（Spring Boot deck、React deck 等）

## 相关
- 关联 ADR: ADR-20260423130348396（lythoskill-deck 移植决策——依赖分层原则）
- 关联 Epic: lythoskill-curator 生态定位
- 关联文件: `cortex/wiki/01-patterns/project-scope-and-ecosystem-paths.md`
