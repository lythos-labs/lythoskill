# Q3 Tech Radar — Research Findings

**Date:** 2026-05-18
**Prepared for:** Team tech radar Q3 update

---

## 1. Bun — Is It Stable Enough for Production CI Pipelines?

### Verdict: Yes, for CI pipelines. Cautious yes for production runtime.

### Current State
- Bun 1.1+ is widely considered production-grade. Anthropic's own Claude Code CLI runs on Bun. The runtime has shed its "fast but buggy" reputation.
- An ongoing Zig-to-Rust rewrite hit **99.8% test compatibility** on Linux x64 glibc, promising better long-term memory safety.
- ~99.7% Node.js API compatibility in Bun 2.0.

### CI Pipeline Performance (the headline numbers)
| Metric | Bun 1.3 | Node.js 26 | Gain |
|---|---|---|---|
| Cold install (1,247 deps) | **8.2s** | 38.6s | ~4.7x |
| Warm install | 1.4s | 4.2s | ~3x |
| Test suite (312 tests) | **4.1s** | 91.2s (Jest) | ~22x |
| Container build | 2m 8s | 4m 23s | ~51% |
| Cold startup | 5-40ms | 50-150ms | ~4x |
| Memory (K8s pods) | 40% lower | baseline | — |

A fintech case study reported CI install time dropping from 11.2 min to 1.8 min (84% reduction), saving $1,900/month.

### Blockers / Gaps
- **Debugging:** No Chrome DevTools integration; `bun --inspect` is limited.
- **APM/Observability:** Datadog, New Relic, Sentry support is experimental.
- **Native addons:** `node-gyp` compiled packages (bcrypt, sharp) may break.
- **HTTP/2 pipelining:** Significantly slower than Node.js in synthetic benchmarks.
- **Windows:** Improved but edge cases remain.

### Recommendation
**Adopt for CI pipelines now.** The install + test speed wins are too large to ignore. For production runtime, adopt on greenfield services where observability tooling is not a hard requirement. Keep Node.js for services with deep native-addon dependencies or compliance-mandated APM coverage.

---

## 2. React Server Components — Should New Projects Default to RSC?

### Verdict: Yes, with explicit carve-outs for three counter-patterns.

### Current State
RSC exited "experimental" with React 19 and is the **default execution model** in Next.js App Router. The industry has converged: Server Components are no longer optional knowledge. The question has shifted from "whether" to "where to draw the server/client boundary."

### Wins
- **30-50% less client-side JavaScript** for content-heavy applications.
- **Eliminates `useEffect` waterfalls** — components `await` data directly without an API layer.
- **Faster FCP and TTI** — HTML streams without waiting for JS bundles.
- **Natural fit for AI workloads** — server-side computation, vector embeddings, RAG pipelines.

### When NOT to Default to RSC
| Scenario | Reason |
|---|---|
| Highly interactive apps (Figma-like, collaborative editors, real-time dashboards) | RSC adds architectural complexity with little benefit — stay client-side |
| Offline-first PWAs | RSC assumes server availability; incompatible with service-worker-first architectures |
| Simple static sites | Plain HTML or static generation is simpler and sufficient |

### Key Architectural Nuance
Counterintuitively, marking Tailwind-heavy presentational components as Client Components can **reduce** Flight payload sizes by 40%+. RSC serializes every `className` string into JSON; client components ship the CSS once.

### Recommendation
**Default to RSC for all new projects** unless the project falls into one of the three carve-outs above. Start with Server Components everywhere, push `'use client'` to leaf-level interactivity (buttons, modals, forms), and measure your specific bundle. Framework: Next.js App Router is the path of least resistance.

---

## 3. Express 5.x — Is the Migration from v4 Worth the Effort?

### Verdict: Not optional. The real question is timing and budget.

### Current State
- Express 5.2.x is the **production-recommended release** by the Express Technical Committee.
- Express 4 entered **formal Maintenance** on April 1, 2025. Target EOL: **no sooner than October 1, 2026**.
- Express 3 is already EOL and unmaintained for over a decade.
- Express 4 has received only 5 minor updates since Express 5 shipped in 2024 — limited to defect and CVE fixes.

### Compliance Pressure
Running unsupported framework versions is flagged as an open finding under SOC 2, FedRAMP, HIPAA, PCI DSS, the EU Cyber Resilience Act, and DORA. This is not a hypothetical concern — it will surface in your next audit.

### Breaking Changes That Matter
| Change | Impact |
|---|---|
| Wildcard routes (`path-to-regexp` v8) | Bare `*` must become named wildcards `'{*splat}'`; silently broken routes possible |
| Async error handling | Rejected promises now properly propagate; previously swallowed errors will surface |
| `req.query` parser default | Changed from `qs` (extended) to `simple`; nested query params break unless reconfigured |
| Renamed methods | `res.sendfile()` → `res.sendFile()`, `app.del()` → `app.delete()` |
| Node.js requirement | Drops Node.js 16/18; requires Node.js 20+, but Node 22 (Active LTS) is the target |
| Middleware compatibility | Some third-party middleware still lacks Express 5-compatible versions |

### Migration Cost Estimates (Enterprise)
- **3 weeks to 3 months per service**
- **$50k to $250k per service** (fully loaded)
- Fleet of 40-200 services → **seven-figure, multi-quarter effort**

### Is It Worth It?
| When | Assessment |
|---|---|
| **New projects** | Start on Express 5.2.x now. No reason to begin on v4. |
| **Compliance-exposed services** | Highest priority. Must migrate before EOL. |
| **Well-tested services** | Manageable; native async error handling is a genuine quality-of-life win. |
| **Large fleet, thin coverage** | Hardest case. Budget carefully and sequence by compliance risk. |
| **Considering alternatives** | This is a natural inflection point to evaluate Fastify, Hono, or serverless runtimes if Express's architecture no longer fits. |

### Recommendation
**Plan the migration now, execute in priority order.** The clock is ticking on Express 4's community support window. Start with an inventory audit of every Express 4 service, upgrade Node.js to 22 first, then migrate service by service starting with compliance-exposed endpoints. If your migration calendar extends past October 2026, secure a commercial extended-support bridge.

---

## Summary Decision Matrix

| Technology | Recommendation | Urgency | Risk |
|---|---|---|---|
| Bun (CI) | Adopt | Medium | Low — CI is a sandboxed environment |
| Bun (Production) | Adopt selectively | Low | Medium — observability gaps |
| React Server Components | Default for new projects | Medium | Low — carve-outs are well-understood |
| Express 5 Migration | Mandatory — plan now | **High** | **High** — compliance exposure post-Oct 2026 |
