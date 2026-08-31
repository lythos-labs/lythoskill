# TASK-20260828004417068: research deepseek-harness plugin integration with lythoskill governance

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |
| in-progress | 2026-08-29 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

User inbox item (2026-08-28): DeepSeek Harness (`dsh`, official plugin-kernel harness, 2026-08; web UI + headless, TUI via community plugins like dsh-TUI) is plugin-shaped, which makes it a natural research target for a **bidirectional** integration:

1. **lythoskill → dsh**: our cross-session memory / project governance tooling (cortex tasks/ADRs, daily/weekly scribe, dreaming SSOT consolidation) as dsh plugins — dsh has sessions/events/plugins but no governance layer.
2. **dsh → lythoskill**: dsh as a consumer of our skill governance — its plugin ecosystem (`dsh plugin add github:...`) is exactly the "frictionless install, no governance" pattern lythoskill exists to govern; also evaluate dsh as an arena player (see ADR-20260828004129233).

This is research-level: produce findings and a recommendation, no implementation.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] Survey dsh's plugin architecture (Cordis plugin rows, `cordis.patch.yml` bundles, `ctx.agents` / session-event APIs) — what can a plugin actually hook?
- [ ] Map lythoskill capabilities onto dsh extension points: which of cortex/scribe/dreaming/deck could be a dsh plugin, and what would the integration surface be?
- [ ] Assess the reverse direction: does dsh's plugin distribution create a governance need lythoskill-deck could serve? Is dsh viable as an arena player (headless mode)?
- [ ] Write findings to `cortex/wiki/02-research/2026-MM-DD-deepseek-harness-integration-survey.md` with a clear recommendation (integrate / adapter-only / watch-and-wait)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- Dispatch the deep-research deck (`arena single --deck examples/decks/deep-research.toml`) per deck-first dispatch rule.
- Sources: dsh official docs/repo, plugin marketplaces, community TUI plugin repos (dsh-TUI, dsh-tianshu-tui) as concrete plugin API evidence.
- Feed results into ADR-20260828004129233 (adapter lifecycle) — a dsh player adapter decision depends on this survey.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] Research doc exists in cortex/wiki/02-research/ with the three mapping questions answered and cited sources → `2026-08-29-deepseek-harness-integration-survey.md`; orchestrator spot-checked load-bearing primary sources (official README + CLI reference both fetched, claims matched)
- [x] Recommendation states one of: integrate / adapter-only / watch-and-wait, with reasoning → **adapter-only** (build headless player adapter now; defer dsh-plugin shipping until rc churn settles; watch governance-direction market with re-open triggers)
- [x] If adapter recommended: follow-up task registered referencing ADR-20260828004129233 → TASK-20260829090402490 (backlog, card filled)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Registered from user inbox item. Blocked on nothing; research-only scope.
- 2026-08-29: Executed as agent-orchestrated arena single (deep-research deck; per 671 handoff mode, no CLI `arena single`). Research cell produced `report.md` (19 KB) + `decision-log.jsonl` (9 entries). Wiki doc written, follow-up adapter task TASK-20260829090402490 registered, run archived to `playground/2026-08-29-dsh-integration-survey/`.

## Related Files
- Modified: (none yet)
- Added: `cortex/wiki/02-research/2026-08-29-deepseek-harness-integration-survey.md`, `playground/2026-08-29-dsh-integration-survey/` (archive), `cortex/tasks/01-backlog/TASK-20260829090402490-*` (follow-up)

## Git Commit Message
```
feat(scope): description (TASK-20260828004417068)

- Detail 1
- Detail 2
```

## Notes
