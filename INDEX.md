# Project Index

> 自动生成于 2026/5/3 21:30:08

## 📊 概览

| 类型 | 总数 | 活跃/完成 |
|------|------|----------|
| Tasks | 55 | 进行中: 0, 待验收: 0, 已完成: 30 |
| Epics | 8 | 活跃: 0, 已完成: 5, 悬置: 1, 已归档: 2 |
| ADRs | 33 | 已接受: 20 |

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

### 悬置

- ⏸️ **EPIC-20260429234732479**: Virtual evaluator swarm for multi-dimensional skill quality assessment

### 已归档

- ~~EPIC-20260423102000000~~: lythoskill MVP — Initial Release
- ~~EPIC-20260423185732845~~: Playground Epic

---

## 📄 Tasks

### 待办 (6)

- [ ] **TASK-20260423124059736**: Create lythoskill ecosystem skill templates (creator/builder/curator)
- [ ] **TASK-20260503152001333**: Adopt alias-as-key dict schema for skill entries
- [ ] **TASK-20260503152002342**: Implement alias resolution and collision detection in deck link
- [ ] **TASK-20260503152005415**: Add deck remove and deck prune commands
- [ ] **TASK-20260503152006435**: Add BDD scenarios for refactored deck CRUD
- [ ] **TASK-20260503154401905**: Make README + CI surface red-green refactor + coverage visible

### 进行中 (0)

_无_

### 待验收 (0)

_无_

### 已完成 (30)

- ✅ ~~TASK-20260423102009000~~: Generate lythoskill Project Files
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
- ✅ ~~TASK-20260503152003393~~: Make deck add write FQ paths with optional as-alias
- ✅ ~~TASK-20260503152004433~~: Rename deck update to refresh and add per-skill arg
- ✅ ~~TASK-20260503154354857~~: Bump actions/checkout to v5 for Node 24 compat

### 悬置 (0)

_无_

### 终止 (18)

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
- 🤔 **ADR-20260502012643344** (01-proposed): 项目自身 skill 通过 `localhost/<name>` symlink 自举，删除 `cold_pool="."` 特例
- 🤔 **ADR-20260502012643444** (01-proposed): `deck add` 写入 FQ + 删除 `--via skills.sh` 后端
- 🤔 **ADR-20260502012643544** (01-proposed): Skills as Flat Controllers — 多作者共存约束下的去中心化 skill mesh
- 🤔 **ADR-20260502110308316** (01-proposed): Arena TOML Schema — Player as Facade 与对决声明
- ✅ **ADR-20260502233119561** (02-accepted): bump command and lockstep versioning policy
- ✅ **ADR-20260502234833756** (02-accepted): identify skill packages via skill subdirectory presence
- 🤔 **ADR-20260503003314901** (01-proposed): git-coupling for cortex governance documents via commit trailer
- 🤔 **ADR-20260503003315478** (01-proposed): epic granularity discipline — one outcome per iteration
- 🤔 **ADR-20260503152000411** (01-proposed): deck 3-axis CRUD model with as-alias schema for working-set collisions
- 🤔 **ADR-20260503170000000** (01-proposed): Monorepo Toolchain — Bun-only and Root Package.json Conventions
- 🤔 **ADR-20260503180000000** (01-proposed): Unit Test Framework Selection — Curator Mind Applied

---

*此文件由 generate-index.ts 自动生成*
