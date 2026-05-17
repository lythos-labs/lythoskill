---
lane: main
checklist_completed: false
checklist_skipped_reason: agent execution, checklist verified verbally
---
# EPIC-20260503234346583: Verification coverage for deck — TDD unit + Agent BDD (leetcode-shape + LLM judge)

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> 给 `lythoskill-deck` 补**两侧验证**:white-box 单测覆盖率 80%(TDD vertical-slice),black-box leetcode-shape Agent BDD(结构化产物 + LLM judge)。

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-03 | Created — ADR-20260503180000000 accepted, framework = bun:test |
| active | 2026-05-04 | Scope expanded: 加入 Agent BDD 侧(`*.agent.md` via `bdd-runner.ts` 扩展 + 结构化产物 + LLM judge);标题 "unit test coverage" → "verification coverage" |
| active | 2026-05-04 | T7-T9 task cards created via cortex CLI(`TASK-20260504004947351` / `004954526` / `005000534`);依赖链 T7 → T8 → T9 |
| done | 2026-05-04 | Done |

## 背景故事

deck 行为的"做对没做对"是**两侧问题**,本 epic 同时覆盖:

### 第一侧:white-box 单测(原范围)

`lythoskill-deck` 目前 **0 unit test**。21 个 CLI BDD 场景覆盖的是集成链路(spawnSync + 文件断言),无法定位具体模块的回归问题。随着 deck CRUD 重构完成(alias、refresh、remove、prune),核心 reconciler 逻辑已经稳定,是时候用 **TDD red-green-refactor** 的方式补 unit 层保险。

### 第二侧:black-box Agent BDD(2026-05-04 加入)

unit test 验证**模块对**,但不验证**agent 读 SKILL.md 之后会不会触发对的命令、产生对的副作用**。这一层是 Agent BDD 的责任,SCENARIOS.md 已经定义为第三档(`*.agent.md` + LLM in-loop verification),但 deck 包**目前 0 个 Agent BDD scenario**。

这一侧的 mental model 是 **"leetcode-shape 工作成果检查"**:

| LeetCode | Agent BDD |
|---|---|
| 题面 | SKILL.md + scenario brief |
| 提交物 | agent 的 CLI 行动 + 文件树副作用 + **结构化产物(JSON/JSONL metadata)** |
| 验证 substrate | hidden test cases(脚本化,因为输出形态死的) | **结构化产物 + 文件树状态**(因为输出形态是语义的) |
| 判决 | AC/WA(脚本) | LLM judge(读 brief + 产物 + fs state) |

**关键不能照抄的那一格**:LeetCode 的 judge 能脚本化,是因为代码题输出形态是定义死的(整数、数组、字符串相等);Agent 完成 "`deck add` 应该新增一个 cold pool 软链" 这类任务时,**输出形态本身是语义的**——文件名/绝对路径/stdout 措辞每次都不一样,只有"语义上做对了"才是要判的事。所以 judge 那一格必须是 LLM。

**但**:为了检查方便、可 replay、可 debug,agent 在做事时仍然要像 arena 那样**输出必要产物作为 JSON/JSONL metadata**(arena 的 `runs/run-A.md` + 评分 JSONL 是范本)。LLM judge 读的是 substrate=结构化产物+fs state,不是裸眼看 stdout。

详见 wiki/lessons: `2026-05-04-agent-verification-leetcode-shape-llm-judge.md`。

### 共同纪律

- **Vertical slices only** — 一个公共接口行为 → 一个测试/scenario → 验证通过 → 下一个。禁止水平切片(禁止一次性写 10 个再写实现)。
- **Public interface only** — 测试通过导出函数 / CLI 表面验证行为,不测试私有实现细节。
- **Tracer bullet first** — 单测侧:第一个测试必须证明 "bun:test + tmpdir sandbox" 端到端跑得通;Agent BDD 侧:第一个 `*.agent.md` scenario 必须证明 "`runClaudeAgent` helper 能拉起 `claude -p` 并产出可解析的产物"端到端跑得通。
- **No speculative tests** — 不写"未来可能用到"的测试。
- **Reuse existing infra, do not parallel-world** — Agent BDD 必须扩 `packages/lythoskill-test-utils/src/bdd-runner.ts`(加 `runClaudeAgent` helper),**不**新建 bash 平行世界(参见 ADR-20260503230522270 reject 教训)。

## 需求树（Workflowy zoom-in）

> Epic 不是 todo list。下面是可逐级展开的层级大纲，每个叶子节点是一个可验证的行为。
>
> **主题 A/B/C 属于 white-box 侧**(单元测试 / `bun:test`);**主题 D 属于 black-box 侧**(Agent BDD / `*.agent.md` + `bdd-runner.ts`)。两侧合计构成本 epic 的 "verification coverage"。

### 主题 A：Tracer bullet — 证明测试路径可行 #backlog
- **触发**: 0 → 1 的第一个测试必须验证 "bun:test 能跑、能断言、能过"
- **需求**:
  - `findDeckToml(cwd)` → 找到/找不到 `skill-deck.toml`
  - `expandHome(path, base)` → `~/` 展开、相对路径 resolve
  - `findSource(name, coldPool, projectDir)` → FQ 路径命中 / 未命中
- **实现**: 纯函数，零 mock，输入 → 输出断言
- **产出**: `src/link.test.ts`（ tracer bullet 阶段，3 个纯函数用例）
- **验证**: `bun test packages/lythoskill-deck/src/link.test.ts` 全绿

### 主题 B：Reconciler 核心链路 — `linkDeck()` #backlog
- **触发**: deck 的心脏逻辑，直接操作文件系统，最需要回归保险
- **需求**:
  - Empty deck → 创建 working set 目录 + `skill-deck.lock`
  - Declared skill + cold pool 存在 → working set 中出现正确 symlink
  - Undeclared skill 留在 working set → 被清理（deny-by-default）
  - Alias collision（同名冲突）→ 按 schema 处理（抛错或覆盖）
  - `max_cards` 超限 → 拒绝或警告
- **实现**: tmpdir sandbox + 模拟 cold pool + 模拟 `SKILL.md`
- **产出**: `src/link.test.ts` 持续追加 reconciler 用例
- **验证**: sandbox 可复现，不依赖真实 `~/.agents/skill-repos`

### 主题 C：命令层公共接口 #backlog
- **触发**: CLI 背后每个 `export function` 都是公共接口
- **需求**:
  - `validateDeck()` → schema error / valid
  - `addSkill()` → deck.toml 更新 + cold pool 下载 + symlink
  - `removeSkill()` → deck.toml 清理 + symlink 删除
  - `refreshDeck()` → 更新已声明 skill
  - `pruneDeck()` → GC 未引用冷池仓库
- **实现**: 按 vertical slice，一个命令一组测试，happy path + 至少一个 error path
- **产出**: `src/validate.test.ts`, `src/add.test.ts`, `src/remove.test.ts`...
- **验证**: `bun test --coverage` 显示 deck 包覆盖率达到 80%

### 主题 D:Agent BDD — leetcode-shape + checkpoint 产物 + LLM judge #backlog

- **触发**: unit test 验证模块对,但**不验证 agent 读 `@lythos/skill-deck` SKILL.md 后会不会触发对的 CLI、产生对的语义副作用**。SCENARIOS.md "Agent BDD" 段已规定 `*.agent.md` + LLM in-loop verification,deck 包目前 **0 个 Agent BDD scenario**。
- **需求**:
  - **D1: `runClaudeAgent` helper** — 扩 `packages/lythoskill-test-utils/src/bdd-runner.ts`,加 `runClaudeAgent(cwd, brief): Promise<{stdout, stderr, code, artifacts}>`,内部用 `Bun.$` / `Bun.spawn` 拉 `claude -p --dangerously-skip-permissions`,工作目录传 cwd
  - **D2: Checkpoint 产物约定** — agent 在做事过程中按 arena `runs/run-A.md` 范本输出 JSONL 到 `<cwd>/_checkpoints/*.jsonl`,字段含 `step`, `tool`, `args`, `exit_code`, `fs_mutations[]`, `final_state` —— **agent 自陈"我做完了 / 位置在 / 你看"**,不是冷数据,是定位+邀请验证
  - **D3: LLM judge** — judge step 读 brief + checkpoint JSONL + 实际 fs state(用 `runCli` 跑 `ls`/`cat` 等),输出 pass/fail + 解释。可以是同一 agent 的不同 mode(参见 arena `agent-autonomous-arena.md` "Judge = Agent, Agent = Judge")
  - **D4: 第一个 scenario** — `packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md`,场景:agent 拿到一个空项目,被要求"声明 X skill 进 deck",验证 deck.toml 被对应修改 + symlink 创建 + checkpoint JSONL 产生
- **实现**: 不引入 Cucumber / 任何成熟 BDD(SCENARIOS.md 段首明文 "LLMs read Given/When/Then natively");**严禁新建 bash 平行世界**(参见 ADR-20260503230522270 reject 教训)
- **产出**:
  - `packages/lythoskill-test-utils/src/bdd-runner.ts` 新增 `runClaudeAgent` helper(~30 LoC)
  - `packages/lythoskill-deck/test/scenarios/*.agent.md`(至少 1 个 scenario,后续可扩 add/refresh/remove/prune 一一对应)
  - `packages/lythoskill-test-utils/SCENARIOS.md` "Agent BDD — empty today" 段更新计数
- **验证**:
  - 本地 agent session 跑 `runClaudeAgent` 能复现 scenario,judge 能产 pass/fail
  - **不进 CI**(CI 无 LLM,SCENARIOS.md 已说明)
  - Checkpoint JSONL 可被人 review,可被另一 LLM judge 复算 → 满足"可视化 + 可 review"

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260503180000000 | Unit Test Framework Selection — bun:test | ✅ Accepted |
| ADR-20260503230522270 | LeetCode-style Agent BDD harness with tmpdir sandbox | ❌ Rejected(2026-05-04) — 反例:把 leetcode 范式抄成 bash judge + playground/ 目录,绕过既有 `@lythos/test-utils` 约定。**主题 D 是它的正确替代**(扩 bdd-runner.ts + 走既有 scenarios 目录 + LLM judge)|

## 关联任务（SMART — 一批 commit 一个 task）

### White-box 侧(单测,T1-T6,已入 backlog)

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260503235008935 | backlog | **Tracer bullet + 纯函数层**: `findDeckToml` / `expandHome` / `findSource` 测试（3 个纯函数，1 个 test file，1 批 commit） |
| TASK-20260503235009959 | backlog | **Reconciler 核心 A**: `linkDeck()` empty deck & symlink creation（tmpdir sandbox，2 个行为，1 批 commit） |
| TASK-20260503235011219 | backlog | **Reconciler 核心 B**: `linkDeck()` deny-by-default & alias collision（边界行为，2 个行为，1 批 commit） |
| TASK-20260503235012454 | backlog | **命令层 A**: `validateDeck()` + `addSkill()` 测试（2 个命令，1 批 commit） |
| TASK-20260503235013705 | backlog | **命令层 B**: `removeSkill()` + `refreshDeck()` + `pruneDeck()` 测试（3 个命令，1 批 commit） |
| TASK-20260503235014489 | backlog | **Coverage sweep**: 补遗漏边界 case，覆盖率推至 80%（1 批 commit） |
| TASK-20260504012457126 | backlog | **`refresh` monorepo git root 修复**: `refresh` 未向上回溯 git 根，导致 monorepo skill 全部报 `Not a git repository`；修复后 `git pull` 应在 monorepo 根执行（1 批 commit） |

### Black-box 侧(Agent BDD,T7-T9,已用 cortex CLI 创建 2026-05-04)

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260504004947351 | backlog | **`runClaudeAgent` helper + checkpoint 约定**: 扩 `bdd-runner.ts`,Bun.spawn 拉 `claude -p`,定义 `_checkpoints/*.jsonl` 字段 schema(1 批 commit) |
| TASK-20260504004954526 | backlog | **第一个 `*.agent.md` scenario(`skills-introspection`)**: tracer bullet of D 侧,验证 helper + checkpoint + LLM judge 端到端可跑(1 批 commit);依赖 T7 |
| TASK-20260504005000534 | backlog | **Add/refresh/remove/prune Agent BDD scenarios**: 4 个命令一一对应 4 个 `.agent.md` scenario(1 批 commit 或拆 4 批);依赖 T7+T8 |

> 依赖链:T7 → T8 → T9。每张卡 frontmatter 的"关联引用"段含 reverse-link 表(epic / 反例 ADR / wiki/lessons / SCENARIOS.md / 现存范本),per ADR-20260503003315478 "task = subagent bootloader" 规约,subagent 零上下文也能 boot。

## 经验沉淀

- 2026-05-04 wiki/lessons: [`2026-05-04-agent-verification-leetcode-shape-llm-judge.md`](../../wiki/03-lessons/2026-05-04-agent-verification-leetcode-shape-llm-judge.md) — Agent verification 三层模型(pattern / substrate / judge)与 ADR-20260503230522270 reject 教训。

## 归档条件
- [ ] 所有关联 task(T1-T9)完成
- [ ] **White-box**: `bun test --coverage` 显示 deck 包覆盖率 ≥ 80%
- [ ] **White-box**: 每个测试都通过公共接口，不耦合实现细节
- [ ] **White-box**: TDD vertical slice 节奏被记录（哪些行为先测、为什么）
- [ ] **Black-box**: deck 包至少 1 个 `*.agent.md` scenario 在本地 LLM-in-loop session 跑通
- [ ] **Black-box**: `bdd-runner.ts` `runClaudeAgent` helper + checkpoint JSONL schema 落地
- [ ] **Black-box**: SCENARIOS.md "Agent BDD" 段更新计数(从 0 → ≥1)
- [ ] **Black-box**: 至少 1 个 subagent / 第二 agent session 用 helper 跑通 scenario,验证 helper 不依赖单 session 状态(对照回路验证)
