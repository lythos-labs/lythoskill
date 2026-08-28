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
- [ ] R1 (必达) Inventory: find every hard-coded project-statistic number in `site/**/*.md` (deck count, package count, test count, skill count — grep for digit+unit patterns around "deck", "package", "test", "skill" in both en+zh) and list them in the Progress Log with file:line
- [ ] R2 (必达) Choose and document the mechanism: (a) extend `site/scripts/inject-version.ts` with a placeholder map (`{{DECK_COUNT}}` etc. replaced pre-build), or (b) a markdown-it plugin. Decide by which touches fewer files; record the decision in the card
- [ ] R3 (必达) EN+ZH page pairs both covered — a number updated in `site/index.md` but not `site/zh/index.md` is the exact rot class being fixed
- [ ] R4 (必达) Source of truth per number is mechanical (e.g. `ls examples/decks/*.toml | wc -l`, `ls -d packages/*/ | wc -l`), computed at build time — never hand-maintained
- **不做**: no lint-checking of prose numbers (brittle — "600+" ranges, rejected in the deferral rationale); no runtime fetches

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Existing injection precedent: `site/scripts/inject-version.ts` (read it first — it already does build-time substitution for versions).
- Site build: `site/.vitepress/` config + `bun run docs:build` (check site/package.json scripts).
- CI: the site-build job in `.github/workflows/test.yml` — injected numbers must appear in the built output; add a grep assertion on the built HTML for one known-dynamic number (negative: hard-coded stale number would fail).
- The command guard (`scripts/check-site-commands.ts`) is the sibling — match its fail-closed, loud-error philosophy.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] Inventory table in Progress Log covers every hard-coded stat number found in R1, each marked injected / intentionally-static → Verify: spot-check 3 entries against the files
- [ ] After `bun run docs:build` (site/), built HTML contains the CURRENT deck count (matches `ls examples/decks/*.toml | wc -l`) → Verify: grep built output
- [ ] EN+ZH parity: the same number appears identical in both built locales → Verify: grep both
- [ ] `bun --filter='*' run test` green + site build green → Verify: run both

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created from the deferral recorded in TASK-20260828003758156 (numbers policy split out of the command guard).

## Related Files
- Modified: site/scripts/inject-version.ts or site/.vitepress/ config, site/**/*.md pages with numbers (pending inventory)
- Added: (pending)

## Git Commit Message
```
feat(site): build-time injection for project statistic numbers (TASK-20260828141622988)

- Placeholder map injected pre-build; deck/package/test counts computed mechanically
- EN+ZH parity; CI assertion on one dynamic number in built HTML
```

## Notes
- Sibling guard: `scripts/check-site-commands.ts` (commands) — this card covers numbers; together they close the "site contradicts reality" class.
