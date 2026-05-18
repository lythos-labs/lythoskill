# Bun Production Readiness Assessment: API Rewrite from Node.js/Express

**Date:** 2026-05-18
**Context:** Evaluating Bun as a replacement runtime for an existing Node.js/Express API.
**Audience:** CTO / engineering leadership. Specifics, not general impressions.

---

## 1. Performance

### Raw Benchmarks (Bun 1.3.x vs Node.js 22/24)

| Metric | Node.js | Bun | Delta |
|--------|---------|-----|-------|
| HTTP throughput (simple) | ~12,000 req/s | ~18,000 req/s | +50% |
| HTTP throughput (optimized) | ~50,000 req/s | ~150,000 req/s | +200% |
| Cold start (serverless) | 800ms–1.4s | 120ms–290ms | 5–16x faster |
| Memory footprint (idle) | ~56 MB | ~28 MB | -50% |
| Memory under load (RSS) | ~192 MB | ~85–128 MB | -30–40% |
| `npm install` (400 deps) | 45s | 6s | ~7x faster |
| Test suite (312 tests, Jest) | 90s | 4.1s (`bun test`) | ~20x faster |

### Framework-Specific Benchmarks

| Configuration | Throughput | Notes |
|---------------|-----------|-------|
| Express on Node.js | 880 req/s | Baseline |
| Express on Bun | 1,030 req/s | +17%, zero code changes |
| Fastify on Node.js | 30,000–65,000 req/s | Enterprise pick |
| Hono on Bun | 50,000+ req/s | Native multi-runtime; best perf on Bun |
| Bun.serve() (native) | #1 in HttpArena mixed workloads | Beats Deno, Go frameworks |

### Real-World Migration Results

- **Trigger.dev** (connection broker): 5x throughput (2,099 -> 10,700 req/s), 28x better max latency, container image 180MB -> 68MB.
- **Anonymous team** (Express + TS API, Node 22 -> Bun): p50 latency 12ms -> 8ms, p99 latency 180ms -> 65ms, CI pipeline 8min -> <3min.

**Bottom line on perf:** Bun delivers 30-50% throughput improvement for real API workloads and dramatically faster CI/test cycles. The biggest win is cold start (5-16x) for serverless/containerized deployments. However, synthetic 3x claims do not materialize in production -- real APIs see 30-40%.

---

## 2. Stability

### Critical Context: The Rust Rewrite (May 2026)

- Bun 1.3.14 was the last Zig-based release. A ~960K-line Rust rewrite (6,755 commits, 2,188 files) was merged in ~6 days via Claude Code.
- Test suite passes at 99.8%. Binary size reduced 3-8 MB. Performance neutral to faster.
- Motivation: memory safety (Rust borrow checker), Zig's beta-language instability, Zig's no-AI-upstream policy clashing with Anthropic's AI-first development.
- **Controversy:** ~13,000 `unsafe` blocks remain. The PR was too large for human review. Some tests were modified to pass. At least one prominent developer (SuperRails) publicly removed Bun from their stack citing trust concerns.

### Known Stability Issues (Pre-Rust, 1.1.x–1.3.x)

- **Memory leaks** in long-running processes leading to OOM crashes. Reddit reports of 14-23 GB spikes under Claude Code workloads. Bun 1.1.13 (April 2026) shipped Libpas scavenger allocator and 5% baseline reduction targeting this.
- **Segfaults** on Linux (Ubuntu 24, Docker) significantly more common than macOS. V2EX community reports frequent crashes in Docker.
- **Native addon crashes** (sharp, Prisma binary engine) under high concurrency.
- **API breakage** between 1.1.x and 1.2.x on HTTP server types.
- **Pipelining gap:** Ranked #41/51 in HttpArena HTTP pipelining; Node.js ~5x faster on pipelined requests.
- **Upload performance:** Ranked #42/48; Node/Express 3.5x faster on large file uploads.

### Stability Assessment Post-Rust Rewrite

The Rust rewrite is the single largest signal of stability improvement, but it is **too new to have a production track record** (days old as of this writing). The 99.8% test pass rate is encouraging; the ~13,000 `unsafe` blocks and AI-generated scale are concerning.

**Verdict:** Pre-Rust Bun had real stability gaps for long-running processes. The Rust rewrite likely fixes the memory-leak class of bugs but introduces unknown regression risk. Wait 1-2 release cycles for the Rust build to stabilize before betting production on it.

---

## 3. Ecosystem Maturity

### What Works

| Category | Status | Details |
|----------|--------|---------|
| Pure JS/TS npm packages | Full | React, Zod, Lodash, Axios, date-fns, etc. |
| Node.js built-in modules | ~95-98% | `node:fs`, `node:http`, `node:crypto`, `node:stream`, `node:buffer`, `node:process` |
| Express | Full | Runs on Bun with zero changes; +17% perf |
| Fastify | Full | Runs on Bun; +5.4% perf from 1.3 optimizations |
| Hono | Full, native | Best Bun framework; multi-runtime |
| Elysia | Full, native | Bun-optimized; best raw perf |
| PostgreSQL | Full | `bun:sql` native client + `pg` (node-postgres) |
| MySQL | Full | `bun:sql` native client + `mysql2` |
| SQLite | Full | `bun:sqlite` native, zero-dep |
| Redis | Full | Native client (7.9x faster than ioredis) |
| Prisma | Partial (v5.4+) | Connection pooling edge cases; Drizzle ORM recommended |
| Drizzle ORM | Full | Works natively; preferred for Bun |

### What Is Broken or Problematic

| Package | Issue | Workaround |
|---------|-------|------------|
| `sharp` | Segfaults under high concurrency | Isolate to Node microservice, or WebAssembly fallback |
| `bcrypt` | Native addon, broken | Use `Bun.password` or `bcryptjs` (pure JS) |
| `canvas` | No practical workaround | Use browser-side rendering |
| `argon2` | Native addon | Use browser-based alternative |
| `better-sqlite3` | Native addon | Use `bun:sqlite` |
| `socket.io` | Fallback transports broken | Rewrite with Bun's native WebSocket |
| Prisma query engine | Intermittent hangs | Drizzle ORM |

### Dependency Audit Thresholds

From the Bun risk quantification framework (blog.hotdry.top, May 2026):

- **<10 pure JS dependencies:** Low risk. Bun is a safe bet.
- **1-3 native addons:** Parallel validation required. Run the same test suite on both Node and Bun.
- **>5 native addons:** Defer production migration. The native addon surface area is too large.

---

## 4. Security

### Vulnerabilities Affecting Bun (2025-2026)

| Issue | Date | Severity | Status |
|-------|------|----------|--------|
| **PackageGate** (`trustedDependencies` bypass) | Jan 2026 | Medium | Patched by Bun within weeks |
| **Shai-Hulud Worm** (Bun used as payload runtime) | 2025 | High (supply chain) | Detection rules published |
| **Mini Shai-Hulud / SAP attack** (Bun downloaded to execute credential stealer) | Apr 2026 | Critical | Patched packages released |
| `curl \| bash` install vector | Ongoing | Medium | No integrity verification on `bun.sh/install` |

### Key Security Concerns

1. **Bun is weaponized by attackers** because it provides an alternative execution path that bypasses Node.js-focused security controls. The Mini Shai-Hulud attack specifically targeted Claude Code and VS Code configs.
2. **No Bun-specific CVEs** for the runtime itself have been published, but the `curl | bash` install method lacks checksum verification.
3. **Mitigations:** Use `--ignore-scripts` during install, commit lockfiles, use official `oven/bun` Docker images with digest pinning, avoid piping `bun.sh/install` to bash.

---

## 5. Observability & Operations

### APM / Monitoring Support

| Platform | Bun Support Level | Path |
|----------|-------------------|------|
| **Datadog** | "Custom Components" (documented, not first-class) | OpenTelemetry Node.js SDK -> OTLP -> Datadog Agent |
| **New Relic** | Via OTel only | Same OTel path |
| **Grafana + Tempo** | Via OTel | Full open-source stack |
| **Uptrace** | Native (`bunotel` extension) | ClickHouse-backed; 70-90% cheaper than Datadog |
| **Sentry** | Partial | `TracingChannel` API effort underway |

### Known Gaps

- **`Bun.serve()` auto-instrumentation:** Not supported. Requires manual spans.
- **`bun:sqlite` auto-instrumentation:** Not supported. Requires manual spans.
- **`@opentelemetry/instrumentation-fs`:** Must be disabled for Bun.
- **OTLP gRPC export:** Unreliable under Bun. Use HTTP exporters.
- **Node.js `--inspect` / Chrome DevTools:** Less polished debugging experience.

### Operational Maturity

- **Docker:** Official `oven/bun` images; container size advantage (68MB vs 180MB).
- **Kubernetes:** Teams report 40% memory reduction across K8s pods.
- **Windows production:** Described as "terrible." Bun is Linux/macOS-only for production.

---

## 6. Adoption & Case Studies

### Known Production Users

- **Anthropic** (owner since Dec 2025) -- internal use alongside Claude Code
- **Trigger.dev** -- migrated connection broker, 5x throughput
- Multiple startups and indie developers report production use (dev.to case studies)
- **No Fortune 500 / regulated-industry adoption publicly documented**

### Migration Experiences (Synthesized)

- **Greenfield:** "If I were starting a new project today, I'd use Bun."
- **Express migration:** "Worth it but budget 2+ weeks; audit native deps first."
- **Team bandwidth cost:** ~20-25 hours of runtime-specific debugging over first 2-3 months.
- **CI savings:** Test suite time drops from minutes to seconds.

---

## 7. Vendor & Strategic Risk

### Anthropic Ownership (Dec 2025)

- Bun is MIT-licensed and remains open-source.
- Anthropic's resources reduce abandonment risk but introduce **vendor concentration risk**: Bun + Claude Code + Anthropic API = single vendor for runtime, coding agent, and LLM.
- The AI-assisted Rust rewrite demonstrates Anthropic's development philosophy: fast, AI-driven, large-scale. Double-edged: faster fixes, less traditional human review.

### Hiring & Team

- **Bun-specific talent pool is small.** Most Node.js developers adapt quickly (compatible API surface), but deep Bun debugging expertise is rare.
- **Learning curve:** Low for pure JS/TS; moderate when hitting Bun-specific edge cases.
- **Tooling ecosystem:** Smaller than Node.js. IDE integration, debugging, and profiling less mature.

---

## 8. Recommendation Matrix

| Scenario | Recommendation | Confidence |
|----------|---------------|------------|
| New greenfield API, pure TS/JS deps | Adopt Bun (Hono or Elysia) | High |
| Express migration, zero native addons | Migrate; budget 2-3 weeks | Medium-High |
| Express migration, 1-3 native addons | Parallel run both Node and Bun first | Medium |
| Express migration, >5 native addons | Stay on Node.js; reevaluate in 6 months | High |
| Regulated industry (finance, healthcare) | Stay on Node.js | High |
| Serverless / Lambda | Strongly consider Bun (cold start is transformative) | High |
| Windows production | Stay on Node.js | High |
| Need 99.99%+ uptime, sustained 72h+ loads | Stay on Node.js; Bun's Rust rewrite too new | Medium-High |

---

## 9. Key Unknowns (as of 2026-05-18)

1. **Rust rewrite stability:** Days old. No production track record. Wait 1-2 release cycles.
2. **Long-running process behavior:** Pre-Rust Bun leaked memory under sustained load. Rust rewrite targets this but unproven.
3. **Datadog/NR first-class support timeline:** No public roadmap. Current OTel path works but requires manual instrumentation for Bun-native APIs.
4. **Anthropic's Bun roadmap:** Post-acquisition priorities unclear. Will Bun remain general-purpose or narrow to AI/Claude use cases?

---

## Sources

- [Bun vs Node.js in Production: Three Months of Real Traffic](https://dev.to/synsun/bun-vs-nodejs-in-production-what-three-months-of-real-traffic-taught-me-3d96)
- [We Moved Our API from Node to Bun. Here's What Broke](https://dev.to/alanwest/we-moved-our-api-from-node-to-bun-heres-what-broke-and-what-got-3x-faster-3hg6)
- [Trigger.dev: Why We Replaced Node.js with Bun for 5x Throughput](https://trigger.dev/blog/firebun)
- [Bun HTTP Server: #1 in Mixed Workloads (HttpArena Deep Dive)](https://dev.to/fbio_reis_355b87b598508e/bun-http-server-1-in-mixed-workloads-41-in-pipelining-the-full-picture-httparena-deep-dive-4h6e)
- [Is Bun Production-Ready in 2026? A Practical Assessment](https://dev.to/last9/is-bun-production-ready-in-2026-a-practical-assessment-181h)
- [Bun Compatibility in 2026: What Works, What Doesn't](https://dev.to/alexcloudstar/bun-compatibility-in-2026-what-actually-works-what-does-not-and-when-to-switch-23eb)
- [Bun Compatibility in 2026: npm, Node.js, Next.js (Alex Cloudstar)](https://www.alexcloudstar.com/blog/bun-compatibility-2026-npm-nodejs-nextjs/)
- [Bun vs Node.js in 2026: Which Runtime Should You Use?](https://dev.to/ottoaria/bun-vs-nodejs-in-2026-which-runtime-should-you-actually-use-lg7)
- [Bun Runtime Risk Assessment Framework (May 2026)](https://blog.hotdry.top/posts/2026/05/05/bun-runtime-risk-assessment-framework/)
- [Anthropic's Bun Rust Rewrite Merged at Speed of AI (The Register, May 2026)](https://www.theregister.com/devops/2026/05/14/anthropics-bun-rust-rewrite-merged-at-speed-of-ai/5240381)
- [Anthropic's Bun Team Trials Port from Zig to Rust (The Register, May 2026)](https://www.theregister.com/software/2026/05/05/anthrophics-bun-team-trials-port-from-zig-to-rust/5222094)
- [Bun 1.1.13 Out with Memory Fixes (The Register, April 2026)](https://www.theregister.com/software/2026/04/21/bun-1113-out-with-memory-fixes-as-dev-complain-of-leaks/5221154)
- [I've Given Up on Bun (SuperRails author)](https://dev.to/hulkinpublic/ive-given-up-on-bun-im-removing-it-from-superrails-1pg4)
- [Bun Introduces Built-in Database Clients (InfoQ, Jan 2026)](https://www.infoq.com/news/2026/01/bun-v3-1-release/)
- [PackageGate Vulnerabilities (DevOps.com, Jan 2026)](https://devops.com/packagegate-vulnerabilities-can-let-attackers-bypass-shai-hulud-defenses/)
- [SAP npm Packages Compromised in Supply Chain Attack (The Hacker News, Apr 2026)](https://thehackernews.com/2026/04/sap-npm-packages-compromised-by-mini.html)
- [Instrument Unsupported Runtimes with OpenTelemetry (Datadog Docs)](https://docs.datadoghq.com/opentelemetry/guide/instrument_unsupported_runtimes/)
- [Bun Performance Monitoring (Uptrace)](https://bun.uptrace.dev/guide/performance-monitoring.html)
- [V2EX Community Discussion: Bun Stability Issues](https://global.v2ex.co/t/1131622)
