---
created: 2026-05-10
updated: 2026-05-10
category: pattern
---

# Side Deck Pattern — Task-Specialized Decks for One-Shot Execution

> Pattern: maintain specialized skill decks (`examples/decks/<task>.toml`) for recurring task types. Use `arena single --deck <side-deck>` for one-shot task execution without polluting the project's main working set.

## The Pattern

```
examples/decks/
  scout.toml            ← minimal deck for quick exploration
  qa-sweep.toml         ← security audit: codeql + semgrep + security-advisor + ...
  deep-research.toml    ← systematic research: research-deep + research-report
  design-studio.toml    ← UI/frontend: frontend-design + theme-factory
  ...

Usage:
  arena single --deck examples/decks/qa-sweep.toml --brief "audit <target>"
  arena single --deck examples/decks/deep-research.toml --brief "..."
```

## Why Side Decks

| | Main deck | Side deck |
|---|---|---|
| Location | project root `skill-deck.toml` | `examples/decks/<name>.toml` |
| When active | Always (daily development) | On-demand (arena single) |
| Working set | `.claude/skills/` (persistent) | arena workdir (ephemeral) |
| Risk of pollution | High (changes affect daily work) | Zero (arena creates isolated workdir) |
| Change frequency | Per-project needs | Stable (SOP-frozen, rarely changes) |

Side decks are the "combo" pattern made portable: a curated set of skills + a COMBO.md workflow, packaged together as a reusable task runner.

## Arena Single: The Stateless Executor

`arena single` is the key enabler. It:
1. Creates an isolated workdir
2. Copies the side deck + runs `deck link`
3. Invokes the player agent with the side deck loaded
4. Cleans up — no trace in the project

This means side decks are **safe to experiment with** — they never overwrite the main deck, never pollute `.claude/skills/`, and never risk deny-by-default violations.

## When to Create a Side Deck

- A task type has been done 2+ times and the skill combo is proven effective
- The task requires skills NOT in the main deck (would bloat daily context)
- The task is periodic (weekly audit, pre-release sweep, research sprint)
- You want to share a workflow with another developer or agent

## Subagent Pattern

Side decks also work for subagent orchestration:

```bash
# Create isolated workdir for subagent
mkdir /tmp/qa-workdir && cd /tmp/qa-workdir
deck link --deck ../path/to/qa-sweep.toml
kimi -p "audit target"   # subagent inherits CWD isolation
```

## Related

- [QA Security Sweep](./2026-05-10-cold-pool-metadata-filesystem-ground-truth.md) — the 5-phase audit flow
- [Cold Pool Architecture](./2026-05-09-cold-pool-architecture-deck-decoupling-with-fsm-reference-counting.md)
- `examples/decks/INDEX.md` — full side deck catalog
