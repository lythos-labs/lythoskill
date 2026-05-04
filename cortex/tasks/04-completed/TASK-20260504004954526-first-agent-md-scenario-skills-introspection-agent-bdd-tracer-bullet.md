# TASK-20260504004954526: First *.agent.md scenario — skills-introspection (Agent BDD tracer bullet)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created — Theme D tracer bullet, T9 解锁起点 |
| completed | 2026-05-04 | Closed via trailer |

## 背景与目标

T7(`TASK-20260504004947351`)已实现 `runClaudeAgent` helper + checkpoint JSONL schema。本卡是 **Theme D(Agent BDD)** 的 tracer bullet：验证"agent 读 SKILL.md → 执行 CLI → 产生正确副作用 + checkpoint"这一完整链路 **端到端可跑通**。

具体场景：给 agent 一个空项目，让它读 `@lythos/skill-deck` 的 SKILL.md，然后执行一次 `deck add` + `deck link`。验证 deck.toml 被正确修改、symlink 创建、agent 留下了可解析的 checkpoint JSONL。

本卡是 T9（4 个完整 scenario）的**前置依赖**——T8 证明 helper + checkpoint + LLM judge 三者能协同工作后，T9 才能批量扩场景。

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 D | 范围、三层模型、LLM judge 原则 |
| 前序任务 | `cortex/tasks/02-in-progress/TASK-20260504004947351-...md`(T7) | `runClaudeAgent` helper + checkpoint schema |
| 后续任务 | `cortex/tasks/01-backlog/TASK-20260504005000534-...md`(T9) | 4 个完整 Agent BDD scenario |
| 反例 ADR | `cortex/adr/03-rejected/ADR-20260503230522270-...md` | 不要 bash judge、不要 playground/、不要写脚本判官 |
| Wiki/lessons | `cortex/wiki/03-lessons/2026-05-04-agent-verification-leetcode-shape-llm-judge.md` | 三层模型 + checkpoint 字段来源 |
| 现存约定 | `packages/lythoskill-test-utils/SCENARIOS.md` "Agent BDD — empty today" 段 | 格式约定: `*.agent.md`，LLM 读 G/W/T，不进 CI |
| 范本 | `packages/lythoskill-arena/skill/references/agent-autonomous-arena.md` | "Judge = Agent, Agent = Judge" |
| /tdd 准则 | `.claude/skills/tdd/SKILL.md` | tracer bullet first; no speculative tests |

## 需求详情(每条 = 1 vertical slice, RED→GREEN 单独走完)

- [ ] **D2.a** 编写第一个 `*.agent.md` scenario 文件
  - 位置: `packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md`
  - 格式: Markdown，frontmatter(`name` / `description`) + `Given` / `When` / `Then`
  - Given: 空项目目录（无 deck.toml、无 .claude/skills、无 cold pool）
  - When: agent 被赋予 brief —— "你有一个空项目，请阅读 `@lythos/skill-deck` 的 SKILL.md，然后声明 `tdd` skill 进 deck 并 link"
  - Then: deck.toml 被创建且包含 `tdd` 声明；`.claude/skills/tdd` symlink 存在；`_checkpoints/*.jsonl` 至少包含 1 条有效 checkpoint

- [ ] **D2.b** 实现 scenario 驱动脚本（或扩 runner）
  - 用 `runClaudeAgent({ cwd: tmpdir, brief })` 执行 scenario
  - brief 中必须指导 agent：**在操作完成后写 checkpoint JSONL** 到 `_checkpoints/add-skill.jsonl`
  - 返回后调用 `readCheckpoints(cwd)` 读取产物

- [ ] **D2.c** 实现 LLM judge（最小版本）
  - judge brief: "请检查以下 agent 执行结果：项目目录中有 deck.toml 吗？有 tdd symlink 吗？checkpoint JSONL 内容合理吗？输出 pass/fail + 解释"
  - 输入: `runClaudeAgent` 返回的 `{ stdout, stderr, code, checkpoints }` + fs state（用 `runCli` 跑 `ls`/`cat`）
  - 输出: `{ verdict: 'pass'|'fail', explanation: string }`
  - **可以是同一 agent session 的第二次 `runClaudeAgent` 调用**（Judge = Agent, Agent = Judge）

- [ ] **D2.d** TDD tracer bullet 验证
  - 本地 agent session 跑一次完整流程：`runClaudeAgent` 执行 → fs 检查 → `runClaudeAgent` judge → 拿到 pass/fail
  - 目标不是"一次就 pass"，而是"链路端到端跑得通"——fail 时能看到清晰的 checkpoint 和 judge 解释，方便 debug

## 技术方案

- **位置**:
  - `packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md`
  - `packages/lythoskill-test-utils/src/bdd-runner.ts`（若需要扩 judge helper）
- **不新建 runner**: 复用 T7 的 `runClaudeAgent` + `readCheckpoints`
- **Judge 实现**: 最小版本即可——一个 `judgeAgentRun(cwd, checkpoints, brief): Promise<{verdict, explanation}>` helper，内部用第二次 `runClaudeAgent` 调用。不要写成 bash 脚本。
- **Brief 设计**: brief 中要给 agent 足够上下文（SKILL.md 内容摘要或路径），但不要把整个 SKILL.md 塞进去——brief 长度应控制在 500 字以内，让 agent 能读得完。
- **Checkpoint 约定**: agent 在 brief 指导下写 `_checkpoints/<step>.jsonl`，字段至少含 `step`, `tool`, `args`, `timestamp`。T7 的 schema 已定义，brief 中引用即可。
- **CI 策略**: `*.agent.md` 文件在 `test:all` 中**被跳过**（runner 用文件名后缀过滤），因为 CI 无 LLM。

## 验收标准

- [ ] `skills-introspection.agent.md` 落地，格式符合 SCENARIOS.md 约定
- [ ] 本地 agent session 能跑一次完整链路（执行 + judge），拿到 pass/fail 结果
- [ ] `_checkpoints/*.jsonl` 内容可被 `readCheckpoints()` 正确解析
- [ ] `bun run test:all` 未被破坏（agent BDD 文件被 runner 正确跳过）
- [ ] `SCENARIOS.md` "Agent BDD — empty today" 段更新为 "1 scenario in local verification"
- [ ] 不进 CI，但场景文件和 judge helper 代码都进 git
- [ ] 进度记录段附第一次跑通的日志摘要（含 checkpoint 样本）

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
  - `packages/lythoskill-test-utils/src/bdd-runner.ts`（若扩 judge helper）
  - `packages/lythoskill-test-utils/SCENARIOS.md`（更新 Agent BDD 计数）
- 新增:
  - `packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md`

## Git 提交信息建议
```
test(deck): add first Agent BDD scenario — skills-introspection tracer bullet (TASK-20260504004954526)

- skills-introspection.agent.md: agent reads SKILL.md, adds tdd skill, links
- runClaudeAgent drives the scenario; checkpoint JSONL captured
- Minimal LLM judge verifies deck.toml + symlink + checkpoints
- SCENARIOS.md: Agent BDD count 0 → 1

Closes: TASK-20260504004954526
```

## 备注

- **这是 Theme D 的 tracer bullet**: 目标不是"一个完美的 scenario"，而是"helper + checkpoint + judge 的端到端链路第一次跑通"。scenario 内容可以简单，但链路必须完整。
- **Judge 的准确性**: tracer bullet 阶段 judge 可能出错（false pass/fail）。没关系——T9 会在更多 scenario 中训练 judge 的 prompt，提高稳定性。
- **不要**引入 Cucumber / Mocha / Jest（参见 ADR-20260503180000000 第 4 条）。
- **不要**sediment 任何东西到 `playground/` 或非 git-tracked 目录（参见反例 ADR）。
- **失败诊断顺序**: 1) agent 是否被正确拉起？2) brief 是否被正确送达？3) agent 是否写了 checkpoint？4) checkpoint 格式是否正确？5) judge 是否拿到了所有输入？
