# Skill Audit False Positive and Task Card Hygiene

> Date: 2026-05-03
> Trigger: Terminating two audit-fix tasks after root-cause analysis revealed the audit itself was the problem.

## The Incident

Epic `EPIC-20260430012504755` (skill-progressive-disclosure-and-quality-audit) spawned three tasks based on a skill-coach audit report:

1. Add `version` frontmatter → **completed** (real issue, real fix)
2. Add `allowed-tools` to release/scribe → **terminated** (false positive)
3. Review reference conditional trigger coverage → **terminated** (false positive)

## Root Cause Analysis

### 1. Task Card Was an Empty Template

Both terminated tasks had empty:
- Background & Goal
- Requirements
- Technical approach
- Acceptance criteria

A subagent receiving only a title ("Add allowed-tools to release and scribe") must guess what the audit actually found. The guess rarely matches the reviewer's intent.

### 2. The Audit Rule Was Mechanically Applied

**Claim**: "release and scribe lack `allowed-tools` — this is a defect."
**Reality**: `allowed-tools` is optional in the Agent Skills spec. It should only be declared when a skill's core workflow requires invoking a specific external CLI.

| Has `allowed-tools` | Why |
|---------------------|-----|
| deck, cortex, arena, curator | Core workflow calls `bunx @lythos/...` CLI |
| release, scribe, creator, onboarding, coach, hello-world | Core workflow uses generic agent capabilities (Shell, Read, Write) |

Adding `allowed-tools` to release/scribe would be **meaningless** — they don't invoke a specific CLI. This is a classic false positive from a linter-style rule that lacks a "does this skill actually need it?" gate.

### 3. Reference Triggers Were Already Clean

All skills in the repo already use the "When you need to… | Read" conditional dispatch format. No "See references/ for more details" bibliographies were found. The audit claim of "22 references need review" appears to have been preempted by earlier cleanup work.

## The Deeper Pattern

```
Audit tool reports "X is missing"
    ↓
Task creator copies title into task card
    ↓
Subagent implements literal fix
    ↓
Reviewer realizes the fix is unnecessary
    ↓
Re-work required (or task terminated)
```

**Break the chain at the second step**: Before creating a task from an audit finding, the creator must ask:
- Is "missing" the same as "defect"?
- What is the specific file/line/symptom?
- What would "fixed" look like?

## Lessons

1. **Audit rules must distinguish "absent" from "defective".** A linter that flags every optional field as missing creates noise, not signal.
2. **Task cards are bootloaders, not placeholders.** If the card doesn't contain enough context for a zero-knowledge subagent to produce correct output, the card is incomplete.
3. **Challenge the premise before executing.** Both the task creator and the subagent should have asked: "Does release/scribe actually need allowed-tools?" The answer was visible in 30 seconds of comparing skill frontmatters.
4. **"No pain, no fix" is a valid heuristic.** If the user (or the agent consuming the skill) doesn't experience friction, a theoretical imperfection is not a bug.

## When to Apply This Lesson

- Creating tasks from automated audit/lint reports
- Reviewing tasks that were returned for re-work
- Writing audit rules for skill-coach or curator
- Deciding whether to terminate a task whose premise is shaky
