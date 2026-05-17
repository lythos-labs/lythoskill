---
lane: main
checklist_completed: false
checklist_skipped_reason: "Design discussed: arena = N-run agent BDD with comparative judge; tasks pre-decomposed (extract runner, structured judge ADR+impl, deck migration, arena migration)"
---
# EPIC-20260504183618345: Unify Agent BDD & Arena: shared runner + structured Judge schema

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-04 | Created |
| done | 2026-05-04 | Done |

## 背景故事

**发现路径(用户原话)**: "我们发现 agent bdd 已经跑起来了,覆盖到 arena 发现 judge 同源,而且 md 解析脆弱。是否有更好的办法?分别制定 A/B 行为分别去跑,让 judge 比对 A/B 其实就是 arena 了,对不?"

### 三件已发生的事(事实陈述,可验证)

1. **Agent BDD 已运行**: deck 包有 5 个 `*.agent.md` scenario,产物落在 `runs/agent-bdd/<ts>/<scenario>/`,每次跑都生成 `_checkpoints/*.jsonl`(substrate)、`judge-verdict.json`(verdict)、`agent-stdout.txt` / `agent-stderr.txt`。这是 ADR-20260503180000000 第 4 条决策"Agent BDD tests remain on custom test-utils runner"的落地。

2. **Arena 涌现物已存在**: `playground/arena-bdd-research/` 是用户在 2026-05-04 13:10 用类似 BDD 形态做的真实 arena 跑。它已经包含:
   - `TASK-arena.md` ≅ `.agent.md`(Task / For Each Participant ≅ Given+When / Output Format ≅ Then / Judge Persona ≅ Judge)
   - `arena.json`(manifest:`task` / `mode` / `participants[]` / `criteria[]` / `status`)
   - `report.md`(comparative judge:Score Matrix + Per-Criterion Analysis + Pareto Frontier + Key Findings + Recommendations)
   - `runs/run-01.md`、`runs/run-02.md`(per-variant artifact)
   - `decks/arena-run-01.toml`、`decks/arena-run-02.toml`(per-variant deck = control variable)

3. **Judge 同源**: deck 里每个 scenario 跑出来的 `judge-verdict.json`(per-scenario PASS/FAIL + criteria[]) 与 arena report.md 里每一列(per-participant 多 criteria 评分) **共用同一个 judge primitive**。差别只是cardinality:Agent BDD = 1 participant(absolute verdict),arena = N participants(comparative verdict + Pareto)。

### 暴露的脆弱性

- **`parseAgentMd` 是 regex+frontmatter 拼凑**(deck/test/runner.ts:357),frontmatter 字段未校验,Given/When/Then 边界靠 `^## ` 正则,bullet 解析靠 `- ` 截断。改一个标点就静默漏字段。已踩过 "alias (localhost)" path-prefix 这类需要专门正则的边角。
- **judge 输出靠自然语言提示词**: `buildJudgePrompt`(deck/test/runner.ts:484)给 LLM 的是英文 instruction,期望它返回 JSON。回归过 "API Error" 之类非 JSON 噪声;`runLLMJudge` 拿到字符串后 best-effort 解析。**没有 schema 强约束,没有 retry-on-parse-fail,没有 function-calling 强类型化**。

### 涌现的统一观

> **Arena = Agent BDD × N variants + comparative judge**
>
> 同一个 runner、同一个 substrate(checkpoint JSONL)、同一个 judge primitive。两个调用模式:
> - **single + absolute**: 1 player × 1 deck × 1 prompt → 1 `judge-verdict.json`(PASS/FAIL)
> - **multi + comparative**: N players × M decks × K prompts → N×M×K `judge-verdict.json`(per-variant) + 1 `report.md`(Pareto)

### 为什么现在做

- arena 包目前是空壳 CLI(`packages/lythoskill-arena/src/cli.ts` 接受 `--task`/`--skills`/`--decks`/`--criteria`/`--control` 但缺 runner backbone),不动手就只能继续用 `playground/` 的 ad-hoc 脚本跑
- T10 已落地 `bdd-runner.ts`(test-utils),提取出 `runClaudeAgent` / `runCli` / `setupWorkdir` / `assertOutput`,但 **Agent BDD 编排层(parseAgentMd / buildJudgePrompt / runLLMJudge / runAgentScenario)还嵌在 deck/test/runner.ts**。T10 完成了一半的提取,继续走完才不浪费第一步
- 用户对 player concept 的指令(2026-05-04):"虽然 claude 就是你,不过我还是不会完全锁死的。所以以后肯定有 useAgent('claude') 这种风格"+ "工具包里准备各种 cli 的非交互调用 shell"→ **runner 必须 agent-pluggable,不能硬编码 `claude -p`**。这是 ADR-20260424120936541(player-deck 分离)在 runner 层的落地

## 需求树

### 主题 A: 抽离 Agent BDD 编排核心 → test-utils(T1) #backlog
- **触发**: parseAgentMd / buildJudgePrompt / runLLMJudge / runAgentScenario 嵌在 `packages/lythoskill-deck/test/runner.ts`,arena 想复用必须 import deck 的 test 子目录,违反包边界
- **需求**:
  - 将 4 个函数搬到 `packages/lythoskill-test-utils/src/agent-bdd.ts`(或拆分多文件)
  - 引入 **agent adapter** 抽象:`runAgent({ agent: useAgent('claude'), cwd, brief, ... })`,Claude 特定逻辑放 `agents/claude.ts`
  - 保留 setup callback 注入,deck 把 `setupAgentWorkdir`(写 skill-deck.toml + mock skill)作为 deck-specific 钩子传入
- **实现**: 见 TASK-20260504183628823(T1)
- **产出**: `packages/lythoskill-test-utils/src/agent-bdd.ts` + `agents/claude.ts` + 单元测试
- **验证**: deck 现有 5 个 `.agent.md` scenario 全部 26/26 回归通过,无文本 diff

### 主题 B: Structured Judge schema(Zod-first)+ ADR(T2) #backlog
- **触发**: `runLLMJudge` 解析自然语言/JSON 字符串,无 schema 强约束,曾出过 "API Error" 非 JSON 回归;`parseAgentMd` 的 frontmatter 字段无校验
- **需求**:
  - 用 **Zod runtime schema** 定义所有 I/O:`AgentScenario`、`Player`、`Deck`、`CheckpointEntry`、`JudgeCriterion`、`JudgeVerdict`、`ArenaManifest`、`ComparativeReport`、`Metrics`(budget DAG)
  - 锚定**已有产物的真实形状**(distill,不发明):
    - `judge-verdict.json` 当前形状 = `{ verdict, reason, criteria[], raw_output, error, timestamp }`(见 `runs/agent-bdd/20260504-172449/.../judge-verdict.json`)
    - `_checkpoints/*.jsonl` 当前形状 = `{ step, tool, args, final_state }`(见同路径)
    - `arena.json` 当前形状 = `{ id, created_at, task, mode, participants[], criteria[], status }`(见 `playground/arena-bdd-research/arena.json`)
    - `metrics.json` 草案 = `{ scenario, budget, dag[], total_duration_ms, retry_count }`(见 ADR-20260504172913972)
  - judge prompt → LLM 用 **function-calling / tool-use 模式**返回结构化结果(而非纯文本提示返回 JSON 字符串)
  - 写 ADR 记录:为何选 Zod、为何拒绝 JSON Schema 直接 import、为何拒绝 io-ts/typebox、为何 function-calling
- **实现**: 见 TASK-20260504183637828(T2)
- **产出**: `packages/lythoskill-test-utils/src/schema.ts`(zod definitions) + `cortex/adr/02-accepted/ADR-<ts>-structured-judge-schema-zod-first-with-function-calling.md`
- **验证**: 故意构造非 JSON 噪声 + 缺字段 + 类型错的 LLM 输出,schema 正确 reject;function-calling 模式下连续 5 次跑零解析错

### 主题 C: deck 迁移到统一 runner(单 + absolute 模式)(T3) #backlog
- **触发**: T1 提取后,deck 必须改用新 runner 才证明抽象成立;否则只是平移
- **需求**:
  - deck/test/runner.ts 改为 import `@lythos/test-utils/agent-bdd`
  - 保留 deck-specific 钩子:`setupAgentWorkdir`(写 skill-deck.toml + mock skill)、`buildDeckToml`、`createMockSkill`
  - 5 个 `.agent.md` scenario 0 改动通过
  - `bdd-runner.ts` 中已有的 `runCli` / `setupWorkdir` / `assertOutput`(CLI BDD 用)保持不动
- **实现**: 见 TASK-20260504183646317(T3)
- **产出**: 修改 `packages/lythoskill-deck/test/runner.ts`、删去已迁移的 4 个函数
- **验证**: `bun test packages/lythoskill-deck/src/*.test.ts` → 49 pass(unit);`bun test packages/lythoskill-deck/test/cli-bdd.test.ts` → 21 pass(CLI BDD);Agent BDD 5 个 scenario 全绿

### 主题 D: arena 迁移到统一 runner(多 + comparative + Pareto)(T4) #backlog
- **触发**: arena 包 CLI 已存在但缺 runner backbone;`playground/arena-bdd-research/` 的 ad-hoc 实现需要正式化
- **需求**:
  - arena CLI(`packages/lythoskill-arena/src/cli.ts`)调用统一 runner 的 multi-variant 模式
  - 支持 `--players A.toml,B.toml --decks X.toml,Y.toml --task ./task.md --criteria a,b,c --runs N`(参考 `cortex/wiki/01-patterns/2026-05-02-desc-preference-arena.md` 的 CLI 草案)
  - 每个 (player × deck × prompt) cell 跑独立 scenario,产出 `runs/<participant-id>/judge-verdict.json`
  - **comparative judge** 拿全部 N 个 per-variant verdict,生成 `report.md`(Score Matrix + Pareto Frontier + Key Findings + Recommendations)
  - 锚定 `playground/arena-bdd-research/report.md` 的输出形态作为 SSOT
- **实现**: 见 TASK-20260504183708932(T4)
- **产出**: `packages/lythoskill-arena/src/runner.ts`(thin orchestration)+ `comparative-judge.ts`
- **验证**: 重跑 `playground/arena-bdd-research/` 的 BDD-research 任务,产物 diff ≤ 文案差异,Pareto 结论一致

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260424120936541 | player-deck separation and deck boundary rationale | accepted(2026-04-24)— player ≠ deck;runner 必须支持矩阵 |
| ADR-20260424115621494 | virtual-evaluator-swarm adaptive concurrency | accepted(2026-04-24)— evaluator 读取 `player.toml` `concurrent` 字段,声明式协商 |
| ADR-20260503180000000 | unit-test framework selection | accepted(2026-05-03)— Agent BDD 留在 custom test-utils runner |
| ADR-20260504172913972 | Agent BDD budget governance | accepted(2026-05-04)— idle-timeout / total-timeout / retry / DAG metrics 是 first-class |
| ADR-<新> | structured judge schema(zod-first + function-calling) | 待写(本 epic 主题 B 产出) |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260504183628823 | backlog | T1: 抽离 runAgentScenario / parseAgentMd / Judge core → test-utils,引入 agent adapter |
| TASK-20260504183637828 | backlog | T2: Structured Judge schema(Zod-first)+ ADR |
| TASK-20260504183646317 | backlog | T3: deck 迁移到统一 runner(单 + absolute) |
| TASK-20260504183708932 | backlog | T4: arena 迁移到统一 runner(多 + comparative + Pareto) |

## 经验沉淀

(执行过程中填写)

## 归档条件
- [ ] T1 完成:`packages/lythoskill-test-utils/src/agent-bdd.ts` + `agents/claude.ts` + unit tests 全绿
- [ ] T2 完成:Zod schema 落地 + ADR 接受 + function-calling judge 跑通
- [ ] T3 完成:deck 5 个 `.agent.md` scenario 在新 runner 上 26/26 通过
- [ ] T4 完成:arena CLI 端到端跑 BDD-research 任务,Pareto 结论与 playground 一致
- [ ] 文档:wiki 加一条"Unified Agent BDD/Arena runner"模式记录,链接到本 epic
