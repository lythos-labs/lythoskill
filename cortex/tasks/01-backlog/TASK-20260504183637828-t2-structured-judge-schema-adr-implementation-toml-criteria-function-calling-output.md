# TASK-20260504183637828: T2: Structured Judge schema (Zod-first) — ADR + implementation

> Filename mentions "TOML criteria, function-calling output" but **the user-mandated direction is Zod-first**:用户原话(2026-05-04)"我建议你从 zod schema 开始"+ "因为其实涌现的东西已经基本雏形了"。Schema design 必须 distill 现有产物,不发明。

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created |

## 背景与目标

`runLLMJudge`(deck/test/runner.ts:523)目前给 LLM 一段英文 prompt,期待返回 JSON 字符串,然后 best-effort 解析。回归过 "API Error" 这种**非 JSON 噪声直接进 raw_output**(见 `runs/agent-bdd/20260504-172449/.../judge-verdict.json` 的 `raw_output` 字段——成功路径下其实是合法 JSON,但出错路径无 schema 防线)。

**多个 I/O 边界缺 schema**:
- `parseAgentMd` 的 frontmatter 字段(无校验)
- `judge-verdict.json` 字段(自然语言 prompt 出来的)
- `_checkpoints/*.jsonl` 字段(agent 自陈,易飘)
- `arena.json` manifest(playground 涌现,无强约束)
- `metrics.json` budget DAG(ADR-20260504172913972 草案)
- `player.toml` schema(ADR-20260424120936541 后续待办)

本任务用 **Zod runtime schema** 把所有边界都锁死,**且替换 judge 调用方式为 function-calling / tool-use**(LLM 直接返回 schema-validated 结构而非字符串)。

### 不发明的设计基线(Distill,不发明)

下表是当前已落盘的事实形状,Zod schema 必须以它们为 SSOT,不允许 schema 一上来就比真实形状更全/更花。

| Zod schema | 真实产物 | 字段 |
|---|---|---|
| `JudgeVerdict` | `runs/agent-bdd/20260504-172449/agent-introspects-deck-skills-via-checkpoint/judge-verdict.json` | `verdict("PASS"/"FAIL")` / `reason` / `criteria[].{name,passed,note}` / `raw_output` / `error` / `timestamp` |
| `CheckpointEntry` | `runs/agent-bdd/20260504-172449/.../_checkpoints/introspection.jsonl` | `step` / `tool` / `args[]` / `final_state{}`(其他字段如 `exit_code` / `stdout_summary` / `fs_mutations` 是 wiki 草案,**先做 optional,不强制**) |
| `ArenaManifest` | `playground/arena-bdd-research/arena.json` | `id` / `created_at` / `task` / `mode` / `participants[].{id,name,deck,description}` / `criteria[]` / `status` |
| `ComparativeReport` | `playground/arena-bdd-research/report.md`(MD 但语义化结构) | Score Matrix(criterion × participant 二维)/ Per-Criterion Analysis / Pareto Frontier / Key Findings / Recommendations |
| `Metrics` | ADR-20260504172913972 第 56-70 行示例 | `scenario` / `budget` / `dag[]` / `total_duration_ms` / `retry_count` |
| `Player` | ADR-20260424120936541 第 56-61 行示例 | `platform` / `model` / `concurrent` |
| `AgentScenario` | deck/test/*.agent.md 当前格式 | frontmatter + `given[]` / `when[]` / `then[]` / `judge.{persona,criteria[]}` |

## 需求详情

- [ ] **新增 `packages/lythoskill-test-utils/src/schema.ts`** 集中 export 所有 Zod schema
- [ ] **优先级 P0(本任务覆盖)**:`JudgeVerdict` / `JudgeCriterion` / `CheckpointEntry` / `AgentScenario`
- [ ] **优先级 P1(本任务覆盖,arena 需要)**:`ArenaManifest` / `ComparativeReport` / `Player` / `Deck`(deck.toml 子集)
- [ ] **优先级 P2(留接口,可分阶段)**:`Metrics`(budget DAG)
- [ ] **替换 `runLLMJudge`** 为 function-calling 模式:
  - 把 `JudgeVerdict` schema 转为 LLM tool definition(用 `zod-to-json-schema` 或手写)
  - LLM 调用 tool 直接返回结构化数据,SDK 层解析后再 `JudgeVerdict.parse(result)` 二次校验
  - 解析失败:retry 1 次,二次失败 → `verdict: "ERROR"` 带 raw + zod issues
- [ ] **替换 `parseAgentMd`** 输出走 `AgentScenario.parse(...)` 强校验
- [ ] **写 ADR**:`cortex/adr/01-proposed/ADR-<ts>-structured-judge-schema-zod-first-with-function-calling.md`
  - 决策驱动:为何 Zod(运行时校验 + TS 类型推断 + 生态成熟);拒绝 io-ts(更复杂);拒绝 typebox(JSON Schema 友好但 DX 弱);拒绝 JSON Schema 直接手写(无类型);拒绝纯 prompt + JSON 解析(已踩坑)
  - 决策驱动:为何 function-calling — LLM provider 内置 schema enforcement,远比 prompt JSON 解析稳
  - 镜像 ADR-20260424120936541 / ADR-20260504172913972 的格式
- [ ] **测试**:故意构造非 JSON 噪声 + 缺字段 + 类型错的 LLM 输出,schema 正确 reject;function-calling mock 模式下连续 5 次跑零解析错

## 技术方案

### Zod schema 草案(distill from frozen artifacts)

```ts
// packages/lythoskill-test-utils/src/schema.ts
import { z } from 'zod';

// ── 1. Substrate(checkpoint JSONL)─ 锚 runs/agent-bdd/.../introspection.jsonl
export const CheckpointEntry = z.object({
  step: z.string(),                              // 例 "deck.introspection"
  tool: z.string(),                              // 例 "read" / "bunx @lythos/skill-deck add"
  args: z.array(z.string()).default([]),
  final_state: z.record(z.unknown()).default({}),
  // optional 扩展(wiki 草案,实际产物未必有)
  exit_code: z.number().optional(),
  stdout_summary: z.string().optional(),
  fs_mutations: z.array(z.object({
    action: z.enum(['create', 'modify', 'delete', 'create-symlink']),
    path: z.string(),                            // 相对路径
    target: z.string().optional(),               // for symlink
  })).optional(),
  timestamp: z.string().datetime().optional(),
});
export type CheckpointEntry = z.infer<typeof CheckpointEntry>;

// ── 2. Verdict(judge-verdict.json)─ 锚 runs/agent-bdd/.../judge-verdict.json
export const JudgeCriterion = z.object({
  name: z.string(),
  passed: z.boolean(),
  note: z.string().default(''),
});

export const JudgeVerdict = z.object({
  verdict: z.enum(['PASS', 'FAIL', 'ERROR']),    // ERROR = parse/runtime fail
  reason: z.string(),
  criteria: z.array(JudgeCriterion).default([]),
  raw_output: z.string().default(''),
  error: z.string().nullable().default(null),
  timestamp: z.string().datetime(),
  // 可选打分(arena 需要)
  scores: z.record(z.number().min(1).max(5)).optional(),  // { coverage: 5, relevance: 4 }
});
export type JudgeVerdict = z.infer<typeof JudgeVerdict>;

// ── 3. Scenario(.agent.md 解析后)
const PathPrefix = z.enum(['localhost', 'github', 'npm']);  // 见 parseAgentMd 的 alias prefix

export const AgentScenario = z.object({
  name: z.string(),
  description: z.string().optional(),
  // frontmatter
  player: z.string().optional(),                 // 引用 player.toml id
  budget: z.object({
    idle_timeout_ms: z.number().int().positive().default(30_000),
    total_timeout_ms: z.number().int().positive().default(300_000),
    max_retries: z.number().int().nonnegative().default(0),
  }).default({}),
  // 段
  given: z.array(z.string()).default([]),        // bullets,可含 path-prefix
  when: z.array(z.string()).default([]),
  then: z.array(z.string()).default([]),
  judge: z.object({
    persona: z.string().default(''),
    criteria: z.array(z.object({
      name: z.string(),
      weight: z.number().min(0).max(1).optional(),
      question: z.string().optional(),
    })).default([]),
  }).default({ persona: '', criteria: [] }),
});
export type AgentScenario = z.infer<typeof AgentScenario>;

// ── 4. Player(锚 ADR-20260424120936541)
export const Player = z.object({
  platform: z.string(),                          // "claude-code" / "kimi" / "cursor"
  model: z.string().optional(),                  // "claude-sonnet-4-6"
  concurrent: z.number().int().positive().default(1),
  tool_set: z.array(z.string()).default([]),
});
export type Player = z.infer<typeof Player>;

// ── 5. Deck(deck.toml 子集)
export const Deck = z.object({
  name: z.string().optional(),
  max_cards: z.number().int().positive().optional(),
  cold_pool: z.string().optional(),
  working_set: z.string().optional(),
  description: z.string().optional(),
  // [innate.skills.*] / [tool.skills.*]
  skills: z.record(z.object({
    path: z.string(),
    role: z.string().optional(),
    layer: z.enum(['innate', 'tool']).optional(),
  })).default({}),
});
export type Deck = z.infer<typeof Deck>;

// ── 6. Arena manifest(锚 playground/arena-bdd-research/arena.json)
export const ArenaParticipant = z.object({
  id: z.string(),                                // "run-01"
  name: z.string(),                              // "deep-research"
  player: z.string().optional(),                 // 引用 player.toml
  deck: z.string(),                              // path or ref
  description: z.string().default(''),
  prompt: z.string().optional(),                 // per-variant prompt override
});

export const ArenaManifest = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  task: z.string(),                              // 顶层任务(单一 task,N 个执行)
  mode: z.enum(['decks', 'players', 'prompts', 'desc-variants', 'matrix']),
  participants: z.array(ArenaParticipant).min(2),  // arena 必须 ≥2
  criteria: z.array(z.string()).min(1),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
});
export type ArenaManifest = z.infer<typeof ArenaManifest>;

// ── 7. Comparative report(锚 playground/arena-bdd-research/report.md)
export const ScoreCell = z.object({
  participant_id: z.string(),
  criterion: z.string(),
  weight: z.number().min(0).max(1),
  score: z.number().min(1).max(5),
  rationale: z.string().default(''),
});

export const ParetoEntry = z.object({
  participant_id: z.string(),
  scores: z.record(z.number()),                  // { coverage: 5, depth: 5, ... }
  dominated: z.boolean(),
  dominated_by: z.array(z.string()).default([]),
});

export const ComparativeReport = z.object({
  arena_id: z.string(),                          // 引用 ArenaManifest.id
  generated_at: z.string().datetime(),
  score_matrix: z.array(ScoreCell),
  weighted_totals: z.record(z.number()),         // { "run-01": 5.0, "run-02": 2.0 }
  pareto: z.array(ParetoEntry),
  key_findings: z.array(z.string()).default([]),
  recommendations: z.array(z.object({
    audience: z.string(),                        // "Deck maintainer"
    recommendation: z.string(),
  })).default([]),
});
export type ComparativeReport = z.infer<typeof ComparativeReport>;

// ── 8. Metrics(P2,锚 ADR-20260504172913972)
export const Metrics = z.object({
  scenario: z.string(),
  budget: z.object({
    idle_timeout_ms: z.number(),
    total_timeout_ms: z.number(),
    max_retries: z.number(),
  }),
  dag: z.array(z.object({
    node: z.string(),
    duration_ms: z.number(),
    status: z.enum(['ok', 'error', 'timeout', 'skipped']),
    token_in: z.number().optional(),
    token_out: z.number().optional(),
  })),
  total_duration_ms: z.number(),
  retry_count: z.number().default(0),
});
export type Metrics = z.infer<typeof Metrics>;
```

### function-calling judge(替代 prompt-then-parse)

伪代码:
```ts
// packages/lythoskill-test-utils/src/judge.ts (T2 重写)
import { JudgeVerdict, type AgentScenario } from './schema';
import zodToJsonSchema from 'zod-to-json-schema';

const JUDGE_TOOL = {
  name: 'submit_verdict',
  description: 'Submit the structured judgment for the agent run',
  input_schema: zodToJsonSchema(JudgeVerdict),
};

export async function runLLMJudge(opts: {
  scenario: AgentScenario;
  agentTranscript: string;                       // stdout/stderr
  checkpoints: CheckpointEntry[];
  judgeAgent: AgentAdapter;
}): Promise<JudgeVerdict> {
  const prompt = buildJudgePrompt(opts);
  const response = await opts.judgeAgent.invokeTool({
    tool: JUDGE_TOOL,
    prompt,
  });
  // SDK 已 schema-enforce,但二次校验防 SDK 偷工
  return JudgeVerdict.parse(response);
}
```

注意:`AgentAdapter` 接口在 T1 是 `spawn(...)`;T2 给它加 `invokeTool(...)` 二次方法,Claude adapter 用 Anthropic SDK 的 tool_use 实现。Kimi/Cursor 没 tool_use 时 fallback 到 prompt + JSON 解析(降级,但 schema 还是 enforce)。

### ADR 决策结构(待写)

```
背景: judge 当前 prompt-string 出过 "API Error" 噪声;parseAgentMd frontmatter 无校验;arena.json 涌现但无强约束
决策驱动: Zod = TS-native + runtime + JSON Schema 互转;function-calling = provider 侧 enforce
方案 A: 维持现状 prompt + JSON.parse — 拒绝(脆)
方案 B: io-ts/typebox/手写 JSON Schema — 拒绝(DX 差或无运行时)
方案 C: Zod + function-calling — 选
影响: 引入 zod 依赖;judge.ts 需要重写;Claude/Kimi adapter 都得加 invokeTool
后续: P2 阶段做 Metrics + 完整 budget DAG;player.toml 解析也走 schema
```

## 验收标准

- [ ] `packages/lythoskill-test-utils/src/schema.ts` 落地,7 个 P0/P1 schema 全部 export
- [ ] `bun test packages/lythoskill-test-utils/src/schema.test.ts` 全绿,覆盖:
  - 真实 fixture(从 `runs/agent-bdd/` 拷入)round-trip 通过
  - 故意噪声(非 JSON / 缺字段 / 类型错)被 reject 且 issues 可读
- [ ] `runLLMJudge` 重写为 function-calling;mock adapter 模式下 5 次连续跑零解析错
- [ ] `parseAgentMd` 输出走 `AgentScenario.parse(...)`;现有 5 个 deck `.agent.md` scenario 全部 parse 通过
- [ ] ADR 写到 `01-proposed/`,提交 commit 含 `ADR: ADR-<ts> accept` trailer 等待用户接受
- [ ] **不破坏 T1 接口**:`useAgent('claude')` factory 不变,只是 adapter 实现里多一个 `invokeTool` 方法
- [ ] **deck/test/runner.ts 暂不动**(那是 T3 的范围)

## 进度记录

## 关联文件
- 修改:
  - `packages/lythoskill-test-utils/src/judge.ts`(T1 写的版本被本任务重写)
  - `packages/lythoskill-test-utils/src/agent-bdd.ts`(parseAgentMd 输出走 schema)
  - `packages/lythoskill-test-utils/src/agents/claude.ts`(加 invokeTool 方法)
  - `packages/lythoskill-test-utils/package.json`(加 zod / zod-to-json-schema 依赖)
- 新增:
  - `packages/lythoskill-test-utils/src/schema.ts`
  - `packages/lythoskill-test-utils/src/schema.test.ts`
  - `cortex/adr/01-proposed/ADR-<ts>-structured-judge-schema-zod-first-with-function-calling.md`
  - 测试 fixture(从 `runs/agent-bdd/` 拷入)

## Git 提交信息建议
```
feat(test-utils): T2 structured Judge schema with Zod + function-calling (TASK-20260504183637828)

- schema.ts: JudgeVerdict / CheckpointEntry / AgentScenario / Player / Deck / ArenaManifest / ComparativeReport (Zod)
- judge.ts: replace prompt-then-parse with function-calling + 2x schema enforcement
- AgentAdapter.invokeTool() for tool_use; Kimi/Cursor fallback to prompt+parse with schema check
- parseAgentMd output validated through AgentScenario.parse()

ADR: ADR-<ts> accept
Task: TASK-20260504183637828 complete
```

## 备注

**用户原话(2026-05-04)**: "我建议你从 zod schema 开始" + "因为其实涌现的东西已经基本雏形了" + "在 bdd 和 arena 里 / 在 runs 跑过的日志里 / 在过去的 playground 里留下来的 arena 痕迹里"。**本任务对此的回应**:每个 schema 都标注了它对应的真实产物(见上表),拒绝凭空抽象。

**filename vs body 不一致说明**:CLI 创建任务时 slug 含 "toml-criteria-function-calling-output";body 已按 Zod-first 重写。后续不重命名文件(避免 git rename 噪声)。
