# ADR-20260513041030769: No cross-package relative imports in packages src

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-12 | Created |
| accepted | 2026-05-13 | Enforced via .husky/pre-commit section 0.7 |
| accepted | 2026-05-12 | Accepted |

## 背景

Today's release pipeline exposed two related failure modes in
`@lythos/skill-deck`'s published manifests:

1. **0.11.0**: every internal `@lythos/*` dep shipped to npm as literal
   `"workspace:*"` (resolved by patching `scripts/publish.sh` to rewrite
   at publish time — `ADR-pattern-2026-05-12-workspace-protocol-in-source`).

2. **0.11.1**: `resolve-deck.ts` had a leftover cross-package relative
   import — `from '../../lythoskill-cold-pool/src/mirror.js'`.
   `npm publish` does not include sibling workspace packages in the
   tarball, so external consumers (`bunx`, `npm install`) hit
   `Cannot find module '../../lythoskill-cold-pool/src/mirror.js'`.

Both bugs are *the same anti-pattern in different artifacts*: a previous
agent reached for a shortcut path (relative import / workspace:*)
without considering the publish-time consequence. 0.11.0's fix landed in
publish.sh (rewrite layer). This ADR addresses the second class: imports.

## 决策驱动

- Source must be free of cross-package relative paths so any package
  can be published in isolation and consumed externally.
- The mistake is subtle: a `from '../../<other-pkg>/src/'` import works
  perfectly within the monorepo (TypeScript follows the path; tests
  pass; CI passes), and fails only at consumer-time, after publish.
- Catching this at commit-time is cheap and certain (regex grep).
- The fix for any flagged occurrence is mechanical: declare
  `@lythos/<other-pkg>: workspace:*` in the importing package's
  dependencies, then import as `from '@lythos/<other-pkg>'`. The
  publish-time rewriter translates to `^version` for the published
  manifest.

## 选项

### 方案A: Allow relative imports, catch in CI publish test

Permit `from '../../<pkg>/src/'` in source. Catch broken manifests via
an E2E publish-validation gate in CI (spawn `bunx <pkg>@<new>` in tmp
and verify resolution).

**优点**:
- Allows fast inner-loop iteration without thinking about packaging
- The CI gate also catches other classes of publish breakage

**缺点**:
- Bug only surfaces at CI publish-test time (late in the cycle)
- CI publish test needs network + npm round-trip; slow
- Doesn't prevent the *practice* — agents keep reaching for shortcut
  paths even when workspace dep is available

### 方案B: Disallow relative cross-package imports via pre-commit guard

Forbid `from '../../<other-pkg>/src/'` in `packages/*/src/*.ts` via
`.husky/pre-commit` regex. Force agents to declare workspace deps and
import via package name.

**优点**:
- Caught at commit-time (earliest possible)
- Zero network, zero CI cost
- Forces correct dependency declaration (which also makes deps visible
  in package.json — easier to reason about the package boundary)
- Pairs naturally with section 0.6 (workspace:* enforcement) — together
  they ensure both the dependency and the import style stay correct

**缺点**:
- Adds another pre-commit step (small cost — single grep)
- Agents may attempt to bypass via `--no-verify` (countered by the
  AGENTS.md hard rule against `--no-verify` for hook failures)

### 方案C: Bundle workspace src into one tarball

Concatenate all `@lythos/*` source into a single npm package, eliminating
cross-package import concerns entirely.

**优点**:
- One published artifact, no cross-package resolution issues

**缺点**:
- Defeats the purpose of monorepo package boundaries
- Consumers must pull the whole bundle even for one skill
- Breaks the package-as-skill-product model
  (`ADR-20260502234833756`)

## 决策

**选择**: 方案B

**原因**: Pre-commit guard catches the bug at the earliest possible
moment, costs nothing at runtime, and reinforces the workspace
dependency declaration discipline already established by section 0.6.
Method A is complementary (file as backlog: `TASK-20260513035228296`)
but should not replace pre-commit enforcement — catching late is much
more expensive than catching early.

## 影响

- **正面**: The class of bug that broke 0.11.1 cannot recur silently;
  agents are forced to think about cross-package deps as a first-class
  concern rather than a "fix it later" shortcut.
- **负面**: One more pre-commit check (negligible perf cost; one grep
  across staged TypeScript source files).
- **后续**: 方案 A (CI E2E publish-validation gate) remains valuable as
  a second layer covering bug classes the pre-commit guard cannot
  detect (e.g. broken `main` field, missing `files`, malformed tarball).
  Tracked as `TASK-20260513035228296`.

## 相关

- 关联 Epic: `EPIC-20260513010237904` (Popular third-party skills E2E with network probe UX)
- 关联 wiki:
  - `cortex/wiki/01-patterns/2026-05-12-workspace-protocol-in-source-concrete-version-at-publish.md` (sibling pattern: workspace:* + publish rewrite)
  - `cortex/wiki/03-lessons/2026-05-12-whack-a-mole-resolved-workspace-deps-swung-between-local-correct-and-publish-correct-until-publish-time-rewrite.md` (the diagnostic journey)
- 关联 ADR: `ADR-20260502234833756` (skill-package-as-product model)
- 关联 commits:
  - `e1975d4` — incomplete fetch-text migration (missed mirror.js — what this ADR prevents)
  - `18b491a` — followup fix that caught the leftover
  - `df87e4f` — `chore(release): v0.11.2` (the recovery release)
- 关联 task: `TASK-20260513040027913` (the original task that drove this ADR)
