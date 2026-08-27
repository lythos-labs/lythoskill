---
last_consolidated: 2026-08-27
sources:
  - "weekly/2026-W17.md"
  - "weekly/2026-W18.md"
  - "weekly/2026-W19.md"
  - "weekly/2026-W20.md"
  - "weekly/2026-W21.md"
  - "weekly/2026-W22.md"
  - "weekly/2026-W23.md"
  - "weekly/2026-W28.md"
  - "weekly/2026-W29.md"
  - "weekly/2026-W30.md"
  - "weekly/2026-W31.md"
  - "daily/2026-07-31.md"
  - "cortex/wiki/03-lessons/2026-07-27-agents-md-shed-sections-ab-rerun-vocabulary-not-necessity.md"
  - "cortex/adr/02-accepted/ (90 ADR files on disk)"
zk_validated: true
zk_issues: 0
zk_validator: "ZK subagent agent-0 — 2026-08-27 — 8/10 readability; P1 (§14 timeline, in pitfalls.md) + P2s fixed in place"
---

# Key Decisions -- Current State

> SSOT of architectural decisions that still govern the project. Superseded ADRs
> live in git history only -- do not use them as current guidance.
> Re-consolidate when the weekly chain accumulates >3 new `decisions_accepted`.

## How to Read

Each entry: **ADR ID**, one-line decision, and current status.

- `✅ holds` -- still governs the project
- `⚠️ superseded by ADR-xxx` -- overruled; see superseding ADR for current rule
- **git-history only** -- these ADRs exist on disk and in git, but do NOT represent
  current architectural truth. They are listed in Superseded ADRs below.

The `#` column is a global sequence assigned in consolidation order, NOT per-section
position — new ADRs are appended to their topic section with the next global number,
so a section may jump (e.g. 26 → 58). No rows were deleted.

The canonical example of ADR lineage tracing is the Combo Evolution trace at the
end of this document. If you encounter a decision chain that looks similar, apply
the same pattern: identify the current-state ADR, mark predecessors as superseded.

---

## 1. Architectural Identity

The thin-skill pattern, its layering, and the meta-governance boundary.

| # | ADR | Decision | Status |
|---|-----|----------|--------|
| 1 | ADR-20260423101938000 | Thin-skill pattern: heavy logic in npm, skill layer as thin router. Every downstream component inherits this layering. | ✅ holds |
| 2 | ADR-20260424013849984 | Lythoskill as anti-corruption layer and meta-governance boundary between agent ecosystems. | ✅ holds |
| 3 | ADR-20260424120936541 | Player-deck separation: deck is a git-tracked artifact, player (agent) is a runtime identity. Deck boundary is the governance perimeter. | ✅ holds |
| 4 | ADR-20260502012643544 | Skills as flat controllers, REST/SPA mental model. No nested skill hierarchies. | ✅ holds |
| 5 | ADR-20260503170000000 | Monorepo toolchain: Bun-only. Root package.json conventions. No Node/npm fallback. | ✅ holds |
| 6 | ADR-20260517140421425 | CLI vs agent-orchestrated behavioral parity. Thin pattern layering: agent intelligence in SKILL.md, stable integration in npm, CLI as mechanical glue. | ✅ holds |
| 7 | ADR-20260423101950000 | ESM import fix for Bun runtime. | ✅ holds |
| 8 | ADR-20260423182606313 | SKILL.md template variable substitution (`{{PACKAGE_VERSION}}`) and CLI help delegation. Source files are templates; never hand-replace placeholders. | ✅ holds |
| 9 | ADR-20260502234833756 | Identify skill packages via `skill/` subdirectory presence. Orthogonal to lock-step versioning scope. | ✅ holds |
| 10 | ADR-20260424113352614 | Project scribe remains independent with optional skill cooperation. | ✅ holds |

Key non-ADR decision: **Orchestrator is distributed by weight, not centralized.** Light = combo prompt, medium = SKILL.md, heavy = CLI. The three layers together form the orchestrator; external evaluators searching for a single "orchestrator" component miss this.

---

## 2. Governance Infrastructure

Deck governance, cortex GTD state machine, and session handoff.

| # | ADR | Decision | Status |
|---|-----|----------|--------|
| 11 | ADR-20260423130348396 | Port skill-manager into lythoskill ecosystem as deck governance. `deck_` prefix, zero-deps skill layer. | ✅ holds |
| 12 | ADR-20260423191001406 | Deck npm package naming: `@lythos/skill-deck`. | ✅ holds |
| 13 | ADR-20260503152000411 | Deck 3-axis CRUD model with alias-as-key dict schema. **Breaking change** from array-of-tables. Current schema. | ✅ holds |
| 14 | ADR-20260502012643244 | FQ-only locator. No bare name resolution. `owner/repo` or `localhost/project` always. The enabling constraint for cold-pool reconciliation, curator indexing, and deck link's symlink resolution. | ✅ holds |
| 15 | ADR-20260502012643344 | Self-bootstrap via localhost symlink. No special case for lythoskill's own skills. | ✅ holds |
| 16 | ADR-20260502012643444 | Deck add writes FQ and removes skills.sh backend. | ✅ holds |
| 17 | ADR-20260430174746744 | Deck add convenience download without locking users into a single package manager. | ✅ holds |
| 18 | ADR-20260502010100000 | Deck link backup strategy for non-symlink entries. | ✅ holds |
| 19 | ADR-20260509144134332 | Deck `sync`/`freeze` renamed to `to-symlink`/`to-snapshot`. Action-explicit verbs describe target state, not operations. | ✅ holds |
| 20 | ADR-20260517152850372 | Deck `also_link_to` multi-CLI POSSE. One `deck link` fans out to `.claude/skills/`, `.cursor/skills/`, `.kimi/skills/`, etc. | ✅ holds |
| 21 | ADR-20260424125637347 | Handoff format migration: fixed `HANDOFF.md` deprecated, canonical path is `daily/YYYY-MM-DD.md`. | ✅ holds |
| 22 | ADR-20260503003314901 | Git coupling for cortex governance documents via commit trailer. `Closes: TASK-xxx`, `Task: TASK-xxx review`, `ADR: ADR-xxx accept` parsed by `.husky/post-commit`. | ✅ holds |
| 23 | ADR-20260503003315478 | Epic granularity discipline: one outcome per iteration. | ✅ holds |
| 24 | ADR-20260503222838594 | Kanban pull mode with CFD observability for agent-driven task management. | ✅ holds |
| 25 | ADR-20260519165746212 | Cortex `probe --suspicious` mode: actionable patterns only (drift, stale references, empty shells). | ✅ holds |
| 26 | ADR-20260519153000000 | Scheduled weekly entropy reduction as governance hygiene. | ✅ holds |
| 58 | ADR-20260607233903985 | Cortex CLI task command unified: create was bare `task "title"` while transitions used subcommands — inconsistency resolved. | ✅ holds |
| 59 | ADR-20260613182316950 | Trailer semantics ratified: `Closes: TASK-xxx` = any-status → completed; `Review:` = dev-complete → review. Strict state machine. | ✅ holds |
| 60 | ADR-20260615222023418 | Trailer dispatch unified to `kind verb id` CLI format (e.g. `Task:` → `review TASK-xxx`). | ✅ holds |
| 61 | ADR-20260710111933808 | cortex/INDEX.md HATEOAS boundary: explicit is/is-not contract for derived-state curation — portal, not real-time status. | ✅ holds |
| 62 | ADR-20260710172235956 | File-level Ground Truth removed from daily template; per-handoff "Verify Current State" section is the SSOT. | ✅ holds |
| 63 | ADR-20260717161516538 | Mechanize boot routines, don't exhort (drift signals live in `deck link`/`refresh --exec`, not docs) + shed dead defensive text no longer needed by current-model agents ("K3 era"). Basis of the AGENTS.md v3 molt (806→418 lines); shed verdicts later proven by a 30-subject A/B rerun (cortex/wiki/03-lessons/2026-07-27: vocabulary redundancy ≠ behavior necessity). | ✅ holds |

---

## 3. Skill Ecosystem

Cold pool, curator, skill types, locator resolution, and the filesystem-native design.

| # | ADR | Decision | Status |
|---|-----|----------|--------|
| 27 | ADR-20260423124812645 | Build output: `packages/<name>/skill/` compiles to `skills/<name>/`. Eliminates `dist/` from git. **Build section holds.** | ✅ holds (build section only) |
| 28 | ADR-20260501090811296 | Pre-commit hook ratified as formal solution for skill build validation. **Supersedes CI portion of ADR-20260423124812645.** | ✅ holds |
| 29 | ADR-20260501092809000 | `skills` branch preserves directory prefix to avoid dual-locator standards. | ✅ holds |
| 30 | ADR-20260501160000000 | Skill deck section semantics and innate re-attachment. Core mechanism (innate/lazy loading) merged into current deck code. Combo section semantics fully superseded by ADR-20260506103209293; file moved to 03-superseded. | ⚠️ partially superseded (combo rules); core mechanism holds |
| 31 | ADR-20260501170000000 | Description preference learning via arena pilot results. Hybrid desc format (calm + explicit triggers) wins both readability and activation. | ✅ holds |
| 32 | ADR-20260424000744041 | Curator output is personal environment scan, not a project artifact. | ✅ holds |
| 33 | ADR-20260518123403810 | Curator role re-derivation: from rigid indexer to agent-assisted discovery companion. 策展者/买家秀 = 查卡器 + 备注 + 组卡审美. | ✅ holds |
| 34 | ADR-20260508230803515 | Curator does NOT wrap external skill discovery APIs as feed-adapters. Agent web fetch beats hand-rolled adapters. | ✅ holds |
| 35 | ADR-20260519224555402 | Curator add global side effects made explicit with `--output` alignment. | ✅ holds |
| 36 | ADR-20260507021957847 | Cold-pool as dedicated resource-holder package (`@lythos/cold-pool`). k8s-style reconciliation between deck lock and filesystem actual state. | ✅ holds |
| 37 | ADR-20260507110332770 | Prune defaults to audit heredoc. Never auto-rm cold-pool entries. No `--yes` flag. | ✅ holds |
| 38 | ADR-20260507110332805 | Refresh defaults to discover-only. `--apply` renders audit heredoc with `git pull --ff-only` lines. Plan-first, never implicit execution. | ✅ holds |
| 39 | ADR-20260507110332831 | Validate-companion pattern: every agent-produced state summary ships with a paired one-click reality-check command. | ✅ holds |
| 40 | ADR-20260519144445916 | `working_set` must NOT alias build output directory `skills/`. The May 17 rename (`working_set` → `skills`) was reverted May 19 because `deck link` overwrote committed build output with symlinks. | ✅ holds |
| 41 | ADR-20260519144500000 | Remove `LYTHOS_COLD_POOL` env var. Superseded by deck.toml as the canonical cold-pool locator. | ✅ holds |
| 64 | ADR-20260616000939948 | skill-deck.lock split: declarative lock separated from operational state snapshot. | ✅ holds (ADR-level) |

---

## 4. Agent & CLI Architecture

Agent-adapter plugin system, arena, Control Transfer Protocol, and test infrastructure.

| # | ADR | Decision | Status |
|---|-----|----------|--------|
| 42 | ADR-20260506214000000 | Agent-adapter as standalone plugin library. 5+ adapters (Claude SDK, Kimi, DeepSeek TUI, DeepSeek serve, Codex). | ✅ holds |
| 43 | ADR-20260517142840955 | Agent-adapter independent spawn architecture. Each adapter spawns independently; no shared process model. | ✅ holds |
| 44 | ADR-20260515204135649 | Agent self-healing environment. Clear error context over structured framework. HATEOAS three-part template + documented internal resilience. | ✅ holds |
| 45 | ADR-20260424115621494 | Virtual evaluator swarm: adaptive concurrency skill design. ADR accepted, implementation deferred. | ✅ holds (ADR-level) |
| 46 | ADR-20260502110308316 | Arena TOML declarative config. Player as facade, k8s-style spec. Replaces CLI flags. | ✅ holds |
| 47 | ADR-20260518024500631 | Agent BDD evolve from `parseAgentMd` to `reproduce.sh` pattern. Self-executable, judge-separated, agent-native. | ✅ holds |
| 48 | ADR-20260518155038335 | `reproduce.sh` + decision-log + logical framework. Verifying premise/conclusion stability as complement to cross-player vs. | ✅ holds |

Key non-ADR decisions in this domain:
- **Control Transfer Protocol**: CLI stdout/stderr = agent interrupt vectors. Plan-mode `--dry-run` + HATEOAS errors + path guards form a three-channel protocol that makes CLI-agent boundaries predictable.
- **Seed Bootstrap**: A deck containing only `lythoskill-deck` is sufficient for a zero-knowledge subagent to read the schema, query the catalog, and self-expand. Recursive bootstrap eliminates the cold-start problem.

---

## 5. Release & Quality

Versioning, publishing, guard modules, and testing conventions.

| # | ADR | Decision | Status |
|---|-----|----------|--------|
| 49 | ADR-20260424113917838 | Red-green-release heredoc migration patch design. Timestamp naming, no semver on patches, self-archiving after execution. | ✅ holds |
| 50 | ADR-20260502233119561 | Bump command and lockstep versioning policy. All packages + root share one version. `bunx @lythos/skill-creator bump`, never hand-edit or use `jq`/`python`. | ✅ holds |
| 51 | ADR-202605102330 | Centralized guard modules vs whack-a-mole. 4 centralized guards (path-guard, id-guard, pre-commit hooks, private-leak) instead of 59 individual bug fixes. | ✅ holds |
| 52 | ADR-20260513144000000 | No hard-coded third-party mirror list. Trust boundary belongs to user. Only `LYTHOS_GH_MIRROR` remains. **Supersedes ADR-20260512191438745.** | ✅ holds |
| 53 | ADR-20260513041030769 | No cross-package relative imports in `packages/src`. Pre-commit guard enforces this. | ✅ holds |
| 54 | ADR-20260503180000000 | Unit test framework selection: curator-mind. Test file co-location with source. | ✅ holds |

Key non-ADR decisions in this domain:
- **Publish-time workspace:* rewrite**: Source stays `workspace:*` for local dev ergonomics. `publish.sh` rewrites to `^version` before `npm publish`, then `git checkout` restores. Pre-commit rejects `^x.y.z` on internal deps in source. Only correct resolution for dual-audience (local dev + npm consumer) tension.
- **Published-manifest tripwire** (2026-07-31, after the 0.17.2 leak): `scripts/check-published-manifests.ts` runs as the last step of `publish.sh` — asks the npm registry (never the bunx cache) and fails CLOSED when a package is unverifiable. 0.17.2 shipped 8 packages with unrewritten `workspace:*`; 0.17.3 republished clean. See pitfalls.md §12-13 and AGENTS.md [LEAK].

---

## 6. Site & Public Face

| # | ADR | Decision | Status |
|---|-----|----------|--------|
| 55 | ADR-20260528113712898 | Two-path strategy: `.claude/skills/` + `.agents/skills/`. Grounded in market evidence, not a compromise -- reality-driven architecture. | ✅ holds |
| 56 | ADR-20260528120317143 | Deck creation guide (thin-skill wizard pattern). Agent is wizard; CLI is guardrail. Describes systemic "agent scan → learn poorly → fabricate" failure mode and structural fix. | ✅ holds |
| 57 | ADR-20260529215906255 | Curator catalog resolution: deck-aware vs independent discovery. Determines how curator resolves skill locators in context of active deck. | ✅ holds |

---

## Combo Evolution: Canonical ADR Lineage Trace

This is the project's canonical example of how a concept evolves through multiple
ADRs. Use this pattern when you encounter any decision chain that spans >2 ADRs.

```
V1 (W17, Apr 24): ADR-20260424114401090
  Combo = skill type. Defined as "orchestration layer" alongside standard skills.
  Naming and emergence strategy. Implementation deferred.
  STATUS: ⚠️ Superseded by V3.

V2 (W18, May 1): ADR-20260501160000000
  Skill deck section semantics codified [combo] as a deck.toml section type.
  At this point, the [combo] section still held skill-type entries.
  Core mechanism (sections + innate/lazy loading) still governs today.
  STATUS: Core mechanism ✅ holds; [combo] content semantics evolved by V3/V4.

V3 (W19, May 6): ADR-20260506103209293
  Combo REDEFINED: no longer a skill type at all. It is a deck-level prompt
  template. Supersedes ADR-20260424114401090 completely.
  The [combo] section in deck.toml now holds prompt templates, not skill refs.
  STATUS: ✅ holds. Current definition.

V4 (W21, May 20): [combo] → [combo.<name>] named pipeline combos
  Not a standalone ADR -- refinement within V3's framework.
  Named pipelines (e.g., [combo.promo], [combo.site-content]) with zero budget
  cost. "The combo prompt IS the orchestrator."
  Part of the orchestrator-distributed-by-weight architecture.
  STATUS: ✅ holds. Current syntax.
```

**Combo today**: a `[combo.<name>]` section in `skill-deck.toml` containing a
prompt template. Not a skill, not a package, not a CLI command. Budget cost: zero.
The combo prompt + SKILL.md + CLI form the distributed orchestrator.

---

## Superseded ADRs -- git-history only

These ADRs exist in the repository but do NOT represent current truth. They
remain in git history for traceability. If you find code or docs still following
these rules, update them to the superseding ADR.

| Superseded ADR | Superseded by | What it originally decided |
|----------------|---------------|---------------------------|
| ADR-20260424114401090 | ADR-20260506103209293 | Combo as a skill type (now: deck-level prompt template) |
| ADR-20260512191438745 | ADR-20260513144000000 | LYTHOS_MIRROR env var with known mirror list (now: no hard-coded mirror list, user owns trust boundary) |
| ADR-20260423124812645 (CI section only) | ADR-20260501090811296 | CI consistency check for skill builds (now: pre-commit hook is the formal solution) |

**Non-ADR reversals** (decisions made, then reverted; document for awareness):

| Reversal | When | Why |
|----------|------|-----|
| `working_set` renamed to `skills` | May 17 committed, May 19 reverted | Collision with build output directory `skills/`. ADR-20260519144445916 locked in `working_set` as canonical field name. W20 weekly incorrectly recorded this as permanent. |
| `allowed-tools` + `reference-triggers` | May 2 built, May 2 reverted | QA red team found critical issues in 4/6 skills. Same-session revert. |
| Curator `feed-adapters` | May 5 built, May 8 ADR rejected, May 9 deleted | Agent web fetch beats hand-rolled API adapters. ADR-20260508230803515. |
| `cortex/epics/02-done` rename to `99-done` | May 17 | Directory rename. Docs referencing `02-done` path are stale. |
| **Publish-time `workspace:*` → `^version` rewrite** | May 11 (v0.10.0 jump exposed it) | v0.9.x used `workspace:*` innocently. At v0.10.0, `workspace:*` literal was published to npm — consumers couldn't resolve it. Two emergency bumps (v0.10.1, v0.10.2) before `publish.sh` rewrite pattern landed. Source stays `workspace:*`, publish-time rewrites, `git checkout` restores. W20 weekly covers the incident. |

### ⚠️ ZK Agent Alert: These Look Like Bugs But Aren't

Key decisions that solve specific governance tensions. A zero-knowledge agent seeing these for the first time might try to "fix" them. Don't.

| If you see... | Why it's like that | Don't |
|---------------|-------------------|-------|
| `workspace:*` in source, `^0.15.4` on npm | **Publish-time rewrite.** Source stays `workspace:*` for local dev ergonomics (bun resolves live). `publish.sh` rewrites to `^version` before `npm publish`, then `git checkout` restores. Pre-commit rejects `^x.y.z` on internal deps. Only correct resolution for dual-audience: local dev needs live resolution, npm consumer needs fixed version. ADR-20260503170000000 + W20 release pipeline rescue. | Don't "fix" `workspace:*` to `^version` in source. Don't remove the publish-time rewrite. |
| `working_set` in deck.toml (not `skills`) | Was renamed to `skills` on May 17, reverted May 19 — collided with build output directory `skills/`. ADR-20260519144445916 locked in `working_set`. | Don't rename `working_set` — it's been tried and reverted. |
| `skills/` directory committed to git | Build output — `packages/<name>/skill/` → `skills/<name>/`. Pre-commit auto-rebuilds. ADR-20260423124812645. | Don't gitignore `skills/` — it's committed build output, not cache. |
| `bun packages/.../cli.ts` instead of `bunx @lythos/...` | In-repo dev uses source directly. External users use `bunx`. See AGENTS.md § Command Shorthand Convention. | Don't replace `bun packages/` with `bunx` in dev scripts — they're different audiences. |
| Deleted/reverted code patterns (`feed-adapters`, `allowed-tools`, `leetcode-harness`) | 3 build-then-reject cycles in W18-W19. Each was built, tested, found wanting, and killed. | Don't resurrect rejected components from git history. These were deliberate kills, not abandoned experiments. |

---

## Anomalies & Gaps in the Weekly Chain

Items discovered during consolidation that a weekly either missed or got wrong:

1. **W20 weekly line 50 claims `working_set` renamed to `skills` permanently.**
   This was reverted 48 hours later by ADR-20260519144445916. The W20 weekly's
   `docs_now_stale` warning is backwards: the rename was the aberration, not the
   original name. W21's `docs_now_stale` corrects this.

2. **ADR-202605011600 (truncated timestamp) exists as a separate file** from
   ADR-20260501160000000. The truncated one is about desc preference learning;
   the full one is about section semantics. Likely an earlier draft superseded by
   ADR-20260501170000000 (description preference learning via arena pilot results).
   Flag for investigation during next ADR audit.

3. **~24 ADRs in `cortex/adr/02-accepted/` are NOT captured in any weekly's
   `decisions_accepted` field.** The weekly chain is a curated importance-ranked
   index, not an exhaustive ADR registry. These ADRs are valid but didn't rise to
   weekly-highlight threshold. For a full ADR inventory, scan the directory
   directly. The weekly chain is sufficient for SSOT consolidation because it
   captures the decisions that actually changed project direction.

4. **Build-then-reject is a deliberate project pattern** (3 instances documented:
   allowed-tools, leetcode harness, feed-adapters). Not a bug -- the project
   experiments fast and kills decisively. Each rejection is documented in an ADR
   so future agents don't re-propose the same discarded idea.

---

## Quick Reference: When to Read Which ADR

| If you need to understand... | Start with ADR... |
|------------------------------|-------------------|
| Why the project exists | ADR-20260423101938000 (thin-skill pattern) |
| How skills are organized | ADR-20260502012643244 (FQ-only locator) |
| How decks work | ADR-20260503152000411 (3-axis CRUD) |
| How versions work | ADR-20260502233119561 (lockstep versioning) |
| How combo works (current) | ADR-20260506103209293 (combo as prompt) |
| How agents plug in | ADR-20260506214000000 (agent-adapter) |
| How cold pool works | ADR-20260507021957847 (cold-pool package) |
| How testing works | ADR-20260518024500631 (Agent BDD reproduce.sh) |
| How governance works | ADR-20260503003314901 (git-coupled trailers) |
| How the site works | ADR-20260528113712898 (two-path strategy) |
