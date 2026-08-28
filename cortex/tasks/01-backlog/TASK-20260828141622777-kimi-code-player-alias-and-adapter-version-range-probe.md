# TASK-20260828141622777: kimi-code player alias and adapter version-range probe

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260828004129233 (accepted 2026-08-28, Option B): each player adapter declares its supported upstream (binary name + version range), probes `--version` at spawn, and fails closed with a loud HATEOAS error on unknown/out-of-range. An alias table absorbs upstream renames — old names keep resolving for one minor cycle with a deprecation warning, then become loud errors.

Concrete driver: Moonshot's `kimi-cli` (Python) is winding down in favor of `kimi-code` (Node.js rewrite, designated successor). Our `kimi` player shells out to a `kimi` binary. When the user's machine only has `kimi-code`, the player silently breaks today.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Adapter contract extension: each adapter in `packages/lythoskill-agent-adapter/src/adapters/` declares `upstream: { binary: string; versionRange: string; aliases?: Record<string, { until: string }> }` (exact shape to be designed against `types.ts` — read it first)
- [ ] R2 (必达) Spawn-time probe: run `<binary> --version` (or adapter-declared equivalent); parse + check against `versionRange`; unknown binary or out-of-range → loud HATEOAS error (what was found / why rejected / how to fix: install X or pin Y)
- [ ] R3 (必达) Alias: `kimi` → `kimi-code`. Old name resolves with a one-line deprecation warning ("player 'kimi' is now 'kimi-code'; alias valid until v0.19.0"); after the alias window it becomes a loud error. Window start = the release containing this change (current version 0.17.11 → alias valid through 0.18.x, error from 0.19.0)
- [ ] R4 (必达) Tests with fake version outputs: in-range, out-of-range, missing binary, alias-with-warning path, alias-expired path (inject spawn per repo IO-injection convention)
- **不做**: no `deepseek-harness` adapter (research first — TASK-20260828004417068); no eager chasing of other upstream renames; no `arena doctor` mechanization (mentioned as future in the ADR)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Adapter layer: `packages/lythoskill-agent-adapter/src/` — `registry.ts`, `types.ts`, `adapters/` (read all three before designing the contract). Kimi-specific adapter: `packages/lythoskill-agent-adapter-claude-sdk/` is the claude one; check how player resolution flows from `packages/lythoskill-arena/src/player.ts` + `cli.ts:276` (`resolvePlayer`).
- Version parsing: semver-ish compare; keep it dependency-light (check whether a semver lib is already in node_modules before hand-rolling).
- The alias table should be data (config in the adapter package), not code branches — a rename becomes a one-row change.
- Support matrix doc = separate card TASK-20260828141622828 (depends on this card's declared data).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `bun --filter='@lythos/agent-adapter' run test` (and arena package tests) green incl. the R4 fixture matrix → Verify: run it
- [ ] Manual: `arena single --player kimi ...` on a machine state where only the alias path resolves → deprecation warning printed, run proceeds via kimi-code → Verify: run with a stubbed binary on PATH (document the stub setup in Progress Log)
- [ ] Out-of-range stub (`--version` prints garbage/old) → loud HATEOAS error, exit non-zero → Verify: run it
- [ ] `bun --filter='*' run test` green overall → Verify: run it (canonical)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260828004129233 acceptance (Option B).

## Related Files
- Modified: packages/lythoskill-agent-adapter/src/{types,registry}.ts, adapters/, packages/lythoskill-arena/src/player.ts (pending)
- Added: (pending)

## Git Commit Message
```
feat(agent-adapter): version-range probe + kimi->kimi-code alias (TASK-20260828141622777)

- adapters declare upstream {binary, versionRange, aliases}; spawn-time --version probe fails closed
- kimi alias resolves with deprecation warning until v0.19.0, then loud error
- Implements ADR-20260828004129233 Option B; minor-level API addition
```

## Notes
- Precedent for binding breakage: ADR-20260518145235543 (claude-cli deprecation) — read before finalizing the deprecation-window mechanics.
