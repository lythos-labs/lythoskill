# ADR-20260424013849984: lythoskill as anti-corruption layer and meta-governance boundary

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-24 | Created: anti-corruption layer positioning, cold pool convention, deck boundary |
| accepted | 2026-04-24 | Approved by user |

## 背景

Agent skill 生态正在经历爆发式增长。2025-2026 年间，每天都有新的 skills 从 GitHub、Vercel marketplace、awesome-lists 涌入。一个典型的开发者冷池很快膨胀到 50+、100+ 甚至更多 skills。

这种增长带来了一个经典的"腐化"问题：
- **标准碎片化**：每个平台有自己的 skill 格式变体
- **选择困难**：同类 skill 描述互相竞争，agent 随机选择
- **静默冲突**：高主见 skills（如 gstack vs superpowers）同时可见时，指令互相矛盾但不报错
- **context 污染**：50+ 个 description 挤进 prompt，稀释有效信息
- **治理缺失**：没有工具帮助用户决定"哪些 skill 值得进入 working set"

lythoskill 的核心定位是 **在这些腐化力量面前建立一道隔离层**——不是重新定义标准，而是在已有标准之上提供治理基础设施。

## 决策驱动

### 1. 防腐层（Anti-Corruption Layer）

lythoskill **不定义** agent skills 标准。它不修改 SKILL.md 格式、不扩展 frontmatter schema、不发明新的 skill 类型。它只做一件事：**让已有的标准在规模增长后仍然可治理**。

| 层面 | 谁定义 | lythoskill 的角色 |
|------|--------|------------------|
| Skill 格式标准 | Agent 平台（Claude Code, Kimi CLI, etc.） | 遵守，不扩展 |
| Skill 内容 | Skill 作者 | 中立，不审查 |
| Skill 分发 | GitHub, Vercel, npm, etc. | 利用，不替代 |
| **Skill 治理** | **lythoskill** | **定义冷池、deck、arena 机制** |

### 2. 两层价值主张

lythoskill 服务两个不同的人群，他们的需求不同：

**Layer A: Deck 治理（面向所有 skill 用户）**
- 用户有 50+ skills，想要 agent 在同一时间只激活最合适的 8-10 个
- 不关心 skills 怎么创建、怎么发布
- 只需要 `skill-deck.toml` + `deck link` 两个概念

**Layer B: Thin Skill Pattern（面向协作/生产级 skill 生态开发者）**
- 团队要维护 20+ 内部 skills，需要版本控制、CI、测试
- 需要"开发时重资产，发布时轻资产"的分层模式
- 需要 creator scaffolding + build pipeline

这两个层可以独立使用。一个用户只用 deck 治理而不创建 skill，是完全合理的。

### 3. 冷池目录约定（Go module 式）

冷池需要一个**无歧义的目录结构**，否则：
- 同名 skill 从不同 repo 来会冲突
- 无法追溯 skill 来源
- 无法支持多 host（GitHub, GitLab, 自建 registry）

### 4. Deck 的职责边界

deck 如果内置 skill 下载功能，会隐式绑定分发渠道（如 Vercel skills.sh），并引入网络、认证、代理等复杂性。这和 Unix 哲学冲突。

## 选项

### 方案 A: lythoskill 做"万能平台"
lythoskill 包揽一切：skill 创建、skill 商店/下载、deck 治理、arena 评测、registry 托管。

**优点**:
- 一站式体验，用户不用离开生态
- 可以统一认证、计费、版本管理

**缺点**:
- 变成它要解决的问题：技能生态的"屎山"
- 绑定分发渠道（做商店就隐式排斥其他商店）
- 治理框架变重，失去 lean 优势
- 和现有平台（Vercel, GitHub, npm）直接竞争

### 方案 B: lythoskill 做防腐层 / meta-governance（推荐）
lythoskill 只解决"治理"问题，把其他事情委托给已有工具：
- 下载：git clone, Vercel skills.sh, npm install
- 分发：GitHub, Vercel marketplace, npm registry
- 标准：Agent 平台定义 SKILL.md 格式

**优点**:
- 不重复造轮子
- 不绑定分发渠道
- 保持核心 lean（零外部依赖）
- 和现有生态互补而非竞争

**缺点**:
- 用户需要组合多个工具（但这也是 Unix 哲学的代价）
- 没有统一的"一键安装全部"体验

### 冷池目录结构：扁平 vs Go module 式

| 维度 | 扁平结构（旧） | Go module 式（新） |
|------|--------------|-------------------|
| 同名冲突 | `web-search` 来自 3 个 repo 会覆盖 | `github.com/owner1/repo1/web-search` vs `github.com/owner2/repo2/web-search` 天然不冲突 |
| 来源追溯 | 看目录名猜不出来源 | 路径即来源：host/owner/repo |
| 多 host | 无概念 | GitHub/GitLab/自建 registry 自然分层 |
| 自动拉取 | `findSource` 返回 null → 报错 | 完全限定名可直接解析为 clone 地址 |
| 向后兼容 | — | 短名字 `"lythoskill-deck"` 仍通过 flat scan 工作 |

### Deck 是否内置 skill 下载

| 方案 | 优点 | 缺点 |
|------|------|------|
| **A: 内置下载** | 一键体验 | 绑定分发渠道、引入网络/认证复杂度、攻击面扩大 |
| **B: 不管下载**（推荐） | 符合 Unix 哲学、减少攻击面、不绑定渠道 | 用户需自行 git clone / npx skills add |

## 决策

**选择**: 方案 B（防腐层 / meta-governance）+ Go module 式冷池 + deck 不管下载

**具体决策项**：

1. **lythoskill 定位**：meta-governance only，不做应用工作流、不做 skill 商店、不做标准定义
2. **冷池目录约定**：`~/.agents/skill-repos/host.tld/owner/repo/skills/skill-name/`（monorepo）或 `~/.agents/skill-repos/host.tld/owner/repo/`（standalone）
3. **deck 职责边界**：toml 声明 + 冷池解析 + symlink 管理 + 约束检查。冷池填充是用户的事
4. **CATALOG.md 归属**： curator 扫描产出（REGISTRY.json, catalog.db, CATALOG.md）属于**用户环境**，不写项目仓库。推荐结论（agent LLM 推理产出）可写入项目 ADR/wiki
5. **两层价值主张**：README 和文档必须明确区分 deck 治理用户（Layer A）和 thin-skill 开发者（Layer B）

**原因**：

- 一个 skill 只有 1 个作者，但有 100+ 使用者。lythoskill 服务的是更大的使用者市场。
- 使用者管理 60+ skills 时必须有 governance，但作者写 skill 不需要。
- Go module 式冷池提供全局唯一性和来源追溯，是 skill 生态规模化的必要基础设施。
- deck 不做下载 = 不绑定 Vercel / GitHub / 任何平台。用户可以自由组合工具。
- CATALOG.md 在 repo 根目录会造成"lythoskill 生态 = 这 55 个 skill"的致命误解。

## 影响

### 正面
- lythoskill 的生态位清晰："治理基础设施提供商"，不是"skill 平台"
- 可以和任何 skill 来源共存：GitHub trending、Vercel marketplace、公司内部 registry
- 核心包保持零外部依赖，CI 快、发布快
- 鼓励外部 repo 围绕 thin-skill 规范生长，形成健康生态

### 负面
- 没有"一键安装全部"体验（但这是有意为之）
- 新用户需要理解 cold pool → deck → working set 三个概念（学习成本）

### 后续
- [ ] README 重写：明确两层价值主张
- [ ] 更新 `cortex/wiki/01-patterns/project-scope-and-ecosystem-paths.md`
- [ ] 删除/迁移 repo 根目录的 CATALOG.md（已完成）
- [ ] 更新所有引用 CATALOG.md 的文档
- [ ] deck SKILL.md 增加「前置条件：冷池填充」章节
- [ ] 宣发材料强调"测评"和"治理"，而非"创建 skills"

## 相关
- 关联 ADR: ADR-20260423130348396（deck 移植决策——依赖分层原则）
- 关联 ADR: ADR-20260424000744041（curator 产出归属——用户环境 vs 项目 artifact）
- 关联 ADR: ADR-20260423101938000（thin-skill 三层模式）
- 关联 Epic: EPIC-20260423102000000-lythoskill-bootstrap.md
- 关联文件: `cortex/wiki/01-patterns/project-scope-and-ecosystem-paths.md`
