# TASK-20260828141622988: build-time injection for site numbers (decks packages tests counts)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |
| in-progress | 2026-08-28 | Started |
| review | 2026-08-28 | Deliverables committed |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Deferred from TASK-20260828003758156 (decision recorded in its Progress Log): the site command guard shipped, but the **numbers** class ("22 decks" when 24 exist, "13 packages", "600+ tests") was deliberately split out. Build-time injection is the right end state — a generated number cannot rot — but the stale numbers live in prose across EN+ZH page pairs, so injection needs placeholder machinery in every page, not a cheap `inject-version.ts` extension.

Trigger evidence: 2026-08-28 UX review found "22 decks" stale at 24 exactly one release after it was written.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] R1 (必达) Inventory: find every hard-coded project-statistic number in `site/**/*.md` (grep for digit+unit patterns around "deck", "package", "test", "skill" in both en+zh) and list them in the Progress Log with file:line. **Define the unit before wiring each source**: "packages" could mean dirs under `packages/` (21) or published `@lythos/*` packages (fewer — skill-only packages like scribe/dreaming/coach have no npm package); use `ls -d packages/*/` filtered to dirs with a non-private package.json for the published count
- [x] R2 (必达) Choose and document the mechanism. Note: `site/scripts/inject-version.ts` does NOT do text substitution — it writes `.vitepress/version.json` consumed by `config.ts`. So the real options are: (a) a **VitePress markdown transform** (`markdown.config` hook in `site/.vitepress/config.ts`) replacing `{{DECK_COUNT}}`-style placeholders at render time, fed by a sibling script to inject-version.ts; or (b) a markdown-it plugin. Decide by which touches fewer files; record the decision in the card
- [x] R3 (必达) EN+ZH page pairs both covered — a number updated in `site/index.md` but not `site/zh/index.md` is the exact rot class being fixed
- [x] R4 (必达) Source of truth per number is mechanical, computed at build time: deck count = `ls examples/decks/*.toml | wc -l` (24 as of 2026-08-28), skill count = `ls -d skills/*/ | wc -l`, package count = per R1's definition. **Test count has no cheap mechanical source** ("600+" comes from the full test run — too expensive for site build): either use `find packages -name '*.test.ts' | wc -l` as a documented proxy, or classify test count as intentionally-static in the R1 inventory
- [x] R5 (可选) Extend the inventory to README.md / README.zh.md stats if R1's grep surfaces them there
- **不做**: no lint-checking of prose numbers (brittle — "600+" ranges, rejected in the deferral rationale); no runtime fetches; no running the test suite at site-build time

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Existing build hook: `site/scripts/inject-version.ts` (43 lines, generates version.json) chained from `bun run build` in `site/package.json` (scripts are `dev`/`build`/`preview` — **there is no `docs:build`**).
- Site config: `site/.vitepress/config.ts` — the markdown transform hook lives here if option (a) is chosen.
- CI: the site-build job in `.github/workflows/test.yml` (lines 51-69, output dir `.vitepress/dist`) — add a grep assertion on the built HTML for one known-dynamic number (a hard-coded stale number would fail).
- The command guard (`scripts/check-site-commands.ts`) is the sibling — match its fail-closed, loud-error philosophy.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] Inventory table in Progress Log covers every hard-coded stat number found in R1, each marked injected / intentionally-static (with reason) → Verify: spot-check 3 entries against the files
- [x] After `cd site && bun run build`, built HTML contains the CURRENT deck count (matches `ls examples/decks/*.toml | wc -l`) → Verify: grep `.vitepress/dist` output
- [x] EN+ZH parity: the same number appears identical in both built locales → Verify: grep both
- [x] `bun --filter='*' run test` green + site build green → Verify: run both

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
- 2026-08-28: R1 inventory (site/**/*.md, en+zh pairs):
  | file:line | number | verdict |
  |---|---|---|
  | site/index.md:104 | 24 decks | INJECTED {{DECK_COUNT}} |
  | site/index.md:120 | Browse all 24 | INJECTED {{DECK_COUNT}} |
  | site/index.md:124 | 13 packages | INJECTED {{PACKAGE_COUNT}} |
  | site/zh/index.md:104 / :120 / :124 | 24 副 ×2, 13 個套件 | INJECTED (parity) |
  | site/index.md:124 + zh:124 | 600+ tests | STATIC — no cheap mechanical source (R4); "+" range rots slowly |
  | site/philosophy.md:32 (+zh) | 871 skills/74 repos/13 skills | STATIC — dated personal snapshot ("as of 2026-05-20") |
  | site/philosophy.md:112 (+zh:108) | 3 players + 3 decks = 9 | STATIC — illustrative arithmetic |
  | site/guide/index.md:50,65 (+zh) | 2 skills | STATIC — example output of a fixture deck |
  | site/guide/index.md:138 | 15+ skills | STATIC — illustrative threshold |
  | README.md:234, :355 (R5) | 661 tests / 44 files | STATIC (no README build pipeline); refreshed to 1000+/56 — they were already stale (actual: 1013 pass, 56 files) |
- 2026-08-28: R2 mechanism decision — option (a): markdown-it core ruler in site/.vitepress/config.ts fed by site/scripts/inject-stats.ts → .vitepress/stats.json (mirrors inject-version.ts exactly; fewest files, same fail-fast-on-missing-json constraint). Option (b) markdown-it plugin package = more machinery for zero gain.
- 2026-08-28: Gotcha: esbuild rejects shebang in imported (non-entry) modules — inject-stats.ts carries no `#!` (comment records why; inject-version.ts keeps its because nothing imports it).
- 2026-08-28: Acceptance verified: `bun run build` green; dist HTML = 24 decks / 13 packages in BOTH locales, zero leftover placeholders; CI grep assertion added to test.yml site-build job; inject-stats step added to all 3 site-building workflows (test.yml, deploy-pages.yml, release.yml — missing it in any would break that build on stats.json import).
- 2026-08-28: Test placement: site/ is NOT a workspace member (workspaces = packages/*), so a site-local test script never runs in the canonical gate. Test lives at scripts/inject-stats.test.ts (check-site-commands precedent — site guards live in root scripts/, run via skill-creator's `bun test src/ ../../scripts/`).
- 2026-08-29: ZK skeptic review — PASS-WITH-NITS (0 P1). Fixed pre-review: P2 README.zh.md test counts now match EN (1000+/56); P3 root-direct test invocation fixed (pipe-capture-under-coverage gotcha → redirect-to-file, check-site-commands precedent); P3 missed inventory item site/articles/conclusion-first.md:31 "around 90 ADRs" → "nearly 100" (actual 98); P3 esbuild import-meta warning silenced (argv-based direct-run detection). Bonus same-rot-class: "18+ decks" hedges in both READMEs → "24+". Post-fix: site build 0 warnings, direct `bun test scripts/inject-stats.test.ts` 4/4, canonical gate EXIT=0, dist HTML EN+ZH parity re-verified.
- 2026-08-29: user-sim gate — yes-with-conditions. Fresh-clone reverse experiment confirmed fail-loud (missing stats.json → vitepress build errors, exit 1 — no silent stale ship path). Condition fixed: config.ts comment now says `bun run build` (bare vitepress skips injection). Recorded non-blocking notes: CI grep couples to exact prose (fail-closed, acceptable); README "56 test files" is exact-value rot (documented STATIC); {{SKILL_COUNT}} computed but unused (pre-provisioned, 3 lines).

