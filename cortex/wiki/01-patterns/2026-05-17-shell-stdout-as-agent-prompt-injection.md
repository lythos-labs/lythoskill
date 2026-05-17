# Pattern: Shell stdout as Agent Prompt Injection (Reproduce.sh IoC)

**Discovered**: 2026-05-17, emerged from agent behavior during zero-knowledge arena E2E test.
**Type**: Agent-orchestrated protocol pattern
**Confidence**: Verified — independent replay subagent confirmed the pattern works.

## Problem

Agent-orchestrated tasks need reproducible replay scripts. Shell can automate mechanical steps (`prepare-workdir`, `archive`), but **intelligent steps (read skill, design, write artifacts) cannot be encoded in shell**. A dumb `echo "Step 3: manual"` leaves the next agent with no context.

## Pattern

**Use shell echo/comment as an IoC (Inversion of Control) prompt injection channel.**

The mechanical script prints **contextual instructions** to stdout. The next agent reads stdout, recognizes the instruction as addressed to it, and takes over the intelligent step.

### Example (from arena reproduce.sh)

```bash
echo "=== Step 3: Agent executes task in workdir (manual step) ==="
echo "  cd $WORKDIR && <spawn subagent to create artifacts + decision-log.jsonl>"
```

The replay agent reads this and reasons:
1. "Step 3 is not a command — it's an instruction for me"
2. "I am the subagent being invoked"
3. "I should cd to the workdir, use the skill, and produce outputs"

### Structure

```
┌─────────────────────────────────────────┐
│ reproduce.sh                            │
│   Step 1: cat > deck.toml    ← CLI      │
│   Step 2: prepare-workdir    ← CLI      │
│   Step 3: echo instruction   ← IoC      │
│           "Agent: you do X"             │
│   Step 4: archive            ← CLI      │
└─────────────────────────────────────────┘
                    │
                    ▼ (stdout)
            ┌──────────────┐
            │  Agent reads  │
            │  Takes role   │
            │  Executes X   │
            └──────────────┘
```

## Why This Works

| Property | Mechanism |
|----------|-----------|
| Agent *can* read | Shell stdout is visible to the agent as tool output |
| Agent *wants* to read | It's running reproduce.sh and needs to understand what happened |
| Instruction is *recognizable* | Natural language in `<angle brackets>` or imperative "you" form triggers role-taking |
| Low ambiguity | The only "gap" in the script is the intelligent step — agent fills it naturally |

## Key Insight

**This pattern was not designed. It emerged.**

The first subagent wrote reproduce.sh *without being told* to use echo as a prompt channel. It intuited that:
1. There's a step it can't encode in shell
2. The next agent will be reading stdout
3. Leaving a natural-language instruction bridges the gap

The replay subagent *understood without a schema*. It read `<spawn subagent>` and self-assigned the role.

## When to Use

- Any replay/reproduce script that has mixed mechanical + intelligent steps
- Arena `reproduce.sh` generation
- Any CLI tool that needs to hand off to an agent mid-pipeline

## When NOT to Use

- Fully deterministic pipelines (no agent needed)
- Steps the script can encode (don't pseudo-prompt what a command can do)

## Related

- ADR-20260517140421425: CLI vs Agent-Orchestrated Parity
- ADR-20260517142840955: Agent-Adapter Independent Spawn
- Thin Skill Pattern: CLI = mechanical, Agent = intelligent, SKILL.md = control layer
- Showcase: 2026-05-17-zero-knowledge-arena-e2e (first verification)
