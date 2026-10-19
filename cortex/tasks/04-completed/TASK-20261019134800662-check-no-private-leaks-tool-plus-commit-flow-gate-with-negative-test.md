# TASK-20261019134800662: check-no-private-leaks tool plus commit-flow gate with negative test

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-19 | Created — owner directive; scope refined after discovering existing value-guard |
| in-progress | 2026-10-19 | Started |
| review | 2026-10-19 | Deliverables committed |
| completed | 2026-10-19 | Done |

## Background & Goals
Owner directive (2026-10-19): the positioning-leak class (key names, machine
paths, personal aliases shipping in committed/generic surfaces) must be caught
by a DETERMINISTIC commit-flow check — "做一个工具,配一个类似gitignore但是
在private的检查目录……commit流程里带上这个性质的检查,类似过去sonar/lint系"
— not by agents remembering to look.

Discovery during scoping: `scripts/check-private-leaks.sh` (pre-commit §0.8)
already guards secret VALUES from `.private/*.env`. The directive covers the
missing PATTERN class. Decision: extend, not rebuild — **ADR-20261019134800627**
(options compared: extend / new TS tool / prompt-only lens).

## Requirements
- [x] Phase 2 (patterns) in `scripts/check-private-leaks.sh`: built-in token-shape baseline + gitignore-style `.private/leak-patterns` (absent = skip silently)
- [x] `--all` audit mode over committed surfaces (fulfills TASK-20261019131118492's repeatability requirement deterministically)
- [x] Exemptions for sanctioned quoting: historical records (cortex/adr|tasks|wiki|INDEX, daily/, drafts/, archived-patches/, showcase/, test-results/, `*.bak*`), fixtures (`*.test.ts`), run artifacts (`packages/*/runs/`, `*/run-output/`)
- [x] Calibration: machine paths NOT built-in (generic fixtures `/home/user`, `/Users/alice` are legal) — personal paths live in the machine-local list; this machine seeded with `lythos-agent-pat` + `/Users/chariots`
- [x] Latent bug fixed: `.private/` without `*.env` crashed the script under pipefail before reporting
- [x] `.husky/pre-commit` STAGED_GUARDS includes `scripts/check-private-leaks` (guard-change hygiene)
- [x] AGENTS.md Critical Gotchas += [LEAK]
- [x] Negative tests committed (`scripts/check-private-leaks.test.ts`, 11 tests: 5 blocked-with-banner + 6 no-false-positive)

## Technical Approach
ADR-20261019134800627 (extend-in-place; rejected: new TS tool, prompt-only
lens). Test idiom per `scripts/check-site-commands.test.ts`: Bun.spawnSync +
sh -c redirect to files (spawnSync pipes return empty under bun test with
coverage). Banner assertions on every negative test so a vacuous exit-1 can't
pass (this caught a real `set -e` loop bug during QA).

## Acceptance Criteria
- [x] `bun test scripts/check-private-leaks.test.ts` → 11 pass / 0 fail → Verify: ran, 16 expect() calls
- [x] Live negative: planted `/Users/chariots` + `github_pat_…` + `lythos-agent-pat` + `.env` value each blocked with correct banner → Verify: 5 negative tests
- [x] Live positive: clean tree + generic fixtures + exempt historical quoting all exit 0 → Verify: 6 positive tests
- [x] `bash scripts/check-private-leaks.sh --all` on this repo → exit 0 (ran post-calibration, clean)
- [x] Full test gate green → Verify: `bun --filter='*' run test` pass count in daily
- [x] ci-gate → Verify: `bun scripts/ci-gate.ts` before push

## Progress Log
- 2026-10-19: Existing `check-private-leaks.sh` discovered (value-guard, pre-commit §0.8) — directive refined to pattern-class extension. QA caught two real bugs before they shipped: (1) `is_exempt "$f" && continue` under `set -e` killed the loop at the first non-exempt file (tests passed for the wrong reason — banner assertions added); (2) pipefail crash when `.private/` has no `*.env`.
- 2026-10-19: Live `--all` calibration run flagged ~60 hits, mostly generic test fixtures — baseline narrowed to token shapes per ADR rationale (a misfiring check gets learned around). Machine paths moved to the machine-local list. Post-calibration audit: exit 0.

## Related Files
- Modified: scripts/check-private-leaks.sh; .husky/pre-commit (STAGED_GUARDS pattern); AGENTS.md (gotcha [LEAK])
- Added: scripts/check-private-leaks.test.ts; .private/leak-patterns (gitignored, machine-local — not committed); cortex/adr/01-proposed/ADR-20261019134800627

## Git Commit Message
```
feat(guard): private-leak gate — pattern phase + audit mode + negative tests (TASK-20261019134800662)

- check-private-leaks.sh: token-shape baseline + .private/leak-patterns (gitignore-style)
- --all audit mode (sweep-card repeatability, deterministic)
- exemptions: historical records / *.test.ts fixtures / run artifacts
- pipefail + set -e fixes found by negative QA; STAGED_GUARDS += the guard
- ADR-20261019134800627
```

## Notes
The pattern list is itself a personal binding (ADR-20261019125409359): seeded
per machine, gitignored, never committed. Fresh machines rely on the
token-shape baseline until seeded.
