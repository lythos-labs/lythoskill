# TASK-20260504004954526: First *.agent.md scenario — skills-introspection (Agent BDD tracer bullet)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created — Theme D 集成 tracer bullet,依赖 T7 |

## 背景与目标

T7 落地 substrate(helper + schema)后,需要第一个 `*.agent.md` scenario 端到端验证三层模型联通(pattern + substrate + judge)。读型 scenario("agent 内省 deck 状态")是最小可行 tracer bullet:

- 不动 fs(零 mutation,降低 helper-bug 与 scenario-bug 的耦合)
- 仍走完 helper → checkpoint → judge 全链路
- 失败定位最容易(只测 helper 是否真能拉起 agent + agent 是否真会输出 checkpoint)

T9(写型 scenario:add/refresh/remove/prune)在本卡通过后再起,引入 fs mutation 验证。

依赖:**TASK-20260504004947351 (T7)** — 需 `runClaudeAgent` + `readCheckpoints` 已可用。

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 D / D4 | 范围、tracer bullet 定义 |
| 前置 task | `cortex/tasks/01-backlog/TASK-20260504004947351-...md` (T7) | 本卡依赖其交付的 helper + schema |
| Wiki/lessons | `cortex/wiki/03-lessons/2026-05-04-agent-verification-leetcode-shape-llm-judge.md` | 三层模型;checkpoint 字段语义("我做完了 / 位置在 / 你看") |
| 反例 ADR | `cortex/adr/03-rejected/ADR-20260503230522270-...md` | 不要 grep 字面量 stdout,不要进 `playground/` |
| 现存约定 | `packages/lythoskill-test-utils/SCENARIOS.md` "Agent BDD" 段 | `*.agent.md` 文件结构惯例 |
| Judge 范本 | `packages/lythoskill-arena/skill/references/agent-autonomous-arena.md` | "Judge = Agent, Agent = Judge" 模式 |
| Bootloader 原则 | `cortex/adr/02-accepted/ADR-20260503003315478-...md` | task = pointers + action |

## 需求详情

- [ ] **D4.a** scenario 文件落位 `packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md`
  - **注意**:目录 `test/scenarios/` 是 git tracked,**不是** `playground/`
  - 文件结构(参考 SCENARIOS.md):**Brief** 段(给 agent 的指令)+ **Expected** 段(给 judge 的标准)+ **Setup** 段(预置 fixture 描述)
- [ ] **D4.b** Brief(给 agent 看,LLM 直接读 G/W/T,无 Cucumber)
  - **Given**:cwd 含一个最小 `skill-deck.toml`(声明 2-3 个 skill)+ 对应 cold pool fixtures
  - **When**:agent 被要求"读 deck 状态,列出已声明 skill 名 + 各自源路径,落到 `_checkpoints/introspect.jsonl`"
  - **Then**:agent 不能修改 deck.toml,不能 link/unlink,只输出 checkpoint
- [ ] **D4.c** Expected(给 judge 看)
  - `_checkpoints/introspect.jsonl` 存在
  - JSONL 第一行 parse 后含 `step: "deck.introspect"` + `final_state.skills_declared` 数组,每元素含 `name` + `source_path`
  - 数组与 fixture deck.toml 完全对应(数量 + 名称 + 顺序无关)
  - **不**做字面量 stdout 断言(stdout 措辞 agent 自由)
- [ ] **D4.d** runner harness 接入
  - 在 `packages/lythoskill-deck/test/runner.ts` 或新增 `agent-bdd-runner.ts` 中加一个 `bun test` 入口,**显式标注 not-for-CI**
  - 用 T7 的 `runClaudeAgent({ cwd, brief })` + `readCheckpoints(cwd)` 跑
  - judge 调用方式见下(D4.e)
- [ ] **D4.e** LLM judge 实现
  - 选项 1(推荐):同样用 `runClaudeAgent` 拉一个 judge agent,brief 给 "verify these checkpoints against this expected"
  - 选项 2(回退):human review,test 只断 checkpoint 文件存在 + 字段非空(judge 推后)
  - 选 1 时,judge 必须能输出可解析的 verdict(`{verdict: "pass"|"fail", reason: string}`)
- [ ] **D4.f** SCENARIOS.md "Agent BDD — empty today" 段更新
  - 计数 0 → 1
  - 列出 `skills-introspection` 作首例

## 技术方案

- **文件位置全部 git tracked**:`packages/lythoskill-deck/test/scenarios/*.agent.md` + harness in `test/runner.ts`
- **Fixture 隔离**:用 T7 的 `setupWorkdir`(或同等)在 tmpdir 拷一份 fixture deck,**不**污染真 `~/.agents/skill-repos/`
- **Brief 写作准则**:
  - 自然语言,但**明确指令 agent 落 checkpoint** + **明确 checkpoint 路径**
  - 不规约 stdout 措辞(留语义自由度)
  - 规约 final_state 字段名(judge 才能机器对齐)
- **Judge 复算性**:两次跑 judge,verdict 应一致(否则 brief 太模糊,需收敛)
- **Tracer 严守**:本卡不引入 mutation 场景(留给 T9),不引入 multi-step checkpoint(留给 T9)

## 验收标准

- [ ] `packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md` 落地
- [ ] 本地 session 跑 harness 一次,checkpoint JSONL 产生,judge 给 pass
- [ ] 同一 brief 跑 2 次 judge,verdict 一致(可视为"可 replay")
- [ ] SCENARIOS.md "Agent BDD — empty today" 段计数从 0 → 1,例子被列
- [ ] **不进 CI**(`bun run test:all` 不应触发本 scenario)
- [ ] T7 的 helper 在本卡跑通后**未被改动**(若需要改 → 倒灌回 T7 重测)

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
  - `packages/lythoskill-test-utils/SCENARIOS.md`("Agent BDD — empty today" 段计数)
  - `packages/lythoskill-deck/test/runner.ts`(或新建 `agent-bdd-runner.ts` 兄弟模块)
- 新增:
  - `packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md`
  - `packages/lythoskill-deck/test/fixtures/introspection/skill-deck.toml`(及配套 cold pool fixture)

## Git 提交信息建议
```
feat(deck): add first Agent BDD scenario — skills-introspection (TASK-20260504004954526)

- Read-only tracer bullet exercising helper → checkpoint → judge end-to-end
- Brief lives in test/scenarios/skills-introspection.agent.md (LLM reads G/W/T)
- Judge implemented as second runClaudeAgent invocation, two-run replay verified
- SCENARIOS.md Agent BDD count 0 → 1

Closes: TASK-20260504004954526
```

## 备注

- **依赖**:T7 (`TASK-20260504004947351`) 必须先合入并跑通
- **不要**:跨入 mutation 测试领域(那是 T9)
- **不要**:把 brief 写成 spec 长篇——agent 越短越好,用 SKILL.md 已声明的能力做事
- 失败诊断顺序:helper 拉不起 agent? → 检查 T7;agent 拉得起但不写 checkpoint? → brief 不够明确;checkpoint 格式不一致? → schema 模糊回 T7;judge 一致性差? → expected 标准不够具体
