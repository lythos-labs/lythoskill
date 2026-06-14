# TASK-20260613234838986: Refactor probe.ts into intent-plan-execute with IO separation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created from probe hardening session |
| in-progress | 2026-06-14 | Refactored probe.ts into intent-plan-execute with IO separation |

## Background & Goals

`probe.ts` (525 lines) is the most complex command in cortex. It mixes filesystem scanning, content parsing, status inference, console output, and git spawning all in one function `probeStatus()`. This makes it impossible to unit-test the full probe logic without hitting the real filesystem and git.

The deck and cold-pool packages already demonstrate the **intent-plan-execute** pattern:
- `buildXxxPlan()` → pure function, returns data-only plan
- `executeXxxPlan(plan, io)` → injectable IO, testable with mocks

This task applies the same pattern to probe, making the entire probe pipeline testable.

## Requirements

- [ ] Extract `buildProbePlan(config)` — pure function that computes what to scan (directories, files, checks to run) without touching filesystem
- [ ] Extract `executeProbePlan(plan, io)` — runs the plan with injectable IO
- [ ] Define `ProbeIO` interface with all side-effect functions used by probe
- [ ] Migrate existing probe tests to use mock IO instead of temp directories
- [ ] Add new tests for `buildProbePlan` (plan structure assertions)
- [ ] Add new tests for `executeProbePlan` with mock IO (full pipeline)
- [ ] Ensure existing CLI behavior unchanged (console output format, exit codes, flags)
- [ ] Keep `isEmptyShell`, `extractStatusHistory`, `filterEmptyShells` as pure exports (already done)

## Technical Approach

### Reference: Deck/Cold-Pool IO Pattern

**Deck `refresh-plan.ts`:**
```typescript
export interface RefreshIO {
  gitPull?: (dir: string) => { status: 'updated' | 'up-to-date' | 'failed'; message: string }
  log?: (msg: string) => void
  linkDeck?: (deckPath?: string, workdir?: string) => void
}
export function executeRefreshPlan(plan: RefreshPlan, io?: RefreshIO): RefreshResult[]
```

**Cold-pool `fetch-plan.ts`:**
```typescript
export interface FetchIO {
  log?: (msg: string) => void
  exists?: (path: string) => boolean
  gitClone?: (url: string, targetDir: string, opts?: { depth?: number; ref?: string }) => void
}
export function executeFetchPlan(plan: FetchPlan, io?: FetchIO): FetchResult
```

**Deck `remove.ts` (full IO injection):**
```typescript
export interface DeckIO {
  error: (msg: string) => void
  exit: (code?: number) => never
  warn: (msg: string) => void
  log: (msg: string) => void
}
const defaultIO: DeckIO = { error: console.error, exit: process.exit, warn: console.warn, log: console.log }
```

### Probe IO Analysis

Current `probe.ts` uses these IO operations:

| Operation | Current Location | IO Type |
|-----------|-----------------|---------|
| `existsSync(dir)` | `scanDir()` | fs |
| `readdirSync(dir, {withFileTypes: true})` | `scanDir()` | fs |
| `readFileSync(file, 'utf-8')` | `probeFiles()`, `detectEmptyShells()`, staleness check, ADR-Epic coupling | fs |
| `spawnSync('git', ...)` | coverage drift check | process |
| `console.log()` | `printResults()`, `probeStatus()` | stdout |
| `console.warn()` | staleness error catch | stderr |
| `listActiveEpics(config)` | `probeStatus()` lane check | fs (indirect) |
| `countByLane(epics)` | `probeStatus()` lane check | pure (already) |
| `process.cwd()` | `relative(process.cwd(), file)` | env |

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CLI Layer (probe.ts or cli.ts)                              │
│  ───────────────────────────────                             │
│  probeStatus(config, opts)                                   │
│    → buildProbePlan(config, opts)    [pure]                 │
│    → executeProbePlan(plan, io)      [injected IO]          │
│    → printProbeSummary(results)      [console output]        │
└─────────────────────────────────────────────────────────────┘

ProbeIO interface:
  readFile: (path: string) => string | null      // null = unreadable
  readdir: (path: string) => { name: string; isDirectory: boolean }[] | null
  exists: (path: string) => boolean
  spawn: (cmd: string, args: string[], opts?: { encoding?: string; timeout?: number }) => { status: number | null; stdout: string; stderr: string }
  log: (msg: string) => void
  warn: (msg: string) => void
  cwd: () => string

Default IO (production):
  readFile: (p) => { try { return readFileSync(p, 'utf-8') } catch { return null } }
  readdir: (p) => { try { return readdirSync(p, {withFileTypes: true}).map(...) } catch { return null } }
  exists: existsSync
  spawn: spawnSync
  log: console.log
  warn: console.warn
  cwd: process.cwd

ProbePlan structure:
  {
    tasks: { dir: string; statusKey: string; files: string[] }[]
    epics: { dir: string; statusKey: string; files: string[] }[]
    adrs: { dir: string; statusKey: string; files: string[] }[]
    checks: {
      statusConsistency: boolean
      laneOccupancy: boolean
      adrEpicCoupling: boolean
      staleness: boolean
      emptyShells: boolean
      coverageDrift: boolean
      nonAsciiSlugs: boolean
    }
    options: { suspicious: boolean; includeCompletedEmptyShells: boolean }
  }

ProbeResult structure (already exists, keep compatible):
  {
    file: string
    type: 'task' | 'epic' | 'adr'
    expectedStatus: string
    lastHistoryLine: string | null
    hasHistorySection: boolean
    match: 'ok' | 'mismatch' | 'missing-history' | 'unclear'
    suggestion: string
  }

ProbeReport structure (new — returned by executeProbePlan, consumed by printProbeSummary):
  {
    statusResults: ProbeResult[]           // per-file status consistency checks
    laneWarnings: string[]                // epic lane occupancy issues
    couplingWarnings: string[]            // ADR-Epic coupling issues
    staleBacklog: string[]                // old backlog tasks
    driftedEpics: string[]                 // old active epics
    emptyShells: string[]                  // template-not-filled detections (after filterEmptyShells)
    coverageDrift: string[]               // packages with commits since coverage snapshot
    nonAsciiSlugs: string[]               // filenames with non-ASCII characters
    summary: {
      totalIssues: number
      hasStatusIssues: boolean
      hasLaneIssues: boolean
      hasCouplingIssues: boolean
      hasStaleness: boolean
      hasEmptyShells: boolean
      hasCoverageDrift: boolean
      hasNonAsciiSlugs: boolean
    }
  }
```

### Refactoring Steps

1. **Extract `buildProbePlan(config, opts)`** from `probeStatus()` lines 249-296:
   - Compute all directories to scan from `config.taskSubdirs`, `config.epicSubdirs`, `config.adrSubdirs`
   - Return plan with directory lists, NO file scanning
   - Pure: no `existsSync`, no `readdirSync`

2. **Extract `executeProbePlan(plan, io)`** from `probeStatus()` lines 297-525:
   - Use `io.readdir` + `io.exists` to scan directories (replaces `scanDir`)
   - Use `io.readFile` to read file contents (replaces `readFileSync` in `probeFiles`, `detectEmptyShells`, etc.)
   - Use `io.spawn` for git coverage drift check
   - Does NOT print to console — returns `ProbeReport` (pure data output)
   - `io.log` / `io.warn` are only used for **internal progress/debug** (optional), not for user-visible output

3. **Extract `printProbeSummary(report, io)`**:
   - **必达** (not optional): required to satisfy "CLI output format unchanged" acceptance criterion
   - Takes `ProbeReport` + `io.log`
   - Prints the exact same console output as current `probeStatus()`
   - Separates data production from presentation
   - CLI layer (`probeStatus`) calls: `const report = executeProbePlan(plan, io); printProbeSummary(report, io);`

4. **Keep `probeStatus(config, opts)` as the public CLI entry point**:
   - `probeStatus` remains exported from `probe.ts` as the thin wrapper
   - Internal implementation: `const plan = buildProbePlan(config, opts); const report = executeProbePlan(plan, defaultProbeIO); printProbeSummary(report, defaultProbeIO);`
   - Do NOT change `probeStatus`'s signature or move it to `cli.ts`
   - This preserves backward compatibility for any code importing `probeStatus` directly

4. **Keep existing pure functions**:
   - `isEmptyShell(content)` — already pure, no change
   - `extractStatusHistory(content)` — already pure, no change
   - `filterEmptyShells(shells, mode)` — already pure, no change
   - `checkMatch(expectedKey, lastHistory)` — already pure, no change
   - `inferStatusFromPath(filePath, config)` — already pure, no change

5. **Test migration**:
   - Existing `probe.test.ts` tests `isEmptyShell`, `filterEmptyShells`, `extractStatusHistory` — keep as-is
   - Add `probe-plan.test.ts` for `buildProbePlan` (plan structure)
   - Add `probe-execute.test.ts` for `executeProbePlan` with mock IO
   - Mock IO pattern: `readFile` returns Map<string, string>, `readdir` returns Map<string, DirEntry[]>, `log` pushes to array

### Key File Paths

| Role | Path |
|------|------|
| Main probe command | `packages/lythoskill-project-cortex/src/commands/probe.ts` |
| Existing tests | `packages/lythoskill-project-cortex/src/commands/probe.test.ts` |
| New plan tests | `packages/lythoskill-project-cortex/src/commands/probe-plan.test.ts` (new) |
| New execute tests | `packages/lythoskill-project-cortex/src/commands/probe-execute.test.ts` (new) |
| Types | `packages/lythoskill-project-cortex/src/types.ts` — may need `ProbeIO`, `ProbePlan` types |
| Reference: deck refresh | `packages/lythoskill-deck/src/refresh-plan.ts` |
| Reference: deck remove | `packages/lythoskill-deck/src/remove.ts` |
| Reference: cold-pool fetch | `packages/lythoskill-cold-pool/src/fetch-plan.ts` |

### Scope Boundaries

- **必达**: `buildProbePlan` + `executeProbePlan` + `ProbeIO` interface + `printProbeSummary` + 测试覆盖
- **可选**: 无 — `printProbeSummary` 已从"可选"改为"必达"（见 Refactoring Steps #3），因为验收标准明确要求 CLI 输出格式不变
- **不做**: 改变 probe 的 CLI 输出格式或行为（用户可见行为必须不变）
- **不做**: 改变 `isEmptyShell` / `filterEmptyShells` / `extractStatusHistory` 的逻辑（它们已经是纯函数）
- **不做**: 重构 `scanDir` 为独立文件（它将被 `executeProbePlan` 内联替代）
- **不做**: 改变 `WorkflowConfig` 类型结构
- **错误处理**: `executeProbePlan` 中 IO 失败（如 `readFile` 返回 null）应 graceful skip，与当前行为一致（当前用 `try/catch` 或 `catch { /* skip */ }`）
- **printProbeSummary 的 log 使用**: `printProbeSummary` 使用 `io.log` 打印用户可见输出；`executeProbePlan` 不使用 `io.log` 打印用户可见输出（它返回 `ProbeReport`）。如果 `executeProbePlan` 需要内部 debug 日志，使用 `io.warn` 或一个可选的 `debug` 回调。

## Acceptance Criteria

- [x] `buildProbePlan` is pure: same config → same plan, no filesystem access
- [x] `executeProbePlan` accepts `ProbeIO` and can be tested with 100% mock IO
- [x] All existing probe tests still pass (no regression)
- [x] New tests cover: plan building, execute with mock IO, full pipeline end-to-end
- [x] `cortex probe` CLI output format unchanged (verified by manual run or snapshot test)
- [x] `cortex probe --suspicious` and `--include-completed-empty-shells` flags still work
- [x] No `process.exit` inside `executeProbePlan` (exit is CLI layer responsibility, per deck/remove pattern)

## Progress Log

- 2026-06-14 03:45 UTC: Extracted `buildProbePlan`, `executeProbePlan`, `printProbeSummary` from `probeStatus`
- 2026-06-14 03:45 UTC: Defined `ProbeIO`, `ProbePlan`, `ProbeReport` interfaces
- 2026-06-14 03:45 UTC: Added `probe-plan.test.ts` (8 tests) and `probe-execute.test.ts` (11 tests)
- 2026-06-14 03:45 UTC: All 49 probe tests pass (30 existing + 19 new)
- 2026-06-14 03:45 UTC: Full monorepo test suite passes (300+ tests across all packages)
- 2026-06-14 03:45 UTC: `cortex probe` and `cortex probe --suspicious` output verified unchanged
- 2026-06-14 03:45 UTC: Lane check inlined into `executeProbePlan` using `io.readFile` + `parseFrontmatter` (no longer calls `listActiveEpics` which did real fs IO)
- 2026-06-14 03:45 UTC: `--include-completed-empty-shells` flag preserved via `ProbeReport.summary.includeCompletedEmptyShells`
- 2026-06-14 03:45 UTC: Removed unused `listActiveEpics`/`countByLane` imports from `probe.ts` (lane logic now self-contained)
- 2026-06-14 03:45 UTC: `probeStatus` remains thin wrapper with unchanged signature for backward compatibility
- 2026-06-14 03:45 UTC: No `process.exit` inside `executeProbePlan` (per deck/remove pattern)
- 2026-06-14 03:45 UTC: All pure functions (`isEmptyShell`, `extractStatusHistory`, `filterEmptyShells`, `checkMatch`, `inferStatusFromPath`) kept unchanged
- 2026-06-14 03:45 UTC: `relative()` path resolution fixed to handle relative mock paths correctly via `resolve(cwd, file)` before computing relative

## Acceptance Criteria

- [x] `buildProbePlan` is pure: same config → same plan, no filesystem access
- [x] `executeProbePlan` accepts `ProbeIO` and can be tested with 100% mock IO
- [x] All existing probe tests still pass (no regression)
- [x] New tests cover: plan building, execute with mock IO, full pipeline end-to-end
- [x] `cortex probe` CLI output format unchanged (verified by manual run or snapshot test)
- [x] `cortex probe --suspicious` and `--include-completed-empty-shells` flags still work
- [x] No `process.exit` inside `executeProbePlan` (exit is CLI layer responsibility, per deck/remove pattern)


## Related Files
- Modified: `packages/lythoskill-project-cortex/src/commands/probe.ts`
- New: `packages/lythoskill-project-cortex/src/commands/probe-plan.test.ts`
- New: `packages/lythoskill-project-cortex/src/commands/probe-execute.test.ts`
- Reference: `packages/lythoskill-deck/src/refresh-plan.ts`, `remove.ts`
- Reference: `packages/lythoskill-cold-pool/src/fetch-plan.ts`

## Git Commit Message
```
refactor(cortex): extract probe plan/execute with injectable IO (TASK-20260613234838986)

- buildProbePlan(config): pure function returning scan plan
- executeProbePlan(plan, io): injectable IO for testability
- ProbeIO interface: readFile, readdir, exists, spawn, log, warn, cwd
- probe-plan.test.ts: plan structure assertions
- probe-execute.test.ts: full pipeline with mock IO
- Keep isEmptyShell/extractStatusHistory/filterEmptyShells as pure exports
```

## Notes
- The probe is the most complex cortex command. This refactor is prerequisite for any future probe enhancements (new checks, new flags).
- Deck's `remove.ts` uses `exit: (code?: number) => never` in `DeckIO` — probe does NOT need `exit` in `ProbeIO` because probe never exits early; it always prints summary and returns.
- Cold-pool's `executeFetchPlan` returns `FetchResult` — probe's `executeProbePlan` should return a structured `ProbeReport` containing all findings (status issues, lane warnings, coupling warnings, stale items, empty shells, coverage drift, non-ASCII slugs) so `printProbeSummary` can consume it.
