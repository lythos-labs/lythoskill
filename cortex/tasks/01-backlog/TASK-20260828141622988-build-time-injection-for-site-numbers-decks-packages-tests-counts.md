# TASK-20260828141622988: build-time injection for site numbers (decks packages tests counts)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Deferred from TASK-20260828003758156 (decision recorded in its Progress Log): the site command guard shipped, but the **numbers** class ("22 decks" when 24 exist, "13 packages", "600+ tests") was deliberately split out. Build-time injection is the right end state — a generated number cannot rot — but the stale numbers live in prose across EN+ZH page pairs, so injection needs placeholder machinery in every page, not a cheap `inject-version.ts` extension.

Trigger evidence: 2026-08-28 UX review found "22 decks" stale at 24 exactly one release after it was written.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Inventory: find every hard-coded project-statistic number in `site/**/*.md` (grep for digit+unit patterns around "deck", "package", "test", "skill" in both en+zh) and list them in the Progress Log with file:line. **Define the unit before wiring each source**: "packages" could mean dirs under `packages/` (21) or published `@lythos/*` packages (fewer — skill-only packages like scribe/dreaming/coach have no npm package); use `ls -d packages/*/` filtered to dirs with a non-private package.json for the published count
- [ ] R2 (必达) Choose and document the mechanism. Note: `site/scripts/inject-version.ts` does NOT do text substitution — it writes `.vitepress/version.json` consumed by `config.ts`. So the real options are: (a) a **VitePress markdown transform** (`markdown.config` hook in `site/.vitepress/config.ts`) replacing `{{DECK_COUNT}}`-style placeholders at render time, fed by a sibling script to inject-version.ts; or (b) a markdown-it plugin. Decide by which touches fewer files; record the decision in the card
- [ ] R3 (必达) EN+ZH page pairs both covered — a number updated in `site/index.md` but not `site/zh/index.md` is the exact rot class being fixed
- [ ] R4 (必达) Source of truth per number is mechanical, computed at build time: deck count = `ls examples/decks/*.toml | wc -l` (24 as of 2026-08-28), skill count = `ls -d skills/*/ | wc -l`, package count = per R1's definition. **Test count has no cheap mechanical source** ("600+" comes from the full test run — too expensive for site build): either use `find packages -name '*.test.ts' | wc -l` as a documented proxy, or classify test count as intentionally-static in the R1 inventory
- [ ] R5 (可选) Extend the inventory to README.md / README.zh.md stats if R1's grep surfaces them there
- **不做**: no lint-checking of prose numbers (brittle — "600+" ranges, rejected in the deferral rationale); no runtime fetches; no running the test suite at site-build time

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Existing build hook: `site/scripts/inject-version.ts` (43 lines, generates version.json) chained from `bun run build` in `site/package.json` (scripts are `dev`/`build`/`preview` — **there is no `docs:build`**).
- Site config: `site/.vitepress/config.ts` — the markdown transform hook lives here if option (a) is chosen.
- CI: the site-build job in `.github/workflows/test.yml` (lines 51-69, output dir `.vitepress/dist`) — add a grep assertion on the built HTML for one known-dynamic number (a hard-coded stale number would fail).
- The command guard (`scripts/check-site-commands.ts`) is the sibling — match its fail-closed, loud-error philosophy.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] Inventory table in Progress Log covers every hard-coded stat number found in R1, each marked injected / intentionally-static (with reason) → Verify: spot-check 3 entries against the files
- [ ] After `cd site && bun run build`, built HTML contains the CURRENT deck count (matches `ls examples/decks/*.toml | wc -l`) → Verify: grep `.vitepress/dist` output
- [ ] EN+ZH parity: the same number appears identical in both built locales → Verify: grep both
- [ ] `bun --filter='*' run test` green + site build green → Verify: run both

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created from the deferral recorded in TASK-20260828003758156 (numbers policy split out of the command guard).
- 2026-08-28: ZK review round 1 — P2s fixed (`docs:build` command didn't exist → `bun run build`; inject-version.ts isn't a substitution mechanism → option (a) reworded to VitePress markdown transform; test/skill/package count sources pinned, test count may land in intentionally-static), P3 (no 可选 tier) fixed with R5.

## Related Files
- Modified: site/.vitepress/config.ts or site/scripts/ (pending mechanism decision), site/**/*.md pages with numbers (pending inventory)
- Added: (pending)

## Git Commit Message
```
feat(site): build-time injection for project statistic numbers (TASK-20260828141622988)

- VitePress markdown transform replaces placeholders pre-build; counts computed mechanically
- EN+ZH parity; CI assertion on one dynamic number in built HTML
```

## Notes
- Sibling guard: `scripts/check-site-commands.ts` (commands) — this card covers numbers; together they close the "site contradicts reality" class.
