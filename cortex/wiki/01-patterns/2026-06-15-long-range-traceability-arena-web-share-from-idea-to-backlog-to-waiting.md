---
created: 2026-06-15
updated: 2026-06-15
category: pattern
---

# 长程可追溯性：从想法到 Backlog 到等待

> 一个想法从出现到实现可能跨越数周甚至数月，但项目的可追溯性基础设施（daily → task → ADR → git commit）让这段延迟本身成为可审计、可理解的历史。

## Context

为什么有些项目"似乎忘记了"某些想法？为什么有些功能"一直在说但一直没做"？

在缺乏可追溯性基础设施的项目里，这些问题的答案是"不知道"——想法消失在 Slack 消息或会议记录里，无法重建决策链。

在有 daily/task/ADR/git 四层载体的项目里，答案是"可以追溯"：
- 想法什么时候出现的？→ daily 记录
- 什么时候被具体化为 task？→ cortex task
- 为什么被推迟？→ ADR 或 epic 的决策记录
- 现在的状态是什么？→ git log + cortex probe

## Details

### 案例：Arena Web Share

**时间线**（从想法到当前状态，完整可追溯）：

| 日期 | 事件 | 载体 | 状态 |
|------|------|------|------|
| 2026-05-05 | "Arena 可视化 web app（TCG 卡组展示 + battle report + 分享）" 作为下一步出现 | [daily/2026-05-05.md](../../daily/2026-05-05.md) | 想法 |
| 2026-05-13 | 具体化为 task：HTML report parity + radar chart + OG card | [daily/2026-05-13.md](../../daily/2026-05-13.md) + TASK-20260513042407452 | Backlog |
| 2026-05-18 | ADR 接受：Agent BDD 的 reproduce.sh 模式确立，明确"人类可读但不完全可执行" | [ADR-20260518024500631](../../adr/02-accepted/ADR-20260518024500631-evolve-agent-bdd-from-agent-md-parseagentmd-to-reproduce-sh-pattern-self-executable-judge-separated-agent-native.md) | 架构约束 |
| 2026-06-15 | 仍在 backlog，因为"基础设施还没稳" | 当前 session 对话 | 等待 |

**这不是"忘记了"，而是"有意识的等待"**。

### 为什么等待是正确的

ADR-20260518024500631 对 reproduce.sh 的定性解释了原因：

> "优点：IoC 原生、无 parser、agent-native、**人类可读但不完全可执行**"
> "人类 `bash reproduce.sh` 看到的是不完整的 echo——只有 agent 能完成"

这意味着 arena 的"可见性层"（web share、HTML report）依赖的基础设施是：
1. **reproduce.sh 模式稳定**（ADR 已接受 ✅）
2. **Agent BDD 可复现链路**（arena.toml → score_matrix → chart → git commit）
3. **LLM 方差的统计推断**（不是单次测量）

在基础设施稳定之前做可见性层，会产生"漂亮的截图但不可复现"的债务——这和项目"约束产生纪律"的哲学相悖。

### 可追溯性的价值

**对于外部观察者**：
- 可以看到"这个功能不是被忘记了，而是被推迟了"
- 可以看到推迟的原因（基础设施依赖）
- 可以看到预计的触发条件（"基础设施稳定后"）

**对于项目自身**：
- 避免重复讨论（"我们之前不是说过要做 arena web share 吗？"→ 直接看 daily/2026-05-05.md）
- 避免优先级漂移（"为什么还没做？"→ 看 epic 的 remaining themes）
- 建立信任："我们说到做到，只是按正确的顺序做"

## When to Apply / When Not to Apply

**适用**：
- 任何"延迟实现但不遗忘"的场景
- 需要向外部解释"为什么这个功能还没做"的场景
- 多 session / 多 agent 协作，需要重建决策上下文

**不适用**：
- 紧急修复（不需要长程追溯，需要立即执行）
- 已明确放弃的想法（应该明确标记为"放弃"而不是"等待"）

## Related

- [daily/2026-05-05.md](../../daily/2026-05-05.md) — Arena web share 想法首次出现
- [daily/2026-05-13.md](../../daily/2026-05-13.md) — 具体化为 task + closing note
- [ADR-20260518024500631](../../adr/02-accepted/ADR-20260518024500631-evolve-agent-bdd-from-agent-md-parseagentmd-to-reproduce-sh-pattern-self-executable-judge-separated-agent-native.md) — reproduce.sh 模式，解释"不完全可执行"的设计哲学
- [daily/2026-05-06.md](../../daily/2026-05-06.md) — "Arena = reproducible experiment | LLM as measurement instrument"
- [ZK Review cognitive foundations](./2026-06-15-zk-review-cognitive-foundations-curse-of-knowledge-review-continuity-attention-economy.md) — "约束产生纪律"的同一逻辑

---

**一句话总结**：长程可追溯性不是"记录一切"，而是"让延迟本身成为可理解的历史"。一个想法从 5 月 5 日到 6 月 15 日仍在 backlog 里，不是项目的失败，而是项目基础设施的证明——它证明了"我们记得，我们在等正确的时机"。