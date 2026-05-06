# TASK-20260506193936311: Implement DeepSeek TUI AgentAdapter: one-shot mode + player registry

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-06 | Created |

## 背景与目标

DeepSeek TUI is the best-in-class Bun.spawn agent candidate: Rust-native (no stdin pipe bug), 1M token context, $0.14/1M input, subagent system with 8 roles. The adapter follows the kimi pattern (one-shot, positional argv, stdin: ignore).

See: cortex/wiki/03-lessons/2026-05-06-deepseek-tui-headless-programmatic-analysis.md

## 需求详情

- [x] `packages/lythoskill-test-utils/src/agents/deepseek.ts` — adapter implementation
- [x] Register in `useAgent()` registry (index.ts)
- [x] Add to BUILTIN_PLAYERS in arena player.ts

## 验收标准

- [ ] `useAgent('deepseek')` returns valid AgentAdapter
- [ ] Hello World smoke test: `deepseek --yolo "Write Hello World to output.md"` → non-empty stdout, output.md created
- [ ] Self-report skills smoke test: agent discovers skills from `.claude/skills/` after deck link
- [ ] Arena `agent-run --player deepseek` works end-to-end

## 关联文件

- 新增: `packages/lythoskill-test-utils/src/agents/deepseek.ts`
- 修改: `packages/lythoskill-test-utils/src/agents/index.ts`
- 修改: `packages/lythoskill-arena/src/player.ts`

## Git 提交信息建议
```
feat(agent): DeepSeek TUI AgentAdapter — one-shot mode + player registry

- deepseek.ts: Bun.spawn one-shot adapter (--yolo, positional argv, stdin:ignore)
- index.ts: register 'deepseek' in useAgent() registry
- player.ts: add 'deepseek' to BUILTIN_PLAYERS for arena resolution

Rust-native binary avoids Bun stdin pipe issues that plague Node.js-based
CLI agents. 1M token context at $0.14/1M input. Adapter follows the kimi
pattern for minimal surface area.
```
