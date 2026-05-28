---
last_consolidated: 2026-05-28
sources: ["daily/2026-05-28.md", "daily/2026-05-21.md", "cortex/wiki/01-patterns/2026-05-02-thin-skill-pattern.md", "AGENTS.md"]
zk_validated: true
zk_issues: 0
zk_validator: "ZK subagent ae891a5 — 2026-05-28 — 'mostly clear, structure clean, concrete examples ground each pattern'"
---

# Pitfalls — Recurring Failure Modes

> SSOT of systemic failure patterns. Each entry: symptom → root cause → fix.
> Updated when a new pattern repeats across ≥2 sessions.

## 1. Agent Scan → Learn Poorly → Fabricate

**Symptom**: Agent writes documentation that looks plausible but contains factual errors — non-existent skill paths, bare command names in code blocks, wrong platform names.

**Root cause**: Agent scans repo surface-level, forms incomplete mental model, fills gaps by guessing. Most common when generating site/docs from a "scan this project and write about it" prompt.

**Real examples**:
- `mermaid` skill referenced in site-builder.toml but doesn't exist in cold pool
- `deck link` written as a code block command (not runnable — needs `bunx @lythos/skill-deck link`)
- `.agents/skills/` described as "Codex-specific" (actually community standard, 14+ agents)

**Fix**: Three-layer guardrail:
1. SKILL.md `description` pushy trigger → forces agent to consult guide before writing
2. Reference guide (`deck-building-guide.md`) as trusted source of truth
3. CLI guardrail (`deck validate`) catches fabrication in output

**Prevention**: When asking any agent to produce documentation, run ZK validation — spawn a zero-knowledge subagent to read the output and self-report understanding.

## 2. Context Pressure → Stale Docs → More Pressure

**Symptom**: 81 ADRs + 54 wiki patterns + 25 dailies. Agent can't read everything → skims → builds wrong assumptions → writes wrong docs. Cycle accelerates.

**Root cause**: Documents accumulate without garbage collection. Old ADRs reference deprecated commands, old wiki patterns describe removed features.

**Fix**:
1. Dreaming skill (see `packages/lythoskill-dreaming/skill/SKILL.md`) periodically consolidates → SSOT
2. AGENTS.md onboarding order: SSOT first, then wiki/adr on demand
3. ZK validation catches when stale content confuses fresh agents

## 3. Bare Command Shorthand in User-Facing Docs

**Symptom**: Site code blocks contain `deck link` or `arena single` — not runnable.

**Root cause**: Agent reads AGENTS.md internal convention (where shorthand is OK), copies it to site docs without translating to user-facing form.

**Fix**: AGENTS.md "Command Shorthand Convention" section + site rule: code blocks must use `bunx @lythos/...` form.

**Prevention**: `grep -rn '`\(deck\|arena\|curator\) ' site/` in code blocks should return 0 after any site edit.

## 4. Cold Pool Staleness

**Symptom**: `deck validate` reports skill not found, but the skill exists on GitHub — just not cloned locally.

**Root cause**: `deck validate` treated "not in cold pool" as hard error. Now (v0.15.4+) it's a warning with HATEOAS next-step suggestions.

**Fix**: `bunx @lythos/curator add <locator>` or `git clone` into cold pool.

## 5. Post-Compaction Amnesia

**Symptom**: Agent loses context after conversation compaction, re-derives facts from scratch (sometimes wrongly), makes decisions on stale assumptions.

**Root cause**: Claude Code compaction drops session context silently. Agent doesn't know what it forgot.

**Fix**: CLAUDE.md top banner + AGENTS.md Release & Auth warning at top. Before any release/auth/version command, re-read the workflow section. Daily handoff captures session state that compaction can't erase.
