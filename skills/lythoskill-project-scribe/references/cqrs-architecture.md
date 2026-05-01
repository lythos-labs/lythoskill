# CQRS: Scribe (Write) + Onboarding (Read)
## Architecture
```
Current session → scribe (dump)
    - Confirm git/cortex/session state
    - Write daily/YYYY-MM-DD.md
              │
              ↓
    daily/2026-04-24.md
    (first section = Session Handoff)
              │
              ↓
Next session → onboarding (read)
    - Find latest daily file
    - Read first section (Handoff)
    - Verify Ground Truth against git
```

## Why Separate Write and Read
- **Scribe** knows what happened (session context, verbal decisions, pitfalls).
  It cannot know how the next agent will need to consume this.
- **Onboarding** knows how to efficiently restore context (layered loading,
  KV cache optimization, degraded paths). It cannot know what happened.

Separating them means each skill has one job and can evolve independently.

## Independence
Each side works alone:
- **Scribe only**: daily files are human-readable. Any agent can `cat` them.
- **Onboarding only**: degrades to file exploration when no daily exists.
- **Both**: optimal path — handoff written with verification commands,
  read with layered loading and freshness checks.
## Relationship with Cortex
Cortex manages the project's task/epic/ADR lifecycle. Scribe references
cortex state during handoff (active tasks, recent completions) but does
not depend on it. If cortex is not in the deck, scribe skips that check.
