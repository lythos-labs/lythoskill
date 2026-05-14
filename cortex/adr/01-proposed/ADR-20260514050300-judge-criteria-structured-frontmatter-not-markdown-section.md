# ADR-20260514050300: Separate task and judge criteria — split test paper from scoring rubric

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-14 | Created |

## 背景

**核心问题：考卷和评分标准混在一个文件里。更深一层：arena 根本不需要 BDD 三段格式。**

### 原始设计意图（偏离的部分）

**arena 的 task card 模式**: 原本应该是 arena 传一个引用（cortex task ID / 文件路径）给 subagent，subagent 自己去读 task 文件。这样 context 友好——不需要把整个 task 内容塞进 prompt。和 cortex task card 模式一致：传 ID，不传全文。

**实际 vs 意图**:
- 意图: `arena → subagent: "看 TASK-xxx"` (一个引用，省 context)
- 实际: `arena → subagent: stdin 塞进完整 brief + Judge + JSON schema` (context 膨胀)

### 技术债形成过程（三次混淆叠加）

**第一次混淆：arena 任务 ≠ BDD test scenario。task card 模式被架空。**

arena `--brief "写一个 HTML"` 就是个 prompt——本可以通过 task card 引用传给 subagent。但 arena 复用了 BDD 测试的基础设施（`parseAgentMd`），硬生生把 prompt 转成临时 `.agent.md`，塞进 Given/When/Then/Judge 四段式。task card 模式完全被绕过。

**第二次混淆：用户说 "useAgent 不需要完整 agent"，被理解成 "arena 需要 BDD 格式"。**

用户说的是 judge 没必要 spawn 一个独立 agent CLI——直接调 LLM API 就够了。讨论转向了 "parseAgentMd 正则解析 Judge section 脆弱"，引入了 AgentScenario 对象来解决结构问题。但根本没改：task 和 judge 仍然在同一个对象里，复用同一个 AgentScenario。

**第三次混淆：AgentScenario 把 prompt + criteria 捆绑了。**

`AgentScenario { when, judge }` 里的 `judge` 字段让 task 定义和评分标准永远耦合在一起。arena 的所有消费者（single, vs, runner）被迫同时处理 task 和 judge。

### 本质

- **task = prompt**，不需要 Given/When/Then，不需要 .agent.md，直接传给 agent 即可
- **criteria = 结构化数据**，应该在 arena.toml 或 .judge.toml 中定义
- **judge = 可能不需要 agent**，直接 LLM API 调用比 spawn 完整 CLI 更可控

**根本原因：arena 执行层的 `useAgent` 传参偷懒 + BDD 基础设施复用，把三个独立概念（task prompt, judge criteria, agent spawn）强制捆进一个 AgentScenario 格式。**

## 决策驱动

1. **考卷和评分标准是两回事**。Task agent 需要 Given/When/Then（考卷），Judge agent 需要 criteria + evidence（评分标准 + 证据）。两者不应共享任何 prompt 内容。
2. **Task agent 和 Judge agent 应该是不同的 agent**，甚至可以不同 player（task=kimi, judge=claude）。
3. **Criteria 应该在结构化文件中定义**（arena.toml / .judge.toml / JSON），不应该混在 .agent.md 的 markdown 里让正则提取。

## 选项

### 方案 A: 保持现状（.agent.md 含 `## Judge`） — Rejected

单个文件包含所有内容，正则提取 `## Judge`。

- **优点**: 零工作量
- **缺点**: 考卷和评分标准混淆，judge 被 task content 带偏，正则解析脆弱

### 方案 B: frontmatter 结构化 criteria — Rejected

criteria 放在 .agent.md 的 YAML frontmatter，仍然是同一个文件。

- **优点**: 机器可读（不再正则解析 markdown），最小改动
- **缺点**: 仍然是同一个文件，task 和 judge 共享数据源，judge prompt 仍可能被污染

### 方案 C: 完全分离 — Selected

**Task 和 criteria 是独立文件/数据源**。

```
# arena single: task 和 criteria 是独立的输入
lythoskill-arena single \
  --task ./task.agent.md          # 考卷（Given/When/Then）
  --criteria ./criteria.judge.toml # 评分标准

# arena vs: task 和 criteria 在 arena.toml 中独立声明
[arena]
task = "./task.agent.md"
criteria = "./criteria.judge.toml"  # 或 inline criteria 数组
```

`.agent.md` **只管 Given/When/Then**，不再有 `## Judge`：

```markdown
---
name: agent-skills-intro
description: ...
timeout: 300000
---

## Given
- Working directory with an empty project
- bun is available

## When
[task description — 纯任务描述]

## Then
- Complete the task above
- Save output to [specified path]
```

`criteria.judge.toml` **只管评分标准**：

```toml
[judge]
player = "claude"  # 不同 player 独立评分
timeout = 60000

[[judge.criteria]]
id = "concrete_analogy"
label = "Concrete analogy beyond 'plugin'"
weight = 1

[[judge.criteria]]
id = "skill_cases"
label = "3-5 real open-source skill cases with what/who/scenarios"
weight = 1
```

### Judge agent 的工作空间

Judge agent 需要根据 arena ID 定位产物。Arena 产物的标准化目录结构：

```
runs/<arena-id>/
├── arena.json              # manifest: participants, criteria, timestamps
├── report.md               # 最终报告
├── runs/
│   ├── <side-1>/
│   │   └── run-1/
│   │       ├── agent-stdout.txt
│   │       ├── agent-stderr.txt
│   │       ├── *.html / *.md / ...   # agent 创建的文件
│   │       └── judge-verdict.json
│   └── <side-2>/
│       └── run-1/
│           └── ...
└── work/                    # agent 原始工作空间（可选）
```

Judge agent 的工作目录就是 `runs/<arena-id>/`。进入后：
- 读 `arena.json` → 知道有哪些 side、criteria 是什么
- 遍历 `runs/<side>/run-N/` → 每个 side 的产物
- 读 agent-stdout.txt → agent 的摘要
- 检查文件（HTML, markdown, etc.）→ 判断是否满足 criteria

### Judge 必须知道什么（第一性原理推演）

Judge 给出确实的分数，必须知道：

1. **Task goal + constraints** — 没有 task 锚点，criteria 只是空洞标签。"concrete_analogy" 对什么任务而言？面向什么受众？什么品味标准？
2. **Criteria + weights** — 结构化的、可验证的评分标准
3. **Evidence** — agent 的产物（文件 + stdout + stderr）
4. **Rubric / taste** — 什么样的类比算 "concrete"？什么样的表格算 "清晰"？

**需要区分的两件事**:
- **Task context**（目标 + 约束 + 品味）— judge 需要，但不应该让 judge 觉得自己要执行 task
- **Task invocation**（指令性内容："你来写"、"完成以下任务"）— judge 不需要，这会让 judge 被带偏

类比：老师改卷需要看到**试卷题目**和**参考答案/评分 rubric**，不需要看到试卷上的"请在答题卡上作答，限时 60 分钟"。

**当前 judge 需要的是 task context，不是 task instructions**。

### Task/judge 分离的完整流程

```
1. arena 启动 task agent (kimi)
   → task agent 在 workdir 中工作
   → 产出文件 + stdout + stderr

2. arena 收集产物到 runs/<arena-id>/runs/<side>/run-1/
   → agent-stdout.txt, agent-stderr.txt, 所有产物文件

3. arena 启动 judge agent (claude) — 独立 session
   → CWD = runs/<arena-id>/
   → criteria 来自 arena.toml（结构化）
   → evidence 在 runs/<side>/run-1/ 下
   → judge 不接触 task instructions

4. judge 写 judge-verdict.json 到每个 run-1/
   → arena 汇总 → report.md
```

- **优点**: 彻底分离考卷和评分标准；judge 不再被 task content 污染；task/judge 可以用不同 player
- **缺点**: 多一个文件；需要修改 arena CLI 参数

### 方案 D: arena.toml inline criteria — 简写版

对于简单场景，arena.toml 的 `criteria` 字段已经是数组了：

```toml
[arena]
task = "./task.agent.md"
criteria = ["concrete_analogy", "skill_cases", "comparison_table"]
```

不需要新文件。arena 内部从 `criteria: string[]` 构建 judge prompt，不依赖 `## Judge`。

- **优点**: vs 模式零新文件
- **缺点**: `string[]` 没有 label/weight，judge LLM 只能靠名字猜测含义

## 决策

**选择**: 方案 C（完整分离）作为目标，方案 D（arena.toml inline）作为过渡。

**Judge 必须是 agent**：Judge 需要看到 task agent 的工作成果和工作空间——文件、stdout/stderr、checkpoints。纯 LLM API 调用只能处理文本，不能读文件系统。Judge agent 只应收到 criteria + evidence（产物），**不收到 task instructions**。

**实施优先级**:
1. **Phase 1**: vs 模式直接使用 arena.toml 的 `criteria` 字段构建 judge prompt，忽略 `.agent.md` 的 `## Judge` section
2. **Phase 2**: single 模式加 `--criteria` 参数（或从 deck 的 frontmatter 提取 criteria）
3. **Phase 3**: 移除 parseAgentMd 中的 `## Judge` 正则解析
4. **Phase 4**: 支持 `criteria.judge.toml` 外部文件 + 独立 judge player

## 影响

### 正面

- Judge agent 不再收到 task instructions，不被打偏
- Task/judge 可以是不同 player（kimi 执行、claude 评分）
- `.agent.md` 回归纯 BDD 任务描述，不再夹带评分标准
- Criteria 结构化后，judge prompt 可精确构建

### 负面

- 需要修改 arena CLI 参数（single 模式加 `--criteria`）
- 需要修改 parseAgentMd（移除 `## Judge` 解析）
- 向后兼容需要考虑（已有 .agent.md 的 `## Judge` 如何处理）

### 命名混淆

**"Agent BDD md" 这个说法本身没错**——问题在于后缀被写成了 `.agent.md`，而不是 `.bdd.md`。又是执行层惯性——parseAgentMd 把文件后缀定死了，然后所有 arena task 文件都跟着叫 `.agent.md`，和 `AGENTS.md`（agent 操作手册）撞车。

修正: `.agent.md` → `.bdd.md`（或 `.scenario.md`），和 `AGENTS.md` 彻底区分。

## 相关

- 关联 ADR: ADR-20260507014124191 (agent-friendly CLI error) — 相同的"结构化数据优于文本"原则
- 关联文件: `packages/lythoskill-test-utils/src/agent-bdd.ts` (parseAgentMd), `packages/lythoskill-test-utils/src/judge.ts` (buildJudgePrompt), `packages/lythoskill-arena/src/runner.ts` (runArenaFromToml)
