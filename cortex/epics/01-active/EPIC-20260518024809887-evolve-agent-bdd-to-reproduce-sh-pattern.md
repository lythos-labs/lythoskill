---
lane: main
checklist_completed: false
checklist_skipped_reason: CLI-driven from session, ADR already written
---
# EPIC-20260518024809887: Evolve Agent BDD to reproduce.sh pattern

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> Evolve Agent BDD to reproduce.sh pattern — self-executable, judge-separated, coverage-trackable

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-18 | Created |

## 背景故事

Agent BDD 的 `.agent.md` 格式有四个结构性问题：命名与 AGENTS.md 冲突、Judge 与 Task 耦合（arena 已修，BDD 未修）、正则解析脆弱、不可自执行。但 showcase/ 中 agent 自然涌现了 7 个 `reproduce.sh` 脚本——自包含、可执行、Judge 分离、agent-native。这次 evolution 是把已经涌现的模式固化为标准。

Refs: ADR-20260518024500631, ADR-20260514050300

## 需求树

### 主题 A: reproduce.sh 契约规范 #backlog
- 定义 reproduce.sh 的标准结构：exit code 约定、stdout 格式、metadata 字段
- 产出：`TESTING.md` 或 `references/reproduce-sh-contract.md`

### 主题 B: bdd-runner.ts 新增 reproduce.sh 执行路径 #backlog
- `Bun.spawn('bash reproduce.sh')` → 捕获 exit code + stdout/stderr → 写入 verdict
- 与现有 parseAgentMd 路径并存

### 主题 C: Coverage dashboard #backlog
- 脚本扫 `showcase/*/reproduce.sh` → 执行 → 汇总 pass/fail/skip → markdown table
- 类似 jest --coverage 的一眼可见性

### 主题 D: 现有 .agent.md 按需迁移 #backlog
- 不强制全量迁移，新场景用 reproduce.sh，旧场景维护现状

### 主题 E: 废弃 parseAgentMd `## Judge` 正则解析 #backlog
- arena.toml judge 字段已替代，可以移除正则提取

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260518024500631 | BDD evolution to reproduce.sh | proposed |
| ADR-20260514050300 | judge criteria frontmatter separation | accepted |

## 关联任务

（待创建——各主题对应一个 task）

## 归档条件
- [ ] reproduce.sh 契约规范文档存在
- [ ] bdd-runner.ts 支持 reproduce.sh 执行路径
- [ ] coverage dashboard 可运行
- [ ] 至少 3 个 showcase/ 场景使用 reproduce.sh 并通过 coverage dashboard
- [ ] parseAgentMd `## Judge` 解析路径标注 deprecated
