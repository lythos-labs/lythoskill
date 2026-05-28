# ADR-20260517142840955: Agent-Adapter — Independent Process Spawn for Reliable Multi-Player Orchestration

**Status**: Accepted
**Date**: 2026-05-17

## Status History

| Status | Date | Note |
|--------|------|------|
| accepted | 2026-05-17 | Accepted via ADR state transition |

## Context

Arena needs cross-player comparison (Claude vs Kimi vs Codex vs DeepSeek) with reliable model selection per side. Two native subagent systems were evaluated and found unreliable:

### Claude Code Subagent Limitations
- `CLAUDE_CODE_SUBAGENT_MODEL` high-priority env var silently overrides SKILL.md `model` frontmatter
- Background subagent model differentiation broken by bug
- Cannot do "main Opus + explore Haiku" within one session

### Codex Subagent Limitations
- `spawn_agent` `model` parameter silently ignored ([openai/codex#22250](https://github.com/openai/codex/issues/22250))
- Agent TOML `model` not respected ([openai/codex#14671](https://github.com/openai/codex/issues/14671))
- No native background/async subagent mode
- Cannot do "main GPT-5.4 + explore GPT-5.4-mini"

### Root Cause

Both systems attempt to manage subagents within one session — context inheritance, fork, permission propagation create complexity that leads to bugs in model routing. The session-scoped subagent model is architecturally fragile.

## Decision

**Bypass native subagent systems entirely. Use independent process spawn via `@lythos/agent-adapter`.**

```ts
const agent = useAgent('deepseek')  // or kimi, claude-sdk, codex
await agent.spawn({ cwd, brief, timeoutMs, modelTier })
```

Each backend is an **independent OS process**:
- `kimi --print` (Kimi CLI, model via `--model` flag)
- `claude -p` (Claude CLI, model via SDK config)
- `deepseek serve --http` (DeepSeek daemon, model via chat API)

Model selection is 100% controlled by spawn parameters, not by host platform subagent routing. No platform bug can interfere.

### Architecture

```
arena / skill-arena (caller)
    │  "I need 2 workers: 1 fast + 1 deep"
    ├──→ useAgent('kimi', { modelTier: 'fast' })
    │       → kimi --print --model kimi-for-coding
    ├──→ useAgent('claude-sdk', { modelTier: 'deep' })  
    │       → Claude SDK → Opus 4.7
    └──→ useAgent('deepseek', { modelTier: 'balanced' })
            → deepseek serve chat
```

Each spawn = independent process, independent context, independent model. No session-scoped leak.

### Why This Works Where Native Systems Don't

| Capability | Native Subagent | agent-adapter |
|-----------|----------------|---------------|
| Per-spawn model selection | Buggy or ignored | ✅ 100% reliable (process flag) |
| Background async | Buggy (Claude) / None (Codex) | ✅ `Promise.all` over OS processes |
| Cross-platform uniform API | None | ✅ `AgentAdapter` interface |
| Cost-tier routing (fast/balanced/deep) | Impossible | ✅ `modelTier` → adapter maps to CLI flag |
| Heavy adapter lazy loading | N/A | ✅ Daemon lifecycle separate package |

### Beyond Cross-Player: Multi-Agent Map-Reduce

This architecture is not just for cross-player comparison. The same independent-spawn pattern enables **same-player multi-agent orchestration**:

```
Main agent (orchestrator)
    │  "Analyze this codebase: 3 workers, each one subsystem"
    ├──→ spawn('deepseek', { modelTier: 'fast' }) → subsystem A
    ├──→ spawn('deepseek', { modelTier: 'fast' }) → subsystem B
    └──→ spawn('claude-sdk', { modelTier: 'deep' }) → cross-cutting + synthesis
```

Each worker is independent — no context sharing, no model routing bugs, no deadlock. The orchestrator collects + judges (map-reduce). This is the same pattern arena already uses for agent-orchestrated cross-deck vs, generalized to any multi-agent task.

## Consequences

### Positive
- **Reliable model routing**: Not subject to any platform's subagent bug
- **Unified interface**: Same `spawn()` call for all platforms
- **Platform-independent**: Arena, deck, any tool can use agent-adapter
- **Future-proof**: New player = new adapter implementing `AgentAdapter`
- **modelTier**: `'fast' | 'balanced' | 'deep'` maps to each platform's model flag

### Implementation Plan
1. Add `modelTier` parameter to `AgentAdapter.spawn()` interface
2. Each adapter maps `modelTier` to platform-specific model flag
3. Arena `--player kimi --model-tier fast` → `useAgent('kimi', { modelTier: 'fast' })`
4. Update agent-adapter package descriptions and README

### Related
- ADR-20260517140421425: CLI vs Agent-Orchestrated parity
- EPIC-20260517121757041: Agent BDD coverage for deck/arena

## Security & Trust

Agent-adapter uses `Bun.spawn` (OS-level process creation). Each spawn runs with the caller's user permissions. No privilege escalation, no sandbox bypass. Auth tokens for each player CLI are user-managed (`.kimi-token`, `.codex-token`, etc.) — never embedded in adapter code.