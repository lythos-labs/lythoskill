# Lythoskill: Understanding from a Zero-Knowledge Subagent

## What Is This Project?

**Lythoskill** is a multi-agent skill management platform for AI coding agents. The project's core thesis is: _what matters is not how many skills you have, but which ones the agent sees at the same time._ It provides tooling and infrastructure for declaring, discovering, governing, benchmarking, and organizing skills that AI agents load at runtime.

The project is a **monorepo** (`packages/<name>/`) written in TypeScript, using Bun as the runtime. Each package may contain a `skill/SKILL.md` if it is a "skill product" -- a skill distributable to other agents. The project follows a lock-step versioning scheme (currently 0.14.0 across all packages).

## Key Concepts

### 1. The Three-Layer Skill Architecture

| Layer | Path | Role | Analogy |
|-------|------|------|---------|
| **Cold Pool** | `~/.agents/skill-repos/` | All downloaded skills (storage) | Card binder / `$GOPATH/pkg/mod/` |
| **skill-deck.toml** | Project root | Declared desired state (declaration) | Deck list / `go.mod` |
| **Working Set** | `.claude/skills/` | What the agent actually scans (runtime) | Hand in play / loaded modules |

The cold pool uses go-module-style paths: `host.tld/owner/repo/skills/skill-name/`.

### 2. Deck Governance (the lythoskill-deck skill)

The `deck` skill is the **irreducible dependency** -- the only skill needed to bootstrap everything else. Its core operations:

- **`deck link`**: Reconciler that makes `.claude/skills/` match `skill-deck.toml` exactly. It creates symlinks for declared skills, removes everything else (deny-by-default). Non-symlink entries are backed up to `.claude/skills.bak.*.tar.gz`.
- **`deck add`**: Declares a new skill in the toml (from a remote URL or cold pool locator).
- **`deck remove`**: Removes a skill from declaration and working set.
- **`deck validate`**: Checks TOML schema; `--remote` probes locators against GitHub.
- **`deck refresh`**: Plan-only scan for updates; `--exec` to git-pull.
- **`deck reconcile`**: Drift report vs cold pool.

A companion file, `skill-deck.lock`, records resolved paths, content hashes, and constraints for recovery.

### 3. Skill Types (Deck Sections vs SKILL.md Types)

| Deck TOML Section | Meaning | SKILL.md `type` Field |
|-------------------|---------|----------------------|
| `[innate]` | Eagerly loaded, always full context | Always `standard` _or_ `flow` |
| `[tool]` | Lazy loaded, read only on trigger | Always `standard` _or_ `flow` |
| `[combo]` | Router skill, delegates to specialists | Always `standard` _or_ `flow` |
| `[transient]` | Temporary workaround with expiration | Always `standard` _or_ `flow` |

**Critical distinction**: `innate`/`tool`/`combo`/`transient` are deck TOML section names, NOT SKILL.md type values. The valid SKILL.md type values are only `standard` (default, prompt-based) and `flow` (embeds Mermaid/D2 flowcharts). Any other type value causes the skill to be silently skipped during loading.

### 4. Thickness Layers

Not all logic belongs in SKILL.md:
- **Heavy**: npm/pip/CLI packages (external package manager)
- **Dispatcher**: Flow or Combo skills (workflow orchestration, routing)
- **Glue**: SKILL.md + scripts/ (thin prompt-based skills)

The real algorithm lives in external tools. Skills only dispatch.

### 5. Seed Bootstrap Pattern

Start with a minimal deck containing only `lythoskill-deck` as innate. The agent reads the deck SKILL.md, learns the schema, uses curator to discover skills in the cold pool, then self-expands via `deck add` + `deck link`. This is the pattern I executed in this session.

### 6. Phase Decks

When a task spans different skill sets, use **separate deck files** per phase instead of editing a single toml. Each phase deck is independently auditable. The reconciler handles the transition: old symlinks removed, new ones created, no state leaks.

### 7. Deny-by-Default

Undeclared skills are physically absent from the working set. This prevents "silent blend" (same-niche skills coexisting, causing the agent to pick randomly and produce inconsistent output).

### 8. Project Cortex (Governance)

GTD-style governance system: ADR (Architecture Decision Records), Epic, Task, Wiki. Uses timestamp IDs to prevent collisions. Numeric-prefixed directories enforce workflow order. Critical rule: always use CLI for state transitions -- never `mv` files by hand, as manual moves bypass Status History and cause probe mismatches. Commit trailers (`Closes: TASK-xxx`, etc.) auto-dispatch via `.husky/post-commit`.

### 9. Session Handoff

Session state is written to `daily/YYYY-MM-DD.md` (not `HANDOFF.md` -- that path is deprecated). The first section is `## Session Handoff` with Ground Truth at the top (overwrite, not append). The project-onboarding skill reads this on next session start.

### 10. Arena (Skill Testing)

A test-play system for skills and deck configurations. Supports single-deck tests, multi-deck A/B comparisons, and cross-player comparisons. All experiments run in `/tmp`, never in committed directories. Provides Pareto frontier analysis (no single "best" skill -- only optimal trade-offs across quality, tokens, maintainability).

## Key Workflows

### Session Start
1. Read `AGENTS.md` (redirected from `CLAUDE.md`)
2. Read latest `daily/YYYY-MM-DD.md` for session context
3. Read `cortex/INDEX.md` for project state
4. Read `git log --oneline -10` for recent activity
5. If after compaction: re-read all innate skill SKILL.md files first

### Session End
1. Run `git status` and `git log --oneline -5`
2. Run `cortex list` for epics/tasks
3. Write Ground Truth to top of `daily/YYYY-MM-DD.md`
4. Append pitfall log, next steps, working-tree state

### Adding a Skill
1. Discover via curator search or web search
2. `deck add github.com/owner/repo/skills/skill-name`
3. `deck link` to reconcile working set
4. `deck validate` to confirm

### Switching Phase
1. `deck link --deck phase<N>.toml` -- atomic switch
2. Work in the new phase
3. `deck link --deck ./skill-deck.toml` -- restore parent

## Skills I Added (and Why)

Starting from the vanilla seed deck (only `lythoskill-deck`), I expanded to 5 skills based on what the project's own AGENTS.md documents as essential:

| # | Skill | Type | Why Added |
|---|-------|------|-----------|
| 1 | **lythoskill-deck** | Innate | Already present. Irreducible dependency for all skill governance. |
| 2 | **lythoskill-project-onboarding** | Tool | Essential for session start: loads daily handoff, avoids redundant file exploration. The CQRS read-side of the handoff pair. |
| 3 | **lythoskill-project-scribe** | Tool | Essential for session end: writes daily handoff including pitfalls and working-tree state. The CQRS write-side. |
| 4 | **lythoskill-project-cortex** | Tool | Required for task/epic/ADR governance. Project rules forbid manual `mv` of cortex files -- CLI-only state transitions. |
| 5 | **lythoskill-curator** | Tool | Required for discovering and indexing skills in the cold pool. The seed bootstrap pattern explicitly depends on curator for agent self-expansion. |

**Not yet added** but potentially useful depending on task:
- **lythoskill-arena**: For benchmarking and testing skills/decks
- **lythoskill-coach**: For reviewing and optimizing SKILL.md quality
- **lythoskill-red-green-release**: For user-acceptance-driven release workflow

## Architecture Principles (from AGENTS.md)

1. **Intent/Plan/Execute**: All CLI logic separates intent (config parse) from plan (pure function, IO injected) from execute (real IO). Pure plan functions are unit-testable.
2. **`--dry-run`**: Every CLI command supports dry-run for plan review before execution.
3. **CLI errors are agent prompts**: Errors use a 3-part template (what failed + why + fix command). Agents read errors and execute fixes.
4. **No premature abstraction**: Three similar lines > premature abstraction.
5. **Tests close specific failure modes**: 634 tests expected, 0 failures. New pure functions need co-located `*.test.ts`.
6. **Dormancy tests**: Fallback hints (mirror, proxy, retry) must stay silent on the healthy path.
