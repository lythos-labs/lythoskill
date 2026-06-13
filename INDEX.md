# Project Index

> 自动生成于 2026/6/13 23:53:19

## 📊 概览

| 类型 | 总数 | 活跃/完成 |
|------|------|----------|
| Tasks | 316 | 进行中: 0, 待验收: 1, 已完成: 270 |
| Epics | 43 | 活跃: 0, 已完成: 39, 悬置: 2, 已归档: 2 |
| ADRs | 87 | 已接受: 82 |

---

## 📋 Epics

### 进行中

_无_

### 已完成

- ✅ **EPIC-20260430011158241**: Monorepo tooling consistency and config debt cleanup
- ✅ **EPIC-20260430012504755**: Skill progressive disclosure and quality audit
- ✅ **EPIC-20260430174751856**: deck add — one-command skill acquisition with pluggable download backends
- ✅ **EPIC-20260501091716524**: Onboarding friction reduction — boost README and AGENTS.md UX from 6.5 to 8.5
- ✅ **EPIC-20260503010218940**: Cortex 流转自动化 + epic 双轨纪律落地
- ✅ **EPIC-20260503234346583**: Verification coverage for deck — TDD unit + Agent BDD (leetcode-shape + LLM judge)
- ✅ **EPIC-20260504165156064**: Extract cortex husky hooks to testable TypeScript modules
- ✅ **EPIC-20260504170744839**: Fix Agent BDD stability — parseAgentMd Given paths and prune timeout
- ✅ **EPIC-20260504183618345**: Unify Agent BDD & Arena: shared runner + structured Judge schema
- ✅ **EPIC-20260504230503067**: Arena TOML declarative config (k8s-style): [[side]] + runs_per_side + reconcile
- ✅ **EPIC-20260504231931835**: Extract intent/plan/execution from deck refresh + prune: pure plan generation + injectable workdir/coldPool/deckPath
- ✅ **EPIC-20260504235551635**: Extract pure functions from test-utils low-coverage modules (bdd-runner, agents/claude): plan/execute separation for CLI helpers
- ✅ **EPIC-20260505015029961**: Curator intent/plan/execute extraction + curator add (cold pool download, no install)
- ✅ **EPIC-20260505184748292**: Curator refresh plan/execute — cold pool update queue with TODO file
- ✅ **EPIC-20260505221500188**: Standardize test file organization — co-located unit tests, separate BDD runners
- ✅ **EPIC-20260505230149768**: Implement CriterionDef schema + judge cleanup + reproducibility metadata for arena chart-ready MVP
- ✅ **EPIC-20260506001552299**: Stabilize agent spawn: CLI workaround + AgentSdkAdapter + MCP fallback + pre-flight
- ✅ **EPIC-20260507020846020**: Cold pool foundation: @lythos/cold-pool package, intent/plan/executor architecture, deck/curator/arena migration
- ✅ **EPIC-20260507191713917**: Cold-pool reconcile — k8s-style desired vs actual convergence with snapshot/sync dual-mode
- ✅ **EPIC-20260508082810062**: Everything-from-URL: deck, arena, task, agents.md as network-native resources
- ✅ **EPIC-20260508155035411**: Deck reconcile convergence — plan-first to auto-apply
- ✅ **EPIC-20260508201323933**: Project showcase — README, Vitepress, and public positioning for the governance layer
- ✅ **EPIC-20260508222319639**: Doc + test infra sweep — SSOT for agentskill.sh syndication
- ✅ **EPIC-20260511235648324**: QA sweep: empty catch hardening across core packages
- ✅ **EPIC-20260513010237904**: Popular third-party skills end-to-end with network probe UX
- ✅ **EPIC-20260515001514240**: Emergency: migrate test/scenarios/ to src/ co-located unit tests
- ✅ **EPIC-20260517121757041**: Agent BDD 覆盖 — deck/arena skill 行为验证
- ✅ **EPIC-20260518024809887**: Evolve Agent BDD to reproduce.sh pattern
- ✅ **EPIC-20260518125955940**: Curator MVP: mindset refactor + legacy migration — thin core, thick data
- ✅ **EPIC-20260518145235543**: Emergency: fix arena agent-adapter — claude defaults to SDK, deepseek available, codex in vs mode
- ✅ **EPIC-20260518153034640**: Hardening deepseek adapter: robust daemon lifecycle — health-check discovery, not PID polling
- ✅ **EPIC-20260519164518898**: entropy-check CLI/agent边界清晰化 — 传感器只报告事实，不替agent做判断
- ✅ **EPIC-20260519224747755**: curator add UX 专业性与副作用透明化
- ✅ **EPIC-20260520124010693**: curator catalog co-location: eliminate three data silos, catalog follows pool
- ✅ **EPIC-20260527212032856**: Site narrative stabilization and living documentation consolidation
- ✅ **EPIC-20260529003844792**: Agent-native project governance: defense layers, evaluation patterns, and bias mitigation
- ✅ **EPIC-20260529214429614**: Curator CLI IO injection + BDD coverage
- ✅ **EPIC-20260529231316655**: Community Skill Pool Expansion — Hot & Niche Skills with WebSearch + Curator Tag
- ✅ **EPIC-20260530135721111**: Arena IO Injection Sweep — CLI and Runner Layers

### 悬置

- ⏸️ **EPIC-20260429234732479**: Virtual evaluator swarm for multi-dimensional skill quality assessment
- ⏸️ **EPIC-20260507012858669**: Real-world skill repo structure compatibility — pre-built deck validation for quick-start

### 已归档

- ~~EPIC-20260423102000000~~: lythoskill MVP — Initial Release
- ~~EPIC-20260423185732845~~: Playground Epic

---

## 📄 Tasks

### 待办 (4)

- [ ] **TASK-20260613185808109**: Enforce English-only slugs for cortex task/epic filenames and fix existing Chinese-mixed slugs
- [ ] **TASK-20260613190646769**: Add unit tests for probe empty-shell filtering (--include-completed-empty-shells)
- [ ] **TASK-20260613234838986**: Refactor probe.ts into intent-plan-execute IO separation
- [ ] **TASK-20260613235254569**: Harden probe empty-shell detection: respect completed status + reduce false positives from template comments

### 进行中 (0)

_无_

### 待验收 (1)

- 🔍 **TASK-20260613185621344**: Audit empty-shell completed tasks for title-to-state mismatches

### 已完成 (270)

- ✅ ~~TASK-20260423102009000~~: Generate lythoskill Project Files
- ✅ ~~TASK-20260423124059736~~: Create lythoskill ecosystem skill templates (creator/builder/curator)
- ✅ ~~TASK-20260423170056315~~: Add add-skill command to lythoskill-creator
- ✅ ~~TASK-20260423223542053~~: Curator SQLite backend for skill metadata governance
- ✅ ~~TASK-20260424115734221~~: Red-green-release 在 README/CLAUDE.md 中补全文档
- ✅ ~~TASK-20260429225846405~~: Add --help and validate subcommand to lythoskill-deck CLI
- ✅ ~~TASK-20260430012458866~~: Audit fix: add version frontmatter to cortex/release/scribe SKILL.md
- ✅ ~~TASK-20260430174753504~~: Implement deck add CLI command with git clone and skills.sh backends
- ✅ ~~TASK-20260501090806543~~: Fix align.ts ESM violation: replace 9 require() calls with import
- ✅ ~~TASK-20260501091722647~~: README Quick Start: add developer branch for repo clone context
- ✅ ~~TASK-20260501091724005~~: README: add Prerequisites section (Bun + pnpm) at top
- ✅ ~~TASK-20260501091725299~~: AGENTS.md: fix HANDOFF-TEMPLATE.md missing path
- ✅ ~~TASK-20260501091726708~~: deck link output: clarify 8/10 skills wording to avoid confusion
- ✅ ~~TASK-20260501091727690~~: init command: add side-effect warning in docs and CLI prompt
- ✅ ~~TASK-20260501091728793~~: AGENTS.md: add bunx vs local path troubleshooting hint
- ✅ ~~TASK-20260501091729644~~: deck CLI: add status subcommand routing
- ✅ ~~TASK-20260502225209839~~: Demo: blocked flow (backlog → in-progress → suspend → resume → review → done)
- ✅ ~~TASK-20260502225209886~~: Demo: re-work flow (backlog → in-progress → review → reject → review → done)
- ✅ ~~TASK-20260502233741335~~: implement creator bump subcommand for lockstep versioning per ADR-20260502233119561
- ✅ ~~TASK-20260503010227902~~: 扩展 cortex CLI 状态机命令(ADR + epic 流转动词)
- ✅ ~~TASK-20260503010228602~~: 实现 cortex epic create 双轨 + checklist + probe lane 扩展
- ✅ ~~TASK-20260503010229362~~: 实现 husky post-commit trailer 解析 + 跟随 commit
- ✅ ~~TASK-20260503010230554~~: 实现 husky pre-commit 软提醒(in-progress 非空)
- ✅ ~~TASK-20260503010231389~~: 三层文档镜像(AGENTS/CLAUDE/memory)+ cortex skill/README 同步
- ✅ ~~TASK-20260503010231988~~: BDD 覆盖 cortex trailer + lane FSM(用 test-utils + subagent)
- ✅ ~~TASK-20260503132523380~~: Move root package.json dependencies to individual packages
- ✅ ~~TASK-20260503132524022~~: Unify lockfile and workspace config — Bun-only
- ✅ ~~TASK-20260503132525248~~: Standardize package.json template across all publishable packages
- ✅ ~~TASK-20260503152002342~~: Implement alias resolution and collision detection in deck link
- ✅ ~~TASK-20260503152003393~~: Make deck add write FQ paths with optional as-alias
- ✅ ~~TASK-20260503152004433~~: Rename deck update to refresh and add per-skill arg
- ✅ ~~TASK-20260503152005415~~: Add deck remove and deck prune commands
- ✅ ~~TASK-20260503152006435~~: Add BDD scenarios for refactored deck CRUD
- ✅ ~~TASK-20260503154354857~~: Bump actions/checkout to v5 for Node 24 compat
- ✅ ~~TASK-20260503154401905~~: Make README + CI surface red-green refactor + coverage visible
- ✅ ~~TASK-20260503235008935~~: Tracer bullet: test findDeckToml, expandHome, findSource pure functions
- ✅ ~~TASK-20260503235009959~~: Reconciler core A: linkDeck empty deck and symlink creation
- ✅ ~~TASK-20260503235011219~~: Reconciler core B: linkDeck deny-by-default and alias collision
- ✅ ~~TASK-20260503235012454~~: Command layer A: validateDeck and addSkill tests
- ✅ ~~TASK-20260503235013705~~: Command layer B: removeSkill, refreshDeck, pruneDeck tests
- ✅ ~~TASK-20260503235014489~~: Coverage sweep: backfill edge cases to 80% coverage
- ✅ ~~TASK-20260504004947351~~: runClaudeAgent helper + checkpoint JSONL schema in bdd-runner
- ✅ ~~TASK-20260504004954526~~: First *.agent.md scenario — skills-introspection (Agent BDD tracer bullet)
- ✅ ~~TASK-20260504005000534~~: Add/refresh/remove/prune Agent BDD scenarios (4 *.agent.md files)
- ✅ ~~TASK-20260504012457126~~: fix deck refresh: traverse up to git root for monorepo skills
- ✅ ~~TASK-20260504165202852~~: T1: Extract trailer dispatch from post-commit shell to TypeScript with tests
- ✅ ~~TASK-20260504165203797~~: T2: Extract Epic-ADR coupling guard from pre-commit shell to TypeScript with tests
- ✅ ~~TASK-20260504165204731~~: T3: Extract lane guard (max-1-active per track) to TypeScript with tests
- ✅ ~~TASK-20260504170113207~~: Investigate and fix Agent BDD prune scenario timeout (exit 143)
- ✅ ~~TASK-20260504170629577~~: Fix Agent BDD scenarios: parseAgentMd Given should support localhost paths (refresh + prune timeout)
- ✅ ~~TASK-20260504170630080~~: Fix add Agent BDD scenario: investigate why deck link fails to sync skill-b into working set
- ✅ ~~TASK-20260504183628823~~: T1: Extract runAgentScenario / parseAgentMd / Judge core from deck to test-utils (variant-aware)
- ✅ ~~TASK-20260504183637828~~: T2: Structured Judge schema (Zod-first) — ADR + implementation
- ✅ ~~TASK-20260504183646317~~: T3: Migrate deck Agent BDD to unified runner (single+absolute mode, regression 26/26)
- ✅ ~~TASK-20260504183708932~~: T4: Migrate arena to unified runner (multi-variant + comparative judge mode + Pareto output)
- ✅ ~~TASK-20260504194307589~~: Split bdd-runner.test.ts: pure unit tests vs Agent BDD tracer (runClaudeAgent)
- ✅ ~~TASK-20260504194315989~~: Add test-utils pure unit tests to CI test workflow (test:all or independent step)
- ✅ ~~TASK-20260504194319386~~: Align CI coverage scope: include test-utils pure logic, exclude agent spawn layer
- ✅ ~~TASK-20260504230517395~~: T1: arena.toml Zod schema + parser (pure, unit-testable)
- ✅ ~~TASK-20260504230519619~~: T2: Player resolution + side mapping: player.toml → useAgent (pure)
- ✅ ~~TASK-20260504230521082~~: T3: runs_per_side statistical aggregation (mean, variance, confidence)
- ✅ ~~TASK-20260504230521853~~: T4: Declarative reconciler: arena.toml → ArenaManifest → runAgentScenario per side × runs
- ✅ ~~TASK-20260504230523260~~: T5: CLI integration + end-to-end BDD (arena run --config arena.toml)
- ✅ ~~TASK-20260504231944285~~: T1: Extract pure RefreshPlan from refreshDeck: resolve config + build target list (no git IO)
- ✅ ~~TASK-20260504231946234~~: T2: Extract pure PrunePlan from prune: scan cold pool vs declared = unreferenced candidates (no fs delete)
- ✅ ~~TASK-20260504231947970~~: T3: Inject workdir/coldPool/deckPath as explicit params for both refresh and prune
- ✅ ~~TASK-20260504231949003~~: T4: Unit tests for RefreshPlan + PrunePlan correctness (edge cases: localhost, nested git, missing)
- ✅ ~~TASK-20260504231950061~~: T5: Agent BDD scenarios for refresh + prune execution (LLM code audit, not real git)
- ✅ ~~TASK-20260504235611557~~: T1: Extract pure functions from bdd-runner.ts: buildCommand, slugifyWorkdir, add unit tests
- ✅ ~~TASK-20260504235613030~~: T2: Add unit tests for assertOutput (already pure, just uncovered)
- ✅ ~~TASK-20260504235613937~~: T3: Add unit test for buildToolPrompt in agents/claude.ts (pure, uncovered)
- ✅ ~~TASK-20260504235614732~~: T4: RunCi/Spawn 重 IO 提取到 injectable function，加 mock 测试默认错误路径
- ✅ ~~TASK-20260504235618571~~: T5: Arena runner 接入 injectable log，验证 dry-run 输出与期望一致
- ✅ ~~TASK-20260505001534316~~: Extract buildClaudeCommand from claudeAdapter.spawn: pure command DSL + pattern-match tests (no spawn needed)
- ✅ ~~TASK-20260505015050270~~: T1: Extract CuratorPlan from scan: pure dir listing + source resolution (no file IO)
- ✅ ~~TASK-20260505015051145~~: T2: Extract skill parsing from scanSkill: frontmatter → SkillMeta (pure, unit-testable)
- ✅ ~~TASK-20260505015052748~~: T3: curator add — download skill to cold pool without installing (like deck add but cold-only)
- ✅ ~~TASK-20260505015054313~~: T4: Feed source abstraction — cold pool / GitHub / URL as source types
- ✅ ~~TASK-20260505015055286~~: T5: Unit tests for pure functions + CLI BDD for curator add
- ✅ ~~TASK-20260505163912399~~: create
- ✅ ~~TASK-20260505165424864~~: create
- ✅ ~~TASK-20260505184757091~~: T1: buildRefreshPlan pure function + RefreshPlan/RefreshItem types in curator-core.ts
- ✅ ~~TASK-20260505184757915~~: T2: refresh-plan + refresh-execute CLI commands in cli.ts
- ✅ ~~TASK-20260505184800031~~: T3: unit tests for buildRefreshPlan + CLI BDD for refresh commands
- ✅ ~~TASK-20260505221507624~~: Move test-utils unit tests from test/ to src/ (co-locate)
- ✅ ~~TASK-20260505221510607~~: Rename bdd-runner.agent.test.ts to test/scenarios/bdd-runner.agent.md
- ✅ ~~TASK-20260505221513429~~: Write TESTING.md — formalize test conventions for the monorepo
- ✅ ~~TASK-20260505221520790~~: Write ADR-20260505221432740 — record rationale for co-location decision
- ✅ ~~TASK-20260505221523973~~: Update CI workflow + test-report.ts paths for new test file locations
- ✅ ~~TASK-20260505221527112~~: Update AGENTS.md to reference TESTING.md test conventions
- ✅ ~~TASK-20260505230249874~~: T1: Implement CriterionDef + CriteriaField Zod schema in test-utils/src/schema.ts
- ✅ ~~TASK-20260505230249921~~: T2: Inject rubric from CriterionDef into buildComparativePrompt
- ✅ ~~TASK-20260505230249954~~: T3: Update ArenaManifest.criteria to CriteriaField union type (backward compat)
- ✅ ~~TASK-20260505230249992~~: T4: Clean up JudgeVerdict — remove scores field, keep criteria as binary pass/fail
- ✅ ~~TASK-20260505230250040~~: T5: Update per-cell judge + arena runner for cleaned JudgeVerdict
- ✅ ~~TASK-20260505230250079~~: T6: Add ArenaRunContext (git_ref, arena_toml, judge_model, runs_per_side) to ComparativeReport
- ✅ ~~TASK-20260506001644250~~: T1: Fix buildClaudeCommand — clean CLAUDE_CODE_* env, prompt via file (not stdin), --output-format json, retry wrapper
- ✅ ~~TASK-20260506001644285~~: T2: Update arena runner pre-flight — add deck link + skill existence check before agent spawn
- ✅ ~~TASK-20260506001644316~~: T3: Extract AgentAdapter as standalone plugin lib + Claude SDK adapter
- ✅ ~~TASK-20260506001644356~~: T4: Create AgentSdkAdapter implementing AgentAdapter interface (spawn + invokeTool)
- ✅ ~~TASK-20260506001644390~~: T5: Register AgentSdkAdapter in useAgent() routing, add claude-sdk player
- ✅ ~~TASK-20260506001644423~~: T6: Arena copy-test re-run with fixed CLI spawn — verify non-empty agent output
- ✅ ~~TASK-20260507010453909~~: Remove implicit skills/ insertion from findSource() and align all deck paths to direct mapping
- ✅ ~~TASK-20260507011711797~~: Design unified skill-locator resolver: syntax parsing + existence validation + semantic path verification via GitHub API
- ✅ ~~TASK-20260507021320323~~: T1: Scaffold @lythos/cold-pool package with monorepo lock-step config
- ✅ ~~TASK-20260507021320360~~: T2: Core types — Locator, ValidationReport, FetchPlan, RefreshPlan, Executor + parseLocator migration
- ✅ ~~TASK-20260507021320388~~: T3: Resolver layer — GitHub Tree API client, validateRemote, inferSkillPath
- ✅ ~~TASK-20260507021320416~~: T4: ColdPoolManager + GitExecutor — single side-effect-holder for git operations
- ✅ ~~TASK-20260507021320442~~: T5: Migrate deck/src/add.ts to consume cold-pool ColdPoolManager
- ✅ ~~TASK-20260507021320467~~: T6: Migrate deck/src/link.ts to consume cold-pool
- ✅ ~~TASK-20260507021320492~~: T7: Migrate deck/src/refresh-plan.ts to consume cold-pool
- ✅ ~~TASK-20260507021320516~~: T8: deck validate command emitting ValidationReport per locator
- ✅ ~~TASK-20260507021320542~~: T9: examples/decks/*.toml CI validation step
- ✅ ~~TASK-20260507021320567~~: T12: Write ADR-20260507014124191 body — agent-friendly CLI error as decision tree
- ✅ ~~TASK-20260507103221240~~: T10: Migrate curator/src/ to consume @lythos/cold-pool primitives
- ✅ ~~TASK-20260507103221276~~: T11: Migrate arena/src/preflight.ts to consume @lythos/cold-pool primitives
- ✅ ~~TASK-20260507112345999~~: Migrate deck BDD scenarios from bare-name fixtures to real lythos-labs/test-stubs FQ locators (BDD-test-stubs)
- ✅ ~~TASK-20260507130509142~~: deck add should not exit-fail when cold pool repo exists; should still write deck.toml + link if specific skill not yet declared
- ✅ ~~TASK-20260507143022480~~: cold-pool metadata layer: SQLite-backed per-repo HEAD ref + per-skill content hash + cross-deck reference index
- ✅ ~~TASK-20260507163036174~~: ${ID}: deck unit test failures — post FQ schema alignment
- ✅ ~~TASK-20260507184440829~~: Research skill quality gates — data source wall, validation rules, terminology unification
- ✅ ~~TASK-20260507220646324~~: playground/blake3 — rebuild BLAKE3 hash from scratch (ProgramBench-style)
- ✅ ~~TASK-20260507223411867~~: Add agent BDD scenarios for cold-pool status and cold-pool prune (post deck/cold-pool separation)
- ✅ ~~TASK-20260507223411896~~: Update deck-refresh agent BDD to match new card-group-safe-update semantics (plan-first, post-pull validate)
- ✅ ~~TASK-20260507223550910~~: Replace runClaudeAgent with useAgent() abstraction — default kimi, support claude-sdk/deepseek
- ✅ ~~TASK-20260507224228837~~: Graduation exam: end-to-end agent BDD — empty dir → curator discover → cold-pool add → deck build → arena compare → judge verdict (recipe .docx)
- ✅ ~~TASK-20260508093141381~~: buildReconcilePlan + executeReconcilePlan — cold-pool reconcile core pure function
- ✅ ~~TASK-20260508093146024~~: deck sync/freeze CLI — snapshot↔symlink intent switching
- ✅ ~~TASK-20260508093148414~~: deck reconcile CLI — user-facing command consuming cold-pool reconcile plan
- ✅ ~~TASK-20260508093150634~~: snapshot storage + GC — cp location decision + orphan cleanup
- ✅ ~~TASK-20260508112022533~~: T1: extract resolveDeckPath — shared URL/path resolution
- ✅ ~~TASK-20260508112022568~~: T2: deck link + validate --deck <url> — URL-native CLI surfaces
- ✅ ~~TASK-20260508112022596~~: T3: deck validate <url> as discover-before-adopt entry point
- ✅ ~~TASK-20260508112022623~~: T5: AGENTS.md as network-native agent bootloader — wiki pattern + PoC
- ✅ ~~TASK-20260508112022651~~: T6: pre-built deck INDEX.md — 11 decks catalogued by use case
- ✅ ~~TASK-20260508155056768~~: Implement deck reconcile --apply convergence
- ✅ ~~TASK-20260508155058319~~: Extract @lythos/infra runtime base package with SqliteDb
- ✅ ~~TASK-20260508155059504~~: Migrate curator catalog DB to inherit SqliteDb
- ✅ ~~TASK-20260508155101016~~: Arena agent-run full e2e with deepseek serve
- ✅ ~~TASK-20260508155102153~~: Fix judge parser markdown bold extraction (** → JSON parse error)
- ✅ ~~TASK-20260508155132653~~: Document AGENTS.md bootloader pattern from playground
- ✅ ~~TASK-20260508155133562~~: Generate deck INDEX.md — catalogue all example decks by use-case
- ✅ ~~TASK-20260508204204714~~: Isolate environment-dependent tests with guard/skip — LobeHub adapter, git-hash, clone tests fail in CI
- ✅ ~~TASK-20260508222319664~~: T1 — SSOT test infrastructure (package.json scripts + root + CI test.yml)
- ✅ ~~TASK-20260508222319692~~: T2 — Doc syndication blockers (validate-weekly fictional, deck/cortex/arena/creator missing commands, scribe stale 0.9.15 + deprecated TOML, multi-platform tagging)
- ✅ ~~TASK-20260508222319717~~: T3 — Doc drift polish (root README dup heading + ad-hoc inaccuracies + ref-link orphans)
- ✅ ~~TASK-20260509101438298~~: Align arena doc surface to working onboarding paths — replace broken `--skills` bare-name examples
- ✅ ~~TASK-20260509104331469~~: T6 — Arena e2e verification test plan: agent-run task + run --config + file output validation
- ✅ ~~TASK-20260509113254423~~: T4 — Curator simplification: delete discover CLI + feed-adapters.ts per ADR-20260508230803515
- ✅ ~~TASK-20260509113255134~~: T7 — project-cortex agent-friendly errors: add Usage + examples to all error paths
- ✅ ~~TASK-20260509113256236~~: T8 — General catch error cleanup: replace `❌ ${e.message}` style patterns across all CLI packages
- ✅ ~~TASK-20260509121724330~~: T9 — URL-first HATEOAS regression playbook (subagent-driven, dormancy-checked)
- ✅ ~~TASK-20260509155623694~~: Rename deck sync/freeze to to-symlink/to-snapshot for action-explicit verbs and avoid sync/link name collision
- ✅ ~~TASK-20260509163129782~~: Migrate prune/reconcile from deck to cold-pool with FSM reference counting
- ✅ ~~TASK-20260509164621003~~: buildListPlan SKILL.md alignment + mode column v6 + cold-pool CLI rebuild
- ✅ ~~TASK-20260510202828095~~: cold-pool P1 fixes — execSync→execFileSync, --lock default, import ReconcileDesiredState
- ✅ ~~TASK-20260510202837850~~: cold-pool P2 reliability — git timeout, symlink loop, truncated tree, prefix matching, cloneUrl protocol
- ✅ ~~TASK-20260510202837878~~: cold-pool P2 maintainability — dedup prune, O(N²) hasSkillMd, behind semantics, untyped lock, timestamp consistency, type drift, locator guards
- ✅ ~~TASK-20260510202837906~~: CI supply-chain — pin third-party GitHub Action SHA
- ✅ ~~TASK-20260510234339990~~: P2 sweep — 4 packages: remaining code quality fixes (TOML parse, path join, renameSync guard, locale, etc.)
- ✅ ~~TASK-20260511091105701~~: replace regex-based SQL check with real parser (node-sql-parser) — LLM hand-roll tendency anti-pattern
- ✅ ~~TASK-20260511093956018~~: deck add: multi-skill discovery warning when repo contains multiple skills — list all, ask user to pick or add all
- ✅ ~~TASK-20260511095504433~~: parseLocator #ref support — branch/tag/commit suffix compatible with skills.sh parseFragmentRef
- ✅ ~~TASK-20260511235656113~~: cold-pool: fetch-plan git checkout failure silently returns wrong status
- ✅ ~~TASK-20260511235909747~~: cold-pool: walk() bare catch silently drops entire subtree on readdir failure (cold-pool.ts:131)
- ✅ ~~TASK-20260511235909780~~: cold-pool: collectRecursive() bare catch silently drops subtree (cold-pool.ts:157)
- ✅ ~~TASK-20260511235909808~~: cold-pool: calculateDirSize() empty catch returns 0 masking permission errors (prune-plan.ts:64)
- ✅ ~~TASK-20260511235909835~~: cortex: post-commit git() helper ignores spawnSync exit code and stderr (post-commit.ts:16)
- ✅ ~~TASK-20260511235909866~~: cortex: pre-commit git() helper ignores spawnSync exit code and stderr (pre-commit.ts:16)
- ✅ ~~TASK-20260511235909913~~: deck: refresh-plan bare catch swallows execSync git failure — misclassifies timeout/signal as not-git (refresh-plan.ts:81)
- ✅ ~~TASK-20260512000000001~~: test-probe
- ✅ ~~TASK-20260512000201440~~: arena: narrow 4 medium catch/log patterns (cli.ts:174,284,309,313)
- ✅ ~~TASK-20260512000201473~~: deck: return error indicators from metadata operations (link.ts, add.ts, remove.ts)
- ✅ ~~TASK-20260512000201505~~: curator: narrow 2 catch patterns — index freshness and clone cleanup (cli.ts:508,873)
- ✅ ~~TASK-20260512000201534~~: cortex: fix 5 medium patterns — dispatch, ADR accept, git add, config parse, coupling
- ✅ ~~TASK-20260513010246527~~: Implement probeConnectivity with TDD + racing + proper error collection
- ✅ ~~TASK-20260513033254695~~: Restore refresh apply-mode — plan-first guardrail (memory feedback_refresh_is_plan_first says default was discover-only with explicit --apply; implementation regressed to direct apply)
- ✅ ~~TASK-20260513033256305~~: Wire probeConnectivity (8b097c5) into plan→apply boundary for deck add/refresh — env probe before executing the plan; surface unreachable proxies / unreachable cold-pool entries before any git operation
- ✅ ~~TASK-20260513033455974~~: Restore CLI subcommand help per ADR-20260423182606313 — cortex CLI and refresh both treat help as positional arg
- ✅ ~~TASK-20260513035228296~~: CI E2E publish-validation gate — after publish, spawn clean bunx <pkg>@<new-version> in tmp dir, verify resolves; gate the release pipeline so workspace:* or other manifest bugs cannot silently reach npm again
- ✅ ~~TASK-20260513040027913~~: Pre-commit guard for cross-package relative imports — reject from ../../<pkg>/src in packages/*/src
- ✅ ~~TASK-20260513095345353~~: Set up showcase/ directory for committed arena demos — start with migrating T5 (2026-05-13 agent-skills-intro CTO brief) as inaugural entry; README + reproduce.sh per demo
- ✅ ~~TASK-20260513095346630~~: Run T5-style arena single on competitive-landscape research as the brief — produce md+html research report on agent-skills-eval / MemTensor skills-vote / etc. Deck: deep-research + baoyu
- ✅ ~~TASK-20260517121808215~~: BDD: deck abc 基础 — link/add/phase-switch/restore
- ✅ ~~TASK-20260517121813603~~: BDD: innate eager-load — curator innate + critique tool
- ✅ ~~TASK-20260517121819470~~: BDD: to-symlink/to-snapshot 切换 + link 行为缺口
- ✅ ~~TASK-20260517121825279~~: BDD: arena single + cross-deck vs 三连触发稳定
- ✅ ~~TASK-20260517121830977~~: BDD: map-reduce 并行 critique — 3 cell 不同 workdir 不同 deck
- ✅ ~~TASK-20260517122556223~~: Wire per-skill mode (symlink/snapshot) into deck link reconciler
- ✅ ~~TASK-20260517174257817~~: Fix archive --sides expecting subdirectory that prepare-workdir doesn't create, causing empty archive
- ✅ ~~TASK-20260517193718598~~: agent-adapter modelTier parameter + description update for reliable cross-player comparison
- ✅ ~~TASK-20260517193950675~~: Deck basics BDD — link/add/phase-switch/restore
- ✅ ~~TASK-20260517193950732~~: Innate eager-load vs tool lazy boundary BDD — verify eager-load after compaction
- ✅ ~~TASK-20260517193950780~~: Snapshot symlink roundtrip BDD — per-skill mode persistence
- ✅ ~~TASK-20260517193958181~~: Arena single + cross-deck vs trigger stability BDD
- ✅ ~~TASK-20260517193958229~~: Map-reduce parallel critique cells BDD — concurrent subagent judge
- ✅ ~~TASK-20260517194318952~~: Move root test/scenarios to package-co-located test directories per TESTING.md
- ✅ ~~TASK-20260518004641351~~: Arena Standard Posture SOP — mindset validator protocol and meta-test showcase
- ✅ ~~TASK-20260518030349878~~: Phase 1 — reproduce.sh contract spec
- ✅ ~~TASK-20260518030349939~~: Phase 3 — BDD coverage dashboard + change-impact probe
- ✅ ~~TASK-20260518030349966~~: Phase 4 — migrate high-value .agent.md to reproduce.sh
- ✅ ~~TASK-20260518105942103~~: Migrate deck-to-symlink-to-snapshot to reproduce.sh
- ✅ ~~TASK-20260518110819248~~: localhost/<skill> quick form for personal skills
- ✅ ~~TASK-20260518111443694~~: Standardize layered testing with plan-mode integration layer
- ✅ ~~TASK-20260518130210081~~: Remove frontmatter niche extraction + add tag command — agent-enriched metadata
- ✅ ~~TASK-20260518130212342~~: Audit rule realignment: drop empty-niche violation, add legacy pattern check
- ✅ ~~TASK-20260518130214814~~: Rewrite curator SKILL.md: discovery SOP via agent+search, not curator as engine
- ✅ ~~TASK-20260518130217386~~: Legacy reference cleanup: skills.sh, deck status sh, HANDOFF.md across repo
- ✅ ~~TASK-20260518130219922~~: Curator reproduce.sh: scan → tag → query → audit full IoC verification
- ✅ ~~TASK-20260518172921265~~: arena CLI single defaults output to CWD, leaks into project dir
- ✅ ~~TASK-20260518212223198~~: implement also_link_to multi-platform fan-out in deck link
- ✅ ~~TASK-20260518230024421~~: fix(deck): validate positional arg [deck.toml] ignored — only --deck flag worked
- ✅ ~~TASK-20260519144445916~~: Symlink pollution cleanup
- ✅ ~~TASK-20260519144500000~~: Remove `LYTHOS_COLD_POOL` environment variable
- ✅ ~~TASK-20260519164655956~~: A: 删除 CheckResult.remediation 字段 + printRemediationSummary
- ✅ ~~TASK-20260519164659220~~: B: symlink检测跨平台 — stat -c 替换为 fs.lstatSync
- ✅ ~~TASK-20260519164702541~~: C: cortex-probe 改用 stats + 启发式过滤，只报告 actionable 项
- ✅ ~~TASK-20260519164705587~~: D: missing-weekly 加入周完成度百分比 + 导航
- ✅ ~~TASK-20260519205953163~~: deck remove does not clean up also_link_to targets
- ✅ ~~TASK-20260519224838606~~: 实现 curator add --output 对齐与副作用显式声明
- ✅ ~~TASK-20260519224912252~~: bare name to full path lookup for deck add
- ✅ ~~TASK-20260520143950404~~: parse-deck.ts: [combo] section is prompt orchestration, not skill list
- ✅ ~~TASK-20260527212829974~~: Global path alignment sweep — establish working_set/cold_pool usage convention across repo
- ✅ ~~TASK-20260527220921728~~: Fix P0 path narrative contradictions — remove 'sole location' language and align docs with code ground truth
- ✅ ~~TASK-20260527222535526~~: Site path narrative audit and rewrite — align with path convention, preserve multi-platform, EN+ZH sync
- ✅ ~~TASK-20260527223818020~~: Cross-platform quick-start design — VitePress tabs for Claude/Codex/Cursor working_set
- ✅ ~~TASK-20260528111848232~~: Apply P1/P2 path-convention fixes: annotate deck tomls, install scripts, arena prompts per deviation report
- ✅ ~~TASK-20260528114758563~~: Fix site command shorthands — ensure all code blocks use runnable commands, establish shorthand resolution convention in AGENTS.md
- ✅ ~~TASK-20260528121027367~~: Dreaming skill PoC — project-level memory consolidation with ZK agent validation, self-bootstrap
- ✅ ~~TASK-20260528221835812~~: Wiki/ADR stale content audit — ZK cross-validate against dreaming SSOT, archive outdated, flag contradictions
- ✅ ~~TASK-20260529003437287~~: Internal Roundtable pattern: extract core mechanism from Agent Evaluation Arena
- ✅ ~~TASK-20260529003742409~~: Refactor curator CLI: add IO injection to runAdd/runFind/runCurator, remove L1 Escape Hatch exemption
- ✅ ~~TASK-20260529010457419~~: ZK audit: curator CLI tests for hidden design defects (argument order, mock magic, false positives)
- ✅ ~~TASK-20260529010924654~~: Fix remove.test.ts: add IO injection to removeSkill, remove direct process.exit assignment
- ✅ ~~TASK-20260529010926067~~: Fix to-symlink-snapshot.test.ts: add IO injection, remove process.cwd/process.exit direct assignment
- ✅ ~~TASK-20260529010927780~~: Fix mirror.test.ts: clarify SOCKS fallback test title/comment mismatch
- ✅ ~~TASK-20260529132734903~~: deck refresh: behind count accuracy + monorepo report clarity
- ✅ ~~TASK-20260529132806774~~: deck refresh reproduce.sh with mock-git isolation
- ✅ ~~TASK-20260529214616879~~: T1: runQuery IO injection + unit tests + reproduce.sh
- ✅ ~~TASK-20260529214618391~~: T2: runAudit IO injection + unit tests + reproduce.sh
- ✅ ~~TASK-20260529214620383~~: T3: runTag IO injection + unit tests + reproduce.sh
- ✅ ~~TASK-20260529214622541~~: T4: runRefreshPlan/runRefreshExecute IO injection + behind count fix + reproduce.sh
- ✅ ~~TASK-20260529214624302~~: T5: backupIndex/restoreIndex/printSchema IO injection + reproduce.sh
- ✅ ~~TASK-20260529214626313~~: T6: --help entry IO injection + reproduce.sh
- ✅ ~~TASK-20260529231326513~~: Search and add hot community skills (claude-skills, awesome-agent-skills, mattpocock/skills)
- ✅ ~~TASK-20260529231326545~~: Search and add niche skills (security, testing, data-quality, a11y)
- ✅ ~~TASK-20260529231326576~~: Tag all added skills with domain/hub/qa tags via WebSearch research
- ✅ ~~TASK-20260529231326608~~: Audit tagged skills and generate quality report
- ✅ ~~TASK-20260530135707211~~: Arena CLI IO injection — extract ArenaCliIO interface and inject into main/singleRun/vsRun/vizRun/prepareWorkdir/archiveRun
- ✅ ~~TASK-20260530135721111~~: Arena runner IO injection — extract ArenaIO for spawn/fs/agent operations
- ✅ ~~TASK-20260530135730555~~: Arena BDD reproduce.sh for CLI and runner IO injection
- ✅ ~~TASK-20260601162858384~~: T3: fix agent-run→single stale references + broken cross-ref to archived file
- ✅ ~~TASK-20260601162859848~~: T3: fix wiki naming — 10 bare-name files + 02-faq/02-research collision + INDEX.md gap
- ✅ ~~TASK-20260601162901076~~: T3: consolidate cold pool patterns — 6 files with 30-40% overlap into 3-4
- ✅ ~~TASK-20260606200104214~~: Add ZK Review reference doc to cortex skill (WHAT/WHY/HOW methodology + 4 required content types)
- ✅ ~~TASK-20260606200107286~~: Update cortex SKILL.md desc + when_to_use + refs table for ZK Review methodology
- ✅ ~~TASK-20260606200108703~~: Update AGENTS.md task-design section to link ZK Review pattern as mandatory pre-assignment gate
- ✅ ~~TASK-20260606220626030~~: AGENTS.md v2 refactor: ZK Review methodology + pass-by-reference + source-path references
- ✅ ~~TASK-20260606222341617~~: bun test exit code 0 on 'Unhandled error between tests' — silent test failures
- ✅ ~~TASK-20260606231034968~~: AGENTS.md BIOS-layer hardening: Z-zone visible headers, Daily Rhythm routing, CPTSD rewrite, FQ-only policy
- ✅ ~~TASK-20260607000945113~~: Fix agent-adapter kimi.test.ts failing in CI when kimi binary absent
- ✅ ~~TASK-20260607002504470~~: Create lightweight AGENTS.md + CLAUDE.md drop-in templates for lythoskill consumer projects
- ✅ ~~TASK-20260607003719576~~: Create lythoskill-consumer-bootstrap deck aligned with site mental model
- ✅ ~~TASK-20260607233651845~~: Standardize scribe daily/weekly templates
- ✅ ~~TASK-20260610210513827~~: Implement CLI task create subcommand compatibility (ADR-20260607233903985)
- ✅ ~~TASK-20260613182153447~~: Update ADR-20260503003314901: Closes: TASK semantic is complete not review-then-done
- ✅ ~~TASK-20260613182154539~~: Reconcile TASK-20260530135707211 status history with completed directory
- ✅ ~~TASK-20260613182155587~~: Resolve cold-pool mirror stash@{0}
- ✅ ~~TASK-20260613184943806~~: Update cortex/INDEX.md epic directory structure to match actual 99-done/03-suspended/04-archived layout
- ✅ ~~TASK-20260613190349815~~: Probe: suppress empty-shell warnings for completed tasks by default

### 悬置 (1)

- ⏸️ **TASK-20260513035226597**: Evaluate bun publish vs npm publish + rewrite — bun ≥1.3 has bun publish; verify workspace:* auto-rewrite behavior via dry-run; if auto-rewrite confirmed, consider switching publish.sh to drop the explicit rewrite layer

### 终止 (39)

- 🛑 ~~TASK-20260423124059766~~: Define and implement lythos naming conventions and publish path
- 🛑 ~~TASK-20260423162055407~~: Port skill-curator to lythoskill ecosystem
- 🛑 ~~TASK-20260423185733611~~: Playground Task
- 🛑 ~~TASK-20260423232250394~~: Consumer onboarding: clarify init → add-skill → build workflow
- 🛑 ~~TASK-20260424115732668~~: Handoff 时效性机制：git status 漂移检测
- 🛑 ~~TASK-20260424115735441~~: Curator CLI 实现文档化：扫描逻辑和 schema 说明
- 🛑 ~~TASK-20260424142722389~~: Curator 全局扫描：冷池 + 活跃池 + 项目本地 skills 统一视图
- 🛑 ~~TASK-20260430011203412~~: Move root package.json dependencies to individual packages
- 🛑 ~~TASK-20260430011205130~~: Unify lockfile and workspace config — Bun-only or pnpm-only
- 🛑 ~~TASK-20260430011206610~~: Create root tsconfig.base.json and unify per-package tsconfig
- 🛑 ~~TASK-20260430011207805~~: Standardize package.json template across all packages
- 🛑 ~~TASK-20260430012458517~~: Audit fix: add allowed-tools to release and scribe SKILL.md
- 🛑 ~~TASK-20260430012459381~~: Audit fix: review reference conditional trigger coverage across all skills
- 🛑 ~~TASK-20260502225209862~~: Demo: cancelled flow (backlog → in-progress → terminate)
- 🛑 ~~TASK-20260502230901152~~: Fix login bug
- 🛑 ~~TASK-20260503132524651~~: Create root tsconfig.base.json and unify per-package tsconfig
- 🛑 ~~TASK-20260503135205264~~: terminate
- 🛑 ~~TASK-20260503135212184~~: --help
- 🛑 ~~TASK-20260503152001333~~: Adopt alias-as-key dict schema for skill entries
- 🛑 ~~TASK-20260505191950708~~: curator add: verify SKILL.md path exists within cloned monorepo before writing; clean up empty dir on clone failure
- 🛑 ~~TASK-20260506001644451~~: T7: MCP server adapter feasibility assessment — sub-agents-mcp, claude-code-controller
- 🛑 ~~TASK-20260506102619862~~: Implement distinct runtime behavior for innate/tool/combo skill types
- 🛑 ~~TASK-20260506193936311~~: Implement DeepSeek TUI AgentAdapter: one-shot mode + player registry
- 🛑 ~~TASK-20260507223935542~~: Agent BDD: curator discover + cross-validate local cold pool vs remote feeds (new/updated/stale detection)
- 🛑 ~~TASK-20260513033214684~~: --help
- 🛑 ~~TASK-20260513042407452~~: Arena HTML report parity — catch up to agent-skills-eval which ships static HTML report; arena currently emits only markdown+JSON; this is parity not differentiation
- 🛑 ~~TASK-20260513042408337~~: Arena radar chart + Open Graph social card — differentiation layer on top of HTML report parity; goal is twitter-shareable visual with reproducible git ref
- 🛑 ~~TASK-20260517174254946~~: Fix extra double quote syntax error in arena reproduce.sh --to argument
- 🛑 ~~TASK-20260517193716031~~: Fix cortex SKILL.md empty shell problem — CLI creates files but agent doesn't fill content
- 🛑 ~~TASK-20260518030349909~~: Phase 2 — bdd-runner.ts reproduce.sh path
- 🛑 ~~TASK-20260518030349994~~: Phase 5 — deprecate parseAgentMd ## Judge regex
- 🛑 ~~TASK-20260518112246074~~: Refactor arena/preflight — IO separation
- 🛑 ~~TASK-20260518112246109~~: Refactor cold-pool/validate-plan — IO separation
- 🛑 ~~TASK-20260518112246144~~: Refactor curator/curator-core — IO separation
- 🛑 ~~TASK-20260521113114794~~: Audit deck references — prune stale, update outdated (sober ZK agent)
- 🛑 ~~TASK-20260521113125677~~: Audit curator references — prune stale, update outdated (sober ZK agent)
- 🛑 ~~TASK-20260521115223592~~: Fix site narrative: cold pool/working set jargon without context — lead with universal pain (global vs project skills, cp reuse, context window limit) before introducing terminology
- 🛑 ~~TASK-20260521120336482~~: Rewrite site narrative from correct starting point: deck as shareable reproducible skill gist, compare against real alternatives (global dir, cp, vercel skills add, marketplace), progressive disclosure from getting-started to philosophy
- 🛑 ~~TASK-20260528112402418~~: Research: Agents Skills ABC in 2026 — .agents/skills community standard scan-path landscape

---

## 🏛️ ADRs

- ✅ **ADR-20260423101938000** (02-accepted): Thin Skill Pattern - Development/Release Split
- ✅ **ADR-20260423101950000** (02-accepted): ESM Import over require for JSON
- ✅ **ADR-20260423124812645** (02-accepted): Build output should live in skills/ and be committed to Git
- ✅ **ADR-20260423130348396** (02-accepted): Port skill-manager into lythoskill ecosystem as deck governance
- ✅ **ADR-20260423182606313** (02-accepted): SKILL.md Template Variable Substitution and CLI Help Delegation
- ✅ **ADR-20260423191001406** (02-accepted): Deck npm Package Naming
- ✅ **ADR-20260424000744041** (02-accepted): Curator output is personal environment scan, not project artifact
- ✅ **ADR-20260424013849984** (02-accepted): lythoskill as anti-corruption layer and meta-governance boundary
- ✅ **ADR-20260424113352614** (02-accepted): project-scribe remains independent with optional skill cooperation
- ✅ **ADR-20260424113917838** (02-accepted): red-green-release heredoc migration patch design
- ✅ **ADR-20260424115621494** (02-accepted): virtual-evaluator-swarm adaptive concurrency skill design
- ✅ **ADR-20260424120936541** (02-accepted): player-deck separation and deck boundary rationale
- ✅ **ADR-20260424125637347** (02-accepted): handoff format migration from fixed file to daily-first
- ✅ **ADR-20260430174746744** (02-accepted): deck add command — convenience download without locking users into a single package manager
- ✅ **ADR-20260501090811296** (02-accepted): CI consistency check abandoned in favor of pre-commit hook for skill build
- ❌ **ADR-20260501091724816** (03-rejected): Rename cold pool to skill_library terminology alignment with Hermes ecosystem
- ✅ **ADR-20260501092809000** (02-accepted): skills branch preserves `skills/` directory prefix to avoid dual locator standards
- ✅ **ADR-20260501170000000** (02-accepted): Description Preference Learning via Arena — Pilot Results
- ✅ **ADR-20260502010100000** (02-accepted): deck link backup strategy for non-symlink entries
- ✅ **ADR-20260502012643244** (02-accepted): FQ-only locator — 删除 bare-name 与隐式策略 fallback
- ✅ **ADR-20260502012643344** (02-accepted): 项目自身 skill 通过 `localhost/me/<name>` symlink 自举，删除 `cold_pool="."` 特例
- ✅ **ADR-20260502012643444** (02-accepted): `deck add` 写入 FQ + 删除 `--via skills.sh` 后端
- ✅ **ADR-20260502012643544** (02-accepted): Skills as Flat Controllers — 多作者共存约束下的去中心化 skill mesh
- ✅ **ADR-20260502110308316** (02-accepted): Arena TOML Schema — Player as Facade 与对决声明
- ✅ **ADR-20260502233119561** (02-accepted): bump command and lockstep versioning policy
- ✅ **ADR-20260502234833756** (02-accepted): identify skill packages via skill subdirectory presence
- 📦 **ADR-20260503003314901** (04-superseded): git-coupling for cortex governance documents via commit trailer
- ✅ **ADR-20260503003315478** (02-accepted): epic granularity discipline — one outcome per iteration
- ✅ **ADR-20260503152000411** (02-accepted): deck 3-axis CRUD model with as-alias schema for working-set collisions
- ✅ **ADR-20260503170000000** (02-accepted): Monorepo Toolchain — Bun-only and Root Package.json Conventions
- ✅ **ADR-20260503180000000** (02-accepted): Unit Test Framework Selection — Curator Mind Applied
- ✅ **ADR-20260503222838594** (02-accepted): Kanban pull mode with CFD observability for agent-driven task management
- ❌ **ADR-20260503230522270** (03-rejected): LeetCode-style Agent BDD harness with tmpdir sandbox + claude -p driver
- ✅ **ADR-20260504134942164** (02-accepted): description-when-to-use-field-stratification-for-cross-cli-compatibility
- ✅ **ADR-20260504135256566** (02-accepted): cortex init ships trailer-driven hooks as the jira-simulation deliverable
- ✅ **ADR-20260504172913972** (02-accepted): Agent BDD budget governance — time/token/retry limits as first-class constraints
- ✅ **ADR-20260504200632939** (02-accepted): Structured judge schema — Zod-first with function-calling enforcement
- ✅ **ADR-20260505221432740** (02-accepted): Standardize test file co-location across monorepo packages
- ✅ **ADR-20260505225159725** (02-accepted): Criterion definition schema — from bare strings to structured scoring dimensions with rubrics
- ✅ **ADR-20260506021112492** (02-accepted): Kimi CLI as default AgentAdapter — Player abstraction validation and CWD isolation for deny-by-default
- ✅ **ADR-20260506103209293** (02-accepted): Supersede combo-skill-as-orchestration-layer — combo is now a deck-level prompt, not a separate skill
- ✅ **ADR-20260506214000000** (02-accepted): AgentAdapter as standalone plugin/extension library
- ✅ **ADR-20260507014124191** (02-accepted): Agent-friendly CLI error as decision tree with repo-structure inference heuristics
- ✅ **ADR-20260507021957847** (02-accepted): @lythos/cold-pool as dedicated resource-holder package with k8s-style reconciliation between skill-deck.lock and filesystem actual state
- ✅ **ADR-20260507110332770** (02-accepted): Prune defaults to audit heredoc; never auto-rm cold pool entries
- ✅ **ADR-20260507110332805** (02-accepted): Refresh defaults to discover-only; --apply renders audit heredoc with hard-timeout git pull lines
- ✅ **ADR-20260507110332831** (02-accepted): Validate-companion pattern: every agent-produced state summary ships with a paired one-click reality-check command
- ✅ **ADR-20260507143241493** (02-accepted): cold-pool metadata layer: git-native hash instead of custom SHA-256, SQLite-backed, local-only trust
- ✅ **ADR-20260507190157540** (02-accepted): Cold-pool project isolation: snapshot (default) vs sync dual-mode with guided intent switch
- ✅ **ADR-20260508074057834** (02-accepted): Deck link working_set path resolution + absolute-path logging
- ✅ **ADR-20260508075301691** (02-accepted): Deck link --deck accepts http/https URL
- ✅ **ADR-20260508075913360** (02-accepted): Extract runtime infrastructure package (@lythos/infra)
- ✅ **ADR-20260508204215712** (02-accepted): Environment-gated tests
- ✅ **ADR-20260508230803515** (02-accepted): Curator does not wrap external skill discovery APIs as feed adapters - agent web fetch beats hand-rolled adapters
- ✅ **ADR-20260509104832428** (02-accepted): Remove run --decks CLI-flag mode — keep only run --config arena.toml
- ✅ **ADR-20260509144134332** (02-accepted): Rename deck sync/freeze to to-symlink/to-snapshot for action-explicit verbs
- ✅ **ADR-20260509170343037** (02-accepted): Cold-pool metadata DB data fingerprint for integrity verification
- ✅ **ADR-20260510233000000** (02-accepted): Centralized path-guard vs whack-a-mole for agent-generated path traversal bugs
- ✅ **ADR-20260511000000000** (02-accepted): Deck skill sources — git-only FQ locators vs hub/marketplace integration
- ✅ **ADR-20260511093900000** (02-accepted): skills.sh syntax sugar in deck add — boundary normalization, not protocol integration
- 📦 **ADR-20260511210000000** (04-superseded): Consolidate curator output to `~/.agents/lythoskill/curator/`
- ✅ **ADR-20260512002131099** (02-accepted): Pre-push semgrep + CI CodeQL split for automated QA gates
- ✅ **ADR-20260513011442965** (02-accepted): Network proxy auto-discovery for resilient connectivity
- ✅ **ADR-20260513041030769** (02-accepted): No cross-package relative imports in packages src
- ✅ **ADR-20260513144000000** (02-accepted): No hard-coded third-party mirror list — trust boundary belongs to user
- ✅ **ADR-20260515204135649** (02-accepted): Agent self-healing environment — clear error context over structured framework
- ✅ **ADR-20260517140421425** (02-accepted): CLI vs Agent-Orchestrated Behavioral Parity
- ✅ **ADR-20260517142840955** (02-accepted): Agent-Adapter — Independent Process Spawn for Reliable Multi-Player Orchestration
- ✅ **ADR-20260517152850372** (02-accepted): Deck `also_link_to` — Multi-CLI Working Set via POSSE Pattern
- ✅ **ADR-20260517224131119** (02-accepted): Multi-layer project context persistence — agent context architecture by volatility class
- ✅ **ADR-20260518024500631** (02-accepted): Evolve Agent BDD from .agent.md+parseAgentMd to reproduce.sh pattern
- ✅ **ADR-20260518123403810** (02-accepted): Curator role re-derivation: from rigid indexer to agent-assisted discovery companion
- ✅ **ADR-20260518155038335** (02-accepted): Reproduce.sh + decision-log + logical framework — verifying premise-conclusion stability
- ✅ **ADR-20260519144445916** (02-accepted): working_set Must Not Alias Build Output Directory
- ✅ **ADR-20260519144500000** (02-accepted): Remove `LYTHOS_COLD_POOL` Environment Variable
- ✅ **ADR-20260519153000000** (02-accepted): Scheduled Weekly Entropy Reduction
- ✅ **ADR-20260519165746212** (02-accepted): cortex probe --suspicious 模式
- ✅ **ADR-20260519224555402** (02-accepted): curator add 全局副作用显式化与 --output 对齐
- ✅ **ADR-20260519225831495** (02-accepted): curator find — bare name to full path lookup
- ✅ **ADR-20260528113712898** (02-accepted): Site path narrative — two-path strategy (.claude/skills + .agents/skills) grounded in market reality
- ✅ **ADR-20260528120317143** (02-accepted): Deck creation guide — formalize "agent is the wizard, CLI is the guardrail"
- ✅ **ADR-20260528153455764** (02-accepted): Combo `skills` field as visual annotation — human-readable, not parsed by code
- ✅ **ADR-20260528173826499** (02-accepted): Distributed orchestration by weight — why no centralized orchestrator
- ✅ **ADR-20260529215906255** (02-accepted): Curator catalog resolution context — deck-aware vs independent discovery
- ✅ **ADR-20260607233903985** (02-accepted): CLI task command: subcommand inconsistency between create and state transitions
- ✅ **ADR-20260613182316950** (02-accepted): Clarify commit-trailer semantics — Closes is review-then-done, Review is dev-complete-to-review
- 🤔 **ADR-20260613190449007** (01-proposed): Wiki patterns: AAA pinned index + dreaming integration

---

*此文件由 generate-index.ts 自动生成*
