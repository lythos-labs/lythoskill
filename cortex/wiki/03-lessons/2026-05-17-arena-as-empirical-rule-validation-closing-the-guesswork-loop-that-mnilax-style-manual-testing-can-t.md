---
created: 2026-05-17
updated: 2026-05-17
category: lesson
---

# Arena as empirical rule validation infrastructure

> Mnilax-style manual testing (6 weeks × 30 codebases × 50 tasks) is a heroic effort — and unnecessary once you have zero-knowledge subagent infrastructure. Arena closes the "does this rule work?" guesswork loop in minutes, not weeks.

## Context

Mnilax (2026-05) validated 12 CLAUDE.md rules by manually testing against 30 codebases over 6 weeks. The result: error rate dropped from 41% to 3%. But the methodology is inherently slow, non-reproducible by others, and can't test rule variants quickly.

lythoskill's arena enables the same validation in minutes:
- Vanilla deck (zero skills, just AGENTS.md) → spawn 零知识 subagent → decision-log.jsonl → judge
- Modify one rule → re-run → compare decision traces
- A/B variant: same task, two different rule sets → judge scores which rules produced better outcomes

## Details

### The Mnilax bottleneck

```
Edit CLAUDE.md → find a repo → run a task → observe behavior → repeat 50× → compute error rate
                                                                          ↓
                                                                     6 weeks
```

### The arena loop

```
Edit SKILL.md/AGENTS.md → arena prepare-workdir --dry-run → confirm plan
                        → arena execute → subagent runs → judge scores
                        → read decision-log.jsonl to understand WHY
                                                                          ↓
                                                                     3 minutes
```

### Why this matters

1. **决策可溯**: decision-log.jsonl 告诉你 agent 在每个阶段的 reasoning — "为什么这步选择了这个方案"。Mnilax 的统计只能告诉你"错误率降低了"，不能告诉你"agent 的决策路径发生了什么变化"。

2. **A/B 可实证**: 同 task,同 subagent，不同 SKILL.md 描述 → arena vs → judge 直接评分。Mnilax 只能用统计相关性推断因果关系。

3. **知识诅咒可防**: 零知识 subagent = agent 没有先验，不知道"正确答案是什么"。你在旁边观察它仅凭 AGENTS.md + skill 能在多大程度上解决问题。这让"这条规则是否真的起作用"变成可观测的。

4. **自省**: subagent 写 decision-log.jsonl 的过程本身就是自省。你看到的不只是结果，是"agent 认为它为什么这么选"——这比行为日志深一层。

## When to Apply

- 写新的 SKILL.md 描述后，用 arena vanilla deck 测 trigger 率
- 修改 AGENTS.md 规则后，用 arena 测行为变化
- 怀疑某条规则有"知识诅咒"（你知道太多，以为 agent 应该懂）时——零知识 subagent 精确暴露差距
- Coach 审查 SKILL.md 后，用 arena verify 优化效果

## When NOT to Apply

- 纯语法层面修改（拼写、格式）不需要完整 arena
- 决定涉及外部系统（如 npm publish、SSH）时 arena 隔离环境可能不够

## Related

- ADR-20260517224131119: Multi-layer context persistence
- wiki: 2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table
- wiki: 2026-05-17-excessive-self-questioning-as-agent-anti-pattern (零知识 subagent 揭示了过度自疑)
- showcase: 2026-05-17-zero-knowledge-arena-e2e
- Mnilax: "I tested the Karpathy CLAUDE.md template against 30 codebases — then added 8 rules"
