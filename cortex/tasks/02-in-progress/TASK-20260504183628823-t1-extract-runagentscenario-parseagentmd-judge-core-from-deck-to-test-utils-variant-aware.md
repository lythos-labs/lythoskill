# TASK-20260504183628823: T1: Extract runAgentScenario / parseAgentMd / Judge core from deck to test-utils (variant-aware)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created |

## 背景与目标

T10 落地了 `packages/lythoskill-test-utils/src/bdd-runner.ts`(153 行):它已经把通用 CLI/agent 调用层(`runClaudeAgent` / `runCli` / `setupWorkdir` / `assertOutput` / `readCheckpoints`)从 deck 抽出来。但 **Agent BDD 编排层**——也就是把 `.agent.md` 解析成 scenario、跑 agent、拿 checkpoint、调 LLM judge 这一整条线——**仍嵌在 `packages/lythoskill-deck/test/runner.ts`**(759 行)。

具体没搬走的 4 个函数:
- `parseAgentMd(content): AgentScenario` (deck/test/runner.ts:357) — frontmatter + Given/When/Then/Judge section 正则解析
- `setupAgentWorkdir` (deck/test/runner.ts:446) — **deck-specific 部分**(写 skill-deck.toml + mock skill),保留 deck;但其 callback 形态需要支持注入
- `buildJudgePrompt` (deck/test/runner.ts:484) — 拼 LLM judge prompt
- `runLLMJudge` (deck/test/runner.ts:523) — 调 Claude / 解析返回
- `runAgentScenario` (deck/test/runner.ts:559) — 整体编排骨架

arena 想复用就必须 import deck 的 test 子目录,这违反包边界。本任务把这 4 个搬到 test-utils,顺便引入 **agent adapter** 抽象,为多生态(Cursor/Kimi/Gemini)留口子。

## 需求详情

- [ ] **创建 `packages/lythoskill-test-utils/src/agent-bdd.ts`** 容纳 `parseAgentMd` + `runAgentScenario`
- [ ] **创建 `packages/lythoskill-test-utils/src/judge.ts`** 容纳 `buildJudgePrompt` + `runLLMJudge`(为 T2 的 Zod 替换做接口预留)
- [ ] **创建 `packages/lythoskill-test-utils/src/agents/claude.ts`** 把现有 `runClaudeAgent` 的 spawn `claude -p` 逻辑搬来,作为第一个 adapter
- [ ] **新增工厂函数** `useAgent('claude'): AgentAdapter`(直接 export 工厂,不要弄 plugin registry)
- [ ] **修改 `bdd-runner.ts` 中的 `runClaudeAgent`** 改为 thin wrapper:`runAgent({ agent: useAgent('claude'), ... })`,保留 export 一段时间防止 T3 之外的消费者破裂
- [ ] **AgentAdapter interface 定义**:
  ```ts
  interface AgentAdapter {
    name: string;                    // "claude" / "kimi" / "cursor"
    spawn(opts: {
      cwd: string;
      brief: string;
      timeoutMs: number;
      idleTimeoutMs?: number;        // ADR-20260504172913972 阶段 1
      env?: Record<string, string>;
    }): Promise<AgentRunResult>;
  }
  ```
- [ ] **保留 setup callback 注入**:`runAgentScenario({ scenario, setupWorkdir, agent, ... })`,deck 把自己的 `setupAgentWorkdir` 作为 setupWorkdir 传入
- [ ] **不在本任务内**:Zod schema(T2)、idle-timeout 完整实现(留 stub 接口给 T2/后续);player.toml 解析(T4 才需要)

## 技术方案

### 文件布局
```
packages/lythoskill-test-utils/src/
  bdd-runner.ts       # T10 已有,保留 CLI BDD 部分;runClaudeAgent 改 thin wrapper
  agent-bdd.ts        # 新:parseAgentMd + runAgentScenario
  judge.ts            # 新:buildJudgePrompt + runLLMJudge(T2 会重写)
  agents/
    index.ts          # 新:useAgent(name) 工厂
    claude.ts         # 新:Claude adapter(spawn `claude -p`)
    types.ts          # 新:AgentAdapter / AgentRunResult interface
```

### parseAgentMd 搬迁不重写
- **直接搬**,不在 T1 内重写解析。Zod schema 在 T2 替换。
- 留下原来的 regex 实现,但**导出 named function 让 T2 容易替换**

### runAgentScenario 关键签名
```ts
async function runAgentScenario<TWorkdir = string>(opts: {
  scenarioPath: string;             // path to *.agent.md
  agent: AgentAdapter;              // pluggable
  setupWorkdir: (scenario: AgentScenario) => Promise<TWorkdir>;
  judgeAgent?: AgentAdapter;        // default: same as agent
  baseDir?: string;                 // runs/agent-bdd/<ts>/
  timeoutMs?: number;
  idleTimeoutMs?: number;
}): Promise<{
  scenario: AgentScenario;
  agentResult: AgentRunResult;
  checkpoints: CheckpointEntry[];
  verdict: JudgeVerdict;            // T2 会替换为 zod-validated
  artifactDir: string;
}>;
```

### Agent adapter 第一个实现(Claude)
直接搬现有 `runClaudeAgent` 的 `spawn('claude', ['-p', brief], { cwd, env })` 逻辑;timeout 处理保留。

### 测试矩阵
- `agent-bdd.test.ts`:用 fixture `.agent.md` 测 `parseAgentMd` 各分支(frontmatter / 有/无 Judge section / "alias (localhost)" path-prefix)
- `judge.test.ts`:mock LLM 返回各种字符串,测 `runLLMJudge` 当前的 best-effort 解析(T2 会替换为 zod 强校验)
- `agents/claude.test.ts`:mock spawn,测 timeout / env 透传 / stdout 收集
- **不在本任务内**:实际跑 `claude -p`(那是 T3 的回归测试做的事)

## 验收标准

- [ ] `bun test packages/lythoskill-test-utils/src/agent-bdd.test.ts` 全绿
- [ ] `bun test packages/lythoskill-test-utils/src/judge.test.ts` 全绿
- [ ] `bun test packages/lythoskill-test-utils/src/agents/claude.test.ts` 全绿
- [ ] `bdd-runner.ts` 的 `runClaudeAgent` 通过新 path 实现且向后兼容(deck 现有 import 不破)
- [ ] `useAgent('claude')` factory 公开导出;新加 adapter 时不需要改 test-utils 主文件
- [ ] **不引入 Zod**(T2 的事);**不引入 idle-timeout 完整实现**(T2 的事,T1 只留 opts 接口)
- [ ] PR diff 评审:无 deck 包以外的破坏性变更

## 进度记录
<!-- 执行时更新,带时间戳 -->

## 关联文件
- 修改:
  - `packages/lythoskill-test-utils/src/bdd-runner.ts`(`runClaudeAgent` 改 thin wrapper)
- 新增:
  - `packages/lythoskill-test-utils/src/agent-bdd.ts`
  - `packages/lythoskill-test-utils/src/judge.ts`
  - `packages/lythoskill-test-utils/src/agents/{index,claude,types}.ts`
  - 对应 `*.test.ts`

## Git 提交信息建议
```
feat(test-utils): T1 extract agent BDD orchestration with pluggable agent adapter (TASK-20260504183628823)

- parseAgentMd / runAgentScenario → agent-bdd.ts
- buildJudgePrompt / runLLMJudge → judge.ts (Zod replacement deferred to T2)
- Claude spawn logic → agents/claude.ts behind useAgent('claude') factory
- runClaudeAgent in bdd-runner.ts becomes thin wrapper for backward compat

Task: TASK-20260504183628823 complete
```

## 备注

**Agent-pluggable 是硬约束**(用户 2026-05-04 指令):"虽然 claude 就是你,不过我还是不会完全锁死的。所以以后肯定有 useAgent('claude') 这种风格"+ "工具包里准备各种 cli 的非交互调用 shell"。意味着第二个 adapter(Kimi 或 Cursor 等)写起来必须低成本——所以 adapter interface 要小,Claude-specific 的环境变量、参数处理都得在 adapter 内部消化。

**不在 T1 引入 Zod**:T2 才做 schema 替换。T1 只做"位移 + adapter 抽象",任何 schema 改动都会污染本任务的 diff,提高回归风险。
