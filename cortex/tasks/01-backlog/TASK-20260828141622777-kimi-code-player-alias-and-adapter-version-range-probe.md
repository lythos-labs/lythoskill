# TASK-20260828141622777: kimi-code player alias and adapter version-range probe

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

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

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `bun --filter='@lythos/agent-adapter' run test` green incl. the R4 fixture matrix → Verify: run it
- [ ] Live: `arena single --player kimi --brief "x"` on the maintainer machine (both `kimi` v0.38.0 and `kimi-cli` v1.45.0 installed) uses the probed upstream's correct flag set → Verify: run with a harmless brief, inspect output is real agent output, not empty/raw passthrough
- [ ] `arena single --player kimi-code --brief "x"` resolves via alias with the one-line note → Verify: run it
- [ ] Out-of-range/missing probe → loud HATEOAS error, exit non-zero → Verify: stub binary on PATH printing a bogus version
- [ ] `bun --filter='*' run test` green overall → Verify: run it (canonical)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260828004129233 acceptance (Option B).
- 2026-08-28: ZK review round 1 — P1 (binary-name contradiction) resolved by live verification: kimi-code's binary IS `kimi` (v0.38.0); card rewritten around capability detection + player-level alias. P1/P2 (alias layer unspecified) → R3 names the layer choice. P2 (ADR→EPIC mislabel) fixed with note.
- 2026-08-28: ZK round 2 (PASS-WITH-NITS) — P2s fixed: real degradation mechanism is parseKimiStreamJson's never-throw empty-text passthrough (catch-all 126-130 is dead code); R1 `upstream` declared optional, kimi-only scope. P3s applied: no spawn-injection precedent (pure-function extraction instead, R4); kimi-cli self-reports "kimi, version 1.45.0" → discriminate on major version (R2).

## Related Files
- Modified: packages/lythoskill-agent-adapter/src/types.ts, adapters/kimi.ts, packages/lythoskill-arena/src/player.ts (pending)
- Added: (pending)

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
