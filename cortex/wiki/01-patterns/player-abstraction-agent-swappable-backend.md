# Player Abstraction — Swappable Agent Backend

> **Pattern**: Use an `AgentAdapter` interface to swap agent backends without changing arena/BDD pipeline logic.
> **Validated**: 2026-05-06 — Kimi CLI replacement for Claude CLI in Bun.spawn context.

## Problem

Agent spawn reliability varies dramatically across CLIs. Claude `claude -p` has deferred tool deadlock (v2.1.76+), Bun stdin pipe bugs (ARM64), and nested session detection — 6 monkey-patch commits never produced valid output. Kimi `--print --afk` worked on the first try.

Without a swappable backend, the entire arena/BDD pipeline is locked to a single CLI's reliability profile.

## Solution

```typescript
// AgentAdapter interface (test-utils/src/agents/types.ts)
interface AgentAdapter {
  name: string
  spawn(opts: { cwd, brief, timeoutMs }): Promise<AgentRunResult>
}

// Registry — swap backend by name
useAgent('kimi')    // default: reliable headless execution
useAgent('claude')  // secondary: retained but not recommended
```

## Key Insight

The Arena pipeline (task → agent spawn → per-cell judge → comparative judge) should not know which CLI is executing. The `AgentAdapter` interface abstracts:

1. **Spawn mechanism**: shell redirect vs stdin pipe vs positional arg
2. **Output format**: JSON vs stream-json vs text
3. **Permission model**: `--afk` vs `--permission-mode bypassPermissions`
4. **Tool availability**: eager vs deferred loading

## Validation

2026-05-06 arena grounding verified:

| Criterion | Kimi | Claude |
|-----------|------|--------|
| Text task (copy) | ✅ output.md, 87 chars | ❌ 0 bytes |
| Deep research (SearchWeb) | ✅ Bun v1.3.13, judge PASS | ❌ never ran |
| Skill introspection | ✅ 2 global + 1 deck | ❌ never ran |
| Commit attempts to fix | **1 (adapter)** | **6 (monkey patches)** |

## CWD Isolation

Companion pattern: run agents in `/tmp/arena-<id>/<side>/` to prevent upward `.claude/skills/` discovery. Without this, agents inherit parent project skills, breaking deny-by-default verification.

```typescript
// runner.ts
baseDir: join(tmpdir(), `arena-${arenaId}`, cell.side)
```

## When to add a new adapter

1. Implement `AgentAdapter` interface in `agents/<name>.ts`
2. Register in `agents/index.ts`
3. Add to `player.ts` BUILTIN_PLAYERS mapping
4. Test with arena copy-test (fastest smoke test)

## Related

- ADR-20260506021112492 (Kimi default decision)
- ADR-20260424120936541 (Player-deck separation)
- `cortex/wiki/03-lessons/kimi-vs-claude-cli-headless-comparison.md`
- `packages/lythoskill-test-utils/src/agents/`
