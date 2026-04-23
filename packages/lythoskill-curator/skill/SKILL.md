---
name: lythoskill-curator
description: |
  扫描、索引和推理 skill 冷池（cold pool）。只读，不修改任何 skill。
  提取 SKILL.md frontmatter 元数据，构建注册表，按查询评分，发现 skill 组合模式。

  触发词：
  - "Scan my skill pool"
  - "What deck should I use for code review?"
  - "Suggest skill combos for this task"
  - "分析我的技能池"
  - "这些技能怎么组合"
  - "推荐一个工作流牌组"
  - "Find synergies between my skills"

cooperative_skills:
  - lythoskill-deck      # curator 推荐可指导 deck 注册决策
  - lythoskill-arena     # 推荐的组合可用 arena 验证
  - lythoskill-project-cortex  # 输出可归档到 wiki/01-patterns/skill-synergies.md

deck_niche: meta.curation.deck-discovery
deck_managed_dirs:
  - .cortex/skill-curator/

type: standard
version: 0.3.2
---

# Skill Curator

**Read-only observer for skill cold pools. Discover combos. Recommend decks.**

这个 skill 不修改、不安装、不激活任何 skill。它只观察、索引和推理。把它看作你 skill 生态的图书管理员。

## 功能

1. **扫描** skill 仓库目录（冷池）
2. **提取** 每个 `SKILL.md` 的 frontmatter 元数据
3. **构建** 索引：按 type、niche、managed directory 分类
4. **输出** `REGISTRY.json` 供程序化消费
5. **推理** 协同关系（LLM-powered combo discovery）

## 为什么不用传统算法

传统文本分析（TF-IDF、聚类）只能找到表面相似度："这两个描述共享 73% 的词汇"。

LLM 推理能找到**因果链**：
> "project-cortex 产出结构化决策（ADR）。repomix-handoff 消费它们来创建上下文包。它们形成生产者-消费者对。"

## 快速开始

```bash
# 索引你的冷池
bunx @lythos/skill-curator [POOL_PATH]

# 为某个任务获取排序推荐
bunx @lythos/skill-curator [POOL_PATH] --recommend "Plan a feature with ADR, epic, and diagram"

# 详细审计模式：每条评分决策的完整追踪
bunx @lythos/skill-curator [POOL_PATH] --recommend "..." --verbose

# 默认值：
#   POOL_PATH = ~/.agents/skill-repos
#   Registry  = POOL_PATH/.cortex/skill-curator/REGISTRY.json
#   Recommend = POOL_PATH/.cortex/skill-curator/RECOMMENDATIONS.json
```

### 推荐输出

`--recommend` 产出分层候选池（5-10 个 skill）：

```
🔴 Tier 1 — Core (must-have):     project-cortex, repomix-handoff, design-doc-mermaid
🟡 Tier 2 — Force Multipliers:    report-generation-combo, epic-tree
🟢 Tier 3 — Optional:             dev-logging, project-scribe
```

**为什么是池子而不是固定集合？**
- Agent 有 curator 不知道的任务特定细节
- 有些 skill 是"力量倍增器"（报告路由、树状可视化）而非核心执行器
- 池子让 agent 有机会发现 curator 未预料的协同

## 注册表结构

```json
{
  "generatedAt": "ISO timestamp",
  "poolPath": "/path/to/cold-pool",
  "totalSkills": 42,
  "skills": [{
    "name": "repomix-handoff",
    "description": "...",
    "type": "standard",
    "version": "0.4.0",
    "path": "...",
    "managedDirs": ["tmp/handoff-*/"],
    "niches": ["meta.tooling.repomix"],
    "triggerPhrases": ["Package my project"],
    "hasScripts": true,
    "hasExamples": true,
    "bodyPreview": "first 500 chars..."
  }],
  "index": {
    "byType": { "standard": [...], "flow": [...] },
    "byNiche": { "meta.tooling.repomix": [...] },
    "byManagedDir": { "cortex/": ["project-cortex", "..."] }
  }
}
```

## 组合发现模式

Curator 识别几种协同模式：

| Pattern | Example | Logic |
|---------|---------|-------|
| **Pipeline** | project-cortex → repomix-handoff → skill-arena | 生产者-消费者链 |
| **Modality Stack** | LLM + VLM + TTS + ASR | 互补 I/O 平面 |
| **Orchestrator-Engine** | report-generation-combo + docx/pptx/xlsx | 结构 + 渲染器 |
| **Temporal Sequence** | red-green-release + playwright + screenshot-handoff | CI/CD 阶段对齐 |
| **Triangulation** | directory-scanner + checkpoint-guardian + project-scribe | 多角度验证 |

## 设计原则

1. **只读永久** — 从不写入被扫描的 skill
2. **Frontmatter 优先** — Body 只读预览，不解析
3. **确定性输出** — 相同池 + 相同查询永远产生相同推荐
4. **分层推荐** — Core / Force Multiplier / Optional，非固定集合
5. **LLM-native** — 注册表为 LLM 消费结构化；推荐为 agent 选择
6. **Domain-aware scoring** — 硬编码领域提升 + 短语匹配 + 负向过滤

## 未来增强

- [ ] `--watch` 模式：skill 变更时自动重新索引
- [ ] 注册表版本 diff 检测生态漂移
- [ ] 直接导出到 skill-deck.toml 格式
- [ ] 扫描 `~/.claude/skills/` 活跃池做"冷 vs 热"分析
- [ ] `superseded_by` 元数据传播防止选择已废弃 skill
