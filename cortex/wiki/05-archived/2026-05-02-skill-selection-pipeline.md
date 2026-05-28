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

Curator 不是简单的关键词过滤。它用 **LLM 推理** 找因果链：

> "project-cortex 产出结构化决策（ADR）。repomix-handoff 消费它们来创建上下文包。它们形成**生产者-消费者对**。"

传统算法只能找到"这两个描述共享 73% 词汇"。Curator 找到的是**为什么它们应该一起用**。

**输出**: 分层推荐池（5-10 个 skill），不是固定集合：

```
🔴 Tier 1 — Core (must-have):        project-cortex, repomix-handoff
🟡 Tier 2 — Force Multipliers:       report-generation-combo, epic-tree
🟢 Tier 3 — Optional:                dev-logging, project-scribe
```

为什么是池子？Agent 有 curator 不知道的任务细节。Tier 2/3 让 agent 有机会发现 curator 未预料的协同。

**识别的协同模式**：

| Pattern | 例子 | 逻辑 |
|---------|------|------|
| **Pipeline** | cortex → repomix-handoff → arena | 生产者-消费者链 |
| **Modality Stack** | LLM + VLM + TTS + ASR | 互补 I/O 平面 |
| **Orchestrator-Engine** | report-generation-combo + docx/pptx | 结构 + 渲染器 |
| **Temporal Sequence** | red-green-release + playwright | CI/CD 阶段对齐 |
| **Triangulation** | directory-scanner + scribe | 多角度验证 |

**只读原则**: Curator 从不写入被扫描的 skill。它是图书管理员，不是装修队。

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

**Deck 的实现: deny-by-default + symlink**

Deck link 并不移动或删除 skill 文件。它只控制** agent 能看到的目录**:

```
冷池 (~/.agents/skill-repos/)          deck 声明          工作集 (.claude/skills/)
  ├── web-search/                        [tool]              ├── web-search -> ../cold-pool/web-search
  ├── docx/                              skills = [          ├── docx -> ../cold-pool/docx
  ├── design-doc-mermaid/                  "docx"          └── (空)
  └── pdf/                               ]                     ↑
                                            pdf 不在声明中 = 不存在于工作集 = agent 看不到
```

**为什么不是"选出最好的"而是"分层推荐池"?**
- Curator 推荐的是**候选池**，不是最终答案
- Agent（或人类）根据任务细节从池子里做最终选择
- 被 reject 的 skill 仍留在冷池，未来项目可能用得上
- 这避免了"因为当前项目不用就删掉"的短视行为

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
