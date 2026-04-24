---
name: lythoskill-curator
description: |
  扫描、索引 skill 冷池（cold pool）。只读，不修改任何 skill。
  提取 SKILL.md frontmatter 元数据，同时输出 REGISTRY.json（结构化 JSON）
  和 catalog.db（SQLite），方便 agent 按需消费。

  重要：Curator CLI 只做「扫描+索引」，不做推荐。推荐由 agent 读取
  注册表后，结合项目上下文通过 LLM 推理完成。

  触发词：
  - "Scan my skill pool"
  - "What skills do I have?"
  - "Index my skills"
  - "分析我的技能池"
  - "List all available skills"

cooperative_skills:
  - lythoskill-deck      # curator 输出可指导 deck 注册决策
  - lythoskill-arena     # 推荐的组合可用 arena 验证
  - lythoskill-project-cortex  # 输出可归档到 wiki/01-patterns/skill-synergies.md

deck_niche: meta.curation.deck-discovery
deck_managed_dirs:
  - ~/.agents/lythos/skill-curator/

type: standard
version: 0.2.0
---

# Skill Curator

**Read-only observer for skill cold pools. Scans, indexes, produces structured data.**

这个 skill 不修改、不安装、不激活任何 skill。它只观察、索引。把它看作你 skill 生态的图书管理员——负责把书架上的书登记成目录，但不替读者决定该读哪本。

## 职责分离

| 角色 | 职责 |
|------|------|
| **curator CLI** | 扫描冷池 → 提取 frontmatter → 输出 REGISTRY.json |
| **agent (LLM)** | 读 REGISTRY.json + 项目上下文 → 推理推荐 + 修改 skill-deck.toml |

为什么这样分？因为推荐需要项目上下文（技术栈、团队习惯、当前阶段），而 curator CLI 看不到这些。把推荐硬编码成关键词匹配算法（TF-IDF、domain boost、n-gram）只能得到表面相似度，无法识别因果链和协同模式。

LLM 推理能做到 curator 算法做不到的事：
> "project-cortex 产出结构化决策（ADR）。repomix-handoff 消费它们来创建上下文包。它们形成生产者-消费者对。"

## 快速开始

```bash
# 索引你的冷池（同时生成 REGISTRY.json + catalog.db）
bunx @lythos/skill-curator [POOL_PATH]

# 默认值：
#   POOL_PATH  = ~/.agents/skill-repos
#   输出目录    = ~/.agents/lythos/skill-curator/（与冷池同层级，避开 agent 扫描）
#   Registry   = ~/.agents/lythos/skill-curator/REGISTRY.json
#   Catalog DB = ~/.agents/lythos/skill-curator/catalog.db
```

然后 agent 读取注册表（JSON 或 SQLite），结合项目上下文做 LLM 推理推荐。

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
    "version": "0.2.0",
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

## Catalog DB 结构（SQLite）

除 JSON 外，curator 同时输出 `catalog.db`，方便 SQL 检索：

```sql
-- 主表：每个 skill 一条记录
SELECT name, type, version FROM skills;

-- 按 type 分组统计
SELECT type, COUNT(*) FROM skills GROUP BY type;

-- 关键词搜索（description / body_preview）
SELECT name FROM skills WHERE description LIKE '%diagram%';

-- 读取 JSON 数组字段（niches / managed_dirs / trigger_phrases）
SELECT name, json_extract(niches, '$[0]') as primary_niche FROM skills;

-- 元数据
SELECT value FROM catalog_meta WHERE key = 'generated_at';
```

**表结构：**

| 表 | 说明 |
|---|---|
| `skills` | 主表，name 为 PRIMARY KEY。数组字段（niches/managed_dirs/trigger_phrases）存为 JSON 字符串 |
| `catalog_meta` | 元数据：generated_at、total_skills、pool_path |
| `idx_skills_type` | type 列索引 |

Agent 选择消费格式：
- **REGISTRY.json**：适合整体读取、遍历、LLM prompt 注入
- **catalog.db**：适合条件查询、统计、按属性过滤

## Agent 推荐工作流

当用户说"推荐一个工作流牌组"或"What deck should I use for code review?"时：

1. **Agent 检查注册表是否存在**
   - 检查 `catalog.db` 或 `REGISTRY.json`
   - 如果不存在：提示用户先运行 `bunx @lythos/skill-curator`

2. **Agent 读取注册表**
   - 通过 SQLite 查询或 JSON 遍历了解冷池里有哪些 skills
   - 提取每个 skill 的 triggerPhrases、managedDirs、niches、description

3. **Agent 结合项目上下文做 LLM 推理**
   - 项目类型（web app、infra、开源维护、文档工程...）
   - 当前 deck 里已激活的 skills
   - 用户当前任务的具体需求

4. **Agent 输出 tiered 推荐池**
   ```
   🔴 Core — must-have:       project-cortex, repomix-handoff
   🟡 Force Multipliers:      report-generation-combo, epic-tree
   🟢 Optional:               dev-logging, project-scribe
   ```

5. **Agent 直接修改 skill-deck.toml**
   - 将推荐写入 deck 配置
   - 运行 `lythoskill-deck link` 激活

**为什么是池子而不是固定集合？**
- Agent 有 curator 不知道的任务特定细节
- 有些 skill 是"力量倍增器"（报告路由、树状可视化）而非核心执行器
- 池子让 agent 有机会发现 curator 未预料的协同

## 组合发现模式（Agent-side）

Agent 读取 REGISTRY.json 后可以识别的协同模式：

| Pattern | Example | Logic |
|---------|---------|-------|
| **Pipeline** | project-cortex → repomix-handoff → skill-arena | 生产者-消费者链 |
| **Modality Stack** | LLM + VLM + TTS + ASR | 互补 I/O 平面 |
| **Orchestrator-Engine** | report-generation-combo + docx/pptx/xlsx | 结构 + 渲染器 |
| **Temporal Sequence** | red-green-release + playwright + screenshot-handoff | CI/CD 阶段对齐 |
| **Triangulation** | directory-scanner + checkpoint-guardian + project-scribe | 多角度验证 |

这些不是 curator CLI 硬编码规则能穷尽的——agent 的 LLM 推理可以发现未预料的模式。

## 设计原则

1. **只读永久** — 从不写入被扫描的 skill
2. **Frontmatter 优先** — Body 只读预览，不解析
3. **确定性输出** — 相同池永远产生相同 REGISTRY.json
4. **分离职责** — CLI 只做数据，agent 做推理
5. **LLM-native** — 注册表为 LLM 消费结构化；推荐为 agent 选择
6. **零算法推荐** — curator CLI 不做评分、不做排序、不做推荐

## 未来增强

- [ ] `--watch` 模式：skill 变更时自动重新索引
- [ ] 注册表版本 diff 检测生态漂移
- [ ] 直接导出到 skill-deck.toml 格式（**注意**：导出的是结构化数据，不是推荐结论）
- [ ] 扫描 `~/.claude/skills/` 活跃池做"冷 vs 热"分析
- [ ] `superseded_by` 元数据传播防止选择已废弃 skill
