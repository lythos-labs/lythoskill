# Arena Design Principles

## Controlled Variable (Deck Isolation)

> Output differences must converge to a **single variable** — the skill under test.

All decks must be identical except for the test skill: same prompt, same context,
same judge persona, same helper skills.

## Agent Scoring, Not Script Scoring

> Do not repeat the curator `--recommend` mistake.

The arena CLI **never scores outputs**. It only scaffolds: create directories,
generate decks, collect outputs. Real scoring is **agent (LLM)** work — the judge
reads `runs/` outputs and performs LLM reasoning against the
evaluation_criteria defined in TASK-arena.md.

CLI handles structure, agent handles reasoning, viz handles rendering.
Three-layer separation.

## Human Review Over Agent Judge

> Agent judge provides reproducible **first-pass screening**; humans provide
> **final review** that agents cannot replicate.

All arena artifacts persist in the filesystem and default to **awaiting human
review**.

**Agent judge limitations**: Can only score against criteria defined in the
prompt; cannot perceive organizational strategy or political constraints; may
over-prefer structured output.

**Human final review catches**: Context misjudgment, value conflicts, novelty
blind spots.
