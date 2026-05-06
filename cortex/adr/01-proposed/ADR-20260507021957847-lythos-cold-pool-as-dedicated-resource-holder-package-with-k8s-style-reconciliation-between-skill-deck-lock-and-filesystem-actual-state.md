# ADR-20260507021957847: @lythos/cold-pool as dedicated resource-holder package with k8s-style reconciliation between skill-deck.lock and filesystem actual state

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-06 | Created |

## 背景

### 核心问题

`packages/lythoskill-deck/src/{add,link,refresh,refresh-plan,prune-plan}.ts` 以及 `packages/lythoskill-curator/src/cli.ts` 各自直接 `execFileSync('git', ['clone', ...])` / `execSync('git pull')`,缺统一 service 层。**典型"controller 绕过 service 直接操作 DAO"反模式**。

### 触发事件

1. **2026-05-07 早晨事件**: 上一 session agent 在错误的 path 模式假设下,把 `skill-deck.toml` 从 9-skill 完整配置覆盖成单 skill 错误 locator;30+ 轮硬钻才恢复。**没有任何 manager/gate 拦住裸操作**。
2. **EPIC-20260506001552299 agent-spawn E2E 测试**: 真实 skill repo 上 `deck link` 反复爆,定位为 cold pool path 解析与 fetch 链路问题。
3. **真实世界 repo 结构调研** (`cortex/wiki/03-lessons/2026-05-07-real-world-skill-repo-structure-survey.md`): 5+ 种 skill repo 布局并存,任何 implicit path 推断都会在某布局下崩。
4. **现有 prune ref-counting 不安全** (`packages/lythoskill-deck/src/prune-plan.ts:113-132`): `buildPrunePlan` 仅查单个 deck.toml 的 declared paths,多 deck 共享 cold pool 时,从一个 workspace 跑 prune 会把另一个 workspace 在用的 repo 标为可删除候选。无 cold-pool-side metadata 记录"哪些 deck 引用了我"。User 反馈"之前 agent 讨论过 prune 引用计数问题,不过我觉得它直接带过去了"——确认此限制存在于现有实现。

### 现有 lock 文件粒度

`skill-deck.lock` 当前结构(2026-05-06 sample):
- `skills[].name` = FQ locator (skill 粒度)
- `skills[].dest` = `.claude/skills/<name>` (working-set 粒度)
- `skills[].content_hash` = SKILL.md SHA (内容粒度)
- **缺 git_ref 字段**——无法精确锁定 cold pool 的 commit hash

这是 **working-set granularity** (per-skill in `.claude/skills/`)。Cold pool 的 reconciliation 需要 **repo+ref granularity** (per-repo at specific commit hash)。**两者不同层级,不应混淆**。

## 决策驱动

1. **缺 manager 直接管理一定脆弱**(用户语:"因为缺少 manager 直接管理肯定很脆弱"): 早晨事件就是无 manager 时的典型故障。
2. **K8s reconciliation 心智**(用户语:"我期望的 cold pool 的样子在我的管理的文件里,好好锁着;变得不一样了能协调回期望状态"): declarative desired state ↔ filesystem actual state ↔ reconciler 收敛。
3. **不复用 deck.lock**: 粒度不匹配。Deck.lock 是 working-set 粒度,cold pool 需要 repo+ref 粒度。强行统一会导致两边都失真。
4. **沿用现有 intent/plan/execute pattern**(`cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md`): manager 持有状态;操作沿用 `buildXPlan` / `executeXPlan(plan, io: XIO)` 形态。
5. **Prune ref-counting 多 deck 安全前提是 cold-pool 持有元数据**: 没有 manager 就没地方挂这个元数据。
6. **0.10.0 切换窗口**(用户语:"这次大概之后完全值得变成 0.10,放弃必要的兼容,因为其实还没有实际用户"): 不需要保留 9.x API 旧接口,可以做不兼容的接口与文件格式更改。

## 选项

### 方案 A: 仅函数式 API,无 manager
所有 cold-pool 能力以纯函数 + IO 注入提供,无中央对象。

- **优点**:最简,无生命周期管理
- **缺点**:无地方持有 metadata(ref-counting 用)、reconciliation desired state、lock 信息;早晨事件类问题无 gate 拦截。**与"manager 直接管理"诉求矛盾**。— **Rejected**

### 方案 B: 在 deck 包内长出 cold-pool 模块
保留单 package 边界,内部按 module 分层。

- **优点**:不增加 package 数量
- **缺点**:curator/arena 想消费时形成循环依赖(arena→deck→cold-pool 但 deck 也想消费 arena 的某些能力);"deck"语义边界不应承载所有跨包资源管理。— **Rejected**

### 方案 C: 独立 `@lythos/cold-pool` 包 + ColdPool manager + plan/execute 操作 — Selected
- 新包 `@lythos/cold-pool` 作为 cold pool 资源的**唯一持有者**(dedicated resource holder)
- 包内导出:
  - `ColdPool` 类(资源持有者): 持有 path 配置、metadata 索引、reconcile 入口
  - `buildFetchPlan(coldPool, locator) → FetchPlan` + `executeFetchPlan(plan, io: FetchIO) → FetchResult`(per-locator 操作)
  - `buildReconcilePlan(coldPool, desired) → ReconcilePlan` + `executeReconcilePlan(plan, io)`(k8s-style 收敛)
  - Git IO 原语:`gitPull(dir)`, `gitClone(url, dir, opts)`, `detectGitRoot(dir)`(从 deck/refresh.ts 提取)
  - `ValidationReport` + `buildValidationPlan(coldPool, locator)`(GitHub Tree API 预检,无 fs 副作用)
- 沿用现有 `XPlan/XIO` pattern,manager 仅管 state,操作通过 plan/execute
- **本 ADR 不强制实现 ref-counting**——但架构允许后续 epic 扩展(ColdPool 可以加 metadata sidecar)

## 决策

**选择**: 方案 C — 独立 `@lythos/cold-pool` 包 + ColdPool manager + plan/execute 操作。

**原因**:
1. 满足"manager 直接管理"诉求
2. 跨包消费(deck/curator/arena)需要独立 package,避免循环依赖
3. 沿用项目已成熟的 intent/plan/execute pattern,不发明新的
4. 为 ref-counting / cache 索引 / reconciliation 等未来需求预留 manager 状态空间
5. 0.10.0 窗口允许重新画包边界,无需 9.x 兼容

## 影响

### 正面
- deck/curator/arena 不再各自 `execFileSync('git ...')`;raw IO 集中在 cold-pool 包内
- 早晨事件类"raw 操作绕过 manager"无法再发生(无 ColdPool import 就无法操作 cold pool)
- ref-counting / multi-deck-safe prune 等扩展有了 architecture 容器
- k8s reconciliation 模型(desired ↔ actual)在管理文件层面落地

### 负面
- 新包 = 新 boundary 维护成本(monorepo lock-step 已经 mitigate)
- Deck.lock 粒度不变(仍是 per-skill);若需要"git_ref 精确锁定",cold-pool 自己存(分离不混淆)
- 0.10.0 breaking changes:CLI 行为可能变化(具体由 deck 迁移 task 决定)

### 后续
1. 实施 EPIC-20260507020846020 的 T1-T9 task
2. 后续 epic:cold-pool metadata sidecar + 多 deck 安全 prune(ref-counting)
3. 后续 epic:`cold-pool reconcile` 命令实现完整 k8s-style 收敛
4. 0.10.0 release window:放弃 9.x 兼容(deck CLI flag/lock 格式可破坏性变化)
5. wiki `cold-pool-unified-facility-design.md` 修订对齐本 ADR 与 intent/plan/execute pattern

## 相关
- 关联 ADR:
  - `ADR-20260502012643244` (FQ-only locator) — 本 ADR 的 locator 形态前提
  - `ADR-20260502012643444` (deck add 写 FQ) — 同上
  - `ADR-20260507014124191` (CLI error as decision tree) — 同 epic 共生 ADR,验证错误路径同样吃 plan/execute pattern
  - `ADR-20260423130348396` (port skill manager into lythoskill ecosystem as deck governance) — 本 ADR 是该决策在 cold pool 层的延伸
- 关联 Epic: `EPIC-20260507020846020`
- 关联 Wiki:
  - `cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md` (操作 pattern 来源)
  - `cortex/wiki/01-patterns/cold-pool-unified-facility-design.md` (待 T13 修订对齐)
  - `cortex/wiki/03-lessons/2026-05-07-real-world-skill-repo-structure-survey.md` (path 多样性证据)
