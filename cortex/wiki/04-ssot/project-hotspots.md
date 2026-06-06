---
category: reference
domain: security
since: 2024-05
status: accepted
summary: |
  High-risk files and recurring work patterns. Read before touching.
  Each entry includes risk type, why it's dangerous, and specific test/QA requirements.
---

# Hot Files

> Read this before modifying any file in the table below.

**Prerequisites** (if you don't know these, read AGENTS.md first):
- **deck**: skill manager — `deck add` clones to cold pool, `deck link` creates symlinks in working set
- **locator**: a skill reference string (URL, path, or shorthand) that deck resolves
- **trailer**: git commit message suffix like `Closes: TASK-xxx` parsed by post-commit hook
- **cold pool**: `~/.agents/skill-repos/` — git clone cache for skill repos
- **guard**: pre-commit or pre-push scripts that validate code before commit

## High-Risk Modification Targets

| File | Risk | Why | QA Requirement |
|------|------|-----|----------------|
| `deck/src/add.ts` | Parsing creep | Each feature (syntax sugar, `@skill`, `#ref`, source URL) adds a parse path. 32 known locator forms. | Run `deck validate` covering all 32 locator variants after any parser change |
| `cold-pool/src/fetch-plan.ts` | Git side-effects | `execFileSync('git', ...)` — array args prevent injection, but exit codes need checking. | Run with invalid URLs to confirm graceful failure (non-zero exit + structured error) |
| `cortex/hooks/*.ts` | Silent governance failure | `git()` helpers, `spawnSync` — must check exit codes. Hooks failing silently = trailers not dispatching. | Negative test: deliberately break a hook, verify it exits non-zero with loud stderr |
| `.husky/` | Guard cascade | Bugs affect every commit. | `arena single --deck examples/decks/qa-sweep.toml --brief "audit .husky changes"` |
| `AGENTS.md` | Compaction amnesia | Most-changed doc. | Self-check: re-read top Release/Auth section after every context compaction |
| Release pipeline | Lockfile drift | `bump` → `bun install` → commit → push → `publish.sh` | Never skip `bun install`; verify with `--frozen-lockfile` in CI |

## When Touching a Hot File

1. **Run full test suite** (unit + `test/runner.ts` BDD if present)
2. **Run negative test** — break the guard, verify it catches
3. **Run qa-sweep deck** for guard/hook changes
4. **Verify no silent failures** — every exit code checked, every error path loud
