# ADR-20260507110332805: Refresh defaults to discover-only; --apply renders audit heredoc with hard-timeout git pull lines

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-07 | Created |

## 背景

`packages/lythoskill-deck/src/refresh.ts` 当前的 `deck refresh`:

1. `buildRefreshPlan(deckRaw)` 扫描 deck 声明的 skills,找到对应 cold-pool 路径,识别 `git`/`localhost`/`not-git`/`missing` 类型
2. `executeRefreshPlan(plan, io)` 对每个 git target 调用 `gitPull(dir)`(实际 `git pull`,30 秒 timeout)
3. 默认行为:执行,不询问

`refresh-plan.ts` 与 `prune-plan.ts` 都已经按现有 intent/plan/execute pattern 抽离了 plan 与 execute(参见 `cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md`)。但 execute 默认就走完整 pull 链路。

### 触发链

- 用户 2026-05-07 反馈:"其实 refresh 也是一般。版本一致性检查和发现更新"——指 refresh 本质应该是"发现 + 报告",pull 是 user 决策
- 同日:"这俩(prune+refresh)都是之前 e2e 超时/exit 过的玩意,我有印象的"——`git pull` 在 agent E2E 中的具体失败模式:
  1. SSH/HTTPS auth 提示 hang(私有 repo 无 token)
  2. 网络慢导致 30 秒 timeout 触发,本次 refresh 整体失败,但部分 target 已 pull
  3. 非 fast-forward refusal(上游 force-push 后)
  4. Merge conflict(本地有未 push 的 commit)
- 这些场景在 quick-start E2E 中很难预料,任何一个都可能让 agent 卡死或退出

`refresh` 与 `prune` 是 cold-pool 上**两个 destructive/blocking 操作**。`prune` 的政策已由 `ADR-20260507110332770` 决定(audit heredoc);本 ADR 决定 `refresh` 的对偶政策。

## 决策驱动

1. **网络 IO 不可控**——`git pull` 触发的网络/auth/merge 任何一环都可能 hang 或失败。在 agent E2E 中,这是 quick-start 体验崩溃的主因之一(README 第一行命令就 hang,用户直接走人)
2. **"有 plan 不等于授权执行"**(同 `ADR-20260507110332770` 决策驱动 #2)——`buildRefreshPlan` 输出"哪些 target 是 git repo + 当前 git root";但 `git pull` 的成功还依赖**当前网络可达 + auth 有效 + 上游 history 兼容**这些 plan 没记录的事实。Plan 的存在是必要不充分条件
3. **discover 与 apply 是两个语义阶段**——`git fetch` + `rev-list HEAD...@{upstream} --count` 只读、可 timeout 兜底、信息无破坏性;`git pull` 是写操作。把它们硬绑在一起的唯一理由是"用户懒得跑两次"——但代价是用户失去了**先看再决定**的能力
4. **curator 已有正确 pattern**——`packages/lythoskill-curator/src/cli.ts` 的 `runRefreshPlan` (写 todo 文件) + `runRefreshExecute` (按 todo 执行)就是 discover/apply 分离。deck 没采用是历史遗留,不是设计决策
5. **0.10.0 release window** 允许默认行为变更

## 选项

### 方案 A: 现状(默认 auto-pull,30s timeout) — Rejected
- **优点**: 一条命令搞定,user 体验"快"
- **缺点**: 上述 4 类网络/auth/merge 失败任何一个触发就 hang 或部分成功;部分成功时 cold pool 处于半 update 状态,用户不知道哪些 target 是新版本

### 方案 B: 加 `--dry-run` flag,默认仍 auto-pull — Rejected
保持默认行为,opt-in 用 `--dry-run` 看 plan。

- **优点**: 兼容性好
- **缺点**: dry-run 是 opt-in,意味着默认值还是危险路径——agent 不会主动加 `--dry-run`,user 也容易忘记。Footgun 仍存在

### 方案 C: discover-only by default + `--apply` 渲染审计 heredoc — Selected

`deck refresh`(默认):

1. 对每个声明的 skill,调用 `git fetch` + `git rev-list HEAD...@{upstream} --count`(都带 hard timeout,5 秒 fetch / 2 秒 rev-list)
2. 报告 per-skill behind count + 不可达原因(rate-limit / auth / network)
3. **不 pull,不 merge,纯只读+读元数据**

`deck refresh --apply`(显式 opt-in):

1. 渲染 shell 脚本,内含 `git -C <path> pull --ff-only --no-edit` 行,每行配 locator + behind-count + 当前 ref 注释
2. 用户审计,可注释掉不想 pull 的,执行 `bash refresh-apply.sh`
3. **CLI 自身仍不 pull**,只渲染

- **优点**:
  - 默认安全:`deck refresh` 永不 hang(都带 timeout),永不部分成功(因为根本不 pull)
  - `--apply` 仍提供"批量"价值,但执行权在 user 手里
  - 与 `ADR-20260507110332770` (prune)对偶,UX 一致——destructive/blocking ops 都是 plan-then-audit-then-user-execute
  - 与 curator `runRefreshPlan` + `runRefreshExecute` 同形,跨包统一
- **缺点**:
  - User 多一步——但本来就该如此(refresh 不该是无脑批量 pull)
  - 渲染的 heredoc 自身可能含错误 fact(behind count 已 stale、git root 失效等)——通过 `validate-refresh` companion 兜底(`ADR-20260507110332831`)

### 方案 D: 把 `git pull` 改用 cold-pool 的 `gitPull` 但加 retry/backoff — Rejected

提升 IO 健壮性,不改 UX。

- **优点**: 兼容性最好
- **缺点**: retry 不能解决 auth hang 和 merge conflict;反而把单次失败变多次失败,延长 hang 时间。Doesn't address root cause(默认就不该 pull)

## 决策

**选择**: 方案 C — discover-only by default + `--apply` 渲染审计 heredoc。

**原因**:

1. 把 quick-start E2E 的最大失败源(`git pull` hang)从默认路径移除
2. 与 prune ADR 对偶——cold-pool 上所有 destructive/blocking ops 用同一 UX 模式
3. 沿用 curator 已 validated 的 discover/apply 分离形态
4. plan ≠ license-to-execute 立场一致(per `ADR-20260507110332770` 决策驱动 #2)
5. 0.10.0 窗口允许默认行为变更

## 影响

### 正面
- `deck refresh` 在 agent E2E 中可预测(纯只读 + hard timeout,最多耗 N×5 秒)
- 与 prune、reconcile 共享同一 plan-then-audit UX,跨命令一致
- Cold-pool 的 `gitPull` 仍作为 primitive 存在,但**只被 user 直接 (通过 heredoc) 调用**,不被交互 CLI 自动调用——这是 `ADR-20260507021957847` "executor 的 IO primitives 与 CLI consumption 解耦"的具体案例
- Refresh report 本身是 plan-as-data(`RefreshDiscoveryReport` 之类),可以输出 `--format=json` 给 agent

### 负面
- 现有 `deck refresh` 用户(脚本里写了的)需要改用 `deck refresh --apply`——0.10.0 release notes 标注
- `deck refresh` 不再触发 `linkDeck` 自动 re-link(原 `RefreshIO.linkDeck` callback)——user apply 后需要自己 `deck link`(可在 heredoc 末尾加一行)

### 后续
1. 实施 `deck refresh` 重构:默认 discover-only,`gitPull` IO 调用从 `executeRefreshPlan` 移除
2. 新增 `RefreshDiscoveryReport` 类型和 `--format=json` 输出
3. 新增 `deck refresh --apply` 渲染 heredoc 的代码路径
4. 实施 `deck validate-refresh <heredoc-path>` companion(per `ADR-20260507110332831`)
5. 与 `cold-pool reconcile` 命令的 "apply updates" 路径用同一 heredoc 形态(后续 epic)
6. README + AGENTS.md 更新 `deck refresh` 用法

## 相关
- 关联 ADR:
  - `ADR-20260507014124191` (CLI error as decision tree) — 同 plan-as-data 立场
  - `ADR-20260507021957847` (`@lythos/cold-pool` 包结构) — executor primitives 与 CLI consumption 解耦的具体应用
  - `ADR-20260507110332770` (prune as audit heredoc) — 姊妹决策,同样的 plan-first UX
  - `ADR-20260507110332831` (validate-companion pattern) — heredoc 必须配的 companion 命令
- 关联 Epic: `EPIC-20260507020846020`(本 epic 内识别问题,后续 epic 实施)
- 关联 memory:
  - `feedback_refresh_is_plan_first.md` (实施细节 + curator 参考)
