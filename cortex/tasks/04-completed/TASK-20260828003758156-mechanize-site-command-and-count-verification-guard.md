# TASK-20260828003758156: mechanize site command and count verification guard

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |
| in-progress | 2026-08-28 | Started |
| review | 2026-08-28 | Deliverables committed |
| completed | 2026-08-28 | Done |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Same bug class twice in one week: site documents CLI commands that don't exist.

- 2026-08-27 ZK onboarding trial: `bunx @lythos/curator scan` (wrong package name + nonexistent subcommand) — an external agent hit 404 following the site.
- 2026-08-28 UX review (TASK-20260828002450069): `arena vs --deck-a/--deck-b` — flags don't exist; real form is `vs --config arena.toml`. Plus "auto-detects player" (no such feature) and stale "22 decks" (actually 24).

Existing guards: `scripts/check-site-deck-snippets.ts` covers only `path =` locators. Writer skill's publication gate #6 ("actionable content must be executed") is doc-exhorted — per P-mechanize-routines, doc-exhorted routines don't run. CI/CD automation (site-build job, release pipeline) fixed the *deploy* side of rot; the *content* side (commands, counts) has no tripwire.

Goal: extend the mechanical guard so the class "site shows a command/number that reality contradicts" fails CI, not the user.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] Extract `bunx @lythos/*` commands from `site/**/*.md` code blocks; verify subcommand + flags against each CLI's real `--help` output → two detector shapes: flags parsed live from each CLI's source (over-approximation, cannot go stale); subcommand/positional table from dispatch code
- [x] Decide policy for numbers → **decided: DEFERRED to its own task** — build-time injection is the right end state but needs per-page placeholder machinery across EN+ZH prose; command guard ships alone (rationale in Progress Log)
- [x] Wire into CI (test.yml site-build job) so violations fail the build
- [x] Negative test: a fake flag in a site page must make the guard exit 1 with a loud error → fixture pages for both historical bugs, subprocess tests assert exit 1 + loud stderr

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- Extend or sibling `scripts/check-site-deck-snippets.ts` (same philosophy: fail-closed, loud errors, negative test required).
- Command check cheapest form: parse each package CLI's usage/`--help` text (single source) and match site commands against it; no need to actually spawn agents (arena runs cost quota).
- CLI inventory (verified 2026-08-28): `@lythos/skill-deck` → `packages/lythoskill-deck/src/cli.ts`; `@lythos/skill-arena` → `packages/lythoskill-arena/src/cli.ts` (prints usage in `main()` when no args / `--help`); `@lythos/skill-curator` → `packages/lythoskill-curator/src/cli.ts` (`printHelp` ~line 1317); `@lythos/skill-creator`, `@lythos/project-cortex` also have CLIs — check their help surfaces when building the table.
- **The two historical bugs need two detector shapes** (ZK review 2026-08-28): catching `arena vs --deck-a` requires *flag validation* against known flags; catching `skill-curator scan` requires knowing curator takes a *pool-path positional*, not subcommands — a positional/subcommand rule. Building only the flag checker will silently miss the second class.
- Numbers: prefer build-time generation (like version.json) over lint — a generated number cannot rot.
- Out of scope: verifying commands against *external* repos (e.g. mattpocock/skills paths already covered by check-site-deck-snippets remote validation).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] Guard catches the two historical bugs: `arena vs --deck-a` and `skill-curator scan` both fail the check → Verify: temp-patch a site page with each, run guard, expect exit 1 (done as fixture pages in scripts/check-site-commands.test.ts — both subprocess fixtures exit 1 with loud stderr)
- [x] CI runs the guard (test.yml) → Verify: `grep -n "check-site" .github/workflows/test.yml` (line 60, site-build job)
- [x] `bun --filter='*' run test` green with the new guard's own tests (canonical form, not `bun run test`) — guard test wired into @lythos/skill-creator's test script (`bun test src/ ../../scripts/`)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Registered from user reflection that CI/CD automation was meant to kill exactly this rot class; deploy side mechanized, content side not yet.
- 2026-08-28: Implemented. `scripts/check-site-commands.ts` extracts `bunx @lythos/<pkg>` commands from site markdown (code blocks + inline code), validates against real CLIs with two detector shapes: (A) flags extracted live from each CLI's `src/cli.ts` source (over-approximation intentional — cannot go stale), (B) subcommand/positional table built from dispatch code (curator = pool-path positional; bare non-path words like `scan` rejected). Real site: 56 commands, exit 0. Both historical bugs fail loudly as fixture tests. **Numbers policy: DEFERRED** — build-time injection is right end state, but the stale numbers live in prose across EN+ZH page pairs; injecting there needs a markdown-it plugin or placeholder replacement in every page (not a cheap inject-version.ts extension), and lint-checking numbers is brittle ("600+" ranges). Command guard ships alone; numbers get their own task. Gotcha discovered: `bun test` + coverage (bunfig.toml) breaks Bun.spawnSync pipe capture (empty buffers, correct exit code) — tests redirect via `sh -c` to files instead (same pattern as test-report.ts).
- 2026-08-28: ZK skeptic review (agent-31) — HONEST-WITH-NITS, high confidence. P2 fixed same-day: deck's `update` subcommand was missing from CLI_TABLE (guard would false-positive on a correct command — the same rot class the guard kills) → added, plus a **drift tripwire test** extracting `case 'x'`/`=== 'x'` dispatch labels from each subcommand CLI source and failing on any label missing from the table (per-spec `ignoreDispatch` for literal/verb-level matches). P3 fixed: loadClis' "fail closed" comment overclaimed — load errors now recorded as `loadError` and reported by checkSite as offenders (negative test: bogus root → offenders non-empty). 16 guard tests green; real site still 56/56.

## Related Files
- Modified: .github/workflows/test.yml (site-build job: guard step), packages/lythoskill-creator/package.json (test script now also runs ../../scripts/ — picks up guard test + previously orphaned scripts tests)
- Added: scripts/check-site-commands.ts, scripts/check-site-commands.test.ts

## Git Commit Message
```
feat(ci): guard site bunx commands against real CLIs (TASK-20260828003758156)

- scripts/check-site-commands.ts: extract `bunx @lythos/*` commands from site/**/*.md, validate with two detector shapes (flags parsed live from CLI source; subcommand/positional table from dispatch code)
- Wired into test.yml site-build job; guard's own tests run via @lythos/skill-creator test script (bun test src/ ../../scripts/)
- Negative fixtures reproduce both historical bugs (arena vs --deck-a, skill-curator scan) with exit 1 + loud stderr
- Numbers policy deferred to its own task (rationale in card)
```

## Notes
