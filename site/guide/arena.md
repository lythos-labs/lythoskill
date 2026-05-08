# Arena: Systematize Skill Comparison

> **What it does:** Same task, different decks, subagent scoring. Know which skill actually works.
> **The analogy:** A/B testing framework for agent skills.

## The Problem

You found two PDF skills. Both claim to "extract tables from PDFs". Which one actually works for your PDFs? Stars on GitHub don't answer this. The author's description won't tell you. Only testing with YOUR data will.

## What Arena Solves

```bash
arena run \
  --players deepseek-serve \
  --decks pdf-skill-a.toml,pdf-skill-b.toml \
  --task "Extract all tables from sample.pdf and output as CSV" \
  --criteria "accuracy,completeness,speed"
```

Two agents run the same task with different decks. A judge scores both outputs. You get a Pareto frontier report showing which (player, deck) combinations are on the frontier — and which are dominated.

## Quick Tour

### Run a comparison

```bash
bunx @lythos/skill-arena@latest run \
  --deck examples/decks/engineering.toml \
  --player deepseek-serve \
  --task "Write a test for isValidSkillName" \
  --runs-per-side 1
```

### What you get

- Per-cell verdicts (PASS/FAIL on each criterion)
- Comparative judge report (score matrix, Pareto frontier, recommendations)
- Artifact directory with agent outputs, judge reports, raw logs

## Core Concepts

| Concept | What it is |
|---------|------------|
| **Side** | One (player, deck) combination. Arena runs N sides in parallel. |
| **Cell** | One run of one side. `runs_per_side` determines statistical coverage. |
| **Comparative Judge** | LLM-based judge that scores outputs across criteria and computes Pareto |
| **L3 Trust** | Arena results = buyer's review (买家秀). Higher weight than desc or star count. |

## Integration with Curator

```
curator scan → find candidate skills
arena compare → which one actually works?
deck add → install the winner
```
