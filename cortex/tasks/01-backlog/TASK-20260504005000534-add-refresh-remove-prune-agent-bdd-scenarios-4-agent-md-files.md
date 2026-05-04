# TASK-20260504005000534: Add/refresh/remove/prune Agent BDD scenarios (4 *.agent.md files)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created — Theme D 扩量，依赖 T7+T8 |

## 背景与目标

T8(`TASK-20260504004954526`)已验证 Agent BDD 的端到端链路（`runClaudeAgent` + checkpoint + LLM judge）**可跑通**。本卡在 T8 的 tracer bullet 基础上，为 deck 的 4 个核心命令各写一个 `*.agent.md` scenario，形成完整的 Agent BDD 覆盖。

这四个 scenario 验证的是：**agent 读 SKILL.md 后，能否正确选择 CLI 命令、传递参数、理解输出语义**——这是 unit test 无法覆盖的维度。

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 D | 范围、三层模型、LLM judge 原则 |
| 前序任务 | `cortex/tasks/02-in-progress/TASK-20260504004947351-...md`(T7) | `runClaudeAgent` helper |
| 前序任务 | `cortex/tasks/01-backlog/TASK-20260504004954526-...md`(T8) | 第一个 `*.agent.md` 范本 |
| 反例 ADR | `cortex/adr/03-rejected/ADR-20260503230522270-...md` | 不要 bash judge、不要 playground/ |
| Wiki/lessons | `cortex/wiki/03-lessons/2026-05-04-agent-verification-leetcode-shape-llm-judge.md` | 三层模型 + judge 必须是 LLM |
| 现存约定 | `packages/lythoskill-test-utils/SCENARIOS.md` | `*.agent.md` 格式、不进 CI |
| 范本 | `packages/lythoskill-arena/skill/references/agent-autonomous-arena.md` | "Judge = Agent, Agent = Judge" |

## 需求详情(每条 = 1 vertical slice, RED→GREEN 单独走完)

- [ ] **D4.a** `deck-add.agent.md` — agent 下载 skill 并加入 deck
  - Given: 空项目，有 deck.toml（已声明若干 skill）
  - When: brief 要求 agent "添加 `github.com/owner/repo/skill` 到 deck"
  - Then: deck.toml 新增 entry；cold pool 中出现 repo；working set 中出现 symlink；checkpoint 记录 `deck add` 步骤

- [ ] **D4.b** `deck-refresh.agent.md` — agent 刷新已声明 skill
  - Given: 项目已声明 skill，cold pool 中 repo 落后上游 1 个 commit
  - When: brief 要求 agent "刷新 deck 中所有 skill"
  - Then: agent 执行 `deck refresh`；stdout 含 "updated" 或 "up-to-date"；lock 文件被更新（若 refresh 触发了 link）

- [ ] **D4.c** `deck-remove.agent.md` — agent 移除 skill
  - Given: 项目已声明 skill-a，working set 有 symlink
  - When: brief 要求 agent "移除 skill-a"
  - Then: deck.toml 中无 skill-a；working set 中无 skill-a symlink；cold pool 保留；checkpoint 记录 `deck remove` 步骤

- [ ] **D4.d** `deck-prune.agent.md` — agent 清理冷池
  - Given: 项目 deck 引用 1 个 skill，cold pool 中有 2 个 repo（1 被引用，1 未引用）
  - When: brief 要求 agent "清理未使用的冷池仓库"
  - Then: agent 执行 `deck prune --yes`；未引用 repo 被删除；被引用 repo 保留

- [ ] **D4.e** Judge prompt 调优
  - 基于 T8 的 judge 经验，写一个可复用的 `judgeDeckScenario(cwd, expectedActions)` helper
  - expectedActions 是一个声明式数组（如 `['deck.toml modified', 'symlink created', 'checkpoint written']`）
  - judge LLM 读 brief + checkpoint + fs state，对照 expectedActions 输出 pass/fail
  - 目标: 4 个 scenario 的 judge 稳定率 ≥ 80%（同一 scenario 跑 5 次，≥4 次 judge 正确）

## 技术方案

- **位置**:
  - `packages/lythoskill-deck/test/scenarios/deck-add.agent.md`
  - `packages/lythoskill-deck/test/scenarios/deck-refresh.agent.md`
  - `packages/lythoskill-deck/test/scenarios/deck-remove.agent.md`
  - `packages/lythoskill-deck/test/scenarios/deck-prune.agent.md`
  - `packages/lythoskill-test-utils/src/bdd-runner.ts`（若扩 judge helper）
- **复用 T8 的 judge 模式**: 同一 agent session 内，先 `runClaudeAgent(brief_execute)`，再 `runClaudeAgent(brief_judge)`
- **Brief 模板化**: 4 个 scenario 的 brief 结构相似（Given/When/Then），可以抽象一个 `buildDeckBrief(scenarioType, params)` 但不强求——先手写 4 个，重复出现再抽象。
- **Fs state 采集**: judge 需要读 fs state。在 `bdd-runner.ts` 中提供一个 `collectFsState(cwd): Record<string, {type, target?}>` helper，列出 cwd 中关键路径的文件类型（file/dir/symlink）和 symlink target。
- **CI 策略**: 同 T8，`*.agent.md` 被 runner 跳过。

## 验收标准

- [ ] 4 个 `.agent.md` scenario 文件落地
- [ ] 每个 scenario 在本地 agent session 至少跑一次，拿到 pass/fail 结果
- [ ] judge 稳定率 ≥ 80%（同一 scenario 重复 5 次）
- [ ] `bun run test:all` 未被破坏（agent BDD 文件被正确跳过）
- [ ] `SCENARIOS.md` "Agent BDD" 段更新计数（从 1 → 5）
- [ ] 不进 CI
- [ ] 进度记录段附每个 scenario 的首次跑通/失败摘要

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
  - `packages/lythoskill-test-utils/src/bdd-runner.ts`（若扩 judge / fs-state helper）
  - `packages/lythoskill-test-utils/SCENARIOS.md`（更新 Agent BDD 计数）
- 新增:
  - `packages/lythoskill-deck/test/scenarios/deck-add.agent.md`
  - `packages/lythoskill-deck/test/scenarios/deck-refresh.agent.md`
  - `packages/lythoskill-deck/test/scenarios/deck-remove.agent.md`
  - `packages/lythoskill-deck/test/scenarios/deck-prune.agent.md`

## Git 提交信息建议
```
test(deck): add 4 Agent BDD scenarios — add/refresh/remove/prune (TASK-20260504005000534)

- deck-add.agent.md: agent downloads skill and updates deck
- deck-refresh.agent.md: agent refreshes declared skills
- deck-remove.agent.md: agent removes skill from deck
- deck-prune.agent.md: agent GCs unreferenced cold-pool repos
- Reusable judge helper with expectedActions declarative check
- SCENARIOS.md: Agent BDD count 1 → 5

Closes: TASK-20260504005000534
```

## 备注

- **不要**期望 agent 100% 正确——Agent BDD 的价值在于"可重复验证 + 可 debug"，不是"零失败"。judge 的存在就是为了捕获 agent 的失误。
- **不要**把 scenario 写得太复杂——每个 scenario 应该能在 60 秒内跑完（`runClaudeAgent` 默认超时）。
- **refresh 的 network**: refresh scenario 需要真实的 git repo 和上游。可用本地 `git init` + `git remote add` 指向本地 bare repo 来模拟，避免网络依赖。
- **失败诊断**: 若 judge 不稳定，优先调 judge brief（给更多明确的检查清单），而不是调执行 brief。
