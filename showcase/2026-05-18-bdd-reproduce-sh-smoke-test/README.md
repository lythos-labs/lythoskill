# reproduce.sh BDD Migration Demo

> **Status**: Demo — shows IoC pattern applied to existing `.agent.md` scenario  
> **Date**: 2026-05-18  
> **Migrated from**: `packages/lythoskill-arena/test/scenarios/arena-single-task.agent.md`

## What Changed

| Before (.agent.md) | After (reproduce.sh + judge.md) |
|---------------------|--------------------------------|
| Judge criteria embedded in `## Judge` markdown | judge.md — separate file, task agent never sees it |
| regex-parsed by parseAgentMd | shell-executable, no parser needed |
| `.agent.md` naming (conflicts with AGENTS.md) | reproduce.sh — no confusion |
| BDD runner required | `bash reproduce.sh` + agent reads Step 3 |
| Human-unreadable without runner | Human can read both reproduce.sh and judge.md |

## Files

| File | Role |
|------|------|
| `reproduce.sh` | Shell scaffold (Steps 1-2, 4-5) + IoC handoff (Step 3) |
| `judge.md` | Structured criteria — judge agent only |
| `decision-log.jsonl` | Agent self-report (created by agent in Step 3) |
| `judge-verdict.json` | Judge output (created by judge in Step 4) |
| `README.md` | This file |

## IoC Pattern

Step 3 is NOT executable — it's a prompt injection channel:
```
echo "  cd $WORKDIR"
echo "  <spawn subagent>"
echo "  Task: 1. Create greet.ts ..."
```

The agent reads stdout, recognizes `<spawn subagent>` as its role, takes over.
See wiki: `shell-stdout-as-agent-prompt-injection.md`
