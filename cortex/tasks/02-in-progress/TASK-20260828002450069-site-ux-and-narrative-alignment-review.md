# TASK-20260828002450069: site UX and narrative alignment review

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |
| in-progress | 2026-08-27 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

User asked for a UX/narrative alignment pass over `site/` against the current reality of the project (v0.17.11). Fact-check found the same bug class as the 2026-08-27 ZK onboarding incident (curator commands): actionable content on the site that does not match the real CLI.

Verified findings (all against `packages/lythoskill-arena/src/cli.ts` / `player.ts`):

- **P1 broken command**: `site/guide/index.md` + `site/zh/guide/index.md` Level 3 document `arena vs --deck-a X --deck-b Y` — those flags do not exist. Real form: `arena vs --config arena.toml` (cli.ts:395 errors otherwise).
- **P1 false prerequisite**: guide Level 3 claims arena "auto-detects" a player (kimi/codex/ANTHROPIC_API_KEY). No auto-detect exists — `single` defaults to `kimi` (cli.ts:276), `--player` selects, claude = SDK needs ANTHROPIC_API_KEY / `.claude-sdk-key` / Claude Code session (agent-adapter-claude-sdk/src/index.ts:67).
- **P2 stale count**: "22 decks and growing" → actually 24 `.toml` in `examples/decks/` (EN+zh index, 2 spots each).
- **P2 navigation gaps**: `/articles/` has no sidebar (5 articles unreachable once inside one); `/guide/` sidebar has only "Overview" (no level anchors).
- Verified OK: 13 published packages, 722 test cases in 44 files ("600+" hedged, fine), curator commands in guide/architecture, `single --brief/--deck` flags, version.json injected at CI build time (committed file is a placeholder, not a bug).

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] Fix arena `vs` command + player prerequisite in EN and zh guide Level 3 (with a minimal inline `arena.toml` so the level stays runnable)
- [x] Update deck count 22 → 24 in EN+zh index
- [x] Add `/articles/` sidebar (5 articles) and `/guide/` sidebar level anchors, EN + zh, in `site/.vitepress/config.ts`
- [x] `bun run site:build` passes

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- Minimal edits to the 4 content files + config.ts; no new pages, no restructure of narrative (site narrative was ZK-validated 2026-08-27 — respect that work).
- Minimal arena.toml example modeled on `examples/arena/research-compare/arena.toml`.
- Per writer skill's external publication gate: all changed commands must be real (verified against CLI source above).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] `grep -rn "deck-a" site/` returns nothing except the legitimate `skill-deck-alt.toml` deck path → verified
- [x] `bun run site:build` exits 0 → verified (6.65s, clean)
- [x] Sidebar config: articles sidebar present; guide sidebar lists Level 0-6 anchors EN + zh; zh anchor ids verified against built HTML (`id="第-3-級-先測試再信任"` present in dist)
- [x] Deck count says 24 in EN+zh index → verified
- [x] `bun scripts/check-site-deck-snippets.ts` → 61 locators validated, pass

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Review done (read all 10 EN pages + spot-checked zh), findings verified against CLI source.
- 2026-08-28: All fixes applied: guide Level 3 arena commands + player prerequisite rewritten (EN+zh), deck counts 24 (EN+zh index), `/articles/` sidebar + `/guide/` level anchors added (EN+zh config). Site build green; deck-snippet guard green. version.json refreshed by build (v0.17.11 · 81901f0f).

## Related Files
- Modified: site/guide/index.md, site/zh/guide/index.md, site/index.md, site/zh/index.md, site/.vitepress/config.ts
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260828002450069)

- Detail 1
- Detail 2
```

## Notes
