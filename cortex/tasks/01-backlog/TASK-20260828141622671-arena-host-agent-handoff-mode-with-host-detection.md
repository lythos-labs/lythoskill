# TASK-20260828141622671: arena host-agent handoff mode with host detection

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260828004129143 (accepted 2026-08-28, now in `cortex/adr/02-accepted/`, Option B): when the arena CLI detects it is running inside an agent session, the default execution mode becomes **host-handoff** — emit HATEOAS guidance for the host agent to orchestrate the run itself (spawn subagents per deck, judge outputs) instead of shelling out to a hardcoded external player.

Today `arena single` hard-defaults to `player = 'kimi'` (`packages/lythoskill-arena/src/cli.ts:276`), which forces install+auth of an external CLI even though ~95% of real arena runs are agent-orchestrated (`site/architecture.md:87`: "Agent-orchestrated by default"), and binds default UX to one vendor binary mid-migration (kimi-cli → kimi-code, ADR-20260828004129233).

**Env-marker ground truth (verified live 2026-08-28 inside a real kimi-code session)**: kimi-code exports **no `KIMI*` variable** and no `CLAUDECODE`; the only marker present is `CLAUDE_CODE_SSE_PORT` (kimi-code is a claude-code fork and inherits it). Claude Code proper sets `CLAUDECODE=1` (and also `CLAUDE_CODE_SSE_PORT`). Consequence: detection can distinguish "no host" vs "an agent host", but kimi-code vs claude-code cannot be told apart by env alone — and doesn't need to be: the handoff guidance is host-agnostic.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Host detection via one injectable function (e.g. `detectHost(env)` in a new `packages/lythoskill-arena/src/host.ts`): known markers = `CLAUDECODE` (Claude Code), `CLAUDE_CODE_SSE_PORT` (claude-code forks incl. kimi-code), plus Codex's marker if one is documented (research; otherwise omit). Detection result = host name or generic "agent host (unidentified)" — never blocks on identifying the specific host
- [ ] R2 (必达) Handoff mode: host detected AND no `--player` → print HATEOAS guidance (what: you are inside an agent session / why: host orchestration is the default per ADR / how: spawn subagents with each deck, judge outputs, pointer to `skills/lythoskill-arena/references/arena-runtime.md`) and exit 0 without spawning anything
- [ ] R3 (必达) Explicit `--player` always forces the external spawn (current behavior byte-for-byte); no host detected AND no `--player` → loud error pointing at `skills/lythoskill-arena/references/player-setup.md`
- [ ] R4 (必达) Tests: env-fixture matrix — {host detected, not detected} × {--player given, absent} = 4 cells, each asserting mode; no-spawn in handoff mode asserted structurally (see Technical Approach)
- [ ] R5 (可选) Audit `skills/lythoskill-arena/` + `site/` for `arena single` examples that assume an external kimi default; align wording with the two modes. Also update `cortex/wiki/01-patterns/2026-05-06-player-abstraction-agent-swappable-backend.md` with a one-line pointer to the new default
- **不做**: the CLI runner path is preserved, not deleted (cross-player fairness needs it); no changes to `vs --config` flow; no telemetry of host detection

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Entry: `packages/lythoskill-arena/src/cli.ts:276` — `resolvePlayer(opts.player ?? 'kimi')`. The handoff branch goes BEFORE the dynamic imports at `cli.ts:270-274` — that makes "no spawn in handoff mode" structural (the adapter modules are never loaded), testable by running `single` in a tmp cwd and asserting no `agent-output-*` directory is created.
- Default resolution becomes: `opts.player ?? (detectHost(process.env) ? HOST_HANDOFF : loud-error)`.
- `singleRun` today hardcodes `useAgent` (cli.ts:270) and `Bun.spawn` (cli.ts:313); `ArenaCliIO` (cli.ts:13-18) has no spawn channel and `cli.test.ts` only covers validation error paths — the structural-placement approach above avoids needing a new spawn seam.
- HATEOAS error style: phase + findings + suggested fixes (AGENTS.md §5; annotation-mindset wiki).
- ⚠️ Behavior-change SEMVER note: default behavior change = minor bump at next release (0.x policy, AGENTS.md [SEMVER]) — mention in the commit message.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] 4-cell env/flag matrix tests green in `packages/lythoskill-arena/src/cli.test.ts` (or new `host.test.ts`) → Verify: `bun --filter='@lythos/skill-arena' run test`
- [ ] Manual: `CLAUDE_CODE_SSE_PORT=1 bun packages/lythoskill-arena/src/cli.ts single --deck examples/decks/quick-start.toml --brief "test"` in a tmp cwd prints handoff guidance, creates no `agent-output-*` dir, exit 0 → Verify: run it
- [ ] `env -i PATH=$PATH HOME=$HOME bun packages/lythoskill-arena/src/cli.ts single --brief "x"` → loud error pointing at player-setup.md → Verify: run it
- [ ] `bun --filter='*' run test` green overall → Verify: run it (canonical)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260828004129143 acceptance (Option B).
- 2026-08-28: ZK review round 1 — P2s fixed (kimi-code env marker researched: none exists, only CLAUDE_CODE_SSE_PORT — detection is host-agnostic by design; no-spawn assertion now structural via branch placement before dynamic imports), P3s applied (player-setup.md pointer; site/architecture.md:87 path).

## Related Files
- Modified: packages/lythoskill-arena/src/cli.ts (pending), skills/lythoskill-arena/ docs (pending)
- Added: packages/lythoskill-arena/src/host.ts or similar (pending)

## Git Commit Message
```
feat(arena): host-agent handoff as default mode inside agent sessions (TASK-20260828141622671)

- detectHost(env) marker table (CLAUDECODE, CLAUDE_CODE_SSE_PORT); host-agnostic handoff guidance with exit 0
- handoff branch before adapter dynamic imports — no-spawn is structural
- explicit --player preserved; no-host no-player fails loudly with player-setup.md pointer
- Implements ADR-20260828004129143 Option B; minor-level behavior change
```

## Notes
- Cross-model doc validation for the new guidance text: `arena single --player <kimi|codex|claude>` per AGENTS.md (doc readability protocol) — after the docs audit (R5).
