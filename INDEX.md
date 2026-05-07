# Project Index

> 自动生成于 2026/5/7 13:25:35

## 📊 概览

| 类型 | 总数 | 活跃/完成 |
|------|------|----------|
| Tasks | 142 | 进行中: 0, 待验收: 0, 已完成: 112 |
| Epics | 22 | 活跃: 0, 已完成: 18, 悬置: 2, 已归档: 2 |
| ADRs | 49 | 已接受: 35 |

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

### 悬置

- ⏸️ **EPIC-20260429234732479**: Virtual evaluator swarm for multi-dimensional skill quality assessment
- ⏸️ **EPIC-20260507012858669**: Real-world skill repo structure compatibility — pre-built deck validation for quick-start

### 已归档

- ~~EPIC-20260423102000000~~: lythoskill MVP — Initial Release
- ~~EPIC-20260423185732845~~: Playground Epic

---

## 📄 Tasks

### 待办 (10)

- [ ] **TASK-20260505015055286**: T5: Unit tests for pure functions + CLI BDD for curator add
- [ ] **TASK-20260505163912399**: create
- [ ] **TASK-20260505191950708**: curator add: verify SKILL.md path exists within cloned monorepo before writing; clean up empty dir on clone failure
- [ ] **TASK-20260506001644390**: T5: Register AgentSdkAdapter in useAgent() routing, add claude-sdk player
- [ ] **TASK-20260506001644423**: T6: Arena copy-test re-run with fixed CLI spawn — verify non-empty agent output
- [ ] **TASK-20260506001644451**: T7: MCP server adapter feasibility assessment — sub-agents-mcp, claude-code-controller
- [ ] **TASK-20260506102619862**: Implement distinct runtime behavior for innate/tool/combo skill types
- [ ] **TASK-20260506193936311**: Implement DeepSeek TUI AgentAdapter: one-shot mode + player registry
- [ ] **TASK-20260507011711797**: Design unified skill-locator resolver: syntax parsing + existence validation + semantic path verification via GitHub API
- [ ] **TASK-20260507112345999**: Migrate deck BDD scenarios from bare-name fixtures to real lythos-labs/test-stubs FQ locators (BDD-test-stubs)

### 进行中 (0)

_无_

### 待验收 (0)

_无_

### 已完成 (112)

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
- ✅ ~~TASK-20260507010453909~~: Remove implicit skills/ insertion from findSource() and align all deck paths to direct mapping
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
- ✅ ~~TASK-20260507130509142~~: deck add should not exit-fail when cold pool repo exists; should still write deck.toml + link if specific skill not yet declared

### 悬置 (0)

_无_

### 终止 (19)

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
- ✅ **ADR-20260424114401090** (02-accepted): combo skill as orchestration layer naming and emergence strategy
- ✅ **ADR-20260424115621494** (02-accepted): virtual-evaluator-swarm adaptive concurrency skill design
- ✅ **ADR-20260424120936541** (02-accepted): player-deck separation and deck boundary rationale
- ✅ **ADR-20260424125637347** (02-accepted): handoff format migration from fixed file to daily-first
- ✅ **ADR-20260430174746744** (02-accepted): deck add command — convenience download without locking users into a single package manager
- ✅ **ADR-20260501090811296** (02-accepted): CI consistency check abandoned in favor of pre-commit hook for skill build
- ❌ **ADR-20260501091724816** (03-rejected): Rename cold pool to skill_library terminology alignment with Hermes ecosystem
- ✅ **ADR-20260501092809000** (02-accepted): skills branch preserves `skills/` directory prefix to avoid dual locator standards
- 🤔 **ADR-20260501160000000** (01-proposed): skill-deck.toml section semantics and innate skill re-attachment after context compaction
- 🤔 **ADR-20260501170000000** (01-proposed): Description Preference Learning via Arena — Pilot Results
- ✅ **ADR-20260502010100000** (02-accepted): deck link backup strategy for non-symlink entries
- 🤔 **ADR-20260502012643244** (01-proposed): FQ-only locator — 删除 bare-name 与隐式策略 fallback
- 🤔 **ADR-20260502012643344** (01-proposed): 项目自身 skill 通过 `localhost/me/<name>` symlink 自举，删除 `cold_pool="."` 特例
- ✅ **ADR-20260502012643444** (02-accepted): `deck add` 写入 FQ + 删除 `--via skills.sh` 后端
- 🤔 **ADR-20260502012643544** (01-proposed): Skills as Flat Controllers — 多作者共存约束下的去中心化 skill mesh
- 🤔 **ADR-20260502110308316** (01-proposed): Arena TOML Schema — Player as Facade 与对决声明
- ✅ **ADR-20260502233119561** (02-accepted): bump command and lockstep versioning policy
- ✅ **ADR-20260502234833756** (02-accepted): identify skill packages via skill subdirectory presence
- ✅ **ADR-20260503003314901** (02-accepted): git-coupling for cortex governance documents via commit trailer
- ✅ **ADR-20260503003315478** (02-accepted): epic granularity discipline — one outcome per iteration
- ✅ **ADR-20260503152000411** (02-accepted): deck 3-axis CRUD model with as-alias schema for working-set collisions
- ✅ **ADR-20260503170000000** (02-accepted): Monorepo Toolchain — Bun-only and Root Package.json Conventions
- ✅ **ADR-20260503180000000** (02-accepted): Unit Test Framework Selection — Curator Mind Applied
- ✅ **ADR-20260503222838594** (02-accepted): Kanban pull mode with CFD observability for agent-driven task management
- ❌ **ADR-20260503230522270** (03-rejected): LeetCode-style Agent BDD harness with tmpdir sandbox + claude -p driver
- 🤔 **ADR-20260504134942164** (01-proposed): description-when-to-use-field-stratification-for-cross-cli-compatibility
- 🤔 **ADR-20260504135256566** (01-proposed): cortex init ships trailer-driven hooks as the jira-simulation deliverable
- ✅ **ADR-20260504172913972** (02-accepted): Agent BDD budget governance — time/token/retry limits as first-class constraints
- ✅ **ADR-20260504200632939** (02-accepted): Structured judge schema — Zod-first with function-calling enforcement
- ✅ **ADR-20260505221432740** (02-accepted): Standardize test file co-location across monorepo packages
- ✅ **ADR-20260505225159725** (02-accepted): Criterion definition schema — from bare strings to structured scoring dimensions with rubrics
- ✅ **ADR-20260506021112492** (02-accepted): Kimi CLI as default AgentAdapter — Player abstraction validation and CWD isolation for deny-by-default
- ✅ **ADR-20260506103209293** (02-accepted): Supersede combo-skill-as-orchestration-layer — combo is now a deck-level prompt, not a separate skill
- 🤔 **ADR-20260506214000000** (01-proposed): AgentAdapter as standalone plugin/extension library
- ✅ **ADR-20260507014124191** (02-accepted): Agent-friendly CLI error as decision tree with repo-structure inference heuristics
- ✅ **ADR-20260507021957847** (02-accepted): @lythos/cold-pool as dedicated resource-holder package with k8s-style reconciliation between skill-deck.lock and filesystem actual state
- 🤔 **ADR-20260507110332770** (01-proposed): Prune defaults to audit heredoc; never auto-rm cold pool entries
- 🤔 **ADR-20260507110332805** (01-proposed): Refresh defaults to discover-only; --apply renders audit heredoc with hard-timeout git pull lines
- 🤔 **ADR-20260507110332831** (01-proposed): Validate-companion pattern: every agent-produced state summary ships with a paired one-click reality-check command

---

*此文件由 generate-index.ts 自动生成*
