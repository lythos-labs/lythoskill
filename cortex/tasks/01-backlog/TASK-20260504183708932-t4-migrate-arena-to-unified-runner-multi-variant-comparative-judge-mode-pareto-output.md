# TASK-20260504183708932: T4: Migrate arena to unified runner (multi-variant + comparative judge mode + Pareto output)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created |

## 背景与目标

`playground/arena-bdd-research/` 是用户在 2026-05-04 13:10 用类似 BDD 形态做的真实 arena 跑——它已经把所有 schema 和形态做出来了:
- `arena.json` ≅ ArenaManifest(T2 已 Zod 化)
- `TASK-arena.md` ≅ AgentScenario 的 N-participant 扩展(顶层 task + 每个 participant 配置 + judge persona)
- `report.md` ≅ ComparativeReport(Score Matrix + Pareto Frontier + Key Findings + Recommendations)
- `runs/run-XX.md` + `decks/arena-run-XX.toml` ≅ 每个 (player × deck) 单元的 artifact

但这是 ad-hoc 写出来的,不是从 `packages/lythoskill-arena/` 包跑出来的。本任务**正式化这条路径**:让 arena CLI 调统一 runner 的 multi-variant 模式,产出与 playground SSOT 同形的 artifact。

arena 包 CLI(`packages/lythoskill-arena/src/cli.ts`)已声明:`--task` / `--skills` / `--decks` / `--criteria` / `--control` / `--dir` / `--project`,但缺 backbone runner——本任务补上。

## 需求详情

- [ ] **新增 `packages/lythoskill-arena/src/runner.ts`** thin orchestration:
  - 读 `--task` MD + `--players A.toml,B.toml` + `--decks X.toml,Y.toml`(笛卡尔积或等长 zip,默认笛卡尔)
  - 对每个 (player, deck) cell:
    - 用 T1 的 `runAgentScenario` 跑(单元产出 `runs/<arena-id>/<participant-id>/judge-verdict.json`)
    - 收集 per-variant verdict
  - 全部跑完后:用 T2 的 schema 调 `runComparativeJudge`(下方定义)
- [ ] **新增 `packages/lythoskill-arena/src/comparative-judge.ts`**:
  - 输入:N 个 `JudgeVerdict` + `ArenaManifest.criteria`
  - 调用 LLM 用 function-calling 模式产出 `ComparativeReport`(T2 schema)
  - 计算 Pareto frontier(对 `criteria` 维度做 dominance 检查)
  - 渲染 markdown report 到 `runs/<arena-id>/report.md`
- [ ] **CLI 命令形态**(参考 wiki `2026-05-02-desc-preference-arena.md` 草案):
  ```bash
  bunx @lythos/skill-arena run \
    --task ./TASK-arena.md \
    --players players/claude-code.toml,players/kimi.toml \
    --decks decks/run-01.toml,decks/run-02.toml \
    --criteria coverage,relevance,actionability,depth \
    --runs 1 \
    --out runs/arena-<id>
  ```
  默认产物路径 `runs/arena-<id>/{arena.json, report.md, runs/<participant-id>/...}`
- [ ] **回归基线**:重跑 `playground/arena-bdd-research/` 的 BDD-research 任务,产物对比:
  - `arena.json`:字段一致(允许 timestamp 差异)
  - `report.md`:Pareto 结论一致(run-01 dominates run-02 across 4 dimensions)
  - per-criterion 评分允许 ±1 浮动(LLM 非确定性)
- [ ] **player.toml schema** 用 T2 的 `Player` zod 校验
- [ ] **不在本任务**:`virtual-evaluator-swarm`(MBTI 多人格)、token-budget Phase 3

## 技术方案

### runner.ts 骨架
```ts
// packages/lythoskill-arena/src/runner.ts
import {
  runAgentScenario, useAgent, runComparativeJudge,
  ArenaManifest, ComparativeReport, parseAgentScenario,
} from '@lythos/test-utils';

export async function runArena(opts: {
  taskPath: string;
  playerPaths: string[];
  deckPaths: string[];
  criteria: string[];
  outDir: string;
  runs?: number;
}): Promise<{ manifest: ArenaManifest; report: ComparativeReport }> {
  const manifest = buildManifest(opts);                        // → arena.json
  const variants = cartesian(opts.playerPaths, opts.deckPaths);
  const verdicts: PerVariantVerdict[] = [];
  for (const v of variants) {
    const result = await runAgentScenario({
      scenarioPath: opts.taskPath,                              // 顶层 TASK-arena.md
      agent: useAgent(loadPlayer(v.playerPath).platform),       // pluggable per variant
      setupWorkdir: arenaSetup(v),                              // 写 deck.toml + mock skills
      artifactDir: `${opts.outDir}/runs/${v.participantId}`,
    });
    verdicts.push({ participantId: v.participantId, verdict: result.verdict });
  }
  const report = await runComparativeJudge({
    manifest,
    verdicts,
    criteria: opts.criteria,
  });
  await writeReport(`${opts.outDir}/report.md`, report);
  return { manifest, report };
}
```

### comparative-judge.ts 骨架
```ts
import { ComparativeReport, JudgeVerdict, ArenaManifest } from '@lythos/test-utils';

export async function runComparativeJudge(opts: {
  manifest: ArenaManifest;
  verdicts: { participantId: string; verdict: JudgeVerdict }[];
  criteria: string[];
}): Promise<ComparativeReport> {
  // function-calling LLM 拿 verdicts + criteria,产出 score_matrix + key_findings
  const llmResult = await invokeJudgeTool(...);
  const scoreMatrix = ComparativeReport.shape.score_matrix.parse(llmResult.score_matrix);

  // Pareto 是确定性算法,不交给 LLM
  const pareto = computePareto(verdicts, criteria, scoreMatrix);

  return ComparativeReport.parse({
    arena_id: opts.manifest.id,
    generated_at: new Date().toISOString(),
    score_matrix: scoreMatrix,
    weighted_totals: computeWeightedTotals(scoreMatrix),
    pareto,
    key_findings: llmResult.key_findings,
    recommendations: llmResult.recommendations,
  });
}

function computePareto(verdicts, criteria, scoreMatrix) {
  // 对每对 (a, b),如果 a 在所有 criteria 上 ≥ b 且至少一个 >,则 b dominated by a
  // 经典 Pareto frontier 算法
}
```

### CLI 集成

`packages/lythoskill-arena/src/cli.ts` 现有 parseArgs 扩展 `--players` `--out`:
```ts
const args = parseArgs(process.argv);
const result = await runArena({
  taskPath: args.task,
  playerPaths: args.players?.split(',') ?? [],
  deckPaths: args.decks.split(','),
  criteria: args.criteria.split(','),
  outDir: args.out ?? `runs/arena-${timestamp()}`,
});
```

### 回归 fixture

复制 `playground/arena-bdd-research/` 关键文件到 `packages/lythoskill-arena/test/fixtures/bdd-research/`:
- `TASK-arena.md`
- `decks/arena-run-01.toml`、`decks/arena-run-02.toml`
- `players/claude-code.toml`(新建,因为 playground 默认隐式 Claude)

写一个回归测试:
```ts
test('arena BDD-research regression', async () => {
  const { manifest, report } = await runArena({
    taskPath: fixturesDir + '/TASK-arena.md',
    playerPaths: [fixturesDir + '/players/claude-code.toml'],
    deckPaths: [fixturesDir + '/decks/arena-run-01.toml', fixturesDir + '/decks/arena-run-02.toml'],
    criteria: ['coverage', 'relevance', 'actionability', 'depth'],
    outDir: tmpDir,
  });
  expect(report.pareto.find(p => p.participant_id === 'run-01').dominated).toBe(false);
  expect(report.pareto.find(p => p.participant_id === 'run-02').dominated).toBe(true);
});
```

## 验收标准

- [ ] `packages/lythoskill-arena/src/runner.ts` 落地,thin orchestration ≤ 200 行
- [ ] `packages/lythoskill-arena/src/comparative-judge.ts` 落地,Pareto 算法是确定性 + 单元测试覆盖
- [ ] CLI 端到端跑通:`bunx @lythos/skill-arena run --task ... --players ... --decks ... --criteria ... --out ...`
- [ ] 重跑 BDD-research 任务,Pareto 结论与 `playground/arena-bdd-research/report.md` 一致(run-01 dominates run-02)
- [ ] `arena.json` 和 `report.md` schema 通过 Zod parse
- [ ] 测试:`bun test packages/lythoskill-arena/src/*.test.ts` 全绿
- [ ] **不破坏 deck**:T3 的 deck Agent BDD 仍 5/5 通过

## 进度记录

## 关联文件
- 修改:
  - `packages/lythoskill-arena/src/cli.ts`(parseArgs 加 `--players` `--out`,wire 到 runArena)
  - `packages/lythoskill-arena/package.json`(workspace dep `@lythos/test-utils`)
- 新增:
  - `packages/lythoskill-arena/src/runner.ts`
  - `packages/lythoskill-arena/src/comparative-judge.ts`
  - `packages/lythoskill-arena/src/{runner,comparative-judge}.test.ts`
  - `packages/lythoskill-arena/test/fixtures/bdd-research/`(从 playground 拷)

## Git 提交信息建议
```
feat(arena): T4 migrate to unified runner with comparative judge + Pareto (TASK-20260504183708932)

- runner.ts: cartesian (player × deck) → runAgentScenario per cell
- comparative-judge.ts: function-calling judge + deterministic Pareto frontier
- CLI: --players supports player.toml; --out controls artifact dir
- Regression: BDD-research playground task reproduces same Pareto verdict

Closes: EPIC-20260504183618345
Task: TASK-20260504183708932 complete
```

## 备注

**playground 是 SSOT**:`playground/arena-bdd-research/` 是用户已经手做出来的形态,本任务**正式化**它而非重新设计。任何 schema/CLI 选择以"能复现 playground 行为"为优先准绳。

**Pareto 不交给 LLM**:LLM 负责 score 和 rationale(语义判断),Pareto dominance 是纯算法(对每对做向量比较),交给 LLM 反而引入非确定性。`computePareto` 必须确定性 + 单测覆盖。

**arena CLI 是入口**,arena 不应反向依赖 deck。所有共享逻辑都在 `@lythos/test-utils`。
