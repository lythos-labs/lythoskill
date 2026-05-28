---
last_consolidated: 2026-05-28
sources:
  - "AGENTS.md"
  - "cortex/wiki/04-ssot/key-decisions.md"
  - "cortex/wiki/04-ssot/pitfalls.md"
  - "packages/lythoskill-dreaming/skill/SKILL.md"
zk_validated: false
---

# Conventions -- How Things Are Done Here

> "How to do it right" layer. architecture.md is "why," key-decisions.md is "what was decided,"
> pitfalls.md is "what not to do." This document is **what to follow when writing code, docs,
> commits, or site content.** ZK agents: read this BEFORE making changes.

---

## 1. Command Shorthand Rules

AGENTS.md prose uses **internal shorthand** (`deck link`, `arena single`, `cortex probe`).
This is a readability convention for project insiders -- shorthand is NOT runnable.

**Resolution**: every shorthand resolves to one of two forms depending on audience:

| Context | Form | Example |
|---------|------|---------|
| AGENTS.md / wiki / internal prose | Shorthand is fine -- first mention establishes full command | "`deck link` (via `bun packages/lythoskill-deck/src/cli.ts link`)" |
| Site code blocks / user-facing docs / external README | **MUST use `bunx` form** -- copy-paste must work | `bunx @lythos/skill-deck link` |
| In-repo dev scripts | Use `bun packages/...` source paths | `bun packages/lythoskill-deck/src/cli.ts link` |

**Rule**: site code blocks containing bare shorthand (`deck link`, `arena single`) are a bug.
Prevention: `grep -rn '`\(deck\|arena\|curator\) ' site/` should return 0 after any site edit.
See pitfalls.md SS 3 for the failure mode this prevents.

## 2. FQ-Only Locator Policy

Per ADR-20260502012643244. All skill locators use **fully-qualified format**:

```
github.com/owner/repo[/skill-path]    # GitHub-hosted skill
localhost/project-name[/skill-path]   # Local-only skill (self-bootstrap)
```

**No bare names.** Never write `lythoskill-deck` as a locator -- must be `localhost/lythoskill-deck`
or `github.com/Caltara/lythoskill/deck`.

**Why**: bare name resolution requires an implicit registry. FQ-only makes reconciliation,
curator indexing, and deck link's symlink resolution deterministic. The enabling constraint
for cold-pool reconciliation.

**When adding a skill**: verify the real repo structure before writing the locator. Clone and
`ls` the directory layout. Do not guess paths -- 32 known locator forms exist because repos
vary. Guessing is the `|| true` of deck authoring (silent failure, no error message).

## 3. Path Conventions

| Term | Canonical name | Rationale |
|------|---------------|-----------|
| Deck working set directory | `working_set` | Was renamed to `skills` May 17, reverted May 19 -- collided with build output `skills/`. ADR-20260519144445916 locked this in. |
| Build output directory | `skills/` | Committed build output from `packages/<name>/skill/`. Pre-commit auto-rebuilds. Not gitignored. |
| Default skills path (Claude Code) | `.claude/skills/` | Claude Code's native default; skill concept originator |
| Community standard path | `.agents/skills/` | Used by 14+ agents (Kimi, Codex, Cursor, Gemini CLI, etc.). Not "Codex-specific" -- that is a fabrication (see pitfalls.md SS 1). |
| Multi-CLI fan-out | `also_link_to` (deck.toml) | `deck link` fans out to `.claude/skills/`, `.cursor/skills/`, `.kimi/skills/`, etc. via `also_link_to` config. Per ADR-20260517152850372. |
| Cold pool | `~/.agents/skill-repos/` (default) | Where `deck add` clones repos. Configurable via `cold_pool` in deck.toml. |
| Daily handoff | `daily/YYYY-MM-DD.md` | ADR-20260424125637347. `daily/HANDOFF.md` is deprecated -- do not use. |

**Never** create root-level content directories (`research/`, `showcase/`, `guides/`).
All content lives under `cortex/wiki/`. Site content is a build target sourced from wiki.

## 4. Naming Conventions

| Do use | Don't use | Why |
|--------|-----------|-----|
| `to-symlink`, `to-snapshot` | `sync`, `freeze` | Action-explicit verbs describe target state, not operations. ADR-20260509144134332. |
| `arena single`, `arena vs` | `agent-run`, `run --decks` | Renamed in 0.10.0. Legacy names are stale. ADR-20260509104832428. |
| `deck link`, `deck add` | (no alternative) | These are canonical. No rename pending. |
| `[combo.<name>]` in deck.toml | `combo-` prefix in filenames | Combo is a deck-level prompt template, not a skill type. ADR-20260506103209293. |
| `[innate]`, `[tool]`, `[transient]` | (no alternative) | Section semantics from ADR-20260501160000000. |

**No `combo-` prefix on anything** -- combo is not a skill type, not a package namespace,
not a file prefix. It is a `[combo.<name>]` TOML section containing a prompt template.

## 5. Done Checklist

Before claiming any piece of work "done" (from AGENTS.md SS "Before claiming done"):

- [ ] Tests pass: `bun test packages/<name>/src/`
- [ ] TypeScript compiles (Bun handles at test time)
- [ ] If CLI surface changed: update `packages/<name>/README.md`
- [ ] If new package: add to `scripts/publish.sh` PACKAGES array
- [ ] If new/modified deck example: `deck validate --deck examples/decks/<name>.toml` passes
- [ ] If producing documentation: run ZK validation -- spawn zero-knowledge subagent,
      self-report understanding, revise unclear sections
- [ ] Commit with `Closes: TASK-xxx` trailer if task exists

**For guard script changes** (`.husky/`, `scripts/pre-commit-*.ts`, `scripts/test-report.ts`,
`scripts/check-path-safety.ts`, `scripts/adr-check.sh`): run a negative test -- deliberately
break something and verify the guard catches it.

**For narrative/positioning content** (marketing, comparison tables, "why lythoskill" prose):
explicit user confirm required before commit. No push-first-no-review for narrative work.

## 6. Commit Conventions

### Trailer Syntax

Cortex governance is commit-driven. Trailers in the commit message body (after a blank line)
are parsed by `.husky/post-commit`:

```
Closes: TASK-xxx             # Any status -> completed
Task: TASK-xxx review        # Move task to review
ADR: ADR-xxx accept          # Accept an ADR
Epic: EPIC-xxx done          # Complete an epic
```

**Do not hand-edit task status by moving files.** Always use the cortex CLI or commit trailers.
Manual file moves bypass state-history tracking and cause probe mismatches.

### Commit Message Style

- Descriptive, imperative mood
- Scope prefix: `feat(scope):`, `fix(scope):`, `docs(scope):`, `chore(scope):`
- Release bump commits: `chore(release): vX.Y.Z`
- Daily handoff commits: `docs(daily): session closeout`
- Include trailer on a new line after the body (blank line separator)

### What NOT to do

- No `--amend` on published commits
- No `--no-verify` (skip hooks)
- No `|| true` in guard/validation contexts -- parse stdout for the specific signal instead
- No `sed -i` for batch changes -- survey with grep (read-only), then fix each call site
  individually with the type checker watching

## 7. Cortex State Transitions

Always use the CLI, never `mv` files by hand:

```
cortex task "title"           # Create task in 01-backlog
cortex start TASK-xxx         # Move to 02-in-progress
cortex review TASK-xxx        # Move to 03-review
cortex done TASK-xxx          # review -> completed
cortex complete TASK-xxx      # any status -> completed (trailer-driven)
```

**Close tasks you finish.** Do not leave tasks in `02-in-progress` after work is done.
Run `cortex probe` before session end to catch inconsistencies.

## 8. Site & Doc Rules

### Code Blocks

All site code blocks must use `bunx @lythos/...` form. Copy-paste must work without
translation. Prose may use shorthand AFTER the first occurrence: "Use `deck link`
(via `bunx @lythos/skill-deck link`) to..."

### Agent Paths in Site Content

- `.claude/skills/` is Claude Code's default (skill concept originator)
- `.agents/skills/` is the community standard (14+ agents)
- Never imply one is the "correct" path or that `.agents/skills/` is "Codex-specific"
- See pitfalls.md SS 1 for the fabrication this prevents

### ZK Validation

Every significant doc change requires a ZK validation pass before "done":
1. Write doc
2. Spawn zero-knowledge subagent to read and self-report understanding
3. Revise unclear sections
4. Re-validate

For site pages, ADRs, SSOT files, and wiki entries that future agents onboard from.

## 9. Daily Handoff Conventions

When session ends or context pressure is high:

1. Confirm triple state: `git status` + `cortex list` + session recall
2. Write to `daily/YYYY-MM-DD.md` (never `daily/HANDOFF.md`)
3. Top section = ground truth (overwrite, not append) -- agents head-read
4. Focus on what file exploration CANNOT recover: pitfalls, true working-tree state,
   specific next steps. Never replay git log or cortex INDEX.

## 10. Related SSOT Documents

| Document | Answers | When to read |
|----------|---------|-------------|
| `architecture.md` | Why the system is shaped this way | Understanding design rationale |
| `key-decisions.md` | What was decided and which ADRs still hold | Before proposing architecture changes; read SS ZK Agent Alert before touching `workspace:*`, `working_set`, `skills/`, or `bun packages/` paths |
| `pitfalls.md` | What failure modes keep recurring | Before generating docs or site content |
| `conventions.md` (this file) | How to do things right | Before writing code, commits, docs, or site content |
| `active-quests.md` | What we're building now | Before starting new work |
