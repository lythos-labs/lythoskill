# TASK-20260829090402490: implement deepseek-harness headless player adapter

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-29 | Created |
| in-progress | 2026-08-31 | Started |
| review | 2026-08-31 | Deliverables committed |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Follow-up to TASK-20260828004417068 (dsh integration survey → `cortex/wiki/02-research/2026-08-29-deepseek-harness-integration-survey.md`). The survey's recommendation is **adapter-only**: dsh's official `headless` profile (`dsh --profile headless "task"`) is a documented one-shot contract — one fresh persisted Agent, final assistant text on stdout, reasoning on stderr, exit 0 on `completed` else 1, no port, invoking directory = workspace root (default `workspace-write` preset). This maps near-1:1 onto `AgentAdapter.spawn` and is strictly simpler than the current deepseek-serve daemon adapter. Feeds ADR-20260828004129233 (adapter lifecycle: upstream probe declaration applies cleanly — `binaries: ['dsh']`, rc version range). Note ADR-20260828004129143: host-handoff is arena's default; this adapter serves the cross-player-comparison specialist case.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] New package `lythoskill-agent-adapter-deepseek-harness` implementing the `AgentAdapter` interface (`packages/lythoskill-agent-adapter/src/types.ts`) — thin subprocess wrap of `dsh --profile headless "<brief>"` in the given cwd, capturing `{stdout, stderr, code, durationMs}`
- [x] Upstream probe per ADR-20260828004129233: detect `dsh` binary, parse `-V`/`--version`, declare supported rc version range
- [x] Known-gap handling documented: `checkpoints[]` empty (headless exposes only reasoning deltas + final text); model tier selection via profile config, not CLI flag
- [x] Co-located tests mocking the subprocess (follow existing adapter test patterns)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- Closest model: `packages/lythoskill-agent-adapter-deepseek-serve/src/deepseek-serve.ts` — the dsh adapter drops the HTTP daemon lifecycle entirely.
- Contract source (primary, machine-checked): `apps/cli/reference/README.md` in deepseek-ai/deepseek-harness — headless section quoted in the survey doc §Q3.
- dsh requires Node ≥22.19; adapter shells out, so no Bun/Node in-process compatibility concern.
- Survey doc: `cortex/wiki/02-research/2026-08-29-deepseek-harness-integration-survey.md` (§Q3 "Is dsh viable as a lythoskill-arena player").

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] `arena single --player deepseek-harness` runs a one-shot task through a real dsh headless invocation → Verify: **REAL SMOKE PASS 2026-08-31** — dsh 0.1.1-rc.2 installed globally (Node v24.19.0 via nvm, credentials from `$DSH_HOME/.credentials.yaml`), `arena single --player deepseek-harness --brief "Reply with exactly: DSH-SMOKE-OK"` → probe detected 0.1.1, exit 0, `/tmp/dsh-real-smoke/agent-stdout.txt` = exactly `DSH-SMOKE-OK`
- [x] Probe correctly reports dsh absent / wrong version → Verify: unit tests with injected ProbeRunner — absent (exit 127/unparseable), out-of-range (1.0.0), stderr-only version, rc-suffix strip; 13 tests pass
- [x] `bun --filter='*' run test` EXIT=0 with the new package included → verified 2026-08-31 (EXIT=0 after `bun install` registered the workspace)
- [x] README for the new package documents prerequisites (Node ≥22.19, dsh install, DEEPSEEK_API_KEY) → `packages/lythoskill-agent-adapter-deepseek-harness/README.md` + support matrix row

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-29: Card filled from survey recommendation (TASK-20260828004417068).
- 2026-08-31: Implemented. New package `@lythos/agent-adapter-deepseek-harness` (thin subprocess wrap of `dsh --profile headless`, upstream probe pinned `>=0.1.0 <1.0.0` fail-closed per ADR-20260828004129233). `satisfiesVersionRange` re-exported from `@lythos/agent-adapter` (shared Option-B util). Arena registration: runner.ts + cli.ts dynamic imports, player.ts entries `deepseek-harness` + alias `dsh`, optionalDependencies. publish.sh PACKAGES + arena README player list synced. Full gate EXIT=0. Real-dsh smoke run blocked (binary absent) — see acceptance.
- 2026-08-31: Stub-upstream e2e 留档 PASS (3/3) — `test/scenarios/headless-stub-e2e-bdd/reproduce.sh`: happy path through full arena CLI (final text → artifacts), fail-closed on out-of-range 1.0.0 (HATEOAS, exit 1), `--player dsh` alias resolution. Transcript + artifacts in the scenario's `run-output/`. Stub emulates the documented headless contract only; does NOT clear the real-dsh smoke acceptance.
- 2026-08-31: ZK skeptic PASS-WITH-NITS (P3: probeDshUpstream ignored exitCode → fixed, explicit non-zero check). Full gate + CI-sim (`env -u CLAUDE_CODE_SSE_PORT -u CLAUDECODE`) both EXIT=0.
- 2026-08-31: **Real-dsh smoke PASS** — user sanctioned install; `npm i -g @deepseek-ai/dsh` under Node v24.19.0 (nvm), dsh 0.1.1-rc.2. `arena single --player deepseek-harness` → probe 0.1.1 → exit 0 → stdout exactly `DSH-SMOKE-OK`. All 4 acceptance items now checked.

## Related Files
- Modified: `packages/lythoskill-agent-adapter/src/index.ts` (re-export), `packages/lythoskill-arena/src/{runner.ts,cli.ts,player.ts}`, `packages/lythoskill-arena/{package.json,README.md}`, `scripts/publish.sh`, `bun.lock`
- Added: `packages/lythoskill-agent-adapter-deepseek-harness/` (package.json, README.md, src/{index.ts,deepseek-harness.ts,deepseek-harness.test.ts}, test/scenarios/headless-stub-e2e-bdd/)

## Git Commit Message
```
feat(scope): description (TASK-20260829090402490)

- Detail 1
- Detail 2
```

## Notes
