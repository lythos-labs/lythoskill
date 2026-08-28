# TASK-20260828141622671: arena host-agent handoff mode with host detection

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260828004129143 (accepted 2026-08-28, Option B): when the arena CLI detects it is running inside an agent session, the default execution mode becomes **host-handoff** — emit HATEOAS guidance for the host agent to orchestrate the run itself (spawn subagents per deck, judge outputs) instead of shelling out to a hardcoded external player.

Today `arena single` hard-defaults to `player = 'kimi'` (`packages/lythoskill-arena/src/cli.ts:276`), which forces install+auth of an external CLI even though ~95% of real arena runs are agent-orchestrated (architecture.md: "Agent-orchestrated by default"), and binds default UX to one vendor binary mid-migration (kimi-cli → kimi-code, ADR-20260828004129233).

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Host detection: detect known agent hosts via env markers — at minimum `CLAUDECODE` (Claude Code) and the kimi-code session marker (research the actual var; e.g. `KIMI_CODE*` / check `env` inside a session). Detection table lives in one function (e.g. `detectHost(env)` in `packages/lythoskill-arena/src/preflight.ts` or a new `host.ts`) — injectable env for tests
- [ ] R2 (必达) Handoff mode: host detected AND no `--player` → print HATEOAS guidance (what: you are inside agent X / why: host orchestration is the default / how: spawn subagents with each deck, judge outputs, pointer to `skills/lythoskill-arena/references/arena-runtime.md`) and exit 0 without spawning anything
- [ ] R3 (必达) Explicit `--player` always forces the external spawn (current behavior byte-for-byte); no host detected AND no `--player` → loud error with player setup instructions (current README pointer)
- [ ] R4 (必达) Tests: env-fixture matrix — {host detected, not detected} × {--player given, absent} = 4 cells, each asserting mode + no spawn in handoff mode
- [ ] R5 (可选) Audit `skills/lythoskill-arena/` + `site/` for `arena single` examples that assume an external kimi default; align wording with the two modes. Also update `cortex/wiki/01-patterns/2026-05-06-player-abstraction-agent-swappable-backend.md` with a one-line pointer to the new default
- **不做**: the CLI runner path is preserved, not deleted (cross-player fairness needs it); no changes to `vs --config` flow; no telemetry of host detection

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Entry: `packages/lythoskill-arena/src/cli.ts:276` — `resolvePlayer(opts.player ?? 'kimi')`. The default resolution becomes: `opts.player ?? (detectHost(process.env) ? HOST_HANDOFF : loud-error)`.
- Follow the repo's Intent/Plan/Execute + IO injection conventions (test seams via injected env/spawn — see `preflight.ts` and `player.ts` for existing seams).
- HATEOAS error style: phase + findings + suggested fixes (AGENTS.md §5; annotation-mindset wiki).
- ⚠️ Behavior-change SEMVER note: default behavior change = minor bump at next release (0.x policy, AGENTS.md [SEMVER]) — mention in the commit message.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] 4-cell env/flag matrix tests green in `packages/lythoskill-arena/src/cli.test.ts` (or new `host.test.ts`) → Verify: `bun --filter='@lythos/skill-arena' run test`
- [ ] Manual: `CLAUDECODE=1 bun packages/lythoskill-arena/src/cli.ts single --deck examples/decks/quick-start.toml --brief "test"` prints handoff guidance, spawns nothing, exit 0 → Verify: run it, check no player process spawned
- [ ] `bun packages/lythoskill-arena/src/cli.ts single --brief "x"` with a scrubbed env (`env -i PATH=$PATH HOME=$HOME bun ...`) → loud error naming player setup → Verify: run it
- [ ] `bun --filter='*' run test` green overall → Verify: run it (canonical)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as follow-up of ADR-20260828004129143 acceptance (Option B).

## Related Files
- Modified: packages/lythoskill-arena/src/cli.ts (+ host detection module), skills/lythoskill-arena/ docs (pending)
- Added: packages/lythoskill-arena/src/host.ts or similar (pending)

## Git Commit Message
```
feat(arena): host-agent handoff as default mode inside agent sessions (TASK-20260828141622671)

- detectHost(env) marker table; handoff guidance with exit 0 when host detected and no --player
- explicit --player preserved; no-host no-player fails loudly with setup instructions
- Implements ADR-20260828004129143 Option B; minor-level behavior change
```

## Notes
- Cross-model doc validation for the new guidance text: `arena single --player <kimi|codex|claude>` per AGENTS.md (doc readability protocol) — after the docs audit (R5).
