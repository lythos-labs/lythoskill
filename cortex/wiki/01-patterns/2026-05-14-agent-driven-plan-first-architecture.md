---
title: Agent-driven plan-first architecture
date: 2026-05-14
tags: [pattern, architecture, plan-first, agent-driven, cold-pool, deck]
related:
  - 2026-05-04-intent-plan-execute-fractal-architecture-pattern.md
---

## Pattern

Destructive or network-dependent CLI operations follow a **plan → agent → execute** flow, not a single-command auto-execute flow.

```
buildFooPlan() → structured plan output → agent reads plan → agent decides → agent executes
```

The key insight: **apply is agent behavior, not a `--apply` flag.**

## Examples in the codebase

| Domain | Plan command | Agent role |
|--------|-------------|------------|
| deck refresh | `deck refresh` (plan-only by default) | Agent sees behind counts, probes remotes, decides which to pull, pulls one by one |
| cold-pool prune | `cold-pool prune` (shows candidates, waits for [y/N]) | Agent reads unreferenced list, cross-checks with other decks, confirms deletion |
| deck add | `deck add --dry-run` | Agent verifies paths and aliases before real execution |
| deck reconcile | `deck reconcile` (drift report) | Agent reads drift report, decides convergence strategy |

## Why agent-driven > heredoc

| Approach | Strengths | Weaknesses |
|----------|-----------|------------|
| Heredoc script | Auditable, reproducible, human-readable | Dead script — fails on any anomaly (non-ff, auth, timeout) |
| Agent-driven apply | Adaptive: probes before each step, switches mirrors, skips risky repos | Requires agent capability (git + shell — already available) |

Both produce auditable output. Heredoc produces `.sh` files; agent-driven produces plan output + execution log. The difference is in **resilience**: an agent can diagnose and fix divergence, an heredoc just fails.

## Related decisions

- ADR-20260507110332805 (refresh discover-only + agent-driven apply, scheme E)
- ADR-20260507110332770 (prune as audit heredoc — same plan-first UX)
- ADR-20260508230803515 (curator no feed adapters — agent web fetch beats hand-rolled adapters)
- Intent/Plan/Execute fractal architecture pattern (2026-05-04)

## When to use

- Any operation that modifies cold pool (git pull, delete)
- Any operation that depends on network (git clone, probe, fetch)
- Any operation with side effects that cannot be rolled back with `git checkout`
