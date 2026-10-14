---
supersedes: []
superseded_by: null
# 下面两项是与 task / epic 的机器可读关联(与 ## Related 段同一件事的两份)
epic: null
tasks: []
---

# ADR-20261014181605217: player adapter: thin CLI wrappers plus protocol as preferred path, no single ecosystem lock-in

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-10-14 | Created |

## Background
player adapter 层（`lythoskill-agent-adapter` + 各玩家适配器）把 kimi/codex/claude/deepseek 的 CLI 包成薄 wrapper，把 arena 的 brief/input 映射成各 CLI 调用。这是「open registration」的最小表面（ADR-20260910113131220），但它不是护城河——护城河是 skills + governance（deck/cortex/ZK review）。

维护成本是真实的：CLI 在沉浮——kimi-cli 2.1.1 让 arena 的 `--player kimi` 协议不匹配直接报废（2026-10-14 实测）；kimi 默认形态变成了 kimi-code；deepseek 自己出了 harness。owner 2026-10-14 反思：与其自己薄封装，不如委托给某个生态总包。

本 ADR 定的是「player 层自己维护 vs 协议化 vs 投靠生态总包」的取舍，不是 arena 编排层（那层是另一个问题）。

## Decision Drivers
- ADR-20260910113131220 已定死：player axis 是 open registration（行为开放注册），CLI-layout 是 closed（sourced data），两轴永不合并。任何总包如果自带写死的 player 集合，就违背这条。
- adapter 是管道不是护城河：它的价值是「能接哪些玩家」，不是「怎么包装」——包装本身是可外包的维护。
- CLI 沉浮（kimi→kimi-code、deepseek harness）→ 不能锁死在一个 vendor。
- 自建薄 wrapper 的真实成本 = 每次 CLI 漂移都要回来修映射（本 session 已付一次）。

## Options

### Option A：继续自建薄 CLI wrapper（status quo）

**Pros**:
- open registration 最彻底——任何 CLI 都能加，无锁死。
- 表面最小，无依赖层。

**Cons**:
- 映射维护归自己：CLI 一漂移就报废（kimi 2026-10-14）。
- 每个玩家的「mapping 成合适 input」的差异（flags/streaming/retry）都要自己跟。

### Option B：协议（A2A/MCP）优先，薄 wrapper 保留为兜底

**Pros**:
- 把「mapping」委托给 vendor 自己维护（他们实现自己的 A2A/MCP server）。
- 仍保住 open registration——任何实现协议的 vendor 都能接入。
- 薄 wrapper 保留 = 协议没覆盖的玩家仍可接，不完全锁死。

**Cons**:
- 协议对各玩家的覆盖率参差，A2A/MCP 在这些具体 CLI 上的成熟度需调研。
- 双路径（协议 + 薄 wrapper）增加一层。

### Option C：投靠单一生态总包（如 deepseek harness 生态 agent team）

**Pros**:
- 维护最省心（turnkey）。

**Cons**:
- 锁死：CLI 沉浮下赌单 vendor，违背 ADR-20260910113131220 的 open registration。
- 可能要求把 skill/context 也塞进它的格式——抢护城河。

## Decision
**Choice**: 方案 B — 协议（A2A/MCP）在覆盖处优先，薄 CLI wrapper 保留为 open-registration 兜底；不投靠单一生态总包。

**Rationale**:
1. 保住 open registration（ADR-20260910113131220 是硬约束，方案 C 违背它）。
2. 把「mapping 维护」在协议覆盖处甩给 vendor——本 session 已证明自建薄 wrapper 的漂移成本是真实且会复发的。
3. 不完全锁死：薄 wrapper 留在原地当兜底，CLI 沉浮时谁没被协议覆盖就继续走薄 wrapper。
4. 护城河（skills + governance）不动——总包最危险的地方是它可能想接管 skill/context 层。

## Impact
- Positive: 映射维护在协议覆盖处甩给 vendor；open registration 保留；与 ADR-20260910113131220 一致。
- Negative: 双路径（协议 + 薄 wrapper）；A2A/MCP 对 kimi/codex/claude/deepseek 的覆盖需逐个核实，未覆盖的仍走薄 wrapper。
- Follow-up:
  - [ ] 调研 A2A/MCP 对四个玩家（kimi/codex/claude/deepseek）的覆盖现状与成熟度，产出「谁走协议、谁走薄 wrapper」的清单
  - [ ] 对一个覆盖最成熟的玩家 spike 协议路径（跑通 arena 一个 brief 端到端）


## Related
- Related ADR: ADR-20260910113131220（player axis open registration / CLI-layout closed，两轴不合并）
- Related ADR: ADR-20260506214000000（agent-adapter 独立插件库——本 ADR 定的是这一层接下来怎么演化）
- Related Epic:
