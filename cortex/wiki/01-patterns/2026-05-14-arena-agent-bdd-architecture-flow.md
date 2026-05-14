# Arena / Agent-BDD Architecture Flow (2026-05-14)

Post ADR-20260514050300 (task/judge decouple) + arena/agent-bdd split.

---

## 1. single mode (`cli.ts singleRun`)

Quick single-deck test. Same primitives as vs mode — agent.spawn directly, no parseAgentMd.

```
CLI: lythoskill-arena single --deck <path> --brief "task text"

  ┌───────────────────────────────────────────────────┐
  │ cli.ts singleRun                                  │
  │                                                   │
  │  resolvePath(deck)                                │
  │  useAgent(resolvePlayer(player))                   │
  │  taskText = opts.brief || readFileSync(opts.task)  │
  │                                                   │
  │  mkdir(workDir)                                   │
  │  write skill-deck.toml + AGENTS.md                │
  │  deck link                                        │
  │                                                   │
  │  agent.spawn({                                    │
  │    cwd: workDir,                                  │
  │    brief: taskText  ← natural lang, no parsing    │
  │  })                                               │
  │                                                   │
  │  sanitize stdout/stderr                           │
  │  cp artifacts → outDir (buildCopyPlan)            │
  │                                                   │
  │  (no judge — criteria absent, skipped)            │
  │                                                   │
  │  summary: stdout + artifacts paths                │
  └───────────────────────────────────────────────────┘

  Components used:
    cli.ts           — arg parse, deck fetch, orchestration
    player.ts        — resolvePlayer
    preflight.ts     — buildCopyPlan, parseDeckSkills
    sanitize.ts      — createSanitizer
    schema.ts        — (only ArenaManifest for manifest write, if needed)

  NOT used: agent-bdd.ts, parseAgentMd, AgentScenario
```

---

## 2. vs mode (`runner.ts runArenaFromToml`)

Declarative multi-deck comparison. No parseAgentMd, no AgentScenario.

```
arena.toml:
  [arena]
  task = "./task.md"           # → resolveTaskText → taskText
  judge = "./judge.md"         # → resolveJudgeText → judgeText
  runs_per_side = 1
  [[side]] name/player/deck   # → ExecutionPlan.cells

  ┌──────────────────────────────────────────────────────┐
  │ runner.ts runArenaFromToml                           │
  │                                                      │
  │  resolveTaskText(toml) → taskText: string            │
  │  resolveJudgeText(toml) → judgeText: string | null   │
  │  buildExecutionPlan(toml) → plan                     │
  │                                                      │
  │  for each cell in plan.cells:                        │
  │  ┌────────────────────────────────────────────────┐  │
  │  │  mkdir(workDir)                                │  │
  │  │  write skill-deck.toml + AGENTS.md             │  │
  │  │  Bun.spawn('bunx @lythos/skill-deck link')     │  │
  │  │                                                │  │
  │  │  ┌──────────────────────────────────────┐      │  │
  │  │  │ agent.spawn({                        │      │  │
  │  │  │   cwd: workDir,                      │      │  │
  │  │  │   brief: taskText  ← natural lang    │      │  │
  │  │  │   timeoutMs: 300000                  │      │  │
  │  │  │ })                                   │      │  │
  │  │  │ → AgentRunResult {stdout,stderr}     │      │  │
  │  │  └──────────────────────────────────────┘      │  │
  │  │                                                │  │
  │  │  sanitize stdout/stderr                        │  │
  │  │  cp artifacts → cellDir (buildCopyPlan)        │  │
  │  │  readCheckpoints(workDir)                      │  │
  │  │                                                │  │
  │  │  ┌──────────────────────────────────────┐      │  │
  │  │  │ runLLMJudge(EvaluateInput, Evidence, │      │  │
  │  │  │   checkpoints, judgeAgent)           │      │  │
  │  │  │                                      │      │  │
  │  │  │  buildJudgePrompt(                   │      │  │
  │  │  │    input: {                          │      │  │
  │  │  │      criteria: judgeText,  ← string  │      │  │
  │  │  │      task_context: taskText[:500]    │      │  │
  │  │  │    },                                │      │  │
  │  │  │    evidence: {                       │      │  │
  │  │  │      sandbox_cwd, stdout, stderr,    │      │  │
  │  │  │      artifact_files                  │      │  │
  │  │  │    }                                 │      │  │
  │  │  │  )                                   │      │  │
  │  │  │  → judge.spawn({ brief: prompt })    │      │  │
  │  │  │  → JSON.parse → JudgeVerdict.parse   │      │  │
  │  │  │  → ParticipantVerdict                │      │  │
  │  │  └──────────────────────────────────────┘      │  │
  │  │                                                │  │
  │  │  write judge-verdict.json to cellDir           │  │
  │  │  verdictsBySide.get(side).push(v)              │  │
  │  └────────────────────────────────────────────────┘  │
  │                                                      │
  │  aggregateAllStats(verdictsBySide) → stats          │
  │  runComparativeJudge(manifest, flatVerdicts)         │
  │  writeReport(report.md)                              │
  │  ArenaManifest { status: 'completed' }               │
  └──────────────────────────────────────────────────────┘

  Components used:
    runner.ts          — orchestration (NO parseAgentMd, NO AgentScenario)
    arena-toml.ts      — parseArenaToml, buildExecutionPlan
    player.ts          — resolvePlayer, resolveSides
    preflight.ts       — buildCopyPlan
    judge.ts           — runLLMJudge, buildJudgePrompt
    schema.ts          — ArenaManifest, JudgeInput, Evidence, JudgeVerdict
    bdd-runner.ts      — readCheckpoints (toolbox, not pipeline)
    sanitize.ts        — createSanitizer
    comparative-judge.ts — runComparativeJudge
    stats.ts           — aggregateAllStats
```

---

## 3. Agent-BDD test harness (`agent-bdd.ts`)

BDD test runner — `parseAgentMd` is legacy, used only by test suites.
New code should construct `AgentScenario` directly or bypass it entirely
(arena runners use `agent.spawn` directly).

```
test.agent.md:  (legacy format — test fixtures only)
  ---
  name / description / timeout
  ---
  ## Given → deck config
  ## When  → agent brief
  ## Then  → acceptance bullets

  ┌──────────────────────────────────────────────┐
  │ agent-bdd.ts runAgentScenario (test suite)   │
  │                                              │
  │  scenario = prebuilt ?? parseAgentMd(path)   │
  │  setupWorkdir(), deck link                   │
  │  agent.spawn({ brief: scenario.when })        │
  │  collectArtifacts(), readCheckpoints()        │
  │                                              │
  │  optional: runLLMJudge(judgeInput, ...)      │
  │   (judgeInput passed from test harness,      │
  │    NOT from scenario.judge string)            │
  └──────────────────────────────────────────────┘

  parseAgentMd is NOT used by arena runners (single / vs).
  It exists for backward-compatible test fixtures only.
```

---

## Component dependency map

```
                   ┌─────────────┐
                   │  schema.ts  │  (JudgeInput, Evidence, JudgeVerdict,
                   └──────┬──────┘   AgentScenario, ArenaManifest, ...)
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐  ┌──────▼──────┐  ┌─────▼──────┐
    │ judge.ts  │  │ agent-bdd.ts│  │ runner.ts  │
    │           │  │             │  │            │
    │ buildJudge│  │ parseAgentMd│  │ agent.spawn│
    │ Prompt    │  │ runAgent    │  │   (direct) │
    │ runLLMJudge│ │ Scenario    │  │ runLLMJudge│
    └─────┬─────┘  └──────┬──────┘  └─────┬──────┘
          │               │               │
          │         ┌─────▼─────┐         │
          │         │ arena     │         │
          │         │  vs mode  │◄────────┘
          │         └───────────┘
          │
    ┌─────▼─────┐
    │ comparative│
    │ judge.ts  │
    │ (arena)   │
    └───────────┘

  Toolbox functions (importable independently):
    judge.ts        → buildJudgePrompt, runLLMJudge
    bdd-runner.ts   → readCheckpoints
    sanitize.ts     → createSanitizer
    stats.ts        → aggregateSideStats, aggregateAllStats
    comparative-judge.ts → computePareto, runComparativeJudge
    schema.ts       → all zod types, normalizeCriteriaWeights

  Shared adapter layer:
    agents/         → useAgent(player) → AgentAdapter.spawn()
```

---

## Key design rules (post-pr-2)

1. **Markdown is for LLM agents, not for regex parsers.** Task text is read as a raw string and passed directly to `agent.spawn({ brief: taskText })`. No section extraction.
2. **parseAgentMd is retired.** It only exists for backward-compatible test fixtures. Arena runners (single + vs) never call it.
3. **Judge input is natural language.** `JudgeInput.criteria: z.string()` — read from judge.md or arena.toml inline, never rendered from objects.
4. **Judge output is strongly typed.** `JudgeVerdict.parse()` enforces the JSON contract coming back from the LLM.
5. **Arena uses `agent.spawn` directly**, not `runAgentScenario`. agent-bdd is a test harness, not the arena runtime.
6. **Toolbox composition.** runLLMJudge, readCheckpoints, aggregateAllStats, computePareto are free functions — import them wherever needed, no unified entry point required.
