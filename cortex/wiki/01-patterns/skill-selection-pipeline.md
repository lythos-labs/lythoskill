# Pattern: Skill Selection Pipeline

> 状态: 📝 Draft | 关联: lythoskill-curator, lythoskill-arena, project-cortex

## 完整工作流

给定一个项目需求，如何选择最合适的 skills？

```
项目需求: "我需要做 web scraping + 报告生成"
        │
        ▼
[Step 1: Curator Discovery]
  curator recommend --for "web scraping and report generation"
  输出: 5 个候选 skills（从本地冷池 + 可选外部搜索）
        │
        ▼
[Step 2: Arena Benchmark]
  arena --task "Scrape example.com and generate summary report"
          --skills "candidate-a,candidate-b,current-workflow"
  输出: 控制变量对比报告（token 效率、时间、输出质量、可靠性）
        │
        ▼
[Step 3: ADR Decision]
  cortex adr "Choose web-scraping skill stack for project X"
  输出: 记录 arena 数据、决策理由、reject 的备选及原因
        │
        ▼
[Step 4: Deck Integration]
  更新 skill-deck.toml，添加选中的 skills
  bunx @lythos/skill-deck link
```

## 各步骤职责

### Curator Discovery

**Scope**: 从"我能用哪些"缩小到"哪些值得试"

- 读取当前项目上下文（已有 skills、项目类型、代码结构）
- 搜索本地冷池（~/.agents/skill-repos/）
- **可选**: 外部搜索（skill hub、GitHub、registry）
- **关键**: 所有发现的 skill 都进冷池，不删除。Deck 只决定"这个项目激活哪些"
- 输出: N 个候选，每个附带 "为什么这个项目需要它"

### Arena Benchmark

**Scope**: 用数据消灭主观偏好

- 控制变量: 同一任务、同一 prompt、同一 judge persona
- 变量: 被测 skill（或 skill 组合）
- 指标: token 消耗、执行时间、输出质量评分、失败率
- 输出: 结构化对比报告，可直接引用到 ADR

### ADR Decision

**Scope**: 把选择变成可追溯的治理文档

- 问题陈述: "我们需要一个 web scraping skill"
- 候选列表: 从 curator + arena 来
- 决策: 选哪个，不选哪个
- 数据支撑: arena 报告的引用
- 后果: 如果未来发现更好的 skill，ADR 提供了升级路径

### Deck Integration

**Scope**: 把决策落地为 agent 可见的配置

- 更新 skill-deck.toml
- 同步 working set
- agent 下次启动时只看到选中的 skills

## 类比: YGOPRO 新卡发布 Test Play

| YGOPRO | lythoskill |
|---|---|
| 新卡发布（进卡池） | Skill 被发现/创建（进冷池） |
| Test play（测强度、combo 可行性） | Arena 跑分（测 token 效率、输出质量） |
| 决定是否进卡组 | Deck 选择（这个项目激活哪些 skill） |
| 卡始终在卡池，只是这局不用 | Skill 始终在冷池，只是这个项目不可见 |

**核心洞察**: 不删卡，只调卡组。冷池是完整的收藏，deck 是当下的选择。

## 为什么需要四步

| 如果只有... | 问题 |
|------------|------|
| Curator 推荐 | 不知道推荐的是否真的好 |
| Arena 跑分 | 不知道为什么要测这些 skill |
| ADR 记录 | 缺乏数据支撑，变成拍脑袋 |
| 直接写 toml | 没有决策过程，无法复盘 |

四步缺一不可：
- **Curator** 解决 "候选从哪来"
- **Arena** 解决 "哪个更好"
- **ADR** 解决 "为什么选"
- **Deck** 解决 "怎么落地"

## 未来: Web Search 集成

当前 curator 只扫描本地冷池。理想状态:

```bash
# 搜索技能 hub / GitHub / registry，找到备选
bunx @lythos/skill-curator discover --query "web scraping"
# → 3 个本地 + 2 个来自 GitHub 的新 skill

# 自动下载到冷池
bunx @lythos/skill-curator fetch <skill-url>

# 然后进入标准 pipeline: arena → adr → deck
```

**风险**: 外部 skill 的安全性审计（参见 `cortex/wiki/01-patterns/project-scope-and-ecosystem-paths.md`）

## 相关

- `lythoskill-curator` — 候选发现
- `lythoskill-arena` — 控制变量评测
- `project-cortex` — ADR 记录
- `lythoskill-deck` — 配置落地
