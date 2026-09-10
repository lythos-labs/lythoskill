# CLAUDE.md

> **For full project guidance, read [`AGENTS.md`](./AGENTS.md) first.**
> This file only contains Claude Code-specific extensions.

> **⚠️ Compaction-safe reminder.** Before any release, version, git remote, or npm command, re-read [`AGENTS.md` → Release & Auth Workflow](./AGENTS.md#release--auth-workflow). Auth (`.git/config`, `~/.ssh/`, `.github-token`, `.npm-access`) is **pre-configured — do not modify**. Versions move via `bunx @lythos/skill-creator bump`, never `jq`/`python`/hand-edit. Past Claude sessions corrupted the git remote URL after losing context — this warning lives at the top so a post-compaction agent sees it on the next read.
>
> **Cortex trailer + lane discipline.** After compaction, you may not remember the trailer syntax or epic lane rules. Quick reference: commit message trailers (`Closes: TASK-xxx`, `Task: TASK-xxx review`, `ADR: ADR-xxx accept`) are parsed by `.husky/post-commit` and auto-create follow-up commits. Epic lanes are dual-track (`main` + `emergency`, max 1 active each). For full details see [`AGENTS.md` → Project Governance (Cortex)](./AGENTS.md#project-governance-cortex).
>
> **📌 Work that is not in `cortex/` did not happen.** Project state — tasks, ADRs, epics, wiki — is written **only** through `bun packages/lythoskill-project-cortex/src/cli.ts <cmd>` (shorthand: `cortex task` / `cortex adr` / `cortex epic`). Neither `.claude/memory/` nor `~/.claude/projects/.../memory/` is project state: they are **yours alone**, unreadable by the other agents on this repo, and they do not travel with git. If you fixed something, decided something, or found something a later agent needs, it goes in a **card or an ADR** — not in memory, not in a scratch file, not in your context. **Compaction is the power cut; only git-tracked files survive it.**

## Claude-Specific Notes

- `.claude/memory/` is Claude Code's native user-level memory (cross-session, user-scoped). It stores preferences like coding style, naming conventions, and project-context shortcuts that persist across all your Claude Code sessions.
- Persistent project memory lives at `~/.claude/projects/.../memory/MEMORY.md` and is auto-loaded into the system prompt; check it for entries on auth, lock-step versioning, handoff path, etc. before improvising.
- `daily/` is the project's cross-CLI journal — it travels with the repo and can be read by any agent (Cursor, Windsurf, Kimi, etc.).

## Session Handoff (Claude-specific reminder)

Scribe is **save discipline** (怕断电所以随手存盘) — save after each batch of commits lands, while facts are fresh; compaction is the power cut and only git-tracked files survive it. The `## Session Handoff` section names the next session's read artifact — saving mid-session says nothing about this session ending. Flow: `AGENTS.md` → "Session Close & Submit". Write to `daily/YYYY-MM-DD.md` (per ADR-20260424125637347). **Do NOT write or read `daily/HANDOFF.md` — that path is deprecated**; older docs may still reference it but the dated file is canonical.

## Onboarding Order for Claude Code

When entering this project with no prior context:
1. `AGENTS.md` — universal project guidance (SSOT). **Re-read after compaction**, especially the Release & Auth Workflow section.
2. `daily/YYYY-MM-DD.md` (latest date file) — highest priority session memory
3. `cortex/INDEX.md`
4. `git log --oneline -10`

All other context (tech stack, commands, architecture, code conventions) is in `AGENTS.md`.
