# TASK-20260517193718598: agent-adapter modelTier parameter + description update for reliable cross-player comparison

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| in-progress | 2026-05-17 | Started |
| review | 2026-05-17 | Deliverables committed |
| completed | 2026-05-17 | Done |

## 背景与目标
agent-adapter needs `modelTier` parameter (fast/balanced/deep) for reliable cross-player comparison. Native subagent model routing is broken in Claude Code and Codex — the agent tool doesn't expose model selection, so A/B comparisons are unreliable (different models produce different quality). agent-adapter bypasses native subagent via independent OS processes, enabling explicit model control.

Refs: ADR-20260517142840955 (agent-adapter independent spawn architecture)

## 需求详情
- [ ] Add `modelTier` parameter to agent-adapter: `fast | balanced | deep`
- [ ] Map modelTier to each player's CLI flags (Claude: --model, Codex: -m, Kimi: --model, DeepSeek: --model)
- [ ] Update agent-adapter SKILL.md description to document modelTier
- [ ] Arena cross-player mode: pass modelTier through config

## 技术方案
agent-adapter already does independent OS process spawn (Bun.spawn). Add `modelTier` to the spawn config. Each player adapter maps `fast/balanced/deep` to their specific model names. Example: Claude `fast` = haiku, `balanced` = sonnet, `deep` = opus.

## 验收标准
- [ ] `modelTier: fast` produces fast model output (verifiable by response speed)
- [ ] `modelTier: deep` produces best-quality output
- [ ] Cross-player comparison with same modelTier produces comparable effort levels
- [ ] Dormancy: omitting modelTier defaults to player's default model

## 关联文件
- 修改: `packages/lythoskill-agent-adapter/`
- 参考: `cortex/adr/02-accepted/ADR-20260517142840955-*.md`

## 备注
