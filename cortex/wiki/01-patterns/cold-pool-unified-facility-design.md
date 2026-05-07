---
created: 2026-05-07
updated: 2026-05-07
category: pattern
---

# Cold Pool Unified Facility — Design

> Architectural record of `@lythos/cold-pool` (extracted in `EPIC-20260507020846020`,
> 2026-05-07). The package is the dedicated resource holder + plan/execute
> primitives for the cold pool. deck/curator/arena are consumers.

> Earlier draft of this doc (pre-T1) presented a 5-layer architecture and
> framed Maven analogies broadly. This revision narrows Maven to one point
> and replaces the 5 ad-hoc layers with the existing project-wide
> intent/plan/execute pattern. See history for the original scoping draft.

---

## 1. 问题域(原始触发)

| # | 当前症状 | 根因 | 现状 |
|---|---------|------|------|
| 1 | Path 反直觉(`skills/skills/skills`、agent 猜路径) | 隐式 `skills/` 插入 + repo 边界不可见 | ✅ 修复(P0 + ADR-20260502012643244 FQ-only) |
| 2 | 多包重复逻辑(deck / curator / arena 各自解析 locator) | 无 service 层 | ✅ 修复(`@lythos/cold-pool` 包) |
| 3 | 未 clone 无法验证 | 只有本地 fs 检查 | ✅ 修复(GitHub Tree API + `executeValidationPlan`) |
| 4 | Agent CPTSD(错误是字符串) | UX 给人不给 agent | ✅ 修复(ValidationReport,见 ADR-20260507014124191) |
| 5 | 无版本锁定 | `skill-deck.lock` 无 `git_ref` | 📋 后续 epic |
| 6 | Cache 无管理 | 裸目录,无索引 | 📋 后续 epic(metadata sidecar + 多 deck 安全 prune) |
| 7 | 预组卡组脆弱(quick-start 失败) | example deck 未 CI 验证 | ✅ 修复(`scripts/validate-example-decks.ts`) |

---

## 2. 心智模型(锁定)

### 2.1 Intent / Plan / Execute(已有项目级 pattern)

cold pool 不发明新的架构形态。它是 `cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md` 在 fetch / validate / reconcile 路径上的延伸。

```
Intent (DSL)        →  Plan (pure data)         →  Execute (IO injection)
skill-deck.toml     →  RefreshPlan / FetchPlan  →  executeRefreshPlan(plan, RefreshIO)
                                                  executeFetchPlan(plan, FetchIO)
deck add <fq>       →  ValidationReport         →  (no execute — Plan IS the report)
```

`buildXPlan` 是纯函数,可 dry-run、可单测。`executeXPlan(plan, io)` 持副作用,IO 注入让测试能用 mock,生产用真实 git/fetch。错误也是 plan layer 的一等数据(ValidationReport),不是异常控制流。

### 2.2 Manager(资源持有者)与操作分离

现有 pattern 没明说"谁持有 cold pool 这个资源"。本设计补一层:

- `ColdPool` 类(`@lythos/cold-pool/src/cold-pool.ts`):**唯一持有者**——path 配置、未来的 metadata 索引、reconcile 入口
- 操作层(`buildFetchPlan / buildValidationPlan` + IO 实现 `gitClone / gitPull / detectGitRoot / fetchRepoTree`):静态函数 + IO 注入

不变量:**任何对 cold pool 的修改必须经过 ColdPool 类或 cold-pool 的导出 IO**。早晨 `skill-deck.toml` 被覆盖事件就是无 manager 时 raw 操作的典型故障(参见 ADR-20260507021957847 §背景)。

### 2.3 Maven 借力(窄化)

仅借用一点:**cold pool 对工作空间不可见**(`~/.agents/skill-repos/` 类比 `~/.m2/repository`)。**不引入 coordinate 系统**(go-module 风格的 FQ locator + git ref + remote URL 三元组已足够),不复制 effective POM / snapshot 政策。

### 2.4 K8s reconciliation 心智(为后续 epic 留位)

declarative desired state ↔ filesystem actual state ↔ ColdPool 内部 reconciler 收敛。粒度边界:`skill-deck.lock` 是 working-set per-skill 粒度;cold-pool 的 reconciliation 是 repo+ref 粒度。**两者不混淆**,cold-pool 自存自己粒度的 desired state(本 epic 内 derived from deck declaration,后续 epic 迁到 cold-pool 自己的 manifest)。

---

## 3. 实现拓扑

```
┌─ Consumer (deck / curator / arena) ──────────────┐
│  deck add → buildFetchPlan + executeFetchPlan    │
│  deck link → parseLocator + ColdPool.resolveDir  │
│  deck refresh → gitPull (cold-pool exports)      │
│  deck validate → buildValidationPlan + execute   │
│  curator add → gitClone (cold-pool exports)      │
│  arena preflight → parseLocator + resolveDir     │
└──────────────────────────────────────────────────┘
                       ↓ imports from
┌─ @lythos/cold-pool ──────────────────────────────┐
│                                                  │
│  Resource layer:                                 │
│    ColdPool (dedicated resource holder)          │
│      .resolveDir(locator) → string               │
│      .has(locator) → boolean                     │
│      .list() → string[]                          │
│                                                  │
│  Plan layer (pure):                              │
│    parseLocator (FQ-only per ADR-20260502012643244)│
│    buildFetchPlan(pool, locator) → FetchPlan     │
│    buildValidationPlan(input) → ValidationPlan   │
│    inferSkillPath(treeEntries) → InferenceResult │
│                                                  │
│  Execute layer (IO injection):                   │
│    executeFetchPlan(plan, FetchIO)               │
│    executeValidationPlan(plan, ValidationIO)     │
│    gitClone / gitPull / detectGitRoot            │
│    fetchRepoTree (api.github.com, no auth)       │
└──────────────────────────────────────────────────┘
```

`@lythos/cold-pool` 没有 bin entry,纯库。consumers 通过 `"@lythos/cold-pool": "workspace:*"` 引入,bun 在子 package 的 `node_modules/@lythos/cold-pool` 创建 symlink。

---

## 4. ValidationReport(plan-as-data 错误)

详见 `ADR-20260507014124191`。要点:

- 错误不是 string,是结构化数据
- `phase: 'syntax' | 'repo-existence' | 'path-existence' | 'skill-md-existence'` 让 agent 知道问题落在哪一层
- `findings.detectedPaths` 列出 cloned repo 中所有含 SKILL.md 的子目录(真实文件系统证据)
- `suggestedFixes[].newLocator` 给出可直接 act 的修正,带 confidence(0..1)分数
- 同一 ValidationReport 服务三个消费者:CLI human-text、agent JSON、CI exit code。渲染发生在 execute 层

---

## 5. Cold-pool 物理布局约定

```
~/.agents/skill-repos/
├─ <host>/<owner>/<repo>/                   ← 远程 skill(标 host 三元)
│   └─ [skill-subpath]/SKILL.md             ← skill-subpath 由 locator 第 4 段以后决定
├─ <localhost-skill-name>/                  ← localhost skill(top-level 直接放)
│   └─ SKILL.md
└─ ...
```

**Localhost layout 关键点**: `localhost/<name>` 这个 locator 中的 `localhost/` 是 "no remote" 标记,**不是目录层**。skill 直接放 cold pool 顶层(per `prune-plan.ts:scanColdPool` 历史约定)。`ColdPool.resolveDir(locator)` 与该约定对齐;arena/preflight.ts 在 T11 也修齐了之前的本地 bug。

---

## 6. 已实现 vs 后续

### ✅ 已实现(EPIC-20260507020846020 / T1-T11 + T12-T13)

| 主题 | 落位 |
|------|------|
| 包脚手架 | `packages/lythoskill-cold-pool/` |
| 核心类型 + parseLocator | `src/types.ts` + `src/parse-locator.ts` |
| GitHub Tree API + ValidationReport | `src/github-tree.ts` + `src/validate-plan.ts` |
| Resolver helpers | `src/infer-skill-path.ts` |
| ColdPool resource holder | `src/cold-pool.ts` |
| Git IO 原语 | `src/git-io.ts` |
| Fetch plan/executor | `src/fetch-plan.ts` |
| deck add/link/refresh 切换 | `packages/lythoskill-deck/src/{add,link,refresh,refresh-plan}.ts` |
| `deck validate --remote --format=json` | `packages/lythoskill-deck/src/validate.ts` + cli.ts |
| examples/decks/*.toml CI 验证 | `scripts/validate-example-decks.ts` + `.github/workflows/test.yml` |
| curator git clone 切换 | `packages/lythoskill-curator/src/cli.ts:911` |
| arena preflight 路径解析切换 | `packages/lythoskill-arena/src/preflight.ts:checkSkillExistence` |
| ADR + Wiki 文档对齐 | `ADR-20260507014124191` + `ADR-20260507021957847` + 本 wiki |

### 📋 后续 epic 候选

- **Cold-pool metadata sidecar + 多 deck 安全 prune (ref-counting)**:每个 cold-pool 条目带 `referencing-decks` 列表,`prune` 删除时检查无 deck 引用才动手。当前 `prune-plan.ts` 只查单 deck.toml,多 workspace 共享 cold-pool 时不安全(参见 ADR-20260507021957847 §6 ref-counting note)。
- **`cold-pool reconcile` 命令**:k8s-style 完整收敛——读 desired state(skill-deck.lock + 增加 git_ref 字段) ↔ 扫 actual state(filesystem) ↔ 产 ReconcilePlan ↔ execute。`buildReconcilePlan` 接口已 scaffold,执行未实现。
- **`@lythos/cold-pool` 公开 API 文档 + npm publish**:0.10.0 release 时同步把 cold-pool 推 npm,公开 API 文档化,允许第三方 deck 替代品也消费。
- **curator/arena 进一步迁移**:目前 T10/T11 是 interface-level migration(只迁了 `git clone` / 路径解析)。curator 的 `git remote update` / `rev-list HEAD...@{upstream} --count` / `pull --ff-only` 这些 staleness 策略,未来若被多消费者复用,可以再抽到 cold-pool。

---

## 7. 与现有代码的对接点(post-T11 现状)

| 现有代码 | T1-T11 后状态 |
|---------|---------------|
| `deck/src/add.ts` | 无 inline `git clone`;通过 `executeFetchPlan` 消费 cold-pool |
| `deck/src/link.ts` `findSource()` | 路径解析委托 `parseLocator` + `ColdPool.resolveDir`;5-strategy fallback 删除 |
| `deck/src/refresh.ts` | 无本地 `gitPull`;import 自 cold-pool |
| `deck/src/refresh-plan.ts` | localhost 检测改用 `parseLocator`(string-based,而非 path-based) |
| `deck/src/validate.ts` | 暴露 `--remote --format=json`,产出 `DeckValidationReport`(每条目带 ValidationReport) |
| `curator/src/cli.ts` `runAdd` | `git clone` 调用切到 cold-pool;`git remote update` 等 staleness 策略保留 |
| `arena/src/preflight.ts` `checkSkillExistence` | 路径计算委托 cold-pool;localhost 修齐 |
| `examples/decks/*.toml` | 7 个 deck 都在 CI 中通过 remote 验证 |
| `skill-deck.lock` | 字段不变(working-set per-skill 粒度);cold-pool 自己的 desired state 留给后续 epic |

---

## 8. 衍生 ADR & wiki

- `ADR-20260507014124191`: Agent-friendly CLI error as decision tree —— ValidationReport 形态来源
- `ADR-20260507021957847`: `@lythos/cold-pool` as dedicated resource-holder package + k8s reconciliation 心智 —— 包结构与粒度边界来源
- `cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md`: 操作 pattern 来源
- `cortex/wiki/03-lessons/2026-05-07-real-world-skill-repo-structure-survey.md`: detectedPaths 推断的证据基础
