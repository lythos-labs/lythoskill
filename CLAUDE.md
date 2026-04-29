# CLAUDE.md

> **For full project guidance, read [`AGENTS.md`](./AGENTS.md) first.**
> This file only contains Claude Code-specific extensions.

## Claude-Specific Notes

- `.claude/memory/` is Claude Code's native user-level memory (cross-session, user-scoped). It stores preferences like coding style, naming conventions, and project-context shortcuts that persist across all your Claude Code sessions.
- `daily/` is the project's cross-CLI journal — it travels with the repo and can be read by any agent (Cursor, Windsurf, Kimi, etc.).

## Session Handoff (Claude-specific reminder)

When a session is ending, follow the handoff flow defined in `AGENTS.md` → "Session Handoff Checklist". The key difference for Claude Code users: your session handoff is written to `daily/HANDOFF.md`, which is tracked by git and readable by the next agent regardless of which CLI they use.

## Onboarding Order for Claude Code

When entering this project with no prior context:
1. `AGENTS.md` — universal project guidance (SSOT)
2. `daily/HANDOFF.md` (if exists) — highest priority session memory
3. `cortex/INDEX.md`
4. `git log --oneline -10`

All other context (tech stack, commands, architecture, code conventions) is in `AGENTS.md`.
