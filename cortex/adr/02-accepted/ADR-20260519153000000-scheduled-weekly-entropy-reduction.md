# ADR-20260519153000000: Scheduled Weekly Entropy Reduction

**Status**: Accepted
**Date**: 2026-05-19

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-19 | Draft discussion, cron + pre-commit + CI hybrid approach |
| accepted | 2026-05-19 | Accepted via ADR state transition |

## Context

This session (2026-05-19) uncovered a cluster of governance debt that accumulated silently over multiple agent sessions:

| Debt Found | Root Cause | Detection Method |
|------------|------------|-----------------|
| `working_set = "skills"` (build output collision) | Agent fatigue — confused working set with build output | User noticed YAML warning + git status |
| `.agents/skills/` symlinks committed (17 total) | Agent didn't understand thin pattern + `git add -A` | GitHub tree audit |
| `LYTHOSKILL_GH_MIRROR` naming inconsistency | Agent fatigue — chose convenience over consistency | User review of env var prefix |
| `LYTHOS_COLD_POOL` dead config | Scaffolding never cleaned up after deck.toml standardized | Code audit |
| W20 weekly missing | Agent session ended without writing weekly | User noticed gap during weekly request |
| Env vars undocumented | Agent didn't consolidate knowledge into README | User questioning |

**Pattern**: Each issue is individually small. Together they represent "governance entropy" — the system drifts toward disorder between cleanup sessions.

## Problem

Agent sessions are bounded (context limits, fatigue). Each session leaves small amounts of debt:
- A misconfigured field
- A committed symlink
- A missing document
- An unclosed task

Without a periodic review, these compound. Today's session was expensive because it had to fix **7** separate fatigue artifacts at once. The cost of repair is `O(n)` where `n` is the number of sessions since last cleanup. The cost of periodic review is `O(1)` — a fixed weekly check.

## Decision

Implement **scheduled weekly entropy reduction** that combines automated detection with agent review.

### What Happens Weekly

```
Trigger: Cron fires every Sunday 23:00 (or user preference)
  │
  ├── 1. Automated probe (no LLM cost)
  │      - cortex probe → status inconsistencies
  │      - find skills/ -type l → symlink pollution
  │      - git status → untracked working set files
  │      - check env var prefix consistency
  │      - check missing weekly for past 7 days
  │
  ├── 2. Agent review (if any probe flags found)
  │      - Read flagged items
  │      - Classify: false positive / real debt / needs ADR
  │      - Fix or register task
  │
  └── 3. Weekly scribe (always)
           - Write weekly/YYYY-Wxx.md even if "nothing happened"
           - "Nothing happened" is itself information
```

### Implementation Options

| Approach | Trigger | Cost | Coverage |
|----------|---------|------|----------|
| **Cron + agent** (preferred) | Weekly prompt | 1 agent review / week | All debt types |
| **Pre-commit expansion** | Every commit | Zero marginal cost | Commit-time only |
| **CI pipeline** | Every push | Zero marginal cost | Post-push only |
| **Hybrid** (recommended) | Cron + pre-commit + CI | Higher setup | Full coverage |

**Rationale for hybrid**:
- **Pre-commit**: Prevents *new* debt (symlinks, env var drift) — lowest cost, highest ROI
- **Cron**: Catches *existing* debt that pre-commit can't see (missing weekly, stale tasks)
- **CI**: Backstop for pre-commit bypasses — fails build if debt detected

### Pre-Commit Expansion

Add to `.husky/pre-commit`:

```bash
# 3.0. Weekly entropy check (runs every commit, lightweight)
#      Full scan on Sundays; quick check other days
DAY_OF_WEEK=$(date +%u)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
  echo "🔍 Weekly entropy scan..."
  # Check for missing weekly
  LATEST_WEEKLY=$(ls weekly/*.md 2>/dev/null | sort | tail -1 | grep -o 'W[0-9]\+')
  CURRENT_WEEK=$(date +%V)
  if [ "$LATEST_WEEKLY" != "W$CURRENT_WEEK" ]; then
    echo "⚠️  No weekly for current week (W$CURRENT_WEEK). Run weekly scribe."
  fi
fi
```

### Cron Schedule (Session-Only)

```cron
# Weekly entropy check — Sunday 23:00 local time
# Fires a prompt that triggers the agent to run probe + review
0 23 * * 0
```

**Limitation discovered 2026-05-19**: Claude Code's `CronCreate` with `durable: true` does **not** persist to `.claude/scheduled_tasks.json` in this environment. The cron is session-only and auto-expires after 7 days.

**Workaround options**:
1. **Pre-commit Sunday check** (most reliable): Add date-gated check to `.husky/pre-commit` that runs full entropy scan on Sundays
2. **Manual trigger**: User runs `/lythoskill-project-scribe-weekly` or asks agent to "run weekly entropy check"
3. **CI/CD**: GitHub Actions cron (external, requires Actions workflow)

**What the check does**:
1. Run `cortex probe`
2. Check `skills/` for symlinks
3. Check `git status` for untracked working set files
4. Check env var prefix consistency (grep LYTHOS* in source)
5. Check if weekly for current week exists
6. If any flags → present to user with suggested fixes
7. If clean → confirm "entropy low, no action needed"

### Cost Analysis

| Scenario | Without Weekly Check | With Weekly Check |
|----------|---------------------|-------------------|
| 4 weeks of normal usage | Debt accumulates silently | Caught and fixed weekly |
| Cleanup cost | High (7 issues in one session) | Low (0-2 issues per week) |
| User attention required | Reactive (user notices) | Proactive (cron alerts) |
| Agent context cost | High (reconstruct from scratch) | Low (incremental review) |

## Consequences

- **Positive**: Debt caught early, never compounds to multi-issue cleanup sessions
- **Positive**: Weekly scribe becomes automatic — no more missing weeks
- **Positive**: User confidence in system hygiene increases
- **Negative**: One cron job per session (not persistent across restarts)
- **Negative**: If user ignores cron prompt, debt still accumulates

## Future

- Persist cron across sessions (requires durable scheduling)
- Expand probe rules based on new failure modes discovered
- Consider auto-fix for known patterns (e.g., working_set collision)

