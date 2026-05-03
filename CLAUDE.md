# CLAUDE.md

> **For full project guidance, read [`AGENTS.md`](./AGENTS.md) first.**
> This file only contains Claude Code-specific extensions.

> **⚠️ Compaction-safe reminder.** Before any release, version, git remote, or npm command, re-read [`AGENTS.md` → Release & Auth Workflow](./AGENTS.md#release--auth-workflow). Auth (`.git/config`, `~/.ssh/`, `.github-token`, `.npm-access`) is **pre-configured — do not modify**. Versions move via `bunx @lythos/skill-creator bump`, never `jq`/`python`/hand-edit. Past Claude sessions corrupted the git remote URL after losing context — this warning lives at the top so a post-compaction agent sees it on the next read.
>
> **Cortex trailer + lane discipline.** After compaction, you may not remember the trailer syntax or epic lane rules. Quick reference: commit message trailers (`Closes: TASK-xxx`, `Task: TASK-xxx review`, `ADR: ADR-xxx accept`) are parsed by `.husky/post-commit` and auto-create follow-up commits. Epic lanes are dual-track (`main` + `emergency`, max 1 active each). For full details see [`AGENTS.md` → Project Governance (Cortex)](./AGENTS.md#project-governance-cortex).

## Claude-Specific Notes

- `.claude/memory/` is Claude Code's native user-level memory (cross-session, user-scoped). It stores preferences like coding style, naming conventions, and project-context shortcuts that persist across all your Claude Code sessions.
- Persistent project memory lives at `~/.claude/projects/.../memory/MEMORY.md` and is auto-loaded into the system prompt; check it for entries on auth, lock-step versioning, handoff path, etc. before improvising.
- `daily/` is the project's cross-CLI journal — it travels with the repo and can be read by any agent (Cursor, Windsurf, Kimi, etc.).

## Session Handoff (Claude-specific reminder)

When a session is ending, follow the handoff flow defined in `AGENTS.md` → "Session Handoff Checklist". Write to `daily/YYYY-MM-DD.md` (per ADR-20260424125637347). **Do NOT write or read `daily/HANDOFF.md` — that path is deprecated**; older docs may still reference it but the dated file is canonical.

## Onboarding Order for Claude Code

When entering this project with no prior context:
1. `AGENTS.md` — universal project guidance (SSOT). **Re-read after compaction**, especially the Release & Auth Workflow section.
2. `daily/YYYY-MM-DD.md` (latest date file) — highest priority session memory
3. `cortex/INDEX.md`
4. `git log --oneline -10`

All other context (tech stack, commands, architecture, code conventions) is in `AGENTS.md`.
