---
status: proposed
author: agent-swarm
---

# ADR-20260503180000000: Unit Test Framework Selection — Curator Mind Applied

## Context

Deck is adding new skills. This requires:
1. **Code coverage** for existing `packages/lythoskill-deck/src/` logic
2. **Refactoring guidance** — tests as safety net for future changes
3. **Distinction from agent BDD** — unit tests ≠ agent behavior tests (see memory: `project_test_utils_bdd_control_loop.md`)

This ADR uses the **curator skill mind**: scan → index → evaluate → recommend.

---

## Phase 1: Scan (Candidate Frameworks)

| Candidate | Runtime Native | ESM | TypeScript | Coverage | Notes |
|-----------|---------------|-----|------------|----------|-------|
| **Bun test** | ✅ Bun built-in | ✅ | ✅ Native | ✅ Built-in | Zero config, fastest |
| **Vitest** | ❌ npm package | ✅ | ✅ First-class | ✅ Built-in | Vite ecosystem, familiar |
| **Node test** | ✅ Node 18+ | ✅ | ⚠️ Needs tsx/ts-node | ❌ Native (c8) | No extra dep but TS friction |
| **Jest** | ❌ npm package | ⚠️ Config-heavy | ⚠️ ts-jest | ✅ | Legacy, overkill for this repo |

---

## Phase 2: Index (Evaluation Dimensions)

Curator-style metadata extraction per framework:

| Dimension | Weight | Why |
|-----------|--------|-----|
| Bun native | High | Team = Bun-only; zero config = agent-friendly |
| ESM-first | High | ADR-20260423101950000 mandates ESM-only |
| TypeScript DX | High | No compile step = Bun's core value prop |
| Coverage built-in | Medium | Needed for refactoring confidence |
| Agent cognitive load | High | Agents must be able to write/debug tests |
| Migration cost | Medium | Existing code needs test scaffolding |

---

## Phase 3: Evaluate (Scoring)

| Dimension | Bun test | Vitest | Node test | Jest |
|-----------|----------|--------|-----------|------|
| Bun native | 10 | 4 | 6 | 3 |
| ESM-first | 10 | 10 | 8 | 5 |
| TypeScript DX | 10 | 9 | 5 | 6 |
| Coverage built-in | 9 | 9 | 4 | 8 |
| Agent cognitive load | 9 | 7 | 5 | 4 |
| Migration cost | 10 | 7 | 5 | 4 |
| **Weighted Total** | **High** | **Medium** | **Low** | **Low** |

---

## Phase 4: Recommend

**Primary: Bun test (`bun test`)**

- Built into runtime — no `package.json` dependency needed
- `bun test` runs `*.test.ts` files with zero config
- Coverage: `bun test --coverage`
- ESM + TypeScript native — no ts-jest, no vitest.config.ts

**Secondary: Vitest** (fallback if Bun test limits hit)

- If Bun test's mock/spy features prove insufficient for complex deck logic
- If team needs Vitest-specific plugins (UI, browser mode)
- Migration path: Vitest config is minimal, tests are mostly compatible

**Rejected:**
- **Jest**: Config-heavy, ESM friction, agent-unfriendly
- **Node test**: TypeScript execution requires extra tooling, coverage via c8 is clunky

---

## Decision

1. **Unit tests use `bun test`** for all `packages/*/src/` modules
2. **Coverage target**: 60% for new code, 40% for existing (gradual backfill)
3. **Test location**: Co-located with source (`src/foo.ts` → `src/foo.test.ts`)
4. **Agent BDD tests remain** on custom test-utils runner (cortex/deck control loop only)

---

## Consequences

- No new `devDependencies` for testing framework (Bun provides it)
- `bun test --coverage` generates coverage reports for CI
- Pre-commit hook may run `bun test --coverage` for changed packages
- Align check may verify test files exist for new `src/` modules

## Related

- Memory: `project_test_utils_bdd_control_loop.md` — agent BDD ≠ unit tests distinction
- ADR-20260423101950000: ESM-only
- ADR-20260503170000000: Bun-only toolchain
