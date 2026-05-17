# AGENTS.md — lythoskill

> Multi-agent project context. CLAUDE.md redirects here. For full detail, see `cortex/wiki/`.

## Index (Page Table)

| Topic | Where |
|-------|-------|
| Release & Auth | § below, then `./scripts/publish.sh` |
| Cortex governance | `cortex/INDEX.md` |
| Session handoff | `daily/YYYY-MM-DD.md` (latest) |
| Architecture decisions | `cortex/adr/02-accepted/` |
| Lessons & patterns | `cortex/wiki/` |
| Test conventions | `TESTING.md` |

## Critical Rules (close real failure modes)

### 1. Release & Auth — do NOT touch
Auth (`.git/config`, `~/.ssh/`, `.github-token`, `.npm-access`) is pre-configured.
Versions: `bunx @lythos/skill-creator bump <patch|minor|major>` — never hand-edit `package.json`.
Publish: `./scripts/publish.sh`. Never `npm login` or modify git remote URL.
**Failure**: agent broke git remote URL after compaction, forced manual recovery.

### 2. Cortex — always use CLI, never mv
Task/epic/adr/wiki: `bunx @lythos/project-cortex <command>`.
State changes: `cortex start/review/done/complete <ID>`. Never `mv` files by hand.
Manual moves bypass Status History → probe noise → next agent inherits drift.
Commit trailers (`Closes: TASK-xxx`) auto-dispatch via `.husky/post-commit`.

### 3. Compaction amnesia — re-read after context loss
After compaction, skill reload, or `/clear`: re-read this file's Release section before any release/git/npm command.
Write session state to `daily/YYYY-MM-DD.md` (top-overwrite Ground Truth).
Read latest daily on session start: `ls daily/*.md | sort | tail -1`.

### 4. Agent Behavior Boundary
| Layer | Who decides | Examples |
|-------|-------------|----------|
| Intent (Goal) | User | What to build, which approach |
| Plan (Architecture) | Agent proposes, User ratifies | ADR, epic design |
| Execute (Implementation) | Agent | Code, tests, commits |
| Release (Ship) | User says "LGTM" | Tag, publish, deploy |

"I think / 我觉得" → write an ADR, don't jump to implementation.
When User corrects approach: write the lesson to `cortex/wiki/03-lessons/`.

### 5. Intent/Plan/Execute — pure functions separate IO
All CLI logic: Intent (config parse) → Plan (pure function, IO injected) → Execute (real IO).
Pure plan functions are unit-testable without filesystem/network.
Every CLI command supports `--dry-run` for plan review before execution.
**Failure**: agent mixed IO into plan logic → untestable, fragile to env changes.

### 6. Control Transfer — CLI exits are prompts for agents
CLI errors use 3-part template: `[What failed] + [Why] + [Fix command]`.
Agent reads error → executes fix → retries. Error = interrupt, not dead-end.
CLI success exits tell agent next step: `✅ Workdir ready → spawn subagent`.
**Pattern**: `reproduce.sh` IoC — shell echo hands control to agent at the intelligent-step boundary.

### 7. No premature abstraction
Three similar lines > premature abstraction. Don't add features beyond the task. Delete unused code completely.
**Failure**: agent added "helper" for one-off operation, created coupling without benefit.

### 8. Tests close specific failure modes
`bun --filter='*' run test` is canonical. 634 tests, 0 fail expected.
New pure functions → co-located `*.test.ts`. Never skip tests for "simple" changes.
**Dormancy**: fallback hints (mirror, proxy, retry) must stay silent on healthy path — grep stderr, require 0 matches.

## Conventions

- **Monorepo**: `packages/<name>/` — each has `package.json` + `skill/SKILL.md` (if skill product)
- **Skill deck**: `skill-deck.toml` declares active skills; `deck link` syncs working set
- **Cold pool**: `~/.agents/skill-repos/` — skill source of truth
- **Experiments**: `/tmp` only, never committed directories. Arena `prepare-workdir` enforces this.
- **Git**: commits include task ID. Push after LGTM. `git log --oneline -10` for recent state.

## Skill Loading Order

1. Innate skills (eager load, always full context): `lythoskill-deck`
2. Tool skills (lazy load, read on trigger): arena, cortex, curator, scribe, onboarding, coach
3. After compaction: re-read every innate skill's full SKILL.md before any tool skill.
