# ADR-20260424001747098: Skill Selection Pipeline 实战演练

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-23 | 实战演练：图表 PDF 报告技能选拔 |

## 背景

验证 Skill Selection Pipeline（curator → arena → ADR → deck）在真实场景中的运作方式。

**项目需求**: "生成一个包含数据图表的漂亮 PDF 报告"

**冷池现状**: `~/.agents/skill-repos/` 中有 47 个 skills，包括 `pdf`, `docx`, `image-generation`, `design-doc-mermaid`, `xlsx` 等可能与报告生成相关的技能。

## Step 1: Curator Discovery

### 1a — CLI 扫描（ curator 的职责 ）

```bash
bun packages/lythoskill-curator/src/cli.ts --recommend "generate beautiful charts and PDF reports" --verbose
```

**CLI 输出**:
```
🔴 Core:        design-doc-mermaid (28), repomix-handoff (28)
🟡 Force-mult:  project-scribe (10)
🟢 Optional:    image-generation (2), pdf (2), skill-arena (2)
```

### 1b — 算法评分的局限性（问题暴露）

| Skill | CLI 得分 | 为什么低 | 实际能力 |
|-------|---------|---------|---------|
| pdf | 2 | description 里没有 "beautiful", "chart", "report" | 完整的 PDF 生成工具链（Python + JS）|
| docx | 2 | description 里没有 "chart", "visualization" | 能生成 docx 含图表，可转 PDF |
| image-generation | 2 | description 讲 image generation，不讲图表 | 能生成数据可视化图片 |
| design-doc-mermaid | 28 | 有 "diagram" (+20) | **只能**生成 Mermaid 图表，不能出 PDF |
| repomix-handoff | 28 | 有 "package" (+20) | **完全无关**：代码打包 handoff |

**问题核心**: CLI 用关键词匹配评分，但 skill 的 description 是作者写的，不一定覆盖用户的查询意图。`pdf` skill 的 description 说 "Comprehensive PDF manipulation toolkit"，但算法无法推断 "manipulation" 包含 "generation"。

### 1c — Agent LLM 推理（正确的推荐方式）

Agent 读取 curator CLI 生成的 `REGISTRY.json`，结合项目需求做 LLM 推理：

> "用户要生成包含图表的 PDF 报告。分析冷池中的 skills:
> - **pdf**: 能创建新 PDF，支持 Python/JS 库，有图表集成能力 → **Core**
> - **docx**: 能创建含图表的 Word 文档，可导出 PDF，设计精美 → **Core**
> - **image-generation**: 能生成可视化图片，可嵌入 PDF → **Force Multiplier**
> - **design-doc-mermaid**: 能生成架构图/流程图，但**不能**直接出 PDF → **Optional（辅助）**
> - **xlsx**: 能生成 Excel 图表，但输出格式不匹配 → **不推荐**
> - **repomix-handoff**: 代码打包，完全无关 → **排除**

**Agent 产出推荐池**:
```
🔴 Core:         pdf, docx
🟡 Force-mult:   image-generation
🟢 Optional:     design-doc-mermaid
```

### 1d — 关键发现: curator CLI 的 `--recommend` 是误实现

当前 curator CLI 的 `--recommend` 用关键词算法做推荐，这与 curator 的设计意图矛盾：

- **设计意图**: curator CLI scan → 生成 REGISTRY.json → **agent 读 index 后 LLM 推理推荐**
- **实际实现**: curator CLI 自作主张加了 `--recommend`，用 keyword scoring 做推荐
- **后果**: 推荐质量差（如 repomix-handoff 被推到 Core），误导用户

**结论**: `--recommend` CLI flag 应该被移除或重构为仅输出原始 index 数据，不做 scoring。

## Step 2: Arena Benchmark（设计阶段）

当前 arena 尚未实现，但测试方案已设计：

**控制变量**:
- 同一任务: "生成一个 2 页的数据报告，包含 1 个柱状图和 1 个折线图，输出 PDF"
- 同一环境: 相同 Node.js/Python 版本
- 同一 judge: 用项目-cortex 的评分标准

**测试矩阵**:

| Deck | 变量 | 控制 |
|------|------|------|
| A | pdf skill | - |
| B | docx skill | - |
| C | pdf + image-generation | - |
| D | docx + image-generation | - |
| E | pdf + docx + image-generation | - |

**评测指标**:
- token 消耗（agent 执行报告生成任务的 prompt token 数）
- 执行时间
- 输出质量（图表清晰度、PDF 排版、信息密度）
- 失败率

## Step 3: ADR Decision

基于 curator 分析（Step 1）和 arena 数据（Step 2，待跑）:

**选择**: 采用 **docx + design-doc-mermaid** 组合

**原因**:
1. docx skill 的设计规范最完整：有颜色 palette、表格样式、图表规范、中英文排版支持
2. docx 可导出 PDF，且排版控制比直接 PDF 生成更灵活
3. design-doc-mermaid 作为辅助，生成架构图/流程图嵌入报告
4. pdf skill 虽然功能强大，但依赖 Python 库，环境 setup 成本高

**不选**:
- image-generation: 生成的是静态图片，不是数据图表，与需求不符
- xlsx: 输出格式是 Excel，不是 PDF
- repomix-handoff: 完全无关

## Step 4: Deck Integration

```toml
[deck]
max_cards = 10

[tool]
skills = ["docx", "design-doc-mermaid"]
```

执行 `bunx @lythos/skill-deck link` 同步 working set。

## 决策

**选择**: 移除 curator CLI 的 `--recommend` flag，回归设计意图

**原因**:
1. CLI 算法推荐质量不可靠（本次实战暴露了严重误判）
2. Agent 的 LLM 推理能正确理解 skill 能力，不受关键词局限
3. curator 的核心价值是 scan + index，不是推荐算法
4. `--recommend` 的存在让用户误以为 curator 是 "推荐工具"，实际上它是 "索引工具"

** curator CLI 的职责边界**:
| 职责 | curator CLI | Agent (LLM) |
|------|------------|-------------|
| 扫描冷池 | ✅ index | - |
| 提取 frontmatter | ✅ index | - |
| 生成 REGISTRY.json | ✅ index | - |
| 理解项目上下文 | - | ✅ recommend |
| 推理 skill 匹配度 | - | ✅ recommend |
| 产出 tiered 推荐池 | - | ✅ recommend |

## 影响
- 正面:
  - 澄清 curator 架构边界，避免未来功能蔓延
  - 实战验证了 Skill Selection Pipeline 的可行性
  - 为 arena 实现提供了具体测试场景
- 负面:
  - 需要移除/重构 curator CLI 的 `--recommend` 代码
  - curator SKILL.md 需要更新，明确 agent 推理的职责
- 后续:
  - 移除 curator CLI 的 `--recommend` 和 scoring 逻辑
  - 更新 curator SKILL.md：添加 "Agent 如何使用 REGISTRY.json 做 LLM 推理" 的指引
  - 实现 arena，用本次设计的测试矩阵跑真实 benchmark
  - 更新 skill-selection-pipeline.md wiki，加入本次实战案例

## 相关
- 关联 ADR: ADR-20260424000744041（curator 产出归属：个人扫描 vs 项目推荐）
- 关联 Epic: lythoskill-curator 架构澄清
- 关联文件: `skills/lythoskill-curator/SKILL.md`, `packages/lythoskill-curator/src/cli.ts`
