# @lythos/cold-pool

Cold pool service layer for the lythoskill ecosystem.

> Status: scaffold (0.9.x). Public API will stabilize at 0.10.0.

## What this is

A dedicated resource-holder package for the cold pool — the local cache of
skill repositories at `~/.agents/skill-repos/` (configurable). This package
is the **only** layer in the ecosystem that holds git side-effects.
deck / curator / arena consume it instead of running `git clone` themselves.

## Architecture

Three layers, sharing the project's `intent → plan → execute` pattern
(`cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md`):

- **Resource layer** — `ColdPool` class holds path, metadata index, reconcile
  entry. Read-only accessors.
- **Plan layer** — `buildFetchPlan(coldPool, locator) → FetchPlan`,
  `buildValidationPlan(coldPool, locator) → ValidationReport`. Pure data,
  no side effects, dry-run printable.
- **Execute layer** — `executeFetchPlan(plan, io: FetchIO)`. IO is
  injectable; defaults to real git operations. Tests swap mocks.

## Locator

Per `ADR-20260502012643244`, locators are FQ-only:

- `host.tld/owner/repo[/skill]` — remote skill (monorepo, flat, or arbitrary subdir)
- `localhost/<name>` — local-only skill, no remote origin

Bare names and `owner/repo` shorthand are rejected — `parseLocator` returns null.

## Granularity boundary

`skill-deck.lock` is **working-set granularity** (per-skill in `.claude/skills/`).
The cold pool reconciliation runs at **repo+ref granularity** (per cloned
repository at a specific commit). The two are not conflated. See
`ADR-20260507021957847`.

## Package status

This is internal monorepo infrastructure during the 0.9.x line. Public
npm publish + stable API targeted for 0.10.0. See
`EPIC-20260507020846020` for the rollout plan.
