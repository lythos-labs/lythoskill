---
created: 2026-05-08
updated: 2026-05-08
category: faq
---

# Player Prerequisites

> Each player adapter needs a specific CLI installed. The adapter detects availability at runtime; if missing, that player is silently unavailable.

## Quick Reference

| Player | Adapter Package | Required CLI | Install | Verify |
|--------|----------------|-------------|---------|--------|
| **claude-sdk** | `@lythos/agent-adapter-claude-sdk` | Claude Code native binary | `npm i -g @anthropic-ai/claude-code` | `claude --version` |
| **claude-cli** | `@lythos/agent-adapter` (built-in) | Claude CLI | `npm i -g @anthropic-ai/claude-code` | `claude -p "hello"` |
| **kimi** | `@lythos/agent-adapter` (built-in) | Moonshot Kimi CLI | [Moonshot official](https://www.moonshot.cn) | `kimi --version` |
| **deepseek** | `@lythos/agent-adapter-deepseek-serve` | DeepSeek TUI | `npm i -g deepseek-tui` | `deepseek --version` |

## claude-sdk

The `@anthropic-ai/claude-agent-sdk` npm package is a **programming interface** — it still requires the native Claude Code binary to be installed separately. Without it, `spawn()` fails with "Claude Code native binary not found."

```bash
npm i -g @anthropic-ai/claude-code
claude --version  # must succeed before arena single works with claude-sdk player
```

## kimi

Requires the **Moonshot official kimi CLI**, not the community `kimi-cli` npm package. The official CLI is distributed through Moonshot's platform.

```bash
# Must be installed and in PATH
kimi --version
```

## deepseek

Uses `deepseek serve --http` daemon mode. The adapter auto-starts serve, manages PID lock files, and reuses existing instances.

```bash
npm i -g deepseek-tui
deepseek --version  # should be 0.8.x
# Arena/adapter handles `deepseek serve --http` lifecycle automatically
```

## Runtime Behavior

All adapters import lazily with `try/catch` — if the required CLI is missing, the adapter is silently unavailable:

```typescript
// arena/src/runner.ts and arena/src/cli.ts
try { await import('@lythos/agent-adapter-deepseek-serve') } catch {}
try { await import('@lythos/agent-adapter-claude-sdk') } catch {}
```

Use `listAgents()` to see which players are available:

```bash
bun -e "import { listAgents } from '@lythos/agent-adapter'; console.log(listAgents())"
```

## Related

- [Agent Adapter as Actor Pattern](../../wiki/01-patterns/2026-05-08-agent-adapter-as-actor-daemon-lifecycle-facade-pattern-for-multi-player-cli-backends.md)
- [Player-Deck Separation](../../wiki/01-patterns/2026-05-02-player-deck-separation-and-tcg-player-analogy.md)
- [lythoskill in Action Guided Tour](./lythoskill-in-action-guided-tour.md)
