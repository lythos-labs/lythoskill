---
lane: main
checklist_completed: false
checklist_skipped_reason: rescoped from suspended EPIC-20260507012858669; architectural framing settled in conversation
---
# EPIC-20260507020846020: Cold pool foundation: @lythos/cold-pool package, intent/plan/executor architecture, deck/curator/arena migration

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> Cold pool foundation: @lythos/cold-pool package, intent/plan/executor architecture, deck/curator/arena migration

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-07 | Created — rescoped from suspended `EPIC-20260507012858669` (quick-start patches subsumed) |

## 背景故事

### 触发链

1. `EPIC-20260506001552299`(agent-spawn 稳定化, 已 done)的 E2E 测试中,`deck link` 在真实世界 skill repo 上反复爆。
2. 同 epic 的子任务 T2 (`pre-flight: deck link skill existence check`) 揭示问题不在 link 本身,在 cold pool 的 path 解析与 fetch 链路。
3. 2026-05-07 早晨事件:agent 在错误的 path 模式假设下,把 `skill-deck.toml` 从 9-skill 完整配置覆盖成单 skill 错误 locator;30+ 轮硬钻才恢复。
4. 同日真实世界 repo survey (`cortex/wiki/03-lessons/2026-05-07-real-world-skill-repo-structure-survey.md`) 揭示 5+ 种 skill repo 布局并存,任何 implicit path 推断都会在某个布局下崩。
5. 调研后定位**真正缺陷**:架构问题——deck/curator/arena 各自直接 `execFileSync('git clone', ...)`,**没有 service 层**,典型的"controller 绕过 service 直接操作 DAO"。

### 问题域

| # | 当前症状 | 根因 |
|---|---------|------|
| 1 | `deck add` 失败信息是字符串,agent 无法自主修复 | 错误是 string 而非 Plan 数据 |
| 2 | `findSkillDir` 在真实世界 repo 上误判 | path 模式假设耦合在单点函数 |
| 3 | `deck/curator/arena` 各自维护 git clone + path 解析 | 缺统一 service 层(intent/plan/executor) |
| 4 | `skill-deck.toml` 被覆盖未被任何 gate 拦住 | 没有 Plan-then-Execute 纪律 |
| 5 | example deck 未经 CI 验证,新用户第一条命令就可能踩雷 | quick-start 实测反馈缺位 |

### 目标价值

把 cold pool 从"裸目录被多个 controller 共享操作"提升为"由 service 层封装的资产":**`@lythos/cold-pool` 包成为唯一持有 git clone / fs write 副作用权的服务层**。deck/curator/arena 退化为消费方,它们的代码只产出 Plan(纯数据),由 cold-pool 的 Executor 执行。

### 心智模型(已锁定)

- **Locator 形态**:go-module 风格,FQ-only(`host.tld/owner/repo[/skill]` 或 `localhost/<name>`)。已由 `ADR-20260502012643244` (FQ-only) + `ADR-20260502012643444` (deck add 写 FQ) + `ADR-20260501092809000` (skills 分支前缀) 三 ADR 锁定,**本 epic 不动**。
- **Maven 借力**:仅借用"cold pool 对工作空间不可见"这一点(`~/.m2/repository` 类比)。**不引入 coordinate 系统**,不复制 effective POM/snapshot 政策——locator + git ref + remote URL 三元组足够。
- **架构纪律 = 现有 intent/plan/execute pattern 的扩展应用**:**不是新发明**。已由 `cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md` 编纂为项目级 fractal architecture pattern,已在 `RefreshPlan / executeRefreshPlan / RefreshIO`(deck/refresh-plan.ts)、`PrunePlan`(deck/prune-plan.ts)、`AgentScenario / runAgentScenario`(arena)、`ExecutionPlan / runArenaFromToml`(arena)上成熟应用。本 epic 把同一 pattern 扩展到 cold pool 的 fetch / validate / 异常诊断路径,并把 deck/curator/arena 散落的 git IO 集中到 cold-pool 提供的 IO 实现上。
  - Intent: `skill-deck.toml` / CLI flags(已有,不动)
  - Plan: 新增 `FetchPlan` / `ValidationReport` / `ReconcilePlan`,以及现有 `RefreshPlan` / `PrunePlan` 的内部目标项升级到 cold-pool 原语
  - Execute: cold-pool 提供 `gitPull / gitClone / detectGitRoot` 等 IO 实现 + `executeFetchPlan(plan, io: FetchIO)`;deck 现有命令通过 IO 注入消费(不再本地 inline `execSync`)
- **Manager 存在感(用户语:"还是要专门的持有资源的 / 缺少 manager 直接管理肯定很脆弱")**:`@lythos/cold-pool` 包内导出 `ColdPool` 类作为 cold-pool 资源的**唯一持有者**——持有 path 配置、metadata 索引、reconcile 入口。Manager 持有状态;操作沿用 plan/execute pattern。早晨 `skill-deck.toml` 被覆盖事件就是无 manager 时的典型故障——**新架构的首要不变量:任何对 cold pool 的修改必须经过 ColdPool 类**(无 ColdPool import 就无法修改 cold pool)。
- **K8s reconciliation 心智(用户语:"我期望的 cold pool 的样子在我的管理的文件里,好好锁着;变得不一样了能协调回期望状态")**:declarative desired state ↔ filesystem actual state ↔ ColdPool 内部 reconciler 收敛。**粒度边界**:`skill-deck.lock` 是 working-set 粒度(per-skill in `.claude/skills/`),cold-pool 的 reconciliation 是 repo+ref 粒度。两者**不应混淆**——cold-pool 自己存自己粒度的 desired state(本 epic 内可暂用 derived from deck declaration,后续 epic 迁到 cold-pool 自己的 manifest)。
- **不在本 epic 内做 ref-counting**:现有 `prune-plan.ts:113-132` 仅查单 deck.toml,多 deck 共享 cold pool 时不安全(用户:"之前讨论过 prune 引用计数问题,直接带过去了")。本 epic **不修复**这个 limitation——但架构必须为后续修复留 metadata 容器(ColdPool 类的 metadata 字段)。
- **0.10.0 breaking-change 窗口(用户语:"完全值得变成 0.10,放弃必要的兼容")**:本 epic 完结后 release 0.10.0,允许 CLI flag / lock 格式 / API 接口的不兼容更改;不需要 9.x compat shim。

## 需求树

### 主题 A: `@lythos/cold-pool` 包基础设施 #backlog
- **触发**: 缺独立的 service 包
- **需求**: 新包脚手架,与 monorepo lock-step 版本对齐(0.9.23),纯库无 bin
- **实现**: `packages/lythoskill-cold-pool/{package.json, tsconfig.json, src/, test/}`
- **产出**: package 可被 deck/curator/arena 通过 workspace 引用
- **验证**: `bun test` 跑通空骨架; `import { Locator } from '@lythos/cold-pool'` 在 deck 中可解析

### 主题 B: 核心数据类型 (Plan layer) #backlog
- **触发**: 当前 fetch / validate 路径无统一 Plan 数据结构
- **需求**: `Locator` (parsed FQ), `ValidationReport`, `FetchPlan`, `FetchIO`(IO 注入接口,对齐现有 `RefreshIO` 风格), `ValidationPlan` 可省略——validate 无 execute 步骤,Plan 即 Report
- **实现**: `src/types.ts` + `parseLocator()`(从 deck 现有 `findSource` 逻辑提取)
- **产出**: 类型导出 + parser 单测覆盖 5+ 种真实世界 repo 形态
- **验证**: parseLocator 对 anthropics/skills, daymade flat repos, mattpocock nested 全部正确解析

### 主题 C: Resolver 层 (远程预检) #backlog
- **触发**: 当前 `deck add` 必须先 clone 才知道 path 对不对
- **需求**: 调用 GitHub Tree API,clone 前预检 repo 存在性 + skill path 存在性;输出即 `ValidationReport`
- **实现**: `src/github-tree-api.ts` (无 auth,公共 repo 即可) + `buildValidationPlan(locator, opts) → ValidationReport`
- **产出**: 纯函数,无 fs 副作用;`inferSkillPath(repoTree)` 在 path 缺失时列出候选 SKILL.md 子目录
- **验证**: 对 survey 中 9 个真实 repo 全部返回正确 ValidationReport;rate-limit 处理 graceful

### 主题 D: ColdPool manager + Fetch 原语 + IO 实现 (Manager + Execute layers) #backlog
- **触发**: `deck/src/{add,link,refresh}.ts` 各自直接 `execFileSync('git', ['clone'/'pull'])` / `execSync('git pull')`,缺统一 IO + 缺 manager
- **需求**: cold-pool 同时提供资源持有者(ColdPool)与 git IO 原语 + per-locator FetchPlan;**沿用现有 `XPlan + XIO` 模式**,manager 不替代 plan/execute
- **实现**:
  - `src/cold-pool.ts`:`ColdPool` 类(持有 path 配置、metadata 索引、reconcile 入口)。**唯一持有 cold-pool 资源的对象**——任何 cold-pool 修改必须经过它。
  - `src/git-io.ts`:`gitPull(dir)`, `gitClone(url, dir, opts)`, `detectGitRoot(dir, coldPool)` 等纯 IO 函数(从 deck/refresh.ts 提取)
  - `src/fetch-plan.ts`:`buildFetchPlan(coldPool, locator, opts) → FetchPlan` + `executeFetchPlan(plan, io: FetchIO) → FetchResult`
  - `src/reconcile-plan.ts`(scaffold,本 epic 不全实现):`buildReconcilePlan(coldPool, desired) → ReconcilePlan` 的接口框架,留 metadata 字段位
  - 默认 `FetchIO` 用 git-io.ts 中的真实实现;测试可注入 mock
- **产出**: deck 任何处需要 git IO 时,从 `@lythos/cold-pool` 导入(本地不再 inline);ColdPool 是新 architecture 的"manager 不变量"
- **验证**: deck 现有 refresh-plan.test.ts 切换 IO source 后行为不变;新增 fetch-plan + ColdPool 单测;ColdPool 类的 read API (`has`, `resolveDir`, `list`) 单测

### 主题 E: deck 迁移 #backlog
- **触发**: `add.ts/link.ts/refresh.ts/refresh-plan.ts` 直接 `execFileSync('git')`
- **需求**:
  - `refresh.ts`:本地 `gitPull` 改为 `import { gitPull } from '@lythos/cold-pool'`
  - `add.ts`:重构为 plan/execute 形态,内部调用 `executeFetchPlan` 替代 inline `execFileSync('git clone')`
  - `link.ts`:`findSource` 路径解析逻辑迁移到 cold-pool 的 `parseLocator`,本地保留 deck-level 编排
  - `refresh-plan.ts`:`detectGitRoot` 迁出,本地 import
  - 新增 `validate.ts`(若已有则扩展):暴露 `deck validate <deck-path>` 命令,产出每个 locator 的 ValidationReport
- **实现**: 5 文件 refactor,保持 CLI 行为兼容
- **产出**: deck 不再 import `node:child_process`(除 cold-pool 自身);新增 `deck validate` 命令
- **验证**: 现有 deck 测试全绿;新增 validate 单测 + agent BDD scenario

### 主题 F: examples/decks/*.toml CI 验证 #backlog
- **触发**: 今早事件后 quick-start 仍未保证可用
- **需求**: CI 步骤跑 `deck validate` 对每个 example deck
- **实现**: `package.json` test script + GitHub Actions workflow step (or husky pre-push if无 CI)
- **产出**: broken locator 阻塞合并
- **验证**: 故意改坏一个 example deck,CI red

### 主题 G: curator/arena 迁移 #backlog (stretch)
- **触发**: 不迁移则 stovepipe 缺陷继续存在
- **需求**: curator scan 通过 ColdPoolManager 索引 cold pool;arena `preflight.ts` 用 ValidationReport
- **实现**: `curator/src/cli.ts` + `arena/src/preflight.ts` refactor
- **产出**: 三包均消费同一 service,不再各自 git clone
- **验证**: curator/arena 测试不退化

### 主题 H: wiki 文档对齐 #backlog
- **触发**: `cortex/wiki/01-patterns/cold-pool-unified-facility-design.md` 当前 5 层架构未围绕 intent/plan/executor 框架
- **需求**: 修订 wiki,把 Maven 引用窄化到"cold pool invisibility",架构图改成 intent/plan/executor 三层
- **实现**: 直接 Edit wiki 文件
- **产出**: wiki 与 epic 心智一致,后续 task 引用 wiki 即可

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260502012643244 | FQ-only locator(锁定 locator 形态) | proposed (de-facto 已生效) |
| ADR-20260502012643444 | deck add 写 FQ + 删 skills.sh backend | accepted |
| ADR-20260501092809000 | skills 分支保留 `skills/` 前缀 | accepted |
| ADR-20260507014124191 | Agent-friendly CLI error 作为决策树(本 epic 触发) | proposed (待填 body) |
| ADR-20260507021957847 | `@lythos/cold-pool` 作为 dedicated resource-holder package + k8s-style reconciliation(本 epic 主决策) | proposed (body 已填) |

## 关联任务

| 任务 | TASK ID | 状态 | 描述 |
|------|---------|------|------|
| T1 | TASK-20260507021320323 | ✅ completed | Scaffold `@lythos/cold-pool` 包(主题 A) |
| T2 | TASK-20260507021320360 | ✅ completed | 核心类型 + parseLocator 迁移(主题 B) |
| T3 | TASK-20260507021320388 | ✅ completed | Resolver 层 + GitHub Tree API client(主题 C) |
| T4 | TASK-20260507021320416 | ✅ completed | ColdPool + git-io + Fetch plan/executor(主题 D) |
| T5 | TASK-20260507021320442 | backlog | deck/src/add.ts 切到 cold-pool(主题 E) |
| T6 | TASK-20260507021320467 | backlog | deck/src/link.ts 切到 cold-pool(主题 E) |
| T7 | TASK-20260507021320492 | backlog | deck/src/refresh-plan.ts 切到 cold-pool(主题 E) |
| T8 | TASK-20260507021320516 | backlog | `deck validate` 命令 + ValidationReport 输出(主题 E) |
| T9 | TASK-20260507021320542 | backlog | examples/decks/*.toml CI 验证(主题 F) |
| T10 | (待创建) | stretch | curator/src/cli.ts 切到 cold-pool(主题 G) |
| T11 | (待创建) | stretch | arena/src/preflight.ts 切到 cold-pool(主题 G) |
| T12 | TASK-20260507021320567 | backlog | 写 ADR-20260507014124191 body(决策记录) |
| T13 | (随尾段一起做) | backlog | wiki cold-pool-unified-facility-design.md 修订(主题 H) |

## 经验沉淀
<!-- 填写到结案时再补 -->

## 归档条件
- [ ] T1-T9 全部 completed
- [ ] T12, T13 completed(文档对齐)
- [ ] 现有 deck/curator/arena 测试全绿
- [ ] examples/decks/*.toml 在 CI 中验证通过
- [ ] 新 agent E2E quick-start(`deck add` + `deck link`)在 9 个 survey repo 上不再爆
- [ ] T10/T11 (stretch)已完成或拆为后续 epic
- [ ] **0.10.0 release 完成**:lock-step 升级所有包到 0.10.0,放弃 9.x compat shim
- [ ] 后续 epic 创建并入 backlog:
  - cold-pool metadata sidecar + 多 deck 安全 prune (ref-counting)
  - `cold-pool reconcile` 命令实现完整 k8s-style 收敛(完整 buildReconcilePlan/executeReconcilePlan)
  - `@lythos/cold-pool` 公开 API 文档 + npm publish
