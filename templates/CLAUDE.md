# CLAUDE.md

> **For full project guidance, read [`AGENTS.md`](./AGENTS.md) first.**
> This file only contains Claude Code-specific extensions.

## Claude-Specific Notes

- `.claude/memory/` is Claude Code's native user-level memory (cross-session, user-scoped).
- Persistent project memory lives at `~/.claude/projects/.../memory/MEMORY.md` and is auto-loaded into the system prompt; check it before improvising.
- `daily/` is the project's cross-CLI journal — it travels with the repo and can be read by any agent.

## Session Handoff

When a session is ending, follow the handoff flow in `AGENTS.md` → "Daily Rhythm" → "Closing".
Write to `daily/YYYY-MM-DD.md`.

## Onboarding Order for Claude Code

When entering this project with no prior context:
1. `AGENTS.md` — universal project guidance (SSOT). **Re-read after compaction.**
2. `daily/YYYY-MM-DD.md` (latest date file) — highest priority session memory
3. `cortex/INDEX.md`
4. `git log --oneline -10`

All other context (tech stack, commands, conventions) is in `AGENTS.md`.
