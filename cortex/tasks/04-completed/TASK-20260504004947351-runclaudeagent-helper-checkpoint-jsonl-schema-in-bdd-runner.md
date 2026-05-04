# TASK-20260504004947351: runClaudeAgent helper + checkpoint JSONL schema in bdd-runner

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created — Theme D tracer bullet (无依赖,先于 T8/T9) |
| in-progress | 2026-05-03 | Started |
| completed | 2026-05-04 | D1.a–d 全部落地,tracer bullet 本地通过,现有 34 CLI BDD 未破坏 |

## 背景与目标

Agent BDD 三层模型(参见 wiki/lessons)的 substrate 层尚未实现:`@lythos/test-utils` 只有 `runCli` / `assertOutput` / `setupWorkdir`,缺少"拉起 LLM agent 在隔离 cwd 中执行 brief 并产出 checkpoint JSONL"这一原语。

本 task 是 Theme D 的 **tracer bullet**:扩 `bdd-runner.ts` 加 `runClaudeAgent` helper + 定义 checkpoint JSONL schema,让后续 T8/T9 的 `*.agent.md` scenario 能跑得起来。

无 T8/T9 依赖反向——本卡是这两张的前置。

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 D / D1 | 范围、共同纪律 |
| Wiki/lessons | `cortex/wiki/03-lessons/2026-05-04-agent-verification-leetcode-shape-llm-judge.md` | 三层模型 + checkpoint 字段 schema 来源 |
| 反例 ADR | `cortex/adr/03-rejected/ADR-20260503230522270-...md` | 不要起 bash 平行世界,不要写 `playground/`,不要把 judge 写成脚本 |
| 现存约定 | `packages/lythoskill-test-utils/SCENARIOS.md` "Agent BDD — empty today" 段 | 不引入 Cucumber;LLM 直接读 G/W/T |
| 范本 | `packages/lythoskill-arena/skill/references/agent-autonomous-arena.md` + `runs/run-A.md` | "Judge = Agent, Agent = Judge" + 评分 JSONL 已有形态 |
| Bootloader 原则 | `cortex/adr/02-accepted/ADR-20260503003315478-...md` | task = pointers + action,不是 tutorial |

## 需求详情

- [x] **D1.a** `runClaudeAgent(opts: { cwd, brief, timeoutMs?, env? }): Promise<AgentRunResult>`
  - 用 `Bun.$` 或 `Bun.spawn` 拉 `claude -p --dangerously-skip-permissions`(stdin 送 brief)
  - 工作目录隔离到 `cwd`(参考 `setupWorkdir` 创建 tmpdir)
  - 默认超时:60s 可调
  - 返回 `{ stdout, stderr, code, durationMs, checkpoints: CheckpointEntry[] }`
- [x] **D1.b** `CheckpointEntry` TypeScript schema
  - 字段:`step` (string), `tool` (string), `args` (string[]), `exit_code?` (number), `stdout_summary?` (string), `fs_mutations?` (FsMutation[]), `final_state?` (Record<string, unknown>), `timestamp` (string ISO)
  - `FsMutation = { action: 'create'|'modify'|'delete'|'create-symlink'; path: string; target?: string }`
  - 路径全部相对 `cwd`(可 review、可 replay)
- [x] **D1.c** `readCheckpoints(cwd: string): CheckpointEntry[]`
  - 读 `<cwd>/_checkpoints/*.jsonl`,逐行 parse,跳过空行
  - 文件不存在时返回 `[]`(不抛)
  - 按文件名排序后再按行序拼接
- [x] **D1.d** TDD vertical slice
  - 第一个测试(tracer bullet):`runClaudeAgent` 用一个最小 brief("回 'ok' 然后落一行 checkpoint")验证三件:不超时、`code===0`、`checkpoints.length>=1`
  - 不写 happy/edge 之外的 speculative 测试
  - 公共接口 only(从 `bdd-runner.ts` 导出),不测试私有

## 技术方案

- **位置**:`packages/lythoskill-test-utils/src/bdd-runner.ts`(同文件追加,~30-50 LoC)
- **不要**单独建 `runClaudeAgent.ts` 文件——SCENARIOS.md 已规约 "single runner module"
- **Bun Shell vs node:child_process**:本仓 ESM-only + Bun-first,新增代码用 `Bun.spawn`(异步)而非 `spawnSync`;`runCli` 现有同步实现保留(有 21 个测试用)
- **Brief 注入方式**:stdin pipe(`echo brief | claude -p ...`),不要文件中介(避免 cwd 污染)
- **Checkpoint 写入责任**:helper 不主动写——helper 只 read。写 checkpoint 是 agent 在 brief 指导下的行为;brief 文本里规约位置 `_checkpoints/<step>.jsonl`
- **Agent 拉起失败 fallback**:`claude` CLI 不可用时,helper 抛清晰错误(`claude not found in PATH`),不静默退化为 mock

## 验收标准

- [x] `bdd-runner.ts` 多出 `runClaudeAgent` + `readCheckpoints` 两个 export,TS 类型严格(`tsc --noEmit` 无 tsconfig 故跳过,但 Bun 运行时通过)
- [x] 至少 1 个 unit test(tracer bullet)在本地跑通(注:本测试本身需要 `claude` CLI,**不进 CI**,标记 `// agent-bdd: not for CI`)
- [x] `CheckpointEntry` / `FsMutation` 类型从 `bdd-runner.ts` re-export
- [x] 现有 21 个 CLI integration BDD 测试不被破坏(`bun run test:all` 全绿)
- [x] 新代码遵 vertical slice:**只**实现 tracer 测试需要的字段,边界字段(stdout_summary、fs_mutations)留给 T8 触发后再补
- [x] 关联引用全在文件 frontmatter 表格中,subagent 零上下文也能 boot

## 进度记录
- 2026-05-04 01:30: 实现 `runClaudeAgent` + `readCheckpoints` + `CheckpointEntry`/`FsMutation` 类型,追加到 `bdd-runner.ts`
- 2026-05-04 01:35: 创建 `test/bdd-runner.test.ts`,含 tracer bullet (Agent BDD) + 3 个 `readCheckpoints` 单元测试
- 2026-05-04 01:40: tracer bullet 首次运行超时(30s→60s),最终通过;现有 34 CLI BDD 测试全绿
- 2026-05-04 01:45: 任务完成,移至 completed

## 关联文件
- 修改:
  - `packages/lythoskill-test-utils/src/bdd-runner.ts`(追加 helper + types)
  - `packages/lythoskill-test-utils/src/bdd-runner.test.ts`(若存在则追加;否则新增)
- 新增:无(不要新建文件,不要建 `playground/`)

## Git 提交信息建议
```
feat(test-utils): add runClaudeAgent helper + checkpoint schema (TASK-20260504004947351)

- Async runClaudeAgent via Bun.spawn, isolates cwd, returns checkpoints
- CheckpointEntry/FsMutation types — substrate for Agent BDD scenarios
- readCheckpoints reads _checkpoints/*.jsonl (relative paths only)
- Tracer-bullet test, marked not-for-CI per SCENARIOS.md Agent BDD policy

Closes: TASK-20260504004947351
```

## 备注

- **不要** sediment 任何东西到 `playground/` 或非 git-tracked 目录(参见反例 ADR)
- **不要** 引入 Cucumber / Mocha / Jest,只用 `bun:test`(参见 ADR-20260503180000000 第 4 条)
- 本卡是 Theme D 的 **tracer bullet**——T8/T9 直接依赖此处导出
- 失败的话,ADR-20260503230522270 是教训:**输出形态有语义自由度时 judge 必须是 LLM**,helper 不替判断
