# ADR-20260616000939948: skill-deck.lock: separate declarative lock from operational state snapshot

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-06-15 | Created |
| accepted | 2026-06-15 | Accepted |

## Background

`skill-deck.lock` currently serves two conflicting purposes:

1. **Declarative lock**: Records the content hash of each linked skill, ensuring reproducibility ("this exact version of the skill was linked")
2. **Operational state snapshot**: Records `linked_at` timestamp and current hash on every `deck link` invocation

The problem: `deck link` updates `skill-deck.lock` even when no skill content has changed — only the timestamp changes. This creates unstaged modifications in `git status` that confuse agents (and humans) into thinking something needs to be committed.

**Real incident**: During AGENTS.md v2.1 onboarding testing, a zero-knowledge agent executed `deck link` as part of Boot First, then saw `skill-deck.lock` as modified in `git status`. The agent flagged this as "unexpected" and asked whether it should be committed. This is friction in the onboarding flow that should not exist.

The root cause is a design inconsistency with other lockfiles in the project:
- `bun.lockb` only changes when dependencies change (substantive change)
- `skill-deck.lock` changes on every `deck link` (operational refresh)

## Decision Drivers

1. **Onboarding friction**: New agents should not see unstaged changes after following the Boot First sequence
2. **Semantic clarity**: A "lockfile" should lock state, not record operation history
3. **Git hygiene**: Files that change on every routine operation should not be git-tracked (or should not change)
4. **Reproducibility**: We still need to know "which skill version is linked" for debugging and drift detection

## Options

### Option A: Split into two files

- `skill-deck.lock` (git-tracked): Content hash lock — only updates when a skill's actual content changes
- `skill-deck.state` (git-ignored): Operational snapshot — `linked_at`, mode, path, etc. Updated on every `deck link`

**Pros**:
- Clean separation of concerns
- `skill-deck.lock` behaves like `bun.lockb` — only changes on substantive updates
- `skill-deck.state` can store rich operational metadata without git noise
- Aligns with existing `.gitignore` patterns (`.claude/skills/` is already ignored)

**Cons**:
- Two files to manage instead of one
- Need to update `deck link`, `deck validate`, and any consumers of the lockfile
- Migration: existing `skill-deck.lock` needs to be split on first run

### Option B: Make `skill-deck.lock` idempotent

Keep one file, but only write to it when content hashes actually change. Skip the write if only `linked_at` would differ.

**Pros**:
- No file proliferation
- Minimal code change
- Backward compatible

**Cons**:
- Loses `linked_at` information (useful for debugging "when was this skill last refreshed?")
- Still mixes declarative and operational concerns in one schema
- Doesn't solve the semantic confusion — agents still see a lockfile that sometimes changes, sometimes doesn't

### Option C: Git-ignore `skill-deck.lock` entirely

Treat it as pure derived state, like `.claude/skills/`.

**Pros**:
- Simplest solution
- Zero git noise

**Cons**:
- Loses reproducibility — no way to know "which version was linked" without running `deck link`
- Breaks CI drift detection (probe uses lockfile to verify working set)
- Breaks multi-agent consistency (agent A links, agent B has no record of what was linked)

## Decision

**Choice**: Option A — Split into `skill-deck.lock` (declarative, git-tracked) and `skill-deck.state` (operational, git-ignored)

**Rationale**:
- The two concerns are genuinely different: "what version is locked" vs "when did we last link"
- `skill-deck.lock` should behave like `bun.lockb` — agents expect lockfiles to be stable
- `skill-deck.state` can evolve independently (add more operational metadata without affecting git)
- The migration cost is one-time and mechanical

## Impact

- Positive:
  - Onboarding friction reduced: Boot First sequence produces clean `git status`
  - Semantic clarity: lockfile = lock, state file = state
  - Future extensibility: `skill-deck.state` can store link history, retry counts, etc.
- Negative:
  - One-time migration complexity
  - Need to update probe and any tools that read `skill-deck.lock`
- Follow-up:
  - Implement `skill-deck.state` schema
  - Update `deck link` to write both files
  - Update `deck validate` to check both
  - Update probe to use `skill-deck.state` for operational checks, `skill-deck.lock` for content verification
  - Add `skill-deck.state` to `.gitignore`
  - Migration: on first run, split existing `skill-deck.lock` into both files

## Related
- Related ADR: ADR-20260423124812645 (Why `skills/` is committed build output)
- Related Epic: EPIC-20260615211529145 (SSOT CLI help and documentation governance)
- Related Task: TASK-20260615234143099 (AGENTS.md v2.1 onboarding improvements)
