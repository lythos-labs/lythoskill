---
created: 2026-05-19
updated: 2026-05-19
category: pattern
---

# Where is the orchestrator — combo prompt as lightweight orchestrator pattern

> The orchestrator is not a separate component. It is distributed by weight across three layers: combo prompt (light), SKILL.md (medium), CLI (heavy). The three-layer architecture IS the orchestrator.

### Smart agent, dumb tool

The three layers exist to separate concerns by two axes: **weight** (how much logic) and **nature** (mechanical vs judgment).

| Weight | Mechanical (dumb) | Judgment (smart) |
|--------|-------------------|------------------|
| **Heavy** | CLI npm — backup, symlink, validate | SKILL.md — complex reasoning, cross-deck reuse |
| **Light** | — | Combo prompt — conditions, call order, state passing |

- **Dumb tool (CLI)**: mechanical, reliable, testable. Filesystem ops, backup, symlink management. Plan/execute, not reasoning.
- **Smart agent instruction (SKILL.md)**: complex judgment that's worth version-controlling and reusing across decks. Heavy orchestration logic lives here.
- **Smart agent instruction (combo prompt)**: light, contextual judgment. "If X then Y, pass A's output to B." Too light to deserve its own file.

The orchestration logic sinks by weight: light stays in prompt, heavy sinks to SKILL.md, heaviest (mechanical) sinks to CLI npm. The three layers ARE the orchestrator — distributed, not centralized.

## Context

lythos has deck (governance), curator (discovery), arena (testing), and cortex (project management). Anyone evaluating the ecosystem will naturally ask: **"where is the orchestrator?"** — the thing that decides which skill to call when, passes state between them, handles conditions and error recovery.

The answer is non-obvious because the orchestrator is **not a package, not a skill, not a CLI command**. It is a one-line TOML field: `combo.prompt`.

## Details

### The anti-pattern: searching for a dedicated orchestrator

```
lythoskill-orchestrator   ← doesn't exist, doesn't need to
lythoskill-meta           ← doesn't exist, doesn't need to
architecture-explainer    ← exists as a deck, not a separate orchestrator
```

Evaluators who expect an explicit orchestrator component will conclude the ecosystem is "工具强、编排弱" (tools strong, orchestration weak). This is a framing error — the ecosystem is designed for the **agent to be the orchestrator**, and the combo prompt is the agent's instruction set.

### The pattern: combo prompt IS the orchestrator

```toml
[combo.git-smart-commit]
skills = ["git-status", "merge-conflict", "commit", "debug"]
prompt = """
You are a git workflow orchestrator.

1. Call git-status to check current state
2. If there are conflict files → call merge-conflict, then return to step 1
3. If working tree is clean → exit
4. Otherwise → call commit to generate message and commit
5. If commit returns non-zero exit code → call debug to analyze error log, retry once
6. Pass all step outputs as context to the next step
"""
```

The agent reads the prompt, reasons about conditions, and dispatches calls. The combo prompt handles:
- **Conditional branching**: "if X then Y, else Z"
- **State passing**: "pass output of A as input to B"
- **Error recovery**: "if X fails, call debug, retry once"
- **Parallel dispatch**: "call A, B, C in parallel, aggregate results"

No if/else syntax needed. No framework. No npm package. The agent understands natural language instructions and executes them.

### The three-layer distribution

| Layer | What it orchestrates | Weight | Lives in |
|-------|---------------------|--------|----------|
| **Combo prompt** | Skill call sequence, conditions, state passing, error recovery | **Light** | `skill-deck.toml` inline, zero max_cards cost |
| **Agent reasoning** | Reads prompt, evaluates conditions, dispatches tool calls | **Runtime** | The agent itself (Claude, Kimi, Codex, etc.) |
| **CLI tools** (deck/arena) | Filesystem sync, backup, symlink management, benchmark execution | **Heavy** | npm packages, versioned, tested, exit-code semantic |

The orchestrator "disappears" because it was never a separate entity — it's the natural language bridge between the agent's reasoning and the CLI's mechanical execution.

### Why this works for agents but confuses humans

| Human expectation | Agent reality |
|------------------|---------------|
| "Where is the orchestrator binary?" | Combo prompt + agent reasoning = orchestrator |
| "How do I write conditional logic?" | Natural language in prompt: "if X then Y" |
| "How does state pass between skills?" | Agent maintains conversation context |
| "This needs a workflow engine" | Agent IS the workflow engine |

Humans need explicit orchestrators because they can't hold multi-step reasoning in a prompt. Agents can. The combo prompt leverages the agent's native capability instead of reimplementing it.

### CQRS parallel

This pattern mirrors the project-scribe/project-onboarding CQRS split:

- **scribe** writes state (daily handoff)
- **onboarding** reads state (three-layer loading)
- **No central "session manager"** — the pair itself is the abstraction

Similarly:
- **combo prompt** declares intent
- **agent** executes reasoning
- **deck CLI** performs mechanical sync
- **No central "orchestrator"** — the three-layer distribution is the abstraction

## When to Apply / When Not to Apply

**Apply combo prompt as orchestrator when:**
- Orchestration logic is < 50 lines of natural language
- Conditions are expressible as "if X then Y"
- State passing is sequential (A's output → B's input)
- Error recovery is simple ("retry once", "call debug on failure")

**Extract to a standalone SKILL.md when:**
- The orchestration logic is complex enough to need version control
- The same orchestration is reused across multiple decks
- The logic needs to reference external APIs or file system
- The combo prompt exceeds ~50 lines and becomes unmaintainable

**Extract to a CLI/npm package when:**
- The logic requires filesystem operations (backup, symlink, archive)
- The logic needs cross-platform reliability guarantees
- The logic needs test coverage and CI validation
- The logic is mechanical, not judgment-based (plan/execute, not reasoning)

## Why this matters: the same boundary as entropy-check remediation

This pattern is the same architectural principle that drove today's entropy-check refactor:

| Anti-pattern | Mistake | Fix |
|-------------|---------|-----|
| entropy-check remediation | CLI as orchestrator: `<spawn subagent to fix X>` | Sensor reports facts, agent judges |
| Dedicated orchestrator npm | npm as orchestrator: "decide which skill to call" | Agent reads combo prompt, decides itself |
| Combo counting toward max_cards | Orchestrator competes with tools for budget | Combo is zero-cost meta-declaration |

The common thread: **the agent is the orchestrator, tools are executors.** The orchestration layer (combo prompt + agent reasoning) must never compete for the same resource budget as the tool layer (CLI + skills). When a tool starts telling the agent what to do, it has crossed the boundary — same bug as `<spawn subagent>` in a sensor.

This is why combo doesn't count toward max_cards. Not because combo is "less important" — because it's a *different category*. It's the difference between a sensor telling you the temperature and a sensor telling you to put on a coat.

## Related

- ADR-20260517152850372: also_link_to POSSE pattern — same "no new component" philosophy
- [[thin-pattern-essence]]: intelligence in SKILL.md, stable integration in npm, CLI mechanical only
- [[recursive-thin-layer-principle]]: defer every layer to mature infra
- entropy-check CLI/agent boundary (EPIC-20260519164518898): same anti-pattern — tool overstepping into agent judgment
- npm README agent-first framing: READMEs should lead with this design philosophy
