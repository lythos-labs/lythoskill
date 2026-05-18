# RFC: Switch Monorepo from pnpm to Bun — Supporting Data

> **Context**: ~30 packages with interdependencies. This document collects the quantitative and qualitative data needed to evaluate the recommendation.

---

## 1. Install Performance (Cold Cache)

All figures from 2025–2026 independent benchmarks on a large monorepo (15 packages, ~800 direct dependencies, ~3,500 total). Your ~30-package repo sits between the "large" and "medium" data points below.

| Scenario | Bun | pnpm | Bun vs pnpm |
|---|---|---|---|
| Large monorepo (15 pkgs, 800 deps) | **4.8s** | 28.6s | 6.0x faster |
| Medium project (200 deps) | **2.1s** | 12.4s | 5.9x faster |
| Small project (50 deps) | **0.8s** | 4.2s | 5.3x faster |

**Projection for ~30 packages**: Bun roughly 3–7s, pnpm roughly 12–25s on cold install, depending on total dependency count. Bun consistently wins by 5–6x on cold installs.

## 2. Install Performance (Warm Cache / Lockfile Exists)

| Scenario | Bun | pnpm | Bun vs pnpm |
|---|---|---|---|
| Small (50 deps) | **0.3s** | 1.1s | 3.7x faster |
| Large (800 deps) | **1.2s** | 8.4s | 7.0x faster |

Warm installs are near-instant with Bun (sub-second to ~1s). This matters for local development iteration (frequent `install` after branch switches) and CI cache-hit scenarios.

## 3. Full CI Pipeline Impact (Install + Build)

| Package Manager | Install | Full Build | Total |
|---|---|---|---|
| Bun | 4.8s | 138s | **~142.8s** |
| pnpm | 28.6s | 142s | **~170.6s** |

**Key insight**: Build time dominates CI pipelines. Bun's raw install speed advantage (24s saved) translates to only a ~16% total CI improvement when builds are long. Real-world migration reports confirm this: one developer reported CI went from 13 min to 11 min (~15% improvement) for a Next.js monorepo, and from 5 min to 4.5 min (~10% improvement) for a backend service.

**Practical CI gain ceiling for a 30-package monorepo**: likely 10–25% total pipeline time reduction. The 5–6x install speed headline number is real but misleading when install is a small fraction of total CI time.

## 4. Monorepo Workspace Feature Comparison

| Feature | pnpm | Bun |
|---|---|---|
| Workspace protocol | `workspace:*` (mature) | `workspace:*` (basic) |
| `--filter` selector syntax | Rich, well-tested | Described by community as "buggy" |
| Topological script ordering | `pnpm run -r --topological` | Not built-in |
| Strict dependency isolation | Yes (prevents phantom deps) | Only with isolated linker (default in 1.3+) |
| Catalog / version pinning | `pnpm-workspace.yaml` catalogs | `bunfig.toml` catalogs (dedup bugs in 1.3+) |
| Hoisting control | Fine-grained (`hoist`, `hoistPattern`) | Binary: hoisted or isolated |
| TurboRepo / Nx integration | First-class | Works but less battle-tested |
| Auto-cleanup of stale cache | Yes | No — requires manual `rm -rf node_modules bun.lock` |

**Critical Bun workspace bugs (as of 2025–2026)**:
- **Catalog deduplication broken in Bun 1.3+** with isolated installs — multiple versions of the same package installed when one would satisfy all (causes runtime errors). Workaround: `linker = "hoisted"` in `bunfig.toml`.
- **Stale cache persistence**: `.bun` cache does not auto-clean when `package.json` or catalog entries change. The only reliable fix is `rm -rf node_modules bun.lock && bun install` after every version change.
- **Windows hangs**: `bun install` with symlink linker hangs indefinitely on large monorepos (~20 workspaces, ~1500 packages). Workaround: force `linker = "hoisted"`.
- **`--filter` unreliability**: Three separate third-party npm packages exist (`workspaces-filter`, `bunn`, `bun-workspaces`) specifically to work around Bun's broken `--filter`.

## 5. Lockfile Comparison

| Aspect | `pnpm-lock.yaml` | `bun.lock` (JSONC) |
|---|---|---|
| Format | YAML | JSON with Comments |
| Human readability | Verbose (thousands of lines) | Compact, designed for PR review |
| GitHub diff rendering | Full YAML diff | Full JSONC diff |
| Tooling detection | Universal | Still catching up (Dependabot, AWS CDK, Cloudflare had gaps) |
| Migration path | — | `bun install` auto-migrates from pnpm-lock.yaml |

Bun's `bun.lock` text format (default since Bun v1.2, Feb 2025) is generally more compact and readable than `pnpm-lock.yaml` for PR reviews. However, some third-party tools (Dependabot, SBOM generators, CDK) still do not detect it.

## 6. Disk Space

| Package Manager | Single Project | Monorepo (Multi-Project) |
|---|---|---|
| pnpm | 205 MB | **Dramatically smaller** — content-addressable global store, one copy of each package version across all projects |
| Bun | 234 MB | Larger per-project; global cache exists but lacks pnpm's hard-link deduplication |

**For a 30-package monorepo**: pnpm's disk advantage is significant. If all 30 packages share React, TypeScript, etc., pnpm stores one copy via hard links. Bun stores per-project copies. The gap widens with more packages and shared dependencies.

## 7. Migration Complexity

Based on real-world pnpm-to-Bun migration reports:

| Area | Effort | Details |
|---|---|---|
| Root config | Low | `packageManager` field, remove `pnpm-lock.yaml` / `pnpm-workspace.yaml`, commit `bun.lock` |
| Scripts | Medium | `pnpm` → `bun run`, `pnpm exec` → `bunx`, filter syntax changes |
| CI/CD | Medium | `oven-sh/setup-bun@v2`, cache key format changes, workflow YAML updates |
| Docker | **High** | Official `oven/bun` images caused infinite CPU hang / crashes in real migrations; workaround is Node image + manual Bun install |
| Dev tooling | Medium | Husky hooks break (manual path fixes), Biome/ESLint via `bunx` |
| Package compatibility | **High risk** | `cls-hooked`, `express-rate-limit`, and `createRequire`-based packages have known Bun runtime failures |
| Module resolution | **High risk** | CJS/ESM interop issues across workspace packages, especially `createRequire` and conditional exports |

**Real-world time budget**: One developer reported ~20 hours for a multi-app monorepo migration, including ~3 hours of CI debugging (15 push-wait-fix cycles). Their conclusion: "If I knew then what I know now, I probably wouldn't have done it."

## 8. Ecosystem Maturity & Adoption

| Metric | pnpm | Bun |
|---|---|---|
| Est. market share (2025) | 10–15% (fastest growing) | 3–5% (rising fast) |
| State of JS 2025 satisfaction | High | "S Tier" (highest satisfaction, first time) |
| Node.js API compatibility | 100% (runs on Node) | ~90–99% (edge cases remain) |
| Open GitHub issues | Low | ~4,700 (vs Node ~1,700) |
| Used by | Vue 3, Vite, Microsoft, Prisma | Smaller/greenfield projects primarily |

## 9. Hybrid Approaches Worth Evaluating

1. **Bun as installer only, Node as runtime**: Use `bun install` for fast dependency resolution, keep `node` for runtime. Avoids runtime compatibility risks. Gains install speed without runtime risk. Some teams report this as a pragmatic middle ground.

2. **Bun for local dev, pnpm for CI**: Fast local installs, stable CI. Adds complexity of two lockfiles to maintain.

3. **Stay on pnpm, optimize CI cache**: With proper `actions/cache@v4` + `--frozen-lockfile` + `--offline`, pnpm CI installs can drop from 15 min to 5 min (92% cache hit rate). This may eliminate the install-speed motivation entirely.

## 10. Summary Decision Matrix

| Criterion | Winner | Margin |
|---|---|---|
| Raw install speed | **Bun** | 5–6x |
| Monorepo workspace maturity | **pnpm** | Significant |
| Dependency isolation correctness | **pnpm** | Significant |
| Disk efficiency (multi-project) | **pnpm** | Moderate–Large |
| Lockfile reviewability | **Bun** | Small |
| CI integration simplicity | **Bun** | Small (no Corepack) |
| Ecosystem tooling compatibility | **pnpm** | Significant |
| Migration risk | **pnpm** (status quo) | — |
| Runtime + package manager unification | **Bun** | N/A (if you want it) |
| Long-term maintenance predictability | **pnpm** | Moderate |

**Bottom line**: The install speed advantage is real but narrows significantly when considering total CI time, workspace feature gaps, and migration risk. For a 30-package monorepo with interdependencies, the recommendation depends on whether you prioritize raw speed (Bun) or correctness + maturity (pnpm). If your CI bottleneck is build time rather than install time, the case for switching weakens considerably.

---

Sources:
- [pnpm vs npm vs yarn vs Bun: The 2026 Package Manager Showdown](https://dev.to/pockit_tools/pnpm-vs-npm-vs-yarn-vs-bun-the-2026-package-manager-showdown-51dc)
- [Bun is Fast, pnpm is Correct (dev.to)](https://dev.to/tumf/bun-is-fast-pnpm-is-correct-the-future-of-the-js-ecosystem-as-shown-by-two-package-managers-2l06)
- [pnpm vs Bun Install vs Yarn Berry (Better Stack)](https://betterstack-com.analytics-portals.com/community/guides/scaling-nodejs/pnpm-vs-bun-install-vs-yarn/)
- [pnpm vs npm vs yarn vs bun: The Real Comparison (dev.to)](https://dev.to/jtorchia/pnpm-vs-npm-vs-yarn-vs-bun-the-real-comparison-nobody-gives-you-in-2025-1pg6)
- [pnpm to Bun migration real-world experience (juejin.cn)](https://juejin.cn/post/7560901930673029146)
- [Bun monorepo workspace issues: catalog dedup bug (GitHub #23615)](https://github.com/oven-sh/bun/issues/23615)
- [Bun monorepo: Next.js 15 useContext bug (GitHub #23800)](https://github.com/oven-sh/bun/issues/23800)
- [Bun text lockfile announcement](https://bun.com/blog/bun-lock-text-lockfile)
- [Bun lockfile documentation](https://bun.com/docs/pm/lockfile)
- [State of JS 2025 results](https://www.163.com/dy/article/KPBQL98U0511D3QS.html)
- [GitHub Actions pnpm caching deep-dive (Hotdry Blog)](https://blog.hotdry.top/posts/2025/12/09/GitHub-Actions-Package-Manager-Design-Flaws-Performance-Traps-Pipeline-Optimization/)
- [npm vs pnpm vs Bun: Workspace Package Managers (Steve Kinney)](https://stevekinney.com/courses/enterprise-ui/workspace-package-managers)
