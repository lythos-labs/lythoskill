# ADR-20260507110332831: Validate-companion pattern: every agent-produced state summary ships with a paired one-click reality-check command

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-07 | Created |

## 背景

`ADR-20260507110332770` (prune as audit heredoc) 与 `ADR-20260507110332805` (refresh discover-then-apply) 都把 destructive/blocking 操作降级为"agent 渲染脚本 → user 审计 → user 执行"。两份 ADR 都隐含一个共同问题:**渲染时刻的事实可能在 user 执行时刻已经 stale**。

例子:
- `deck prune` 在 11:00 渲染脚本说"`/cold/foo/abandoned` 未被任何 deck 引用,可删";11:05 user 还没看,另一个 workspace 把它 link 进了自己的 deck。User 11:10 才执行,这时删掉就误删
- `deck refresh --apply` 在 11:00 渲染脚本说"skill-X behind=3,可 fast-forward pull";11:03 上游 force-push 了,FF 失败但 plan 不知道;user 执行后 N-1 个 pull 成功 1 个失败,cold pool 处于半 update 状态

User 2026-05-07 反馈:
- "如果搞错了状态,非常容易错上加错"
- "所以如果事实错误,是灾难引入器"
- "也就是说,产生一份审计报告和一键可 validate 的入口方便用户确认...是很重要的"

并补:"之前 probe 其实就是在协调,因为至少'当前状态是啥样,是否有内在不一致,测试是否都通过'——这种可以反复执行验证的部分存在"——指 `cortex probe` 命令早已是该 pattern 的引用实例,只是没显化为通用 pattern。

### 适用范围:不只 prune/refresh

凡是 agent 产出的、要被后续 actor(user 或下一个 agent)consume 的 state summary,都受同一约束:

- 渲染时的 fact 可能与 consume 时的 fact diverge
- diverge 时,consume action 基于 stale fact,后果不可逆/难修复
- agent 不能假设"我刚渲染所以一定 fresh"——尤其在 multi-agent / multi-workspace 场景

具体艺术品清单:
- prune heredoc / refresh heredoc(本 epic 衍生)
- scribe daily handoff(`daily/YYYY-MM-DD.md` 顶部 ground truth)
- scribe-weekly summary(后续 skill,见 `~/.claude/projects/.../memory/project_weekly_summary_format.md`)
- 任何 `--format=json` 输出被 CI 或下游 agent 消费

## 决策驱动

1. **渲染时刻 ≠ consume 时刻**——cold pool / git remote / cortex 状态都是 mutable shared resources,任何"扫描后 → 行动前"的窗口都允许 drift
2. **错误 fact 不是 bug,是 pattern**——传统 fix 思路是"渲染更频繁"或"action 时再次扫描",但前者增加成本不解决问题,后者把 audit 步骤偷偷藏进 action(user 失去 review 机会)。**Pattern 是把 reality-check 外化为 user 一键命令**
3. **`cortex probe` 已经有了**——`packages/lythoskill-project-cortex/src/cli.ts probe` 命令读 cortex Status History,与 directory placement 比对,报不一致。结构与所有未来 validate-companion 命令同形:**read claim → query reality → diff**
4. **plan/execute pattern 的自然延伸**——validate IS plan-with-derivation-step-swapped(claim 替换为 check-against-reality)。Plan layer 已经定义了所有 facts;validate 只是改用不同 reducer
5. **Cost-asymmetric**——validate 是只读 + 快速(seconds);如果 validate 报红,user 重新生成 summary 即可,边际成本最低。如果不做 validate,基于 stale fact 的 destructive action 边际成本极高

## 选项

### 方案 A: 不做 validate-companion,依赖 user 自己 sanity-check — Rejected
- **优点**: 不增加 CLI 表面
- **缺点**:
  - User 不会逐项手动验证(audit fatigue)
  - 即使想验证也没有标准入口——user 不知道"具体要查哪些 fact",summary 里隐含很多 belief
  - `cortex probe` 已存在,证明这个 pattern 是有需求的,只是当时没显化为通用约定

### 方案 B: 在 summary 渲染时附 `--strict` flag,自动 validate-then-render — Rejected
- **优点**: 默认就 fresh
- **缺点**:
  - 把 validate 偷偷藏进 render——user 仍没机会"在执行前看一眼是否仍 fresh"
  - 解决不了"渲染后 → 执行前"的 drift 窗口
  - 方案不可组合(每种 summary 要在自己 render 路径里嵌入 validate,违反单一职责)

### 方案 C: 每种 summary 配独立的 `validate-X` 命令,user 在 act 前手动 invoke — Selected

每种 agent-produced state summary,在同一 CLI 表面下提供 `validate-X` companion:

| Summary 类型 | Companion 命令 | 验证内容 |
|------------|---------------|---------|
| Prune heredoc (`prune.sh`) | `deck validate-prune <path>` | 每个 rm 路径仍存在 / 每个 `# kept` 注释里的 deck 仍引用 |
| Refresh heredoc (`refresh-apply.sh`) | `deck validate-refresh <path>` | 每个 path 仍是 git repo / behind-count 仍准确 / upstream 未 force-push |
| Scribe daily handoff (`daily/YYYY-MM-DD.md`) | `scribe verify` | git_commit 匹配 / cortex probe 通过 / 列出的 in-progress task 状态对 |
| Scribe-weekly summary (`weekly/YYYY-Wxx.md`) | `scribe-weekly verify <path>` | 列出的 epic 状态匹配当前 cortex / 列出的 ADR 仍存在 |
| Cortex 自身 | `cortex probe`(已实现,引用实例) | dir 与 Status History 一致 / lane WIP 不超 / ADR-Epic 耦合 |

每个 companion 都是只读 + 快速 + 可重复。User 工作流:`agent 渲染 summary → user 跑 validate-X → 绿灯则 act,红灯则让 agent 重新渲染`。

- **优点**:
  - User 在 act 前有显式的 reality-check 步骤
  - 实现可独立 ship,每种 summary 独立演化
  - 与 plan/execute pattern 自洽(validate IS plan-with-different-reducer)
  - `cortex probe` 已 validated 该形态可行
- **缺点**:
  - User 多一步——但本来就该如此(consume stale fact 的代价远高于多一步检查)
  - 每种 summary 需要单独实现 validate-X——分摊到各自的 ADR + epic 中,增量推进

### 方案 D: 提供通用 `lytho validate <type> <path>` 入口,内部 dispatch — Considered, deferred

提供单一 entry point,根据 type 路由到不同 validator。

- **优点**: User 只记一个命令
- **缺点**:
  - 当前 4 类 summary 分布在 deck/scribe/scribe-weekly/cortex 多个 skill,没有共用的 root binary
  - 提早抽象——只有 4 类 validator 时,每个独立的 `deck validate-X` / `scribe verify` 心智成本更低
  - 推迟到有 7+ 类 validator 后再考虑

## 决策

**选择**: 方案 C — 每种 summary 配独立的 `validate-X` companion。

**原因**:

1. `cortex probe` 已经是该 pattern 的引用实施,可直接镜像
2. 与 plan/execute pattern 的"plan as pure-data + IO 注入"立场自洽——validate 只是注入"check-against-reality" reducer
3. 增量可推进:每个相关 ADR(prune/refresh/scribe/scribe-weekly)落地时同步实现自己的 validate-X
4. 不引入跨 skill 的依赖耦合

## 影响

### 正面
- "agent 状态摘要 → user 行动"这条链路有显式安全检查点,不再依赖 user 自觉
- 每种 summary 的 validate-X 成本低(共享 plan/execute pattern,只换 reducer)
- pattern 通用化后,未来任何新 summary 类(reconcile plan、release plan、benchmark report 等)都自带"必须配 validate"的设计纪律
- 与"manager 直接管理"立场对齐(`ADR-20260507021957847`)——agent 不替 user 决策,只为 user 提供决策所需的 fact 检验工具

### 负面
- 每个相关 epic 的 scope 多一个 validate-X 子任务——但这是必要纪律
- User 学习曲线:多记 N 个 validate-X 命令——通过 README + AGENTS.md 集中介绍化解

### 后续
1. `deck validate-prune` 实施(随 prune heredoc 重构,per `ADR-20260507110332770`)
2. `deck validate-refresh` 实施(随 refresh discover-then-apply 重构,per `ADR-20260507110332805`)
3. `scribe verify` 实施——把 `lythoskill-project-onboarding` 的 Layer 3 Ground Truth Verification 抽出独立命令(后续 epic)
4. `scribe-weekly verify` 实施——伴随 `lythoskill-project-scribe-weekly` 新 skill(后续 epic,per `~/.claude/projects/.../memory/project_weekly_summary_format.md`)
5. `cold-pool reconcile`、release plan 等未来命令都遵循本 pattern
6. AGENTS.md 增加"State summaries must ship with a validate-X companion"通用约束
7. 若未来有 7+ 类 validator,考虑方案 D 的统一 dispatch entry

## 相关
- 关联 ADR:
  - `ADR-20260507014124191` (CLI error as ValidationReport) — plan-as-data 思路的同向决策
  - `ADR-20260507021957847` (`@lythos/cold-pool` resource holder) — manager 不替 user 决策的同立场
  - `ADR-20260507110332770` (prune as audit heredoc) — 直接消费 validate-companion 的姊妹决策
  - `ADR-20260507110332805` (refresh discover-then-apply) — 同上
- 关联 Epic: `EPIC-20260507020846020`(本 epic 识别 pattern,实施在后续 epic 分摊)
- 关联 Wiki:
  - `cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md` (validate IS plan-with-different-reducer 的来源)
- 关联 memory:
  - `feedback_validate_companion_pattern.md` (含具体艺术品清单 + cortex probe 引用实例细节)
