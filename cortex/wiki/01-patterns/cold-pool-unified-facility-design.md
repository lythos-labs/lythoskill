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
├─ <host>/<owner>/<repo>/                   ← 远程 skill(host/owner/repo 三段统一)
│   ├─ SKILL.md                             ← 形态 A: standalone — locator 无 skill 段
│   │                                       │   (e.g. `github.com/garrytan/gstack`)
│   │                                       │   **SKILL.md 必须在 repo 根**,否则解析失败
│   └─ <skill-subpath>/SKILL.md             ← 形态 B: monorepo — locator 第 4 段以后是 skill 子路径
│                                              (e.g. `github.com/anthropics/skills/skills/pdf`,
│                                               skill="skills/pdf",SKILL.md 在 skills/pdf/ 下)
├─ localhost/<owner>/<repo>/                ← 本地 skill,完全同 shape,只是 host=localhost(无远程)
│   ├─ SKILL.md                             ← 形态 A standalone
│   └─ <skill-subpath>/SKILL.md             ← 形态 B with skill subpath
└─ ...
```

**Layout 心智**(per user 2026-05-07): "**FQ locator 其实是 path,一层层进入就是 FQ locator 展开。就没有各种特殊情况了**"。无论 host 是 `github.com` 还是 `localhost`,布局完全一致——`<coldPool>/<host>/<owner>/<repo>[/skill]`。Code 路径 `ColdPool.resolveDir` / `ColdPool.list` 没有 localhost 分支判断。

**两种 SKILL.md 位置**:
- **A. Standalone**: locator 是 `<host>/<owner>/<repo>`(三段,无 skill 子路径),SKILL.md **必须**在 `<coldPool>/<host>/<owner>/<repo>/SKILL.md`(repo 根)。e.g. `github.com/garrytan/gstack` → `<cold>/github.com/garrytan/gstack/SKILL.md`。
- **B. With skill subpath**: locator 是 `<host>/<owner>/<repo>/<skill...>`(四段或以上),SKILL.md 在 `<coldPool>/<host>/<owner>/<repo>/<skill...>/SKILL.md`。e.g. `github.com/anthropics/skills/skills/pdf` → `<cold>/github.com/anthropics/skills/skills/pdf/SKILL.md`(注意双 `skills/skills/` 是 anthropics 仓库自己叫 `skills` 又内含 `skills/` 子目录的真实形态,FQ-only 不去"修正"它)。

**localhost 本质**: 仅是 `host` 段为字面 `localhost` 表示**无远程**(无 clone / 无 pull / 无 fetch),其他完全等同。`isLocalhost: true` 这个 flag 唯一作用是让 fetch / refresh / validate 跳过网络步骤。

**推荐快速本地 skill convention**(非强制): `localhost/me/skills/<skill-name>`(`me` 默认 owner、`skills` 默认 repo)。例如 quick-start 想搓个临时 polish-text skill,直接 `mkdir ~/.agents/skill-repos/localhost/me/skills/polish-text/` 然后写 SKILL.md,deck.toml 引用 `localhost/me/skills/polish-text` 即可。当然 `localhost/<any-owner>/<any-repo>` 都合法,这只是一个对个人/快速场景的常用前缀建议。

**Legacy drift**: 历史上有两类 post-compaction 失忆 agent 的产物:
- A: `<coldPool>/<x>/SKILL.md`(顶层 + SKILL.md)——agent 为让 bare-name `web-search` 解析过测试硬塞的
- B: `<coldPool>/localhost/<name>/SKILL.md`(深 2 层、缺 owner/repo)——更早的 `localhost/<name>` 形态遗留

两类都被 `ColdPool.list()` 和 `prune-plan.ts:scanColdPool` 检出后纳入枚举(便于后续 prune heredoc 列为 cleanup 候选)。新代码生产永远走 `<host>/<owner>/<repo>` 三层。

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

- **Prune 改为审计-就绪 heredoc 生成器**:`deck prune` (和未来任何 cold-pool prune)**不再自动删除**。per user 2026-05-07 决定:prune 太危险,即使加 metadata ref-counting 也是错方向。新 UX 是渲染一个 shell 脚本——可执行的 `rm -rf <path>` 行(配 locator + size 注释)+ 注释掉的 `# kept: <path> — referenced by <deck-A>, <deck-B>` 行(扫到但被其他 deck 引用的,暴露"为啥不回收"以便 user sanity-check 边界检测本身)。删 `--yes`、删 interactive confirm。Cold-pool 的 executor 层不暴露 `rmRf` IO,只有 `gitClone` / `gitPull`(executor cannot delete)。
- **Refresh 拆为 discover + apply 两步**:per user 2026-05-07,`deck refresh` 也是高风险——`git pull` 的网络 IO 历史上多次让 E2E 超时/exit。新默认行为是 **discover-only**:`git fetch` + `git rev-list HEAD...@{upstream} --count` 计算 behind 数,只报告不拉取。用户显式 `deck refresh --apply` 才渲染 `git -C <path> pull --ff-only` 行的 heredoc 让用户审计后手工跑。所有 `git pull` 必须带 hard timeout。具体形态参考 `~/.claude/projects/.../memory/feedback_refresh_is_plan_first.md`。
- **`cold-pool reconcile` 命令**:k8s-style 完整收敛——读 desired state(skill-deck.lock + 增加 git_ref 字段) ↔ 扫 actual state(filesystem) ↔ 产 ReconcilePlan ↔ execute。`buildReconcilePlan` 接口已 scaffold,执行未实现。**注意:reconcile 中的"remove orphans"路径同样遵守 heredoc-only 规则,不直接删;"apply updates"路径遵守 refresh 的 apply-script 规则,不直接 pull。**
- **`@lythos/cold-pool` 公开 API 文档 + npm publish**:0.10.0 release 时同步把 cold-pool 推 npm,公开 API 文档化,允许第三方 deck 替代品也消费。
- **curator/arena 进一步迁移**:目前 T10/T11 是 interface-level migration(只迁了 `git clone` / 路径解析)。curator 的 `git remote update` / `rev-list HEAD...@{upstream} --count` / `pull --ff-only` 这些 staleness 策略,未来若被多消费者复用,可以再抽到 cold-pool。**注意 curator 已有 `refresh-plan` / `refresh-execute` 两步分离,正是 deck 该借鉴的形态。**

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
