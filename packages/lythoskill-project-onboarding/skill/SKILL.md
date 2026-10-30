---
name: lythoskill-project-onboarding
version: {{PACKAGE_VERSION}}
description: |
  Session context loader. Reads the latest daily handoff to restore
  project context without redundant file exploration. Three-layer
  loading: CLAUDE.md (stable) → daily handoff (session state) →
  git verification (ground truth). Degrades to file exploration
  when no handoff exists. Read-side pair with project-scribe (scribe
  writes the daily, onboarding reads it).
when_to_use: |
  Start of session, resume work, onboard to project, review history,
  continue previous work, take over task, what happened last time,  先复盘 ("review first"), 了解项目 ("understand the project"), 接手任务 ("take over a task"), 继续之前的工作 ("continue previous work").
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
# Find the most recent daily file.
# Filter to dated filenames BEFORE sorting — never `ls daily/*.md | sort | tail -1`.
# That form answers a date question with lexicographic position and has returned
# README.md / _README.md twice (locale-dependent). See references/latest-daily-query.md.
ls daily/ 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.md$' | sort | tail -1
# Read first section (## Session Handoff)
```

**Handoff is fresh if**: `git_commit` in handoff matches current HEAD and
date is recent (within 3 days).

**If fresh**: use handoff directly. Skip cortex/skills exploration.
**If stale or missing**: degrade to file exploration (see below).
**If stale + gap >7 days**: `git log --since="7 days ago" --oneline` to reconstruct activity, then `cortex probe` to check current state. Don't rely on stale Next Steps.

### Layer 3: Ground Truth Verification (always required)
```bash
git status
git log --oneline -5
```

Compare against handoff's **0. Verify Current State** section. If they diverge,
handoff is stale — flag it and rely on real-time git output.

### Layer 3b: Project shape survey → initialize the PROJECT's own conventions
The generic skill does not require CI tail-checks — that was one project's
rule, and a project's rules belong in the project's own agent-facing docs
(AGENTS.md / CLAUDE.md), not in a universal onboarding gate. What this layer
MUST do is survey the shape and hand the finding back:

| Project shape | What this layer does |
|---------------|----------------------|
| Not a git repo, or no remote | Note "no VCS remote" in the summary. Nothing to tail. |
| Remote host is not GitHub | Note the host. `gh` cannot help there — the project's own docs would name the right CLI. |
| GitHub repo with Actions | Note the workflows found (`gh run list --limit 5`). **Suggest initializing the project's AGENTS.md with a CI-tail-check line** if the project wants that discipline — the lythoskill repo's own AGENTS.md is one example of such a project-level rule. |
| GitHub repo without Actions | Note "no CI". Offer the same AGENTS.md suggestion for whatever check the project does have (or none). |

Tailing CI only happens when the PROJECT's own conventions declare it — read
the project's AGENTS.md/CLAUDE.md for that; if declared, use ambient `gh`
auth (never export a project-specific token here; this skill runs in projects
it cannot know). Failure semantics when you do tail: not logged in →
`gh auth login`; 401 = token expired; 404 = the logged-in account's token has
no grant for this repo — check `gh auth status` or the project's own auth doc.
## Degraded Exploration (no usable handoff)
Only when Layer 2 fails. Read in this order:
```bash
cat skill-deck.toml               # What skills are active
cat cortex/INDEX.md               # Project governance state
git log --oneline -10             # Recent changes
ls -lt cortex/adr/02-accepted/ | head -10   # Recent decisions
ls -lt cortex/wiki/02-research/ | head -10  # Recent research
ls cortex/epics/01-active/        # Active epics
ls cortex/tasks/01-backlog/       # Pending work
ls cortex/tasks/02-in-progress/   # Active work
```
**If the project has cortex**, the `ls -lt` on adr/, wiki/, epics/, tasks/ directories
tells you what happened recently without reading every file — timestamps reveal
the most recent decisions, research, and active work at a glance.

**Cortex ID = timestamp**: ADR-/TASK-/EPIC- prefixes use `yyyyMMddHHmmssSSS`.
This enables date-range grep reconstruction (e.g., `ls cortex/adr/02-accepted/ |
grep '^ADR-2026051'` finds all May 2026 decisions). Use this when a weekly is
missing or when verifying claims across a date range.
## Freshness Decision Table
| Condition | Verdict | Action |
|-----------|---------|--------|
| Daily exists, git_commit matches HEAD, date ≤3 days | ✅ Fresh | Use handoff directly |
| Daily exists, git_commit ≠ HEAD | ⚠️ Stale | Read handoff for context, but verify everything |
| Daily exists, date >3 days old | ⚠️ Probably stale | Same as above |
| No daily file found | ❌ Missing | Full degraded exploration |

## Batch Index scan (read side of the write-side contract)
A handoff whose git state matches HEAD is trustworthy for state — but before
concluding "no prior art" on a live problem, scan the handoff's
`### Batch Index` `read when` triggers. A matched trigger means the work
already exists: follow its refs, don't re-derive. Weight **experiment
(`playground/`, `runs/`) and research/wiki (`cortex/wiki/`) entries
highest** — their carriers are quiet and surface no other way; a code batch
leaves trails, an experiment or wiki batch leaves only this line.

If the first handoff's index doesn't match your problem, scan the next
handoff section below — prepend days accumulate one index per session, and
every one of them is live until its commits are verified. Stale handoffs:
scan too, but treat matched refs as leads to verify against current state,
not settled prior art.
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
- [ ] Layer 3b: Project shape survey — repo? remote? host? Actions? Record findings in the summary; if CI exists, SUGGEST writing a tail-check into the project's own AGENTS.md (project-level rule, not a universal gate). Only actually tail CI when the project's own docs declare it.
- [ ] If handoff fresh → use directly
- [ ] Batch Index: scanned `read when` triggers for prior art matching your live problem (experiment/research/wiki entries especially) before concluding "no prior art"
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
sections (multiple sessions same day), read the **first** one — scribe prepends
new handoffs to the top of the file.
## Supporting References
| When you need to… | Read |
|--------------------|------|
| Understand the CQRS architecture with scribe | [references/cqrs-architecture.md](./references/cqrs-architecture.md) |
| Get the canonical "latest daily" query and why it filters before sorting | [references/latest-daily-query.md](./references/latest-daily-query.md) |
| See detailed output format variants and edge cases | [references/output-formats.md](./references/output-formats.md) |
