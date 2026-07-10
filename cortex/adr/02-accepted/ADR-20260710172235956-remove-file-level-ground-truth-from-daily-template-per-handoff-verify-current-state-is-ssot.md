# ADR-20260710172235956: Remove file-level Ground Truth from daily template — per-handoff Verify Current State is SSOT

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-07-10 | Created |
| accepted | 2026-07-10 | Accepted |

## Background

The daily handoff file (`daily/YYYY-MM-DD.md`) currently has a `## Ground Truth` section at the file top, above all `## Session Handoff` sections. This section contains:
- Git HEAD
- Version
- Deck status
- Branch state
- Active epic/task counts

**Problem**: In the prepend model (new handoffs added at the top), the file-level `## Ground Truth` is written once and never updated. Subsequent sessions prepend new handoffs above older ones, but the Ground Truth at the very top remains stale.

Evidence from `daily/2026-07-10.md`:
- `## Ground Truth` says Git HEAD = `76151e38`
- First `## Session Handoff` (Afternoon) says Git HEAD = `5772ce89` (different commit)
- The Ground Truth is **older** than the handoff it precedes

This creates a UX hazard: an onboarding agent scanning the file top-to-bottom sees stale Ground Truth before reaching the fresh handoff. The stale Ground Truth may mislead the agent about current state.

## Decision Drivers

1. **Single Source of Truth (SSOT)**: There should be exactly one place for "current state" in a handoff file. Having two (file-level Ground Truth + per-handoff Verify Current State) guarantees divergence.
2. **Prepend model compatibility**: File-level metadata cannot stay fresh in a prepend architecture without rewriting the file top on every session — which is complex and error-prone.
3. **Agent UX**: The first thing an onboarding agent reads should be the freshest information, not a stale summary.
4. **Self-contained handoffs**: Each session's handoff should be independently understandable without requiring the agent to reconcile multiple state sources.

## Options

### Option A: Remove file-level Ground Truth, expand per-handoff Verify Current State
Move all Ground Truth fields into each `## Session Handoff`'s `## 0. Verify Current State` section. Each handoff is self-contained.

**Pros**:
- No stale metadata at file top
- Each handoff is independently verifiable
- Onboarding agent reads fresh state immediately
- Simple: no file-level state to maintain
- Aligns with "handoff = self-contained snapshot" principle

**Cons**:
- Slight repetition if multiple sessions same day (each handoff repeats git HEAD, version, etc.)
- File loses "at-a-glance" daily summary

### Option B: Keep file-level Ground Truth, update it on every prepend
Maintain `## Ground Truth` at file top, but rewrite it every time a new handoff is prepended.

**Pros**:
- Retains file-level daily summary
- No repetition across handoffs

**Cons**:
- Complex: prepend operation must now rewrite file top + insert handoff
- Risk of corrupting file structure during rewrite
- Violates "simple prepend" model
- Still has two state sources (file-level + handoff-level), just kept in sync by convention

### Option C: Keep file-level Ground Truth, mark as potentially stale, agent must skip
Keep current structure but add explicit warning: "⚠️ May be stale, verify with latest handoff."

**Pros**:
- Minimal code change
- Retains backward compatibility with existing daily files

**Cons**:
- Does not solve the problem, only acknowledges it
- Agent must still perform mental reconciliation between two state sources
- "May be stale" is a smell — if it's always potentially stale, why have it?

## Decision

**Choice**: Option A

**Rationale**:
- The prepend model is non-negotiable (it enables efficient onboarding reading)
- File-level metadata in a prepend architecture is inherently stale
- Repetition across handoffs is acceptable cost for correctness
- `## 0. Verify Current State` already exists in the handoff template and contains the same fields as Ground Truth — we are consolidating, not inventing
- The "at-a-glance" daily summary can be recovered by reading the first handoff's Verify section, which is always at the top of the first handoff

## Impact

- Positive:
  - Eliminates stale metadata hazard
  - Simplifies scribe skill (no file-level state management)
  - Each handoff is a complete, verifiable snapshot
  - Onboarding agent gets fresh state without reconciliation
- Negative:
  - Existing daily files with `## Ground Truth` become legacy format (not a problem — they are historical, not templates)
  - Slight increase in handoff size (repeated fields)
- Follow-up:
  - Update `daily-template.md` to remove `## Ground Truth` section, expand `## 0. Verify Current State`
  - Update scribe SKILL.md to reflect new template
  - Update onboarding SKILL.md to remove "Ground Truth" references
  - Consider: should `## 0. Verify Current State` include a `diff` command (from previous handoff to current HEAD) to show what changed since last session?

## Related
- Related ADR: ADR-20260424125637347 (daily/YYYY-MM-DD.md as canonical handoff path)
- Related Epic:
- Related Task: TASK-20260710172217283
