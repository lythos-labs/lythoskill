# RFC: Migrate Monorepo from pnpm to Bun -- Data & Findings

**Status:** Draft research for RFC recommendation
**Scope:** ~30 packages with cross-package interdependencies
**Date:** 2026-05-18

---

## 1. Executive Summary

Bun offers compelling install speed (5-28x faster than pnpm on cold installs) and consolidates the toolchain (runtime, test runner, bundler, package manager in one binary). However, production monorepo usage reveals significant gaps: `workspace:*` protocol is not resolved on publish, the binary lockfile breaks code review, and pnpm's workspace filtering remains more powerful. For a 30-package monorepo, the decision hinges on whether install speed + toolchain consolidation outweighs production stability gaps.

---

## 2. Install Performance Benchmarks

### 2.1 Cold Install (Cleared Cache)

| Project Size | pnpm | Bun | Bun Speedup |
|---|---|---|---|
| Small (~50 deps) | 4.2s | 0.8s | 5.3x |
| Medium (~200 deps) | 12.4s | 2.1s | 5.9x |
| Large monorepo (15 pkgs, 800 deps) | 28.6s | 4.8s | 6.0x |
| Very large monorepo (~3500 deps) | 53.0s | 3.2s | 16.6x |

### 2.2 Warm/Cached Install

| Project Size | pnpm | Bun | Bun Speedup |
|---|---|---|---|
| Small | 1.1s | 0.3s | 3.7x |
| Large (800 deps) | 8.4s | 1.2s | 7.0x |

### 2.3 CI Pipeline Total Time (Install + Build, 15-pkg monorepo)

| Phase | pnpm | Bun | Delta |
|---|---|---|---|
| Install | 28.6s | 4.8s | -23.8s |
| Build | 142.0s | 138.0s | -4.0s |
| **Total** | **170.6s** | **142.8s** | **-27.8s (16%)** |

**Key finding:** Install speed advantage is real but narrowed in CI by the build phase dominating total time. For a 30-package monorepo with parallel builds, the gap may narrow further.

### 2.4 Local Developer Experience

For local development (frequent re-installs after branch switches, dependency updates):
- **Typing `install` and getting back to work in <2s vs 10s+** is the strongest DX argument for Bun
- Warm cache performance matters more than cold install for day-to-day work
- Bun's native TypeScript support eliminates `ts-node`/`tsx` overhead in scripts

---

## 3. Workspace & Monorepo Feature Comparison

| Feature | pnpm | Bun | Gap Severity |
|---|---|---|---|
| Workspace definition | `pnpm-workspace.yaml` | `"workspaces"` in `package.json` | Low -- compatible format |
| Package filtering | `--filter` with dependency-graph selectors (`{^...}`, `{/...}`) | `--filter` by name, path, glob | **Medium** -- advanced graph filters missing |
| Recursive commands | `pnpm -r build` (topological) | `--filter '*' --sequential` or `--parallel` | Low -- Bun covers basic cases |
| Strict isolation | Default (no phantom deps) | Configurable (`isolated` mode) | Low -- both support it |
| `workspace:*` protocol | Resolved on publish | **NOT resolved on publish** | **Critical** -- breaks consumers |
| Catalog protocol | `catalog:` in workspace.yaml | No equivalent | Medium -- no shared version strategy |
| Lockfile format | `pnpm-lock.yaml` (readable YAML) | `bun.lockb` (binary) | **High** -- breaks code review and diff inspection |
| Hoisting control | `hoist`, `hoist-pattern`, `public-hoist-pattern` | `isolated` / `hoisted` binary modes | Medium -- less granular |
| Overrides | `pnpm.overrides` | `overrides` in package.json | Low -- standard compatible |
| Patch dependencies | `pnpm patch` / `pnpm.overrides` based | No built-in patch support | Medium |
| Global store | Content-addressable, hard-linked across projects | Per-project store | Low -- pnpm saves GBs across projects |

---

## 4. Production Blockers (as of Bun 1.3.x, May 2026)

### 4.1 `workspace:*` Not Resolved on Publish (CRITICAL)

**What happens:** When `bun publish` (or any publish tool) publishes a package that depends on another workspace package via `workspace:*`, the protocol is left unresolved in the published `package.json`. Consumers installing from npm get:

```
error: Workspace dependency "@scope/pkg" not found
error: @scope/pkg@workspace:* failed to resolve
```

**Impact for a 30-package monorepo:** If your packages are published to npm and consumed externally, this is a **hard blocker**. Workarounds require pre-publish scripts to manually replace `workspace:*` with actual versions.

**Mitigation:** Add a pre-publish script that resolves versions, or use a publish orchestration tool that handles this. This adds complexity and a point of failure.

### 4.2 Binary Lockfile (`bun.lockb`) (HIGH)

The binary lockfile format means:
- `git diff` shows "Binary files differ" -- no visibility into dependency changes
- Code review of dependency updates becomes blind
- Security audits of transitive dependency changes require external tooling (`bun bun.lockb` to inspect)
- CI checks for dependency drift must use `bun` rather than simple `diff`

### 4.3 Windows Symlink Hangs in Large Monorepos (MEDIUM, Platform-Specific)

Bug #25970 on `oven-sh/bun`: `bun install` hangs indefinitely on Windows with the default symlink linker in monorepos with ~20 workspaces and ~1500 packages. Workaround: switch to `hoisted` linker via `bunfig.toml`.

### 4.4 Module Resolution Edge Cases (MEDIUM)

Real-world migration case studies report:
- `cls-hooked` unsupported (Node-specific internals)
- Next.js 15 + shared React UI packages: context deduplication breaks during static generation (Bun #23800)
- `express-rate-limit` broke post-migration
- Design system packages throwing "module not found" for `createRequire` calls

**Mitigation:** These are project-specific. A dependency audit (`grep -r "cls-hooked\|require("` across the monorepo) should precede any migration plan.

---

## 5. Migration Complexity (Real-World Case Study Data)

Based on a published migration of a comparable monorepo (Next.js + Vite + React + design-system):

| Activity | Time Spent |
|---|---|
| Initial migration (lockfile, workspace config) | 2 hours |
| CI/CD (GitHub Actions) debugging | 3 hours |
| Docker build fixing | 4 hours |
| Git hooks (Husky) reconfiguration | 2 hours |
| Module resolution fixes | 5 hours |
| Testing and verification | 4 hours |
| **Total** | **~20 hours** |

CI time savings observed: ~10-25% per workflow (5min -> 4.5min backend, 13min -> 11min Next.js).

---

## 6. Ecosystem Context

| Metric | pnpm | Bun |
|---|---|---|
| GitHub stars (May 2026) | ~32k | ~80k |
| Top-100k repo usage (relative) | 11x Bun | Baseline |
| Turborepo/Nx compatibility | Standard | Community adapter layer |
| npm registry adoption | 10-15% (growing) | 3-5% (fastest growing) |
| State of JS 2025 satisfaction | High | "S-tier" (highest rating) |

pnpm has higher production share; Bun has faster growth and higher developer enthusiasm. Both are trending upward while npm and Yarn decline.

---

## 7. Cost Analysis (30-Package Monorepo)

### 7.1 CI Cost Reduction

Assuming 200 CI runs/day, $0.008/min compute:
- pnpm: 171s per run = ~57 hours/day = $27.36/day
- Bun: 143s per run = ~48 hours/day = $22.85/day
- **Savings: ~$4.50/day = ~$1,650/year**

This is real but modest -- CI cost savings alone don't justify the migration risk.

### 7.2 Developer Productivity

Assuming 20 developers, 5 `install` operations per day:
- pnpm: 10s average x 5 x 20 = ~17 minutes/day in install wait
- Bun: 1.5s average x 5 x 20 = ~2.5 minutes/day in install wait
- **Saved: ~14.5 minutes/day = ~60 hours/year**

This is the stronger argument -- install wait accumulates across the team.

### 7.3 Migration Cost

- Engineering time: ~20-40 hours (one-time)
- Risk of production issues: moderate (see Section 4)
- Ongoing maintenance of workarounds: 2-5 hours/month (if publish protocol workaround needed)

---

## 8. Recommendation Structure

The RFC should include BOTH the "yes" and "no" cases with data, structured as:

### Case for Migrating (Yes)

1. **Install speed**: 5-7x faster cold, 3-7x faster warm
2. **Toolchain consolidation**: One binary replaces Node.js runtime, test runner (`vitest`/`jest`), and package manager
3. **Developer experience**: 1.5s installs feel instantaneous; branch switching friction drops dramatically
4. **CI savings**: ~16% reduction in CI pipeline time
5. **Directional alignment**: Bun is the fastest-growing tool; pnpm is mature but plateauing
6. **Native TypeScript**: Scripts run directly without transpilation step

### Case Against Migrating (No, or Wait)

1. **`workspace:*` publish blocker**: If you publish to npm, this is a hard blocker
2. **Binary lockfile**: Breaks dependency change review
3. **pnpm's filtering is still superior**: `--filter ...{^...}` graph selectors have no Bun equivalent
4. **Migration risk is non-trivial**: 20+ hours, edge cases in module resolution
5. **CI savings are modest**: $1,650/year doesn't justify risk on its own
6. **pnpm's global store**: If your team works on multiple JS projects, pnpm saves significant disk

### Conditional Recommendation

- If the team already uses Bun as the runtime (bun test, bun run): **stronger case for alignment**
- If packages are published to npm: **pnpm until workspace:* publishing is fixed**
- If internal-only monorepo (no npm publish): **Bun is viable today with lockfile review tooling**
- If CI cost reduction is the primary driver: **not worth the migration risk alone**

---

## 9. Key Data Points to Include in the RFC

1. **Your actual install benchmarks**: Run `time pnpm install` vs `time bun install` on YOUR monorepo, cold and warm
2. **Dependency audit**: List all packages using Node-specific APIs (`cls-hooked`, `node-gyp`, native addons)
3. **Publish pipeline**: Document whether `workspace:*` is used and whether publish resolution is needed
4. **CI pipeline timing**: Break down install vs build vs test time in your actual CI
5. **Team survey**: Developer satisfaction with current pnpm workflow and appetite for change
6. **Migration test run**: Attempt `bun install` in a branch and catalog all failures

---

## 10. Proposed RFC Structure

```
1. Problem Statement
   - What pain points does pnpm cause today?
   - Quantitative data (install wait, CI time, DX survey)

2. Proposed Solution
   - Migrate to bun as unified package manager + runtime

3. Technical Analysis
   - Performance benchmarks (your own data)
   - Feature parity assessment
   - Known gaps and workarounds

4. Risk Assessment
   - workspace:* publish blocker
   - Binary lockfile reviewability
   - Module resolution edge cases
   - Migration complexity estimate

5. Alternatives Considered
   - Stay on pnpm (do nothing)
   - Adopt bun for local dev only, keep pnpm for CI/publish
   - Wait for bun v1.4/v1.5 to close known gaps

6. Implementation Plan
   - Phase 1: Dependency audit + compatibility test
   - Phase 2: CI migration (parallel run)
   - Phase 3: Developer migration
   - Phase 4: Archive pnpm-lock.yaml

7. Success Metrics
   - CI time reduction target
   - Developer satisfaction improvement
   - Zero production regressions
   - Time-to-revert threshold

8. Recommendation
   - Clear yes/no/wait with conditions
```

---

Sources:
- Benchmarks: dev.to 2026 package manager showdown, Better Stack Community
- Migration case study: Intlayer monorepo migration (arctic-shift.photon-reddit.com)
- Bun issues: oven-sh/bun #25970 (Windows hang), #23800 (Next.js context), #14662 (catalog migration)
- State of JS 2025: package manager satisfaction and adoption data
- Steve Kinney's Enterprise UI: workspace package manager comparison
