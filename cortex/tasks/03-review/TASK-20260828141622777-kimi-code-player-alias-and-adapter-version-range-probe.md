# TASK-20260828141622777: kimi-code player alias and adapter version-range probe

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |
| in-progress | 2026-08-28 | Started |
| review | 2026-08-28 | Deliverables committed |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260828004129233 (accepted 2026-08-28, now in `cortex/adr/02-accepted/`, Option B): each player adapter declares its supported upstream (binary name + version range), probes `--version` at spawn, and fails closed with a loud HATEOAS error on unknown/out-of-range. An alias table absorbs upstream renames.

**Verified facts (live, 2026-08-28 — these correct the ADR's assumption):**
- kimi-code's binary is named **`kimi`**, not `kimi-code` (v0.38.0 at `~/.kimi-code/bin/kimi`). The legacy Python kimi-cli's binary is `kimi-cli` (v1.x — self-reports as `kimi, version 1.45.0`, so version-output parsing must discriminate on the MAJOR version, not the product name). So the ADR's example alias `kimi` → `kimi-code` is wrong at the *binary* level; at the *player* level, users will guess `kimi-code` and should land on the kimi player.
- In-repo today: `packages/lythoskill-agent-adapter/src/adapters/kimi.ts:10-21` — `detectKimiBinary()` prefers `kimi-cli`, falls back to `kimi`. `buildKimiCommand` always passes `--print --output-format stream-json` (kimi.ts:32) — **which kimi-code does not support** (comment at kimi.ts:13).
- The real quiet-degradation path (ZK round 2 correction): `parseKimiStreamJson` (kimi.ts:40-89) **never throws** — every line is individually try/caught (kimi.ts:47-85), so kimi-code's non-stream-json stdout parses to `{text: '', checkpoints: []}` and `spawnKimi` returns it as a successful-but-empty run (kimi.ts:140). The catch-all at kimi.ts:126-130 is unreachable dead code. The fix must detect protocol mismatch (zero parsed events + non-empty raw stdout / non-zero exit) and fail loudly — not "fix" the dead catch branch.

So the real work: capability-aware upstream detection (which upstream is behind the binary + which flag set it speaks), version-range declarations, fail-closed on mismatch, and a player-level alias so `kimi-code` resolves to the kimi player.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Adapter contract extension in `packages/lythoskill-agent-adapter/src/types.ts` (read it first): an **optional** `upstream: { binaries: string[]; versionRange: string; probeArgs: string[] }` field on `AgentAdapter` — optional so this task touches only the kimi adapter; other adapters stay unprobed (current behavior). binaries plural because kimi has two (`kimi-cli` legacy, `kimi` = kimi-code)
- [ ] R2 (必达) Spawn-time probe **inside the adapter's spawn path** (the adapter owns its upstream knowledge; not a registry wrapper): run `<binary> <probeArgs>` (e.g. `--version`), parse, check against `versionRange`; unknown binary or out-of-range → loud HATEOAS error (what was found / why rejected / how to fix). For kimi specifically: probed kimi-code (0.x) → use kimi-code's real flag set (research: `--prompt`? print mode? — verify against the installed binary, do not guess); probed kimi-cli (1.x) → existing `--print` set. **Version-output trap**: both binaries self-report as "kimi" — discriminate on major version (0.x = kimi-code, 1.x = kimi-cli)
- [ ] R3 (必达) Player-level alias: `kimi-code` resolves to the kimi player (users will guess the new name). Alias resolution happens in `packages/lythoskill-arena/src/player.ts` (`BUILTIN_PLAYERS` map, lines 14-23) or the adapter `registry.ts` — pick one layer, state it in the Progress Log. Alias is data (one row), prints a one-line note ("player 'kimi-code' = 'kimi'"). No expiry needed here since both names mean the same current upstream; the ADR's one-minor-cycle expiry applies to future *breaking* renames
- [ ] R4 (必达) Tests. No spawn-injection precedent exists (kimi.test.ts / claude-cli.test.ts only do parameter injection into pure builders, e.g. kimi.test.ts:15) — so extract version-parse / range-check / protocol-mismatch detection into **pure functions taking the probe's stdout string**, per the repo's Intent/Plan/Execute convention, and fixture those. Matrix: in-range kimi-code, in-range kimi-cli, out-of-range, missing binary, alias `kimi-code` resolution, and the regression test — kimi-code probed but invoked with `--print` must NOT silently return empty/raw stdout as success
- **不做**: no `deepseek-harness` adapter (research first — TASK-20260828004417068); no eager chasing of other upstream renames; no `arena doctor` mechanization (ADR lists it as future); no support-matrix doc (TASK-20260828141622828); no `upstream` declarations for other adapters (R1 is optional-field, kimi only)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Code to reconcile with first: `packages/lythoskill-agent-adapter/src/adapters/kimi.ts` — `detectKimiBinary` (lines 10-21), `buildKimiCommand` (24-33), `parseKimiStreamJson` (40-89, never throws), `spawnKimi` (incl. dead catch-all 126-130, empty-stdout return 140), loud binary-not-found throw (147-150). Registry/types: `src/registry.ts`, `src/types.ts` (`AgentAdapter` at types.ts:34-55). Player resolution: `packages/lythoskill-arena/src/player.ts` (`BUILTIN_PLAYERS` lines 14-23) + `cli.ts:276` (`resolvePlayer`).
- The empty-stdout-passes-as-success fix is the highest-value piece — an unexpected-protocol response must fail loudly.
- Version parsing: no semver lib in any package.json (verified) — hand-roll a minimal compare; keep dependency-free per repo instinct.
- Deprecation-window precedent: `cortex/epics/99-done/EPIC-20260518145235543-*.md` (claude-cli deprecation — note: often mislabeled "ADR-20260518145235543", including in `player.ts:15`; it is an EPIC with tasks A-D, not deprecation-window policy).

### Implementation plan (2026-08-28, post-repro design — verified facts below all reproduced live)

**Reproduced facts**: (1) `kimi --print --output-format stream-json` → exit 1, empty stdout, stderr `error: unknown option '--print'` — silent passthrough confirmed. (2) arena `singleRun` (cli.ts:348) never checks `agentResult.code`; runner.ts:324 per-cell catch converts a throw into an ERROR verdict — throwing from the adapter is a safe loud failure on both paths. (3) kimi-code 0.38.0's working flag set: `kimi --prompt <prompt> --output-format stream-json` (prompt mode is mutually exclusive with `--auto`/`--yolo`; `--output-format` requires prompt mode, no stdin). (4) kimi-code's stream-json is schema-compatible with `parseKimiStreamJson` (`role:"assistant"` + string content, plus `role:"meta"` lines skipped by the role filter) — live capture parsed to `PROBE_OK`. (5) Version fingerprints: `kimi --version` → `0.38.0`; `kimi-cli --version` → `kimi, version 1.45.0`. (6) All callers of `buildKimiCommand`/`parseKimiStreamJson` are kimi.ts + kimi.test.ts — signature can evolve safely.

**Design**:
- R1: `AgentAdapter.upstream?: { binaries: string[]; versionRange: string; probeArgs: string[] }` (optional; kimi declares `binaries: ['kimi-cli','kimi']`, `versionRange: '>=0.30.0 <2.0.0'`, `probeArgs: ['--version']`).
- R2 pure functions in kimi.ts: `parseKimiVersion` (first `\d+\.\d+\.\d+` in output), `classifyKimiUpstream` (0→kimi-code, 1→kimi-cli, else null = fail closed), `satisfiesVersionRange` (hand-rolled `>=`/`>`/`<=`/`<` comparators), `buildKimiCommand(modelTier, binary, upstream='kimi-cli', prompt?)` (kimi-code → `--prompt <prompt>`, never `--print`), `detectKimiProtocolMismatch({code, rawStdout, stderr, events})` (code≠0 → error w/ stderr snippet; code 0 + non-empty stdout + 0 events → protocol mismatch; code 0 + empty stdout → no output; else null — deliberately does NOT reject "events but no text"). `parseKimiStreamJson` gains `events: number` in its return (backward compatible).
- R2 IO flow in spawnKimi: detectKimiBinary → `Bun.spawnSync([binary, '--version'])` probe → parse/classify/range-check (failure → HATEOAS Error: found / supported / fix) → upstream-specific command (kimi-code: prompt in argv, no temp file) → spawn → parse → mismatch check → throw HATEOAS Error. Dead catch-all (kimi.ts:127-130) deleted. Probe runs per spawn (≈10-50ms, no cache-staleness class).
- R3 layer choice: `arena/src/player.ts` BUILTIN_PLAYERS + one-line note in `singleRun` (cli.ts:276) only — precedent `'claude-code': 'claude-sdk'`; registry layer would make the adapter package know arena concepts; runner.ts per-cell resolution stays quiet (no per-cell spam).
- Reliability: fix at adapter layer covers all three spawn consumers (singleRun, runner cells, comparative-judge) which never check exit codes; schema compatibility is measured not assumed; probe is ground truth not name-guessing; fail-closed only outside known-good ranges (ADR Option B semantics).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `bun --filter='@lythos/agent-adapter' run test` green incl. the R4 fixture matrix → Verify: run it
- [ ] Live: `arena single --player kimi --brief "x"` on the maintainer machine (both `kimi` v0.38.0 and `kimi-cli` v1.45.0 installed) uses the probed upstream's correct flag set → Verify: run with a harmless brief, inspect output is real agent output, not empty/raw passthrough
- [ ] `arena single --player kimi-code --brief "x"` resolves via alias with the one-line note → Verify: run it
- [ ] Out-of-range/missing probe → loud HATEOAS error, exit non-zero → Verify: stub binary on PATH printing a bogus version
- [ ] `bun --filter='*' run test` green overall → Verify: run it (canonical)

## Implementation Results (2026-08-28)
- `bun --filter='@lythos/agent-adapter' run test` → 51 pass, 0 fail (incl. full R4 matrix: version parse/classify/range, kimi-code command build, real kimi-code capture parse, protocol-mismatch matrix with the live-bug regression fixture)
- `bun --filter='@lythos/skill-arena' run test` → 146 pass, 0 fail (incl. alias resolution + note tests; 145 before review-condition fixes)
- Live A (kimi-code path, kimi-cli hidden from PATH): `arena single --player kimi` → real output `ARENA_777_OK`, exit 0
- Live B (alias): `arena single --player kimi-code` → prints `ℹ️  player 'kimi-code' = 'kimi' (built-in alias)`, real output, exit 0
- Live C (out-of-range): stub `kimi` printing `9.9.9` → exit 1, HATEOAS error (Detected 9.9.9 / Supported ranges / Fix)
- `bun --filter='*' run test` → EXIT=0 (canonical gate)


## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260828004129233 acceptance (Option B).
- 2026-08-28: ZK review round 1 — P1 (binary-name contradiction) resolved by live verification: kimi-code's binary IS `kimi` (v0.38.0); card rewritten around capability detection + player-level alias. P1/P2 (alias layer unspecified) → R3 names the layer choice. P2 (ADR→EPIC mislabel) fixed with note.
- 2026-08-28: ZK round 2 (PASS-WITH-NITS) — P2s fixed: real degradation mechanism is parseKimiStreamJson's never-throw empty-text passthrough (catch-all 126-130 is dead code); R1 `upstream` declared optional, kimi-only scope. P3s applied: no spawn-injection precedent (pure-function extraction instead, R4); kimi-cli self-reports "kimi, version 1.45.0" → discriminate on major version (R2).
- 2026-08-28: Pre-implementation verification + plan-mode design. Live-reproduced the bug (`--print` rejected by kimi-code 0.38.0, exit 1, empty stdout, arena reports success) and live-verified the fix substrate (kimi-code flag set = `--prompt <prompt> --output-format stream-json`; its stream-json parses with the existing parser; version fingerprints for both binaries). Plan written into Technical Approach above.
- 2026-08-28: ZK skeptic review — PASS-WITH-NITS (no P1; regression fix, fail-closed probe, alias, and test counts independently re-verified). user-sim gate — yes-with-conditions. Conditions fixed same-day: (1) `upstream` declaration is now consumed — `probeKimiUpstream`/`detectKimiBinary` take the declared `probeArgs`/`versionRange`/`binaries` instead of hardcoding (both reviewers flagged the inert contract surface); (2) probe success now prints `ℹ️  kimi upstream: kimi-code 0.38.0` on stderr (symmetric with the alias note — upstream visibility on dual-binary machines); (3) card text aligned `-p` → `--prompt`. Remaining P3 pack (probe timeout, probe exit-code check, timeout-kill misdiagnosis, argv-exposure comment, live-artifact persistence) registered as TASK-20260828212204402. Re-verified live after fixes: A (kimi-code path, upstream note + real output), C (stub 9.9.9, improved HATEOAS wording), adapter 51/0 + arena 146/0 green.

## Related Files
- Modified: packages/lythoskill-agent-adapter/src/types.ts (optional `upstream` field on AgentAdapter), adapters/kimi.ts (probe/classify/split flag sets + fail-loud mismatch detection; dead catch-all removed), adapters/kimi.test.ts (fixture matrix incl. live-bug regression), packages/lythoskill-arena/src/player.ts (`kimi-code` alias + `playerAliasNote`), src/cli.ts (one-line alias note in singleRun), player.test.ts
- Added: none

## Git Commit Message
```
feat(agent-adapter): version-range probe + kimi-code player alias (TASK-20260828141622777)

- optional upstream {binaries, versionRange, probeArgs} on AgentAdapter; kimi declares and probes at spawn
- kimi: capability detection picks kimi-cli (1.x) vs kimi-code (0.x) flag sets; protocol mismatch fails loudly (no more empty-stdout-as-success)
- player alias kimi-code -> kimi (data row, one-line note)
- Implements ADR-20260828004129233 Option B; minor-level API addition
```

## Notes
- The ADR's alias-window mechanic (one minor cycle then loud error) is preserved as the generic policy for future breaking renames; the kimi case itself is non-breaking (both names → same current upstream).
