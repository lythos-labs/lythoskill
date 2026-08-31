---
created: 2026-08-29
category: research
domain: integration-survey
created_by: kimi-session (arena deep-research cell, TASK-20260828004417068)
sources:
  - "github.com/deepseek-ai/deepseek-harness (official repo, docs/capability-seams.md, apps/cli/reference/README.md)"
  - "community plugin-API evidence: ligaoc/dsh-plugin-dev, huiliyi37/dsh-tianshu-tui, dsh-TUI marketplaces"
  - "orchestrator spot-check 2026-08-29: official README + CLI reference fetched and matched report claims"
zk_validated: false
status: draft
---
# DeepSeek Harness (dsh) × lythoskill governance — integration survey

- **Task**: TASK-20260828004417068 (research-level; findings + recommendation, no implementation)
- **Date**: 2026-08-29
- **Method**: agent-orchestrated arena run (deep-research deck, single cell) — outline from the task card, structured primary-source fetching per question, synthesis with inline citations. Orchestrator spot-checked the two load-bearing primary sources (official repo README, CLI behavior reference) against the report's claims before adopting.
- **Source-quality key**: **[P]** = primary (official repo/docs); **[C]** = community plugin/skill used as concrete API evidence; **[M]** = third-party marketplace/directory (ecosystem signal only).

## TL;DR

DeepSeek Harness is real, official (DeepSeek AI, MIT, developer preview since 2026-08-13), and its plugin architecture is exactly as the task card describes: Cordis plugin rows, `cordis.patch.yml` bundles, `ctx.agents`, and a durable session-event API are all documented in primary sources. The bidirectional fit is genuine on both sides. **Recommendation: adapter-only** — build a `deepseek-harness` arena player against the official `headless` profile now (cheap, contract-stable surface), and defer shipping lythoskill capabilities as dsh plugins until the rc-channel churn settles. The reverse direction (deck governance for dsh's plugin sprawl) is a real market need but a product bet, not an engineering task — watch it.

---

## Q1 — dsh plugin architecture: what can a plugin actually hook?

### Kernel: Cordis v4

dsh is "everything-is-a-plugin" on top of **Cordis**, whose design is formalized in the paper *A Programming Paradigm for Spatiotemporal Composability* (arXiv 2608.25512 per [opentrain.ai](https://www.opentrain.ai/papers/a-programming-paradigm-for-spatiotemporal-composability--arxiv-2608.25512/)) **[P→paper]**. Cordis is the Koishi chatbot framework's plugin kernel: Koishi production runs Cordis v3 with 4,000+ community plugins; dsh ships the v4 rewrite as `@deepseek-ai/cordis@4.0.1` ([Redreamality's survey](https://redreamality.com/blog/cordis-spatiotemporal-composability-deepseek-harness/), [official repo README](https://github.com/deepseek-ai/deepseek-harness)) **[P/C]**. Core semantics: all mutations go through `ctx.effect` (returns a dispose closure, LIFO unwind), services are declared via `inject` and accessed as `ctx.<key>` through an inject-gated Proxy, and plugins hot-reload on config change ([paper解读, juejin](https://juejin.cn/post/7673465077636333587)) **[C]**. Practical consequence for us: **clean plugin unload is a framework guarantee**, not author discipline — governance plugins can be mounted/unmounted without residue.

### Plugin = module; bundle = distribution; profile = composition

Verified from the official CLI behavior reference ([`apps/cli/reference/README.md`](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/apps/cli/reference/README.md)) **[P]** and corroborated by the community skill [ligaoc/dsh-plugin-dev `SKILL.md`](https://raw.githubusercontent.com/ligaoc/dsh-plugin-dev/main/SKILL.md) (version-anchored to `dsh 0.1.0-rc.6`, defers to official docs on conflict) **[C]**:

- A **plugin** is a module exporting `name`, optional `inject`, a Schemastery `Config` schema, and `apply(ctx, config)`. Everything it registers is auto-disposed on unload.
- A **bundle** is an npm package whose `package.json` declares `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`. `dsh plugin add` reconciles the profile's `dsh.profile.bundles` list against installed packages by this declaration — packages without it install as plain dependencies with a one-time warning **[P]**.
- A **profile** (`$DSH_HOME/profiles/<name>`) is one bootable composition. Config composes **four layers, later wins per row**: bundle patches (in bundles-list order) → profile `cordis.patch.yml` → home `$DSH_HOME/cordis.patch.yml` → each `--patch` overlay **[P]**. A patch **replaces a row's entire `config` (no deep merge)**; rows support `insert` (new row, unique `id`), top-level override-by-`id`, and `disabled: true` **[C, matches CLI reference semantics]**.

So "Cordis plugin rows" = the entry tree of `{id, name, config, disabled}` rows that these patch layers compose. This is a *declarative, file-addressable* composition surface — the property that makes external governance tooling feasible at all.

### Extension points (what `ctx.*` a plugin can hook)

The machine-generated official service graph [`docs/capability-seams.md`](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/docs/capability-seams.md) **[P]** enumerates the seams. The ones that matter for this survey:

| Seam | Role (per official doc) | Relevance |
|---|---|---|
| `ctx.tools` | Tool registry + guarded execution pipeline (pre-policy → guards → dispatch → post-policy → result observation) | Register model-facing tools; enforce policy |
| `ctx.sessions` | Append-only Session store; **emits the durable session event feed** | Cross-session memory hooks |
| `ctx.sessionPersistence` | Durable persistence seam (jsonl / sqlite backends) | Where dsh's "memory" physically lives |
| `ctx.sessionQuery` | Session reads, traces, filters, full-text search | Scribe/retrieval integration |
| `ctx.agents` | Owns live Agent handles, the **create/resume factory seam**, initiator propagation | Programmatic agent lifecycle |
| `ctx.systemPrompt` | System-prompt assembly registry (`section({name, order, text})`) | Inject governance rules into every session |
| `ctx.skills` | Skill provider registry; merges provider catalogs (`skill-filesystem` impl) | **Deck governance hook — see Q2** |
| `ctx.approval` | One-shot permission decisions over `approval/request` waterfall; fails closed | Policy enforcement point |
| `ctx.commands` | Human slash-command registry (no model round-trip) | `/task`, `/daily` style UX |
| `ctx.settings` / `ctx.credentials` | Layered settings seam; credential-reference seam (config stores refs, never secrets) | Config surface for plugins |
| `ctx.storage` / `ctx.storageDomain` | Non-session KV hub + typed domain facility | Durable plugin state |
| `ctx.jobs` | Background job registry | Scheduled consolidation (dreaming) |
| `ctx.webServer` | HTTP route registration | Plugin-owned endpoints |
| `ctx.subagents` | Subagent provider seam (in-process, ACP, Codex, Claude Code, dsh-sdk backends) | dsh already federates other CLIs |

Event-level hooks (community-verified, consistent with the graph) **[C]**: the tool pipeline exposes five interception points — `tools/pre-execute`, guard, execute, `tools/post-execute`, result; agent lifecycle events include `agent/session-start`, `agent/pre-step`, `agent/request`, `system-prompt/assemble`; and `session/event` is the persistent-event observation point (`turn/*`, `tool/call` are *persisted session events*, observed via `session/event`, with custom event types merged into `SessionEventMap` via `declare module`).

**Concrete UI evidence**: community TUIs — [huiliyi37/dsh-tianshu-tui](https://github.com/huiliyi37/dsh-tianshu-tui) ("UI is a pure presentation layer: **all agent state comes from the session event stream**", installs into a `tui` profile) **[C]** and dsh-TUI ([marketplace entry](https://dshmarketplace.dev/plugins/ccch1mneyyy-dsh-tui), Claude-Code-style fullscreen TUI) **[M]** — prove the session-event feed is a sufficient API to build a whole terminal client on. The official repo also ships `@deepseek-ai/dsh-headless`, `-sdk`, `-sdk-minimal`, and `-acp` in-box bundles **[P]**, i.e. non-web surfaces are first-class.

### Distribution

`dsh plugin --profile <name> add <spec>` forwards to pnpm inside the profile dir; specs: npm package (recommended), tarball, `github:owner/repo[#ref]`, local dir **[P]**. Git specs ship **source**, built at install time by the package's `prepare` script — pnpm ≥10 blocks this until the consumer adds the package to `allowBuilds` in the profile's `pnpm-workspace.yaml`, because it is arbitrary code execution at install **[P, explicit in CLI reference]**. Discoverability is the GitHub `dsh-plugin` topic **[P]**.

## Q2 — lythoskill capabilities as dsh plugins

All four lythoskill pillars have a natural dsh seam. One cross-cutting caveat: lythoskill's npm packages are Bun-oriented TypeScript; dsh plugins run on Node ≥22.19 **[P/C]**. The cheap path is plugins that shell out to lythoskill CLIs (the thin-skill pattern already separates CLI from logic); the deep path (importing lythoskill libs in-process) needs a Node-compatibility check we did not perform.

| lythoskill capability | dsh integration surface | Shape of the plugin |
|---|---|---|
| **cortex** (tasks/ADRs, probe) | `ctx.tools` (model-facing `cortex_task`/`cortex_review` tools wrapping the CLI), `ctx.commands` (`/task` human commands), `ctx.systemPrompt.section` (inject task-governance rules at assembly), `ctx.sessionProjections` (per-session task state folds) | Host plugin + config schema; strongest fit — dsh has sessions/events but **no governance layer** anywhere in the seam graph |
| **scribe** (daily/weekly handoff) | `session/event` listener + `ctx.sessionPersistence`-adjacent reads; `agent/session-start` to inject the latest daily into context via `ctx.systemPrompt` | Pure host plugin; dsh's session events give better triggers than our current "remember to close the session" model |
| **dreaming** (SSOT consolidation) | `ctx.jobs` for scheduled runs; `ctx.sessionQuery` (official full-text search over sessions) as the read side; writes stay in our `cortex/`/wiki files | Feasible; note dsh already has a `compaction` seam, but it is intra-session context management, not cross-session SSOT — no overlap conflict |
| **deck** (skill governance) | `ctx.skills` seam: implement a SkillProvider that wraps `skill-filesystem` and filters the merged catalog against a declared deck file — **deny-by-default maps directly onto dsh's provider-merge model**; plus a profile-level layer managing `dsh.profile.bundles` / `cordis.patch.yml` as reconciled state | Architecturally the cleanest mapping of all four: lythoskill-deck already reconciles declared-vs-physical skill sets; dsh profiles are the same problem one level down |

## Q3 — reverse direction: dsh as lythoskill consumer

### Does dsh's plugin distribution create a governance need deck could serve?

Yes — the evidence is structural, not anecdotal:

- **Frictionless install with install-time code execution**: `dsh plugin add github:owner/repo` runs the package's `prepare` build script on the user's machine; the official docs themselves gate this behind an explicit `allowBuilds` opt-in and marketplace entries carry warnings like "⚠️ Plugins run with the [full privileges]" ([dsh-agent-teams listing](https://deepseek-harness-plugin.com/plugins/dsh-agent-teams/)) **[P/M]**.
- **Anarchic discovery**: discovery is a bare GitHub topic **[P]**, and at least six unofficial directories/marketplaces already exist (dshplugin.store, dshplugin.me, deepseekplugins.org, dshmarketplace.dev, dshfind.com, dsh.deepseek404.com), some explicitly marking entries **未验证 / "no commit-pinned verification result yet"** ([dsh.deepseek404.com entry](https://dsh.deepseek404.com/detail.php?id=huiliyi37%2Fdsh-tianshu-tui), [dshfind editor-verified badges](https://dshfind.com/en/plugins/huiliyi37/dsh-tianshu-tui)) **[M]**. A community "Radar" repo pre-scans plugin candidates before promoting them to curated lists ([ecosystem page](https://deepseekdocs.com/en/ecosystem)) **[M]** — i.e. the ecosystem is already reinventing curation, badly and in parallel.
- **Scale**: the ecosystem page indexes 1,345 `dsh-plugin`-topic projects **[M]** (the raw topic page claims 12,560 repos — the two figures disagree; see Epistemics). Two weeks after launch, this is past the point where ad-hoc install is safe.

What lythoskill-deck's model would add: a **declared deck file as SSOT** (which plugins/profiles are allowed), **deny-by-default reconciliation** of the working set, **FQ-only locators + commit pinning** (`github:owner/repo#<sha>` — dsh supports the syntax but nothing encourages it), and **provenance checks** (license/verification status — the marketplaces show this data exists but is unenforced). This is a genuine product-shaped opportunity; whether lythoskill should *be* that product for dsh is a strategy question, not settled by this survey.

### Is dsh viable as a lythoskill-arena player (headless mode)?

Yes — this is the strongest single finding. The official `headless` profile is an in-box bundle (`@deepseek-ai/dsh-headless`) with a documented one-shot contract **[P, CLI reference]**:

```
dsh --profile headless "run the tests"
```

- Creates one fresh persisted Agent, submits the positional task, waits for quiescence; **prints only the final assistant text on stdout, streams reasoning to stderr, exits 0 on `completed` else 1**; mounts no HTTP server/browser and opens no port.
- Invoking directory = workspace root, default `workspace-write` permission preset (writes confined to the workspace) — arena's temp-dir cells fit this exactly.
- Version probe: `-V`/`--version` on the launcher **[P]**.

Mapped onto our `AgentAdapter` interface (`packages/lythoskill-agent-adapter/src/types.ts`): `spawn({cwd, brief, timeoutMs}) → {stdout, stderr, code, durationMs}` is a near-1:1 subprocess wrap — strictly simpler than the current `deepseek-serve` adapter's HTTP daemon lifecycle (`packages/lythoskill-agent-adapter-deepseek-serve/src/deepseek-serve.ts`). Known gaps: `checkpoints[]` would be empty (headless exposes only reasoning deltas + final text; the durable JSONL session could be parsed post-hoc if checkpoints matter); model tier selection would go through profile settings/config layers rather than a CLI flag; and the `upstream` probe declaration from ADR-20260828004129233 applies cleanly (`binaries: ['dsh']`, rc version range). Per ADR-20260828004129143, note that host-handoff remains arena's default mode — a dsh adapter serves the cross-player-comparison specialist case.

## Recommendation: **adapter-only**

1. **Build the `deepseek-harness` arena player adapter now** against the headless profile. Cost is a thin subprocess wrapper; the contract (stdout/exit-code/no-port) is documented in the official CLI reference; it directly feeds ADR-20260828004129233's follow-up ("evaluate a deepseek-harness adapter"). **Follow-up task registration is required by the task card but outside this research cell's write scope — the orchestrator should register it referencing ADR-20260828004129233.**
2. **Do not ship lythoskill capabilities as dsh plugins yet.** The seam fit is excellent (Q2), but dsh is `0.1.0-rc.x` with announced compatibility-breaking changes **[P: README "THERE WILL BE COMPATIBILITY-BREAKING CHANGES"]**, the peer-dependency graph is partially unpublished (`dsh-type-meta` 404 incident documented in [dsh-plugin-dev](https://raw.githubusercontent.com/ligaoc/dsh-plugin-dev/main/SKILL.md)) **[C]**, and every community dev guide leads with "interfaces may change." Revisit when dsh hits a stable minor or when the rc-churn cadence measurably slows.
3. **Watch the governance-direction market** (dsh → deck). The need is real and growing (unverified-install warnings, duplicated curation efforts), but positioning lythoskill-deck as dsh's plugin governor is a product commitment. Trigger to re-open: dsh 1.0, or an official registry/governance API announcement, or inbound user demand.

## Epistemics — what is and isn't verified

- **Verified from primary sources**: existence/ownership/license of dsh; Cordis kernel + paper; profile/bundle/patch composition semantics; the seam catalog including `ctx.agents` and session-event feed; headless one-shot contract; plugin-install mechanics including `allowBuilds`.
- **Community-sourced (plausible, version-anchored, but third-party)**: the exact tool-pipeline event names, `SessionEventMap` declaration-merging, `inject`/`Config` idioms, rc-channel peer-version pitfalls. These come from one community skill that demonstrably did end-to-end testing, but I did not re-verify each against official source code.
- **Not verified at all**: no empirical run — I did not install or execute dsh; adapter feasibility is argued from documented contracts, not from a working spawn. The full `docs/user/develop/` tutorial series was located but not read end-to-end. The ecosystem-size figures (1,345 vs 12,560) conflict and both are single-source. Whether lythoskill's Bun-oriented packages run under Node 22 (required for in-process plugins) is untested.

## Sources

Primary:
- https://github.com/deepseek-ai/deepseek-harness (official README — everything-is-a-plugin, Cordis, developer preview warning, run modes)
- https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/docs/capability-seams.md (generated service/seam graph — ctx.* catalog)
- https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/apps/cli/reference/README.md (CLI behavior reference — profile boot, layers, headless contract, plugin add/allowBuilds)
- https://deepseek-harness.github.io/deepseek-harness/ (official docs landing — web UI, SDK, CLI modes, plugin dev entry)
- https://www.opentrain.ai/papers/a-programming-paradigm-for-spatiotemporal-composability--arxiv-2608.25512/ (Cordis paper abstract)

Community API evidence:
- https://raw.githubusercontent.com/ligaoc/dsh-plugin-dev/main/SKILL.md (plugin-dev skill — apply/inject/Config, extension-point table, event hooks, install three forms, pitfalls; dsh 0.1.0-rc.6)
- https://github.com/ligaoc/dsh-plugin-dev (repo page)
- https://github.com/huiliyi37/dsh-tianshu-tui (TUI plugin — session-event-driven UI evidence)
- https://github.com/topics/dsh-plugin (official discovery mechanism)

Ecosystem / governance signals:
- https://deepseekdocs.com/en/ecosystem (1,345-project index, install three forms, Radar pre-scan repo)
- https://deepseek-harness-plugin.com/plugins/dsh-agent-teams/ (`dsh plugin add github:...` + full-privilege warning)
- https://dsh.deepseek404.com/detail.php?id=huiliyi37%2Fdsh-tianshu-tui ("unverified / no commit-pinned verification" marker)
- https://dshfind.com/en/plugins/huiliyi37/dsh-tianshu-tui (editor-verification badge)
- https://dshmarketplace.dev/plugins/ccch1mneyyy-dsh-tui (dsh-TUI listing)
- https://www.dshplugin.store/plugin/losebird/dsh-plugin-market, https://dshplugin.me/plugins/dsh-tianshu-tui, https://deepseekplugins.org/plugins/Noob-stupid/dsh-github-login (marketplace sprawl)
- https://redreamality.com/blog/cordis-spatiotemporal-composability-deepseek-harness/ (Cordis v3/v4 lineage), https://juejin.cn/post/7673465077636333587 (paper internals: ctx.effect/LIFO/inject-gated proxy)
- https://xcloud.host/what-is-deepseek-harness-features-architecture-use-cases/, https://springbrand.ai/deepseek-harness, https://www.orcarouter.ai/blog/deepseek-harness-plugins, https://juejin.cn/post/7675340767079252009 (launch context: 2026-08-13, 0.1.0-rc.7 by 08-17)
