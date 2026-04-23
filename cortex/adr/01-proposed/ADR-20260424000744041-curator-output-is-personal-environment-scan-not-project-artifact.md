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
开发者运行 `curator index`，扫描 `~/.agents/skill-repos/` 下自己的 40 个 skill。产出 CATALOG.md + REGISTRY.json + catalog.db。**期望**：这些文件留在自己机器上，供本地 `curator recommend` 和 `curator query` 消费。

### 场景 2: 团队共享 Git 仓库
如果 CATALOG.md 被提交到 git，新 clone 的队友会看到「55 skills」并困惑：「我本地只有 12 个，剩下 43 个去哪下载？」**后果**：误导性文档，团队认知失调。

### 场景 3: CI / 无头环境
CI  runner 没有 `~/.agents/skill-repos/`。如果构建流程依赖 CATALOG.md，会直接失败或产出空结果。**结论**： curator 产出不能作为项目构建的硬依赖。

### 场景 4: 跨项目复用冷池
开发者同时维护 5 个项目，但只有一个冷池（`~/.agents/skill-repos/`）。每个项目的 skill-deck.toml 不同，但 curator 扫描的是同一批 skill。**结论**：扫描结果属于用户/环境，不属于任何特定项目。

### 场景 5: 团队 lead 分享「推荐卡组」
团队 lead 用 curator 扫描团队共享冷池，然后为「前端项目」生成推荐：`curator recommend --for "React + TypeScript 项目"`。产出是一个 tiered 推荐列表（Core/Force Multiplier/Optional）。**这个推荐结果可以也应该被分享**——它进入项目的 skill-deck.toml、ADR 或 onboarding 文档。**但分享的是「推荐结论」，不是「完整冷池扫描原始数据」**。

### 场景 6: 外部生态发现
开发者运行 `curator discover --query "web scraping"`，从 GitHub / skill hub 找到 3 个新 skill。这些外部 skill 被下载到冷池，然后进入标准 pipeline（arena → adr → deck）。**发现过程是探索性的，产出（下载到冷池的 skill）是个人化的**，但「发现结果报告」可以作为项目 wiki 的一部分。

### 场景 7: 为任意开源项目推荐 skills
你参与了一个知名开源项目（如 React、Vite、某个 AI 框架），想用 curator 从自己的冷池里挑合适的 skills 辅助工作。`curator recommend --for "大型开源项目维护"` 产出的推荐池完全可以被采纳——写入该项目的 skill-deck.toml、ADR 或贡献者指南。

### 场景 8: 按角色/职位定制 deck
你接手了一个 Spring Boot 项目的后续开发。可以为不同角色定制不同 deck：
- **后端工程师 deck**: Spring Boot + database-migration + API-testing skills
- **DevOps deck**: CI/CD + docker + monitoring skills
- **全栈 deck**: 上述全部 + frontend-build skills

所有 deck 共享同一个冷池（`~/.agents/skill-repos/`），但通过不同的 skill-deck.toml 声明不同的 working set。**curator 的推荐能力完全跨技术栈、跨角色**。

**curator 的价值不局限于 lythoskill 自身，它服务于任何需要 skill 治理的项目和团队**。

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
| **推荐结论** | `curator recommend` 的 tiered 推荐池 | 项目上下文 | ✅ 可共享（可写入 skill-deck.toml、ADR、项目 wiki） |
| **外部发现报告** | `curator discover` 的搜索结果摘要 | 探索过程 | ✅ 可共享（作为调研笔记） |

**原因**:
- curator 的 **index** 扫描的是**用户环境**，不是**项目代码**。原始扫描产出归属必须与环境对齐。
- 但 curator 的 **recommend / discover** 是**项目上下文驱动的**，其结论（「这个项目适合用哪些 skill」）完全可以、也应该被分享。
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
