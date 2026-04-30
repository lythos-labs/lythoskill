# Scenario: 从需求到 Deck — 生成图表 PDF 报告

> 类型: 实战案例 | 关联: [skill-selection-pipeline](../01-patterns/skill-selection-pipeline.md), lythoskill-curator, lythoskill-arena
>
> 适用场景: 报告生成、数据可视化、调研流程、金融分析、科学论文排版

---

## 场景设定

**你的需求**: "生成一个包含数据图表的漂亮 PDF 报告"

**你的冷池**: `~/.agents/skill-repos/` 里有 47 个 skills。其中与"报告生成"相关的包括：

| Skill | 类型 | 关键能力 |
|-------|------|---------|
| `pdf` | 标准 | Python/JS PDF 生成工具链，支持嵌入图表 |
| `docx` | 标准 | Word 文档生成，含颜色 palette、表格样式、图表规范、中英文排版 |
| `image-generation` | 标准 | 静态图片生成，可嵌入其他文档 |
| `design-doc-mermaid` | 标准 | Mermaid 架构图/流程图生成 |
| `xlsx` | 标准 | Excel 生成，含数据图表，但输出格式为 `.xlsx` |
| `repomix-handoff` | 标准 | 代码打包（与报告生成无关，干扰项） |

**重要前提**: 以下决策是**基于这个特定冷池**做出的。如果你的冷池里没有 `docx` skill，或者有 `latex-pdf` skill 但没有 `pdf` skill，推理结果会完全不同。

**问题**: 外面技能那么多，该选哪几个？

---

## Step 1: Curator Discovery（扫描，不推荐）

### 1a — 运行扫描

```bash
lythoskill-curator ~/.agents/skill-repos
# 输出: REGISTRY.json + catalog.db
```

Curator 只负责**扫描和索引**。它不会告诉你"该用哪个"——因为它不知道你的项目上下文。

### 1b — Agent LLM 推理（这才是推荐发生的地方）

Agent 读取 `REGISTRY.json`，结合你的具体需求做推理：

> "用户要生成包含图表的 PDF 报告。分析冷池中的 skills:
> - **pdf**: 能创建新 PDF，支持 Python/JS 库，有图表集成能力
> - **docx**: 能创建含图表的 Word 文档，可导出 PDF，设计精美
> - **image-generation**: 能生成可视化图片，可嵌入 PDF
> - **design-doc-mermaid**: 能生成架构图/流程图，但不能直接出 PDF
> - **xlsx**: 能生成 Excel 图表，但输出格式不匹配
> - **repomix-handoff**: 代码打包，完全无关"

**产出推荐池**:
```
🔴 Core:         pdf, docx
🟡 Force-mult:   image-generation
🟢 Optional:     design-doc-mermaid
```

### 1c — 为什么不能用关键词匹配做推荐？

假设有个 CLI 工具用关键词评分：

| Skill | 关键词得分 | 为什么低 | 实际能力 |
|-------|-----------|---------|---------|
| pdf | 2 | description 里没有 "beautiful", "chart" | 完整的 PDF 生成工具链 |
| docx | 2 | description 里没有 "chart", "visualization" | 能生成含图表的 docx，可转 PDF |
| design-doc-mermaid | 28 | 有 "diagram" (+20) | **只能**生成 Mermaid 图，不能出 PDF |
| repomix-handoff | 28 | 有 "package" (+20) | **完全无关**：代码打包 |

**结论**: 关键词匹配会被 description 的写法误导。LLM 推理能理解 skill 的真实能力边界，不受词汇覆盖局限。

---

## Step 2: Arena Benchmark（用数据消灭主观偏好）

设计控制变量实验：

**任务**: "生成一个 2 页的数据报告，包含 1 个柱状图和 1 个折线图，输出 PDF"

**测试矩阵**:

| Deck | 技能组合 |
|------|---------|
| A | pdf |
| B | docx |
| C | pdf + image-generation |
| D | docx + image-generation |
| E | pdf + docx + image-generation |

**评测指标**:
- token 消耗
- 执行时间
- 输出质量（图表清晰度、PDF 排版、信息密度）
- 失败率

---

## Step 3: ADR Decision（把选择变成可追溯的决策）

基于 curator 分析和 arena 数据，写 ADR：

**选择**: docx + design-doc-mermaid

**原因**:
1. docx skill 的设计规范最完整：颜色 palette、表格样式、图表规范、中英文排版
2. docx 可导出 PDF，且排版控制比直接 PDF 生成更灵活
3. design-doc-mermaid 作为辅助，生成架构图/流程图嵌入报告

**不选**:
- image-generation: 生成静态图片，不是数据图表
- xlsx: 输出格式是 Excel，不是 PDF

**注意**: 这个决策的前提是冷池里有这些 skills。如果你的冷池里没有 `docx` 但有 `latex-pdf`，ADR 的结论可能是 `latex-pdf + design-doc-mermaid`。Curator 产出的是**推理过程**，不是**标准答案**。

---

## Step 4: Deck Integration（落地）

```toml
[deck]
max_cards = 10

[tool]
skills = [
  "github.com/anthropics/skills/skills/docx",
  "github.com/SpillwaveSolutions/design-doc-mermaid",
]
```

```bash
bunx @lythos/skill-deck link
```

---

## 适配其他领域

这个 pipeline 的"PDF 报告"可以替换为任何具体任务：

| 领域 | 需求 | 可能激活的技能 |
|------|------|---------------|
| 金融调研 | "生成季度财报分析 PDF" | pdf, xlsx, web-search, data-viz |
| 科学研究 | "整理实验数据为论文图表" | docx, image-generation, design-doc-mermaid |
| 产品文档 | "输出 API 文档 + 架构图" | docx, design-doc-mermaid, web-search |
| 运营周报 | "自动抓取数据生成周报" | web-scraping, xlsx, project-scribe |

**不变的是 pipeline**: curator 扫描 → agent 推理 → arena 验证 → ADR 决策 → deck 落地。

---

## 复盘：这个案例教会我们什么

1. **Curator 是索引工具，不是推荐工具**。推荐发生在 agent 侧，因为推荐需要项目上下文。
2. **LLM 推理 > 关键词匹配**。理解 skill 的能力边界需要语义推理，不是 TF-IDF。
3. **Arena 数据让 ADR 有说服力**。"我测了 5 个组合，docx 在排版指标上得分最高"比"我觉得 docx 更好"可信得多。
4. **Deck 的 deny-by-default 保护了你**。即使冷池有 47 个技能，agent 只能看到 deck 里声明的 2 个，避免 silent blend。

---

## 相关

- [Pattern: Skill Selection Pipeline](../01-patterns/skill-selection-pipeline.md) — 抽象 pipeline 说明
- `lythoskill-curator` — 冷池扫描与索引
- `lythoskill-arena` — 控制变量评测
- `lythoskill-deck` — Deck 配置与同步
