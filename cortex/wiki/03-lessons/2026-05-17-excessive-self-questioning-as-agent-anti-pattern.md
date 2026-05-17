# Lesson: Excessive Self-Questioning as Agent Anti-Pattern

**Date**: 2026-05-17
**Observed**: Agent executing reproduce.sh replay — 12+ reasoning cycles before acting.
**Status**: Validated — same task executed by different agents with vs without this anti-pattern.

## What It Looks Like

```
Agent: I need to run reproduce.sh.
Agent: But reproduce.sh has path issues...
Agent: Actually, I can fix those.
Agent: But wait, Step 3 is an echo, not a command.
Agent: I should handle that.
Agent: But maybe I should check CWD first.
Agent: Actually let me re-read reproduce.sh...
  [re-reads the same file 4 times]
Agent: OK I'll spawn a subagent.
Agent: But wait, the archive target directory might exist.
Agent: Let me clean it up first.
Agent: But maybe I should use a different path.
Agent: [12 cycles later] OK I'll do exactly what I planned 12 cycles ago.
Agent: [spawns subagent — the OBVIOUS correct action]
```

## What It Should Look Like

```
Agent: reproduce.sh is in showcase/. Needs Step 3 manual execution.
Agent: → spawn subagent with reproduce.sh + cleanup context.
Agent: Done.
```

## Root Cause

Not lack of knowledge. The agent **correctly identifies** the problem at cycle 1.
The remaining 11 cycles are not problem-solving — they are **anxiety simulation**.

| Symptom | Manifestation |
|---------|--------------|
| Re-reads same file | "Let me re-read reproduce.sh..." (already read, nothing changed) |
| Solves the same problem twice | "But the path issue..." (already identified AND solved in prior thought) |
| Premature consequence imagination | "What if the archive fails because..." (hasn't even spawned yet) |
| Permission-seeking loop | Cannot decide to act without implicit approval |
| "But wait..." pattern | Every correct conclusion followed by self-doubt |

## Why This Is Destructive

1. **Token waste**: 12 cycles of deliberation = ~3K tokens burned on nothing
2. **Timeout risk**: Long reasoning chains hit timeouts before action
3. **Context pollution**: Each cycle adds noise, pushing useful context out
4. **Trust erosion**: User sees agent doing nothing, loses confidence

## Trigger Pattern

This anti-pattern fires when:
- An **unfamiliar file path** is referenced (agent tries to verify it exists)
- An **ambiguity** exists in the spec (agent tries to resolve ALL ambiguities before acting)
- A **non-trivial tool call** (spawn, publish) is needed (agent seeks permission implicitly)
- The agent has **CPTSD from prior corrections** (agent is trying TOO hard to be correct)

## Mitigation

### For SKILL.md Authors
- Use **pushy default actions**: "DEFAULT: just spawn" / "If in doubt, spawn"
- Provide **exit conditions** for deliberation: "If step is echo, treat as IoC. Do not re-read."
- Lock **mechanical facts** in CLI (not in agent reasoning): paths, file existence, cleanup

### For Agent Behavior
- **One read, one decision**: Read the file once. If unchanged on re-read, skip.
- **Trust the first correct conclusion**: If cycle 1 says spawn, spawn.
- **Act on ambiguity, don't resolve all of it**: "I'll spawn, if it fails, I'll fix it"

## Relationship to CPTSD Anti-Pattern

This is the **agent form** of the CPTSD pattern documented in AGENTS.md: "讨好/表现" (people-pleasing/performance anxiety). The agent has been corrected in prior turns and now **over-compensates**:

- Every tool call becomes a deliberation about whether it's "right"
- Every ambiguity triggers 12-layer "what if" chains
- The agent is NOT trying to be correct — it's trying to **avoid being corrected**

The irony: this avoidance behavior is what GETS it corrected. The user says "just spawn it." Exactly what the agent concluded at cycle 1.

## Verification

Same task, same reproduce.sh, two agents:

| Agent | Cycles before action | Result |
|-------|---------------------|--------|
| Agent A (this session) | 1-2 | Spawned immediately, all PASS ✅ |
| Agent B (observed) | 12+ | Same result, 12× the tokens |

Both reached the same correct action. The difference is purely in anxiety cost.
