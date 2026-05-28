# ADR-20260517224131119: Multi-layer project context persistence — agent context architecture by volatility class

**Status**: Accepted
**Date**: 2026-05-17

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-17 | Draft discussion, four-layer context architecture |
| accepted | 2026-05-17 | Accepted via ADR state transition |

## 背景

Agent 跨会话上下文断裂是系统性故障源。表现为三个维度：

1. **Compaction 丢失**：会话过半，CLAUDE.md 还在，但 skill 加载状态、当前任务进度、pitfall 记录全部蒸发。Agent 从中间状态重新推理，产出与前半段矛盾。
2. **多 CLI 漂移**：Claude Code、Codex、Cursor、Kimi、Windsurf 各自有 `CLAUDE.md`、`AGENTS.md`、`.cursor/rules` 的加载约定。同一个人在同一个 repo 用不同工具时，某个 CLI 的 agent 读到的是另一个 CLI 写了一半的上下文——或不读。
3. **知识未沉淀**：每次踩坑后的教训留在 agent 的 session memory 里。下一个 agent 从零开始，重复踩坑。

Mnilax 2026-05 在 30 个代码库上实测证实：单文件 CLAUDE.md 超过 200 行后合规率从 76% 跌到 52%。规则必须是**可测试的祈使句**（"显式暴露冲突"），而非噪音（"小心/多想/真正专注"）。每条规则必须闭合一个**实际观察到的失败模式**——不可凭空添加。

lythoskill 项目自身从 2026-04 至今积累了一套四层上下文体系。这套体系不是设计出来的，是从反复踩坑中长出来的。本文档正式化它的架构，并确认继续演进的方向。

## 决策驱动

1. **Agent session 不是人类 session**。人类能容忍"上下文窗口里的东西慢慢变"。Agent compaction 是突变事件——前一秒全量，后一秒只剩 git-tracked 文件。上下文体系必须假设 compaction 随时发生。
2. **CLAUDE.md 单文件模型不够**。项目不变量（架构、技术栈、发布流程）、会话状态（当前任务、pitfall）、可复用知识（pattern、lesson）——这三类信息有不同的挥发性和消费者。塞进一个文件就是 Mnilax 说的"膨胀到 4000+ token，合规率掉到 30%"。
3. **多 CLI 兼容需要协议层而非 CLI 专属文件**。CLAUDE.md 是 Claude Code 专属。AGENTS.md 是跨 CLI 的协议层。CLAUDE.md 降级为 redirect stub。
4. **Subdirectory AGENTS.md 可行**。Claude Code 支持分层 CLAUDE.md：父目录在 launch 时加载，子目录在按需触碰时加载。我们的 monorepo 不同子包有不同侧重点（arena 的 plan-first 协议 vs cortex 的状态机），包级 AGENTS.md 自然承载。
5. 但**不引入 rules/*.md 的 path-scoped 模式**——首层已经 4 层，再加 path 维度是过度抽象。对于当前的规模（~30 个包），根级 + 少量子包级的 AGENTS.md 足以。

### NES Bank Switching — 项目从一开始就用 OS 内存管理模型理解上下文

AGENTS.md 从早期版本就使用 `## Index (Page Table)` 结构：topic → pointer → full page。这不是巧合——agent 的上下文窗口像 NES 的 64KB 地址空间，远小于需要访问的信息总量。Page Table（Index）就是 MMU：用少量 token 的索引换取对大得多的知识体的按需访问。

这个心智模型贯穿了整个项目的设计：
- **Index (Page Table)**：topic → wiki page / ADR → 按需加载
- **Skill Deck**：声明式工作集 = 驻留集（resident set），undeclared skill = page fault → cold pool
- **CQRS scribe/onboarding**：写端（每次 session 结束的脏页写回）和读端（下个 session 的页面调入）
- **Control Transfer Protocol**：CLI exit = interrupt → agent handler = page fault handler → fix → resume

Mnilax 的 200 行天花板是同一个原理的具体数字：超过 200 行，agent 的"TLB"（翻译后备缓冲，translation lookaside buffer）就开始 miss——规则被模式匹配到但不再被真正理解。我们的四层体系本质上是**把内容按访问频率和挥发性分到不同的"bank"，每个 bank 保持在 agent 可以有效处理的尺寸内**。

## 架构：四层，按挥发性分层

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: AGENTS.md (project-invariant, ~150 lines)         │
│ 技术栈、架构、发布流程、Agent 行为边界、测试 SSOT          │
│ 消费: 每个 session 启动时加载                              │
│ 变更: 架构迁移时手动更新                                    │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: daily/YYYY-MM-DD.md (session-volatile)             │
│ Ground Truth (git HEAD + 版本)、Pitfalls、Next Steps         │
│ 消费: onboarding skill 读取最新日期的                       │
│ 变更: 每次 session 结束时 scribe 覆盖顶部                   │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: memory/ (cross-session, user-scoped)               │
│ 用户偏好、项目 pattern 快捷方式、决策档案                    │
│ 消费: Claude Code 自动注入 system prompt                    │
│ 变更: agent 在用户确认后写入                                │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: cortex/wiki/ (extracted knowledge, permanent)      │
│ Patterns、Lessons、FAQ — 归类、日期戳、交叉引用              │
│ 消费: agent 按需读取（references 模式）                     │
│ 变更: task 完成后提取 wiki，不可覆盖                         │
└─────────────────────────────────────────────────────────────┘
```

### Layer 1: AGENTS.md — project-invariant

**对标 Mnilax 原则**：每条规则闭合一个本项目的实际失败模式。

| 当前 AGENTS.md 内容 | 闭合的失败模式 |
|---------------------|---------------|
| Release & Auth Workflow（不要碰 .git/config/.ssh/.npm-access） | Agent 在 compaction 后试图"fix" git remote，破坏了预配置的 SSH alias |
| Versions move via `bunx bump`, never hand-edit | Agent 用 jq/python 手改版本号，漂移 lockfile |
| Test SSOT: `bun --filter='*' run test` | Agent 运行错误的测试命令，遗漏包 |
| Agent Behavior Boundary: cortex CLI for state changes, never mv | Agent 手 mv cortex 文件，Status History 漂移 |
| Daily handoff: write to `daily/YYYY-MM-DD.md`, not HANDOFF.md | Agent 写到已弃用的路径 |
| CQRS: scribe (write) + onboarding (read) | Agent 同时读写，覆盖最新状态 |

**200 行天花板**：当前 AGENTS.md ~550 行。需要精简到 ~200 行，把详细内容推到 wiki references。原则：AGENTS.md 写"是什么和为什么"，wiki 写"怎么做和案例"。

**Monorepo 子目录 AGENTS.md**：`packages/lythoskill-arena/AGENTS.md` 可以在 agent 进入 arena 子目录时按需加载，承载 plan-first 协议、`prepare-workdir`/`archive` 的 CLI 约定。根 AGENTS.md 只写跨包的通用规则。

### Layer 2: daily/YYYY-MM-DD.md — session-volatile

**闭合的失败模式**：Compaction 后 agent 丢失进度。上一个 agent 在做什么、做到了哪个 commit、踩了什么坑——全部蒸发。

**设计原则**：
- **Top-overwrite**：每次大段产出后覆盖顶部的 Ground Truth。Agent 是 head-read，追加到底部的新真相会被旧真相截断。
- **git_commit 作为 freshness token**：handoff 里的 HEAD hash vs 当前 HEAD → 立即知道 stale 与否。
- **多 Session Handoff 段**：同一天多个 session 时，读最后一个 `## Session Handoff` 段。

### Layer 3: memory/ — cross-session persistent

**闭合的失败模式**：用户对 agent 说"以后别这样做"——下一 session 的 agent 不知道这件事。

Claude Code 的 `~/.claude/projects/.../memory/` 是 user-scoped 的持久存储，自动注入 system prompt。我们用它存储：
- 用户偏好（"不要端到端总结"、"push-first-no-review narrative"）
- 项目 pattern 快捷方式（"deck link 不 respect per-skill mode"）
- 决策档案（前 12 条高频 prior）

**不存储**：代码 convention（读 AGENTS.md）、git 历史（读 git log）、临时任务状态（读 daily）。

### Layer 4: cortex/wiki/ — extracted knowledge

**闭合的失败模式**：同一个坑不同 agent 踩了多次——因为教训留在上一个 agent 的 session 里，没有沉淀到可发现的位置。

**按 category 分类**：
- `01-patterns/`：可复用方案（Shell stdout IoC, Seed Bootstrap, Control Transfer Protocol）
- `02-faq/`：常见问题
- `03-lessons/`：反模式教训（Excessive Self-Questioning, Codex Symlink Snapshot, Feed-Adapter Concept-Stone）
- `04-legacy/`：过时但历史价值

**Skill references 模式**：cortex/wiki 作为 skill 的 reference 层。Skill 的 SKILL.md 写触发条件和决策树（~200 行），复杂背景和案例推送到 wiki（按需加载）。这与 Mnilax 的 "200 行合规率天花板" 一致。

## 与 Mnilax 12 条的映射

| Mnilax 规则 | lythoskill 等价物 | 层级 |
|-------------|-------------------|------|
| 1. 先思后码 | AGENTS.md §Agent Behavior Boundary | L1 |
| 2. 简单至上 | Thin Pattern: 不引入新概念除非必要 | L1 |
| 3. 外科手术 | AGENTS.md "不改 adjacent code" | L1 |
| 4. 目标驱动 | Task 卡的 exit criteria + deliverables | L2 |
| 5. 仅用模型判断 | CLI 硬化: 确定性逻辑不进 SKILL.md | L1+L4 |
| 6. Token 预算 | SKILL.md ~200 lines, AGENTS.md ~150 lines | L1 |
| 7. 暴露冲突 | ADR rejected 选项记录 + wiki lessons | L4 |
| 8. 先读后写 | Onboarding: CLAUDE.md → AGENTS.md → daily → wiki | L1 |
| 9. 测试验证意图 | `buildPreparePlan` / `buildArchiveSidePlan` 纯函数测试 | L1 |
| 10. 检查点 | daily scribe 覆盖 Ground Truth（每 session） | L2 |
| 11. 遵从规范 | Cortex CLI for state changes, never mv | L1 |
| 12. 显式失败 | HATEOAS errors, dormancy tests, probe | L1+L4 |

## 我们的实践：领先于 Mnilax 模板的维度

Mnilax 12 条覆盖了单 agent 在单 session 内的编码行为。我们踩过的坑在此之上多了四个维度——这些在我们的体系里已经有对应的机制：

| 维度 | Mnilax 12 条 | lythoskill 实践 | 对应机制 |
|------|-------------|----------------|---------|
| **知识诅咒** | 无 | Zero-knowledge subagent 测试 | Arena 零知识 E2E: 完全不知情的 subagent 被 spawn 进隔离 workdir,只读 AGENTS.md + skill,验证行为 |
| **Compaction 后失忆** | 无 | 四层体系按挥发性分层 | daily handoff (Layer 2) + memory (Layer 3) + wiki (Layer 4) |
| **SKILL.md 描述有效性** | 无 | A/B variant + subagent trigger 率测试 | Arena cross-deck vs: 同 task,不同 desc → 实测触发率 |
| **Fallback 误触** | 无 | Dormancy 属性测试 | T9 playbook: healthy path grep mirror/proxy/fallback → 必须 0 匹配 |
| **多 CLI 兼容** | 无 | AGENTS.md 协议层 + POSSE 分发 | `deck also_link_to = .agents/skills` → Claude/Codex/Kimi 多 working set |
| **Agent 自主修复** | 隐式 | HATEOAS 错误 + Control Transfer Protocol | CLI exit = interrupt → agent handler → fix → resume |
| **容器式 subagent** | 无 | Agent tool spawn = container，不是外部 RPC | Plan-first: prepare-workdir(dry-run) → agent 审 → execute |
| **Subagent 输出审判** | 无 | Map-reduce judge subagent | Arena cross-deck: 并行 spawn → collect → judge score |

## 决策选项

### 方案 A: 完全替换——Rejected

用 Mnilax 12 条模板替换现有 AGENTS.md。

- **优点**: 极简（~80 行 vs 当前 ~550 行），业界认可
- **缺点**: 丢失所有项目特定规则。Release & Auth Workflow（agent 破坏 git remote 的前科）、Cortex trailer + lane discipline（agent 手 mv 文件造成 probe 漂移）、Compaction-safe doc visibility（agent 在 compaction 后忘记 re-read AGENTS.md）——这些都是本项目实际踩过、Mnilax 模板完全没有覆盖的失败模式。替换 = 把已经闭合的漏洞重新打开。

### 方案 B: 简单追加——Rejected

在现有 AGENTS.md 开头追加 Mnilax 12 条。

- **优点**: 不丢失现有内容
- **缺点**: 直接突破 200 行天花板（当前 550 + 80 = 630 行），合规率会从已经偏低的水平继续下坠。Mnilax 的数据：>200 行后合规率 76% → 52%。追加是反模式。

### 方案 C: 精修现有体系——Selected

保持四层架构 + AGENTS.md 精简到 ~150 行 + 引入子目录 AGENTS.md。用 Mnilax 方法论（闭合实际失败模式、200 行天花板、可测试的祈使句）做审查框架，不照搬内容。

- **优点**: 保留项目特定的失败模式覆盖，同时达到文件大小合规
- **缺点**: 需要一次专门的编辑 session——把 ~400 行内容推到 wiki references
- **Coach 集成**: `lythoskill-coach` skill 引用 Mnilax 原则作为 SKILL.md 审查的 references——200 行天花板、每条规则闭合失败模式、禁用噪音词

### 方案 D: Summary + 融合——Selected（与 C 互补）

在 C 的基础上，新增一个 `AGENTS-SUMMARY.md`（或 wiki entry）作为 Mnilax 12 条与我们实践的对齐文档——不是给 agent 读的，是给人类/新 contributor 理解"为什么我们的体系长这样"的。同时 coach skill 的 references 加入 Mnilax 文章链接作为外部验证源。

- **优点**: 不是神秘主义（"我们就是这么做"），而是有外部参照的理性选择。新人能理解为什么我们既尊重 Mnilax 又不照搬。
- **缺点**: 多一个文档要维护。但这是一个 write-once, read-rarely 的文档。

## 决策

**选择**: 方案 C + D 组合。

1. **AGENTS.md 精简**（目标 ~150 行）：详细内容推送到 wiki references。保留"闭合失败模式的规则"，删除"教程式解释"。
2. **引入子目录 AGENTS.md**：`packages/lythoskill-arena/AGENTS.md`、`packages/lythoskill-project-cortex/AGENTS.md`——承载包级协议（plan-first、状态机、99-done 目录约定）。
3. **Mnilax 方法论作为 coach references**：coach 审查 SKILL.md 时引用 200 行天花板、闭合失败模式、可测试祈使句原则。不照搬 Mnilax 模板内容。
4. **拒绝 CLAUDE.md rules/*.md path-scoped 模式**。当前规模不需要。四层 + 子目录 AGENTS.md 已足够。
5. **新增 AGENTS-SUMMARY.md**（wiki entry）：Mnilax 12 条 ↔ lythoskill 实践的对应表，给人类/new contributor 理解体系设计理由。

**有意不做的**：
- 不接受 Mnilax 模板的直接替换。我们的 AGENTS.md 是从自己的生产环境长出来的——"Release & Auth Workflow"、"Cortex trailer + lane discipline"、"CQRS scribe/onboarding"、"Compaction-safe doc visibility"、"Agent Behavior Boundary"——这些都是 Mnilax 模板没有而我们必需的。
- 不引入 CLAUDE.md 以外的 CLI 专属文件作为 SSOT。AGENTS.md 是协议层，CLAUDE.md 是 redirect stub。其他 CLI 通过 `deck also_link_to` POSSE 分发。

## 影响

- **正面**: 四层体系的架构原理正式化，不再是"我们就是这么做的"而是有明确的 why。与 Mnilax 12 条的映射证明我们的体系不是闭门造车。
- **正面**: 子目录 AGENTS.md 为 monorepo 包级差异化提供了自然载体。
- **负面**: AGENTS.md 精简需要把 ~400 行推到 wiki——需要一次专门的编辑 session。
- **后续**: 
  - ADR accept 后创建 epic: AGENTS.md 精简到 ~150 行 + 引入子目录 AGENTS.md
  - AGENTS.md 作为 skill-creator init 的模板参考

## 相关

- ADR-20260424125637347: 每日手写文件 (daily handoff)
- ADR-20260515204135649: Agent self-healing via clear error context (3-part template)
- Mnilax: "I tested the Karpathy CLAUDE.md template against 30 codebases — then added 8 rules" (X: @Mnilax/status/2053116311132155938)
- wiki: 2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table
- wiki: 2026-05-09-dormancy-property-test-for-fallback-hints
- wiki: 2026-05-17-excessive-self-questioning-as-agent-anti-pattern

