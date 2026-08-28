# TASK-20260828141622828: publish player adapter support matrix

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260828004129233 (accepted 2026-08-28, now in `cortex/adr/02-accepted/`, Option B) names a **support matrix** — player × upstream × supported versions × status — living in the adapter README as SSOT. "The matrix makes 'what do we support' reviewable and gives new players (deepseek-harness) a clear entry path."

**Depends on TASK-20260828141622777** (adapters must actually declare `upstream {binaries, versionRange, aliases}` before the matrix has real data). Start after that one lands, or write against its declared contract if development runs in parallel — if …777 hasn't landed, write the version/alias columns from its R1/R3 draft and mark those cells "(pending TASK-20260828141622777)".

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) `packages/lythoskill-agent-adapter/README.md` gains a support matrix table. **Player inventory source: `grep -rn "registerAgent(" packages/*/src --include='*.ts' | grep -v test | grep -v registry.ts`** — `src/registry.ts` is an empty runtime registry, NOT a player list (ZK review finding). Current inventory (accurate 2026-08-28 — re-run the grep, don't trust this card blindly): `kimi` (kimi.ts:159), `claude-cli` deprecated (claude-cli.ts:197-198 — note it registers BOTH `'claude'` and `'claude-cli'` for the same deprecated adapter: represent `'claude'` in the aliases column of the claude-cli row, NOT as a separate row), `claude-sdk` (`lythoskill-agent-adapter-claude-sdk/src/index.ts:155`), `codex` (`lythoskill-agent-adapter-codex/src/index.ts:125`), `deepseek` (`lythoskill-agent-adapter-deepseek-serve/src/deepseek-serve.ts:300`). Columns: player name, upstream binary, supported version range, aliases, status (active / deprecated / planned)
- [ ] R2 (必达) The matrix includes a "planned" row for deepseek-harness pointing at TASK-20260828004417068 (research task). `cursor`/`gemini` are OUT of scope — mentioned in the README (line 60) as "built-in pass-through" but have no adapter; add one line reconciling that README mention with reality
- [ ] R3 (必达) A "Keeping this matrix honest" subsection in the README: when adding/renaming an adapter, update the matrix in the same PR (doc-exhorted for now; mechanized `arena doctor` is future work, not this card)
- **不做**: no `arena doctor` implementation; no runtime changes — documentation only

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Read `packages/lythoskill-agent-adapter/README.md` (current lifecycle docs; existing player table at lines 54-60 notably LACKS codex — this card fixes that) and enumerate players via the grep in R1.
- Site impact check: `site/index.md`, `site/zh/index.md`, `site/guide/index.md`, `site/architecture.md` mention player names — align if they contradict the matrix.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] README matrix has exactly one row per registered player (modulo the `'claude'` alias-column rule in R1) → Verify: `grep -rn "registerAgent(" packages/*/src --include='*.ts' | grep -v test | grep -v registry.ts` vs table rows, manual diff
- [ ] deepseek-harness "planned" row references TASK-20260828004417068 → Verify: grep
- [ ] "Keeping this matrix honest" subsection present → Verify: grep
- [ ] `bun --filter='*' run test` green → Verify: run it (canonical; docs change, should be unaffected)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260828004129233 acceptance (Option B). Blocked-on: TASK-20260828141622777.
- 2026-08-28: ZK review round 1 — P1s fixed (registry.ts is empty → inventory source is grep registerAgent, full row set enumerated; alias column rule stated for parallel development), P2 (codex missing from README, cursor/gemini scope) resolved in R1/R2, P3 (R3 shape → README subsection) applied.
- 2026-08-28: ZK round 2 (PASS-WITH-NITS) — P2 fixed ('claude' dual-registration in claude-cli.ts:197-198 → aliases column, not a row), P3s applied (claude-sdk anchor → claude-sdk/src/index.ts:155; verify grep excludes registry.ts).

## Related Files
- Modified: packages/lythoskill-agent-adapter/README.md (pending)
- Added: (none)

## Git Commit Message
```
docs(agent-adapter): player support matrix in README (TASK-20260828141622828)

- player x upstream x version range x aliases x status, inventory from registerAgent grep
- planned deepseek-harness row; keeping-this-matrix-honest subsection
- Implements ADR-20260828004129233 support-matrix follow-up
```

## Notes
- Sequence note: start after TASK-20260828141622777, or write against its declared contract with pending-marked cells.
