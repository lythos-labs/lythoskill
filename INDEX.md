# Project Index

> 自动生成于 2026/4/30 01:25:24

## 📊 概览

| 类型 | 总数 | 活跃/完成 |
|------|------|----------|
| Tasks | 20 | 进行中: 0, 待验收: 0, 已完成: 3 |
| Epics | 5 | 活跃: 4, 已归档: 1 |
| ADRs | 14 | 已接受: 14 |

---

## 📋 Epics

### 进行中

- **EPIC-20260423185732845**: Playground Epic
- **EPIC-20260429234732479**: Virtual evaluator swarm for multi-dimensional skill quality assessment
- **EPIC-20260430011158241**: Monorepo tooling consistency and config debt cleanup
- **EPIC-20260430012504755**: Skill progressive disclosure and quality audit

### 已归档

- ~~EPIC-20260423102000000~~: lythoskill MVP — Initial Release

---

## 📄 Tasks

### 待办 (17)

- [ ] **TASK-20260423124059736**: Create lythoskill ecosystem skill templates (creator/builder/curator)
- [ ] **TASK-20260423124059766**: Define and implement lythos naming conventions and publish path
- [ ] **TASK-20260423162055407**: Port skill-curator to lythoskill ecosystem
- [ ] **TASK-20260423185733611**: Playground Task
- [ ] **TASK-20260423223542053**: Curator SQLite backend for skill metadata governance
- [ ] **TASK-20260423232250394**: Consumer onboarding: clarify init → add-skill → build workflow
- [ ] **TASK-20260424115732668**: Handoff 时效性机制：git status 漂移检测
- [ ] **TASK-20260424115734221**: Red-green-release 在 README/CLAUDE.md 中补全文档
- [ ] **TASK-20260424115735441**: Curator CLI 实现文档化：扫描逻辑和 schema 说明
- [ ] **TASK-20260424142722389**: Curator 全局扫描：冷池 + 活跃池 + 项目本地 skills 统一视图
- [ ] **TASK-20260430011203412**: Move root package.json dependencies to individual packages
- [ ] **TASK-20260430011205130**: Unify lockfile and workspace config — Bun-only or pnpm-only
- [ ] **TASK-20260430011206610**: Create root tsconfig.base.json and unify per-package tsconfig
- [ ] **TASK-20260430011207805**: Standardize package.json template across all packages
- [ ] **TASK-20260430012458517**: Audit fix: add allowed-tools to release and scribe SKILL.md
- [ ] **TASK-20260430012458866**: Audit fix: add version frontmatter to cortex/release/scribe SKILL.md
- [ ] **TASK-20260430012459381**: Audit fix: review reference conditional trigger coverage across all skills

### 进行中 (0)

_无_

### 待验收 (0)

_无_

### 已完成 (3)

- ✅ ~~TASK-20260423102009000~~: Generate lythoskill Project Files
- ✅ ~~TASK-20260423170056315~~: Add add-skill command to lythoskill-creator
- ✅ ~~TASK-20260429225846405~~: Add --help and validate subcommand to lythoskill-deck CLI

### 悬置 (0)

_无_

### 终止 (0)

_无_

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

---

*此文件由 generate-index.ts 自动生成*
