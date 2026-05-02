---
name: lythoskill-project-onboarding
version: 0.7.0
type: standard
description: |
  Session context loader. Reads the latest daily handoff to restore
  project context without redundant file exploration. Three-layer
  loading: CLAUDE.md (stable) → daily handoff (session state) →
  git verification (ground truth). Degrades to file exploration
  when no handoff exists. CQRS read-side pair with project-scribe.
when_to_use: |
  Start of session, resume work, onboard to project, review history,
  continue previous work, take over task, what happened last time,  先复盘, 了解项目, 接手任务, 继续之前的工作.
---

# Project Onboarding
> Read the handoff. Don't re-explore what's already written down.
## Three-Layer Loading
Loading order optimized for KV cache (stable content first, volatile last):
### Layer 1: Meta-skill (rarely changes)
```bash
cat CLAUDE.md
```

Provides: how to work in this project, architecture, conventions.
### Layer 2: Session State (from latest daily file)
```bash
# Find the most recent daily file
ls daily/*.md 2>/dev/null | sort | tail -1
# Read first section (## Session Handoff)
```

**Handoff is fresh if**: `git_commit` in handoff matches current HEAD and
date is recent (within 3 days).

**If fresh**: use handoff directly. Skip cortex/skills exploration.
**If stale or missing**: degrade to file exploration (see below).

### Layer 3: Ground Truth Verification (always required)
```bash
git status
git log --oneline -5
```

Compare against handoff's Ground Truth State section. If they diverge,
handoff is stale — flag it and rely on real-time git output.
## Degraded Exploration (no usable handoff)
Only when Layer 2 fails. Read in this order:
```bash
cat skill-deck.toml          # What skills are active
cat cortex/INDEX.md           # Project governance state
git log --oneline -10         # Recent changes
ls cortex/tasks/01-backlog/   # Pending work
ls cortex/tasks/02-in-progress/  # Active work
```
## Freshness Decision Table
| Condition | Verdict | Action |
|-----------|---------|--------|
| Daily exists, git_commit matches HEAD, date ≤3 days | ✅ Fresh | Use handoff directly |
| Daily exists, git_commit ≠ HEAD | ⚠️ Stale | Read handoff for context, but verify everything |
| Daily exists, date >3 days old | ⚠️ Probably stale | Same as above |
| No daily file found | ❌ Missing | Full degraded exploration |
## Output Format
After loading, summarize to user:
```
📋 Project: <name> (<tech stack>)
📌 Version: <tag> (git: <hash>)
📄 Source: daily/<date>.md | degraded exploration
⚠️ Pitfalls: <top 1-2 from handoff>
🎯 Current: <active task>
💡 Next: <prioritized next step>
✅ Verification: git state matches handoff | ⚠️ diverged
```
## Checklist
- [ ] Layer 1: Read CLAUDE.md
- [ ] Layer 2: Find latest daily/, read handoff section
- [ ] Assess freshness (git_commit match, date recency)
- [ ] Layer 3: Verify with `git status` + `git log`
- [ ] If handoff fresh → use directly
- [ ] If handoff stale/missing → degraded exploration
- [ ] Output summary to user
## Gotchas
**Don't re-explore when handoff is fresh.** The whole point of the scribe→onboarding
pipeline is to avoid burning tokens on redundant `ls` and `cat`. If the handoff
exists and git state matches, trust it.

**Handoff date ≠ freshness.** A 2-day-old handoff with matching git_commit is
fresher than a same-day handoff whose git_commit doesn't match HEAD (someone
committed outside the agent session).
**Multiple handoff sections.** If the daily file has multiple `## Session Handoff`
sections (multiple sessions same day), read the **last** one.
## Supporting References
| When you need to… | Read |
|--------------------|------|
| Understand the CQRS architecture with scribe | [references/cqrs-architecture.md](./references/cqrs-architecture.md) |
| See detailed output format variants and edge cases | [references/output-formats.md](./references/output-formats.md) |
