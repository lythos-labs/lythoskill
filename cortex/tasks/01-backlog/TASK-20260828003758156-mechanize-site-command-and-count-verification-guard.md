# TASK-20260828003758156: mechanize site command and count verification guard

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Same bug class twice in one week: site documents CLI commands that don't exist.

- 2026-08-27 ZK onboarding trial: `bunx @lythos/curator scan` (wrong package name + nonexistent subcommand) — an external agent hit 404 following the site.
- 2026-08-28 UX review (TASK-20260828002450069): `arena vs --deck-a/--deck-b` — flags don't exist; real form is `vs --config arena.toml`. Plus "auto-detects player" (no such feature) and stale "22 decks" (actually 24).

Existing guards: `scripts/check-site-deck-snippets.ts` covers only `path =` locators. Writer skill's publication gate #6 ("actionable content must be executed") is doc-exhorted — per P-mechanize-routines, doc-exhorted routines don't run. CI/CD automation (site-build job, release pipeline) fixed the *deploy* side of rot; the *content* side (commands, counts) has no tripwire.

Goal: extend the mechanical guard so the class "site shows a command/number that reality contradicts" fails CI, not the user.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] Extract `bunx @lythos/*` commands from `site/**/*.md` code blocks; verify subcommand + flags against each CLI's real `--help` output (run with a stub/no-op where possible, or parse the usage string from source)
- [ ] Decide policy for numbers ("N decks", "13 packages", "600+ tests"): generate at build time (inject-version.ts-style) vs lint-check vs leave manual — pick one, document why
- [ ] Wire into CI (test.yml site-build job) so violations fail the build
- [ ] Negative test: a fake flag in a site page must make the guard exit 1 with a loud error

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- Extend or sibling `scripts/check-site-deck-snippets.ts` (same philosophy: fail-closed, loud errors, negative test required).
- Command check cheapest form: parse each package CLI's usage/`--help` text (single source) and match site commands against it; no need to actually spawn agents (arena runs cost quota).
- Numbers: prefer build-time generation (like version.json) over lint — a generated number cannot rot.
- Out of scope: verifying commands against *external* repos (e.g. mattpocock/skills paths already covered by check-site-deck-snippets remote validation).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] Guard catches the two historical bugs: `arena vs --deck-a` and `skill-curator scan` both fail the check → Verify: temp-patch a site page with each, run guard, expect exit 1
- [ ] CI runs the guard (test.yml) → Verify: `grep -n "check-site" .github/workflows/test.yml`
- [ ] `bun run test` green with the new guard's own tests

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Registered from user reflection that CI/CD automation was meant to kill exactly this rot class; deploy side mechanized, content side not yet.

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260828003758156)

- Detail 1
- Detail 2
```

## Notes
