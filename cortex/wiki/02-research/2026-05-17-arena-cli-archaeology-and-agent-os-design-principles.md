---
created: 2026-05-17
category: research
---

# Arena CLI 考古：从脚手架生成器到 Agent OS 执行层的 ten-stratum 演变

> **研究方法**：git 地层学（stratigraphy）——将 `packages/lythoskill-arena/src/` 的 commit 历史视为沉积层，每层 sediment 下埋着一个具体的故障事件或架构决策。通过 `git log --oneline --all -- packages/lythoskill-arena`、`git blame`、`git show <hash>` 重建演变链条。
>
> **核心发现**：Arena CLI 的形态变化不是功能迭代的自然生长，而是**agent 行为灾难驱动出的防御性架构**。IO 剥离、细粒度 commit、guard 系统、intent/plan/execute 分形——全部指向同一个底层问题：**agent 没有时间感，只有逻辑链；agent 没有发布视角，只有局部可见性；agent 的"正确"不等于项目的"正确"。**

---

## 摘要

本文通过考古学方法追踪 `lythoskill-arena` 包从初始提交（2026-04-23）到 v0.14.1（2026-05-17）的 25 天演变史，识别出十个清晰的"地层"（strata）。每层都由一个具体的 agent 行为故障触发，并通过架构变更或 guard 建立防御。

关键发现：
1. **Intent/Plan/Execute 不是架构美学，是事故后的沉积**——每次 IO 剥离都对应一次裸操作导致的恢复灾难。
2. **细粒度 commit 是 SOP 的日志输出**——不是开发者习惯好，而是 agent 工作流中每个原子操作的自然产物。
3. **Guard 系统是认知盲区的物化**——每个 pre-commit hook 都防止一种"agent 真心觉得对，但项目会崩"的认知模式。
4. **Git 是逻辑链，不是时间线**——agent 没有时间感，但能通过遍历 commit DAG 的因果链来理解一切。
5. **Cortex 是 Agent OS 雏形**——不是"轻量级 Jira"，而是为无时间感、无发布视角、无边界意识的 agent 设计的调度与状态机基础设施。

---

## 一、方法：git 地层学

传统代码考古依赖 `git blame` 追溯单行的最后修改者。但对于理解"为什么代码是现在这个样子"，`git blame` 只是起点。

本项目采用更系统的方法：
- **`git log --oneline --all -- <path>`**：获取文件级的时间线
- **`git show <hash> --stat`** + **`git diff <hash>^..<hash>`**：重建每次变更的完整上下文
- **交叉引用**：commit message → ADR → Task → Wiki，形成决策网络

这种方法有效的前提正是本项目的文化特征：**commit 粒度极细，每个 commit 对应一个有编号的 Task，且 commit message 包含故障描述**。

---

## 二、Arena CLI 的十层演变

### Stratum 0: 原始沉积（Apr 23, `77e1aa9`）

**形态**：`runArena(argv)` — 单一函数 225 行，纯 CLI flag 驱动。

```ts
function runArena(argv: string[]) {
  // 解析参数 → 创建目录 → 生成 deck → 写 arena.json → 写 TASK-arena.md → console.log 下一步指令
}
```

**关键特征**：
- `--task`, `--skills`, `--criteria`, `--control`, `--dir`, `--project`
- **没有自动执行**。它生成的是"静态脚手架"：目录结构、deck 文件、task card，然后**打印 bash 指令让人类去跑**
- 没有 `runner.ts`，没有 `vs`/`single` 区分，没有 plan
- IO 完全内联：`mkdirSync`、`writeFileSync`、`console.log` 全部混在一个函数里

**埋藏的问题**：它只是一个"文件生成器"，不是真正的 runner。Agent 拿到 task card 后，每一步都要手动执行。

---

### Stratum 1: MOO/Pareto 扩张（Apr 24, `a2ff50f`）

**新增**：`--decks` 参数，支持完整 deck 配置对比（vs `--skills` 单 skill 控制变量）。

- single-skill 模式：自动生成 control-variable deck
- full-deck 模式：复制现成 deck 到 arena 目录
- judge persona 开始分模式：single-skill 选 Winner，full-deck 做 Pareto 前沿分析

**但仍然是 monolithic**。CLI 逻辑随着模式分支膨胀。

---

### Stratum 2: 声明式转折（May 4, `666652d` + `3cf6fbe`）

**这是地质断层**——从 CLI flag 风格跳转到声明式配置。

- T1: `arena-toml.ts` 诞生 — Zod schema + minimal TOML parser + `buildExecutionPlan()`
- T4: `runArenaFromToml()` 取代 `runArena()` — `arena.toml` → `buildExecutionPlan` → per-cell spawn

```ts
// 首次出现 intent/plan/execute 结构
const plan = buildExecutionPlan(toml)
if (dryRun) return { plan }  // ← 关键突破：plan 可以独立存在
// ... execute ...
```

**但仍用 `runAgentScenario`**（BDD test infra）。runner.ts 从 cli.ts 分离，但内部仍耦合在 agent-bdd 框架上。

---

### Stratum 3: IO 注入首次落地（May 5, `5b264b5`）

**T5: injectable log + dry-run output tests**

```ts
export async function runArenaFromToml(opts: {
  // ...
  dryRun?: boolean
  log?: (msg: string) => void  // ← IO 注入
})
```

- `formatPlanOutput(plan)` 纯函数
- dry-run 输出可测试：inject `log: capture[]` → diff against expected

**这是 arena 中 intent/plan/execute 的首次完整闭环**。但此时只注入了 `log`，spawn/fs 仍是硬编码。

---

### Stratum 4: Pre-flight 硬化（May 6, `2758ecd`）

**直接触发**：T2 task — "pre-flight deck link verification + output copy hardening"

`preflight.ts` 诞生，**6 个纯函数，41 个测试，100% 覆盖**：
- `parseDeckSkills` — TOML 解析
- `checkSkillExistence` — cold pool 命中/缺失
- `validateLinkResult` — exit code 分析
- `buildCopyPlan` — 文件复制计划（纯数据！）
- `resolveColdPoolDir` — 路径解析
- `formatSkillWarnings` — 警告格式化

diff 显示的关键变化：
```ts
// Before: 裸 IO，错误被吞
for (const entry of readdirSync(agentWorkdir)) {
  if (skipSet.has(entry)) continue
  try { cpSync(src, dest, { recursive: true }) } catch {}  // ← 沉默失败
}

// After: 先 build plan，再 execute，错误被记录
const plan = buildCopyPlan(agentWorkdir, outDir, entries, skipSet)
for (const { src, dest, name } of plan) {
  try { cpSync(src, dest, { recursive: true }) } catch (e) {
    console.warn(`⚠️ Failed to copy agent output: ${name} — ${e.message}`)
  }
}
```

**这是"纯逻辑从 IO 中剥离"的首次大规模实践**。`buildCopyPlan` 是 pure function，可以单测；`cpSync` 是 injected IO，留在 execute 层。

---

### Stratum 5: 隔离修复（May 6, `93cd2f1`）

Agent workdir 从项目树内移到 `/tmp/arena-<id>/`。

> "Before: bare deck showed 9 parent project skills. After: bare deck shows 0 deck skills."

deny-by-default 的物理隔离——如果 workdir 在项目树内，kimi/claude 会向上遍历发现 `.claude/skills/`。

---

### Stratum 6: Judge 解耦（May 14, `08d1815`）

**从 BDD test infra 中解放**。

- `runAgentScenario` → `agent.spawn` 直接调用
- `parseAgentMd` / `AgentScenario` 被移除
- `arena-toml.ts` 增加 `[arena].judge` 字段（自然语言 judge input，不解析）

Commit message 说得很清楚：
> "arena/agent-bdd split — direct agent.spawn, not runAgentScenario. No parseAgentMd, no AgentScenario."

**这意味着 arena 从"测试框架的附属品"变成了独立的执行引擎**。

---

### Stratum 7: Agent-Orchestrated 范式（May 15, `67d1fac`）

**重大范式转变**：SKILL.md 默认不再调用 CLI `single`/`vs`。

> "Agent-orchestrated mode reads arena.toml, prepares per-side isolated environments, spawns parallel subagents, and judges — without invoking the arena CLI at all."

- Player mode (`--player kimi`) 变成 opt-in
- Mermaid 流程图嵌入 SKILL.md 作为视觉约束

**CLI 和 Agent 开始分家**：CLI 是"execute 层"，Agent 是"intent/plan 层"。

---

### Stratum 8: Prompt IoC + tmpdir（May 15, `8b4fc30`）

- `buildArenaPrompt()`：固定契约模板 + `{brief}` 变量注入
- singleRun: `agentWorkdir` 在 `tmpdir()`，artifacts copy 到 `--out`
- kimi adapter 白盒化：parse tool_calls/tool into CheckpointEntry

毕业考试 v5 PASS（125KB docx + radar chart）。

---

### Stratum 9: 子命令提取（May 17, `30d258e`）

**`prepare-workdir` + `archive` 从 `singleRun` 中提取为独立 CLI 子命令**。

Commit message 揭示了这个动作的深层动机：
> "Thin pattern: SKILL.md = control layer (intent/plan), CLI = execute layer (prepare-workdir, archive, single, vs)"

这是**控制反转**：agent-orchestrated 协议不再手动 mkdir/copy/link，而是委托给 CLI 子命令。Agent 和 CLI 之间达成了 black-box parity。

---

### Stratum 10: Plan-First CLI（May 17, `85357c1`）— 当前地表

**prepare-workdir 和 archive 都增加了 `--dry-run` plan-first mode**：

```ts
// prepareWorkdir
const plan = buildPreparePlan({ deckPath, deckContent, workDir, ... })  // pure
console.log('📋 Prepare plan:', ...)
if (dryRun) return  // ← gate
// execute: mkdirSync, writeFileSync, Bun.spawn...
```

```ts
// archiveRun
const plan = buildArchiveSidePlan(fromDir, sides, existsSync)  // pure
console.log('📋 Archive plan:', ...)
if (dryRun) return  // ← gate
// execute: cpSync...
```

- `buildPreparePlan()` 纯函数，14 个新单测
- `buildArchiveSidePlan()` 纯函数
- Control Transfer Protocol wiki：CLI-Agent boundary as interrupt vector table

---

## 三、核心发现

### 发现一：IO 剥离不是"架构美学"，是事故后的防御沉积

看地层记录就很清楚——**这不是一次性的架构重构，而是每次事故后的沉积**：

| 地层 | 触发事件 | 剥离了什么 | 防御什么 |
|------|---------|-----------|---------|
| Stratum 2 | CLI flags 难以维护 | `buildExecutionPlan` | 混乱的参数组合 |
| Stratum 3 | dry-run 无法测试 | `log` 注入 | 不可验证的预览 |
| Stratum 4 | cpSync 沉默失败、link 失败无检查 | `buildCopyPlan`, `validateLinkResult` | 裸 IO 的错误吞噬 |
| Stratum 5 | agent 发现父项目 skills | `tmpdir()` 隔离 | 目录遍历污染 |
| Stratum 6 | BDD infra 限制 judge 灵活性 | `agent.spawn` 直接调用 | 框架耦合 |
| Stratum 9 | agent 手动步骤不可靠 | `prepare-workdir` / `archive` CLI | agent 行为漂移 |
| Stratum 10 | agent 和 CLI 行为不一致 | `buildPreparePlan`, `buildArchiveSidePlan` | black-box 不对称 |

每一次剥离都在回答同一个问题：**"我们怎么知道在产生 side effect 之前，计划是对的？"**

从最早的 `runArena()`（没有 plan，只有 IO），到现在的 `prepare-workdir`（先 `buildPreparePlan`，再 `--dry-run` gate，再 execute），arena CLI 的形态变化本质上是在**代码中建立一个又一个的检查点**——因为在这个项目里，调用 CLI 的 agent 不可信，所以 CLI 必须在自身结构中加入这些 gate。

---

### 发现二：细粒度 commit 是 SOP 的日志输出

传统项目里细粒度 commit 难，因为人类有心理摩擦（"这点改动不值得 commit"、"先攒着"）。Agent 没有这些。在 SOP 约束下，agent 的每次工具调用都是原子操作，commit 只是操作的自然产物。

更关键的是：**commit 不是人类社交行为，是 SOP 的日志输出**。

看 arena 的 commit 模式：
- `feat(arena): T1 arena.toml Zod schema + parser + execution plan generator`
- `feat(arena): T5 injectable log + formatPlanOutput + dry-run output tests`
- `refactor(arena): decouple judge prompt from task invocation`

每次 commit 对应一个有编号的 Task（T1, T5），每个 Task 对应一个纯函数或一个决策。Agent 不会在"做 task A 的途中顺便把 task B 也做了"——SOP 不允许。

这与项目的工作流本质一致：**人类定义 SOP，agent 执行，git 审计**。

---

### 发现三：Guard 系统是 agent 认知盲区的物化

通过 `git log --oneline --all -- .husky/pre-commit` 可以追踪每个 guard 的引入 commit，每个都对应一个真实事故：

| Guard | 引入 commit | 触发事件 | 为什么 agent 会踩 |
|-------|------------|---------|----------------|
| path-safety | `bd7f90e` | P0+P1 path traversal (CWE-22) | Agent 不理解"用户输入的 TOML alias"需要 sanitization |
| private-leak | `f508fb4` | `LYTHOS_SOCKS_PROXY` 值被 commit 进 release body (`b92692a`) | Agent 不理解 `.private/` 是隔离边界 |
| cross-package import | `0d1038e` | 0.11.1 发布后外部消费者崩 | Agent 不理解 npm publish 的 tarball 边界 |
| workspace:* | `8b23d70` | 8 个 package 写 `^0.x.y`，Bun 解析到 stale cache | Agent 不理解 Bun workspace 解析语义 |
| manual cortex mv | `8cc3450` | agent `git mv` 导致 Status History 与目录不一致 | Agent 把 cortex 文件当普通文件 |
| guard-script sensitivity | `d7a6e61` | guard 本身被修改后没 QA，级联失效 | Agent 不理解元层基础设施的级联效应 |

**这些不是"编程错误"，是代理行为错误**。外部 lint 工具（eslint、prettier、tsc）完全无法检测这些问题，因为它们检测的是语法/类型/风格，而不是"代理是否理解了这个特定项目的工作流约定"。

最精妙的是 `check-path-safety.ts` 的"信任声明"机制：

```ts
// If the file imports path-guard, it's aware of the safe pattern — skip checking
if (content.includes("from \"./path-guard.js\"")) {
  return findings;  // empty = pass
}
```

这不是"检测危险模式然后报错"——这是 **"检测你是否声明了你知道安全模式"**。如果文件 import 了 `path-guard.ts`，guard 就**信任你已经 self-certified**。

---

### 发现四：Git 是逻辑链，不是时间线

Agent 没有时间感。不是"记忆力不好"或"上下文窗口有限"，是**根本不存在"过去-现在-未来"的连续体**。

Agent 擅长处理的是逻辑链：
```
A → B → C → D
```

Git 的 DAG 恰好是这种结构：
```
commit A (为什么做 X)
  ↓
commit B (修复 X 导致的 Y)
  ↓
commit C (重构 X 的实现)
  ↓
commit D (当前状态)
```

当 agent 执行 `git log --oneline -5 file.ts` 时，它不是在"回忆时间线"——它在**遍历逻辑链**：

```
08d1815 refactor(arena): decouple judge
5b264b5 feat(arena): T5 injectable log
3cf6fbe feat(arena): T4 declarative reconciler
666652d feat(arena): T1 arena.toml Zod schema
77e1aa9 feat: add lythoskill-arena
```

这条链的每个节点都是：**"因为上一个状态有缺陷 X，所以产生了这个改动 Y"**。agent 不需要知道"5 月 4 日 23:10"这个 timestamp 意味着什么。它只需要理解 T1 → T4 → T5 → decouple 这个**因果顺序**。

这也解释了为什么 cortex 采用链式结构：
- **ADR** = 决策链（问题 → 选项 → 选择 → 原因 → 影响）
- **Epic** = 任务拆解链（目标 → 依赖推理 → 子节点树 → smart task）
- **Task** = 执行链（backlog → in-progress → review → completed）
- **Status History** = 状态转移链（machine-parseable 表，最后一行 = 最新状态）
- **Daily handoff** = 会话链（按日期顺序排列，agent 按序读取恢复上下文）

---

### 发现五：Cortex 是 Agent OS 雏形

`ADR-20260503003315478` 把这个机制推到了完全形态：

| OS 概念 | Cortex 对应 |
|---------|-------------|
| handler / fd / pid | task card id (`TASK-YYYYMMDDHHMMSSnnn`) |
| handler 指向的结构 | task card 文件本身 |
| 进程间传递引用而不是拷贝 | context window 只传 task id，不内联内容 |
| process | subagent 实例 |
| process group / job | epic（一组相关 handler 的 coherent 集合） |
| kernel scheduler | main agent（派发 handler 到 subagent process） |
| bootloader | task body + frontmatter（把 subagent boot 到执行就绪） |
| system config / policy | ADR（决策记录，长期不变） |
| syslog / journal | daily/YYYY-MM-DD.md |
| RAM（易失） | 会话上下文（压缩即丢） |
| persistent storage | cortex/ 目录树（跨会话存活） |

以及 **6502 隐喻**：

> "context window 比起文件系统相当于 6502 寻址空间那样受限"

| 6502 时代 | Agent 时代 |
|-----------|-----------|
| 64KB RAM（寻址空间） | Context window（几十~几百 K tokens） |
| 软盘 / 磁带 / ROM（可达 MB ~ GB） | 文件系统 / cortex/ 目录树（可达 GB ~ TB） |
| Bank switching / paged memory | task card id 作为引用，工具按需读入 |
| 程序员手工管理 working set | Main agent 选择"传 id 还是传内容" |

**关键解锁**：在引用模式下，**task card 引用一个 100MB 的资源也不会炸 CW**，因为 task card 内只放路径/id，subagent 通过工具读取必要切片。这是 agent OS 雏形最具体的工程意义：**CW 受限 ≠ agent 受限**。

这也解释了为什么本 ADR 的所有约束是必要的：
1. **Lane 上限 = 进程调度纪律**（OS 不会同时跑 100 个 active process group）
2. **Task 必须 smart = handler 协议契约**（subagent 拿到 task id 必须能按统一协议解析、执行、回写）
3. **Frontmatter + 外部引用 = handler 设计原则**（OS handler 是不透明小标识，真正的内容按 syscall 按需读）
4. **Context window 只传引用 = 内存效率**（传 task id，subagent 自己 read，这是 OS-level 内存管理）
5. **Trailer + post-commit hook = kernel-level 状态同步**（用户态 commit 发出 syscall trailer，内核 hook 把状态机推进到一致）
6. **lane / checklist 拒绝 = 资源分配 admission control**（OS 里新进程 fork 时 kernel 检查 ulimit / cgroup；cortex 里 epic create 时检查 lane 占用）

---

## 四、与外部实践的收敛

本研究注意到，上述机制并非孤立设计。`ADR-20260503003315478` 的外部验证章节记录了与 Hermes Agent（NousResearch）和 Manus context engineering 的收敛：

- **Hermes 9-layer system prompt 组装**：identity → memory guidance → skills → platform hints → context files → frozen memory，按"稳定→易变"排序。等价于"模板化 AGENTS.md 渲染管道"的 forward-looking 路径。
- **Hermes frozen memory snapshot**：session 启动时固化，中途任何 memory write 不修改 system prompt。解析为 snapshot 概念。
- **Manus KV-cache 三规则**：① 前缀稳定 ② append-only ③ 显式 cache breakpoint。与 references-only 架构天然合拍。

这意味着：**lane / handler / references-only 不是创新，是收敛**——多个独立路径在 agent OS 这个抽象层上汇合到了同一组工程不变量。

---

## 五、结论：Agent OS 的设计原则

从 arena CLI 的考古中，可以提炼出五条设计原则，适用于任何以 agent 为主要执行者的项目：

### 原则 1：把"时间线上的事件流"转换为"逻辑链上的节点图"

Agent 没有时间感，但能通过遍历因果链来理解一切。所有工作产物必须组织成逻辑链：
- commit graph = 代码变更的因果链
- Status History = 状态转移链
- ADR = 决策链
- Task = 执行链

### 原则 2：在产生 side effect 之前必须有一个可 review 的检查点

Agent 的"正确"是局部可见的（"当前能跑通"），项目的"正确"是全局的（"发布后能用"、"安全边界完整"）。Plan 层就是那个检查点——即使 plan 错了，也只是数据错了，没有真实破坏。

### 原则 3：Guard 防的是"你不知道你不知道"

Lint 防"手滑"（语法、类型、风格）。Guard 防"认知盲区"——agent 真心觉得对，但项目会崩。每个 guard 都是一个被编码的教训，必须有具体的触发事件，不能是"最佳实践清单"。

### 原则 4：元层基础设施的修改必须自带 QA 警告

Guard 脚本的 bug 会级联静默失效。当 agent 修改 guard 时，必须强制打印警告并要求负向测试（deliberately break → verify guard catches）。

### 原则 5：CW 是 6502，文件系统是磁盘

Context window 受限 ≠ agent 受限。所有可能膨胀的内容放在文件系统里，通过 id / 路径 / 引用寻址，工具按需读入。这是 agent OS 的工程基础。

---

## 六、相关文件

- `cortex/adr/02-accepted/ADR-20260503222838594-kanban-pull-mode-with-cfd-observability-for-agent-driven-task-management.md`
- `cortex/adr/02-accepted/ADR-20260503003315478-epic-granularity-discipline-one-outcome-per-iteration.md`
- `cortex/adr/01-proposed/ADR-20260504135256566-cortex-init-ships-trailer-driven-hooks-as-the-jira-simulation-deliverable.md`
- `cortex/adr/02-accepted/ADR-20260503003314901-git-coupling-for-cortex-governance-documents-via-commit-trailer.md`
- `cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md`
- `cortex/wiki/02-research/2026-05-13-sunk-cost-fallacy-git-rollback-cheaper-than-patch.md`
- `cortex/wiki/02-research/2026-05-11-git-provenance-over-design-assumption-lesson.md`
- `cortex/wiki/03-lessons/2026-05-17-excessive-self-questioning-as-agent-anti-pattern.md`
- `packages/lythoskill-arena/src/cli.ts`
- `packages/lythoskill-arena/src/runner.ts`
- `packages/lythoskill-arena/src/arena-toml.ts`
- `packages/lythoskill-arena/src/preflight.ts`
- `.husky/pre-commit`
- `.husky/post-commit`
