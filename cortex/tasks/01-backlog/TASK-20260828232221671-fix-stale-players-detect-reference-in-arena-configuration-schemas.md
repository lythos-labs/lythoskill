# TASK-20260828232221671: fix stale players-detect reference in arena configuration-schemas

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ZK skeptic review of TASK-20260828141622671 (2026-08-28, P3-4) found pre-existing drift:
`packages/lythoskill-arena/skill/references/configuration-schemas.md:126` (and its built twin
`skills/lythoskill-arena/references/configuration-schemas.md`) tells agents to run
`bun packages/lythoskill-arena/src/cli.ts players detect` — but no `players` subcommand exists
in the CLI dispatch (`packages/lythoskill-arena/src/cli.ts` cli() chain: single/run/vs/compare/viz/prepare-workdir/archive).
An agent following the doc hits "Unknown command: players". This is exactly the doc-vs-reality
class the check-site-commands guard was built to catch, but it only scans `site/`, not skill references.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Fix or remove the stale `players detect` instruction in configuration-schemas.md (source + rebuild to `skills/`). Either describe the real detection flow (`--player` resolution fails loudly with install guidance; host-handoff is default in agent sessions per ADR-20260828004129143) or drop the auto-detection paragraph if no such command is planned.
- [ ] R2 (可选) Grep the same file + other arena skill references for similar phantom subcommands (`<cli> <noun> <verb>` patterns not in the dispatch chain).

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Source of truth for what exists: `packages/lythoskill-arena/src/cli.ts` cli() dispatch.
- Edit source `packages/lythoskill-arena/skill/references/configuration-schemas.md`, then `bun packages/lythoskill-creator/src/cli.ts build lythoskill-arena` to sync `skills/`.
- Consider whether the players.toml auto-detection concept should become a real `players detect` subcommand instead — that is a scope decision for the user, default to doc fix only.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] No reference in `skills/lythoskill-arena/` instructs running a nonexistent subcommand → Verify: `grep -rn 'players detect' skills/ packages/lythoskill-arena/skill/` returns nothing
- [ ] `bun --filter='@lythos/skill-arena' run test` green → Verify: run it

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Registered from ZK skeptic finding P3-4 on TASK-20260828141622671 review.

## Related Files
- Modified: packages/lythoskill-arena/skill/references/configuration-schemas.md (pending), skills/lythoskill-arena/references/configuration-schemas.md (pending, via build)

## Git Commit Message
```
docs(arena): remove stale players-detect subcommand reference (TASK-20260828232221671)

- configuration-schemas.md described a `players detect` CLI that never existed
```

## Notes
- Priority: P3 — doc drift, no runtime impact.
