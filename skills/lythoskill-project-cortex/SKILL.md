---
name: project-cortex
version: 0.8.0
type: standard
description: |
  GTD-style project governance with ADR, Epic, Task, and Wiki.
  Numeric-prefixed directories (01-backlog, 02-in-progress, etc.)
  ensure GTD workflow ordering. Timestamp IDs avoid collision without
  a central database. CLI creates documents, generates indexes, and
  probes for status inconsistencies.
when_to_use: |
  Create a task, create an epic, create an ADR, architecture decision,
  project management, track requirements, delegate to subagent,
  task status, project index, what needs to be done, backlog,
  milestone, project governance, generate index, probe status.
allowed-tools:
  - Bash(bunx @lythos/project-cortex *)
---

# Project Cortex: ADR + Epic + Task + Wiki
> Automation over memory. Use CLI for IDs and templates. Use index for discovery.
## Three Systems
```
Epic (WHY)          ADR (HOW)           Task (WHAT)
requirement origin  technical decision  executable work
derives tasks       guides tasks        links to epic/adr
```

Epics track why a feature exists. ADRs track how technical decisions were made.
Tasks track what specific work to do. Wiki captures reusable knowledge after
tasks succeed.

## CLI Commands
```bash
# Create documents (CLI assigns timestamp ID, generates from template)
bunx @lythos/project-cortex task "Fix login bug"
bunx @lythos/project-cortex epic "User auth system" --lane main|emergency
bunx @lythos/project-cortex adr "Choose database"
# Initialize cortex/ directory structure in current project
bunx @lythos/project-cortex init
```

> **Agent 不需要自己拼路径或生成 ID。** CLI 会自动处理：timestamp ID、模板填充、目录放置。Agent 只需执行命令，然后从输出中读取返回的完整路径和 ID。

# Generate INDEX.md with overview stats and document listing
bunx @lythos/project-cortex index

# List all tasks, epics, ADRs
bunx @lythos/project-cortex list

# Show project statistics
bunx @lythos/project-cortex stats

# Probe: check if file location matches internal status record + epic lane counts
bunx @lythos/project-cortex probe
```

## State Machine Commands

```bash
# Task state machine
bunx @lythos/project-cortex start TASK-xxx
bunx @lythos/project-cortex review TASK-xxx
bunx @lythos/project-cortex done TASK-xxx        # review → completed only
bunx @lythos/project-cortex complete TASK-xxx    # any status → completed (trailer-driven)
bunx @lythos/project-cortex suspend TASK-xxx
bunx @lythos/project-cortex resume TASK-xxx
bunx @lythos/project-cortex terminate TASK-xxx
bunx @lythos/project-cortex archive TASK-xxx

# ADR state machine
bunx @lythos/project-cortex adr accept ADR-xxx
bunx @lythos/project-cortex adr reject ADR-xxx
bunx @lythos/project-cortex adr supersede ADR-xxx --by ADR-yyy

# Epic state machine
bunx @lythos/project-cortex epic done EPIC-xxx
bunx @lythos/project-cortex epic suspend EPIC-xxx
bunx @lythos/project-cortex epic resume EPIC-xxx
```

`probe` is a read-only consistency check. It compares each document's directory
(source of truth) against its internal Status History table. Mismatches are
flagged for human review — probe never auto-fixes.
## Directory Structure
```
cortex/
├── INDEX.md
├── adr/
│   ├── 01-proposed/
│   ├── 02-accepted/
│   ├── 03-rejected/
│   └── 04-superseded/
├── epics/
│   ├── 01-active/
│   ├── 02-done/
│   ├── 03-suspended/
│   └── 04-archived/
├── tasks/
│   ├── 01-backlog/       ← Capture + Clarify
│   ├── 02-in-progress/   ← Engage
│   ├── 03-review/        ← Pending acceptance
│   ├── 04-completed/     ← Normal completion
│   ├── 05-suspended/     ← Blocked (recoverable)
│   ├── 06-terminated/    ← Cancelled (abnormal end)
│   └── 07-archived/      ← Final archive
└── wiki/
    ├── 01-patterns/      ← Reusable solutions    ├── 02-faq/           ← Common questions    └── 03-lessons/       ← Retrospectives
```
Numeric prefixes ensure GTD workflow ordering in `ls` output.
## ID Format
`PREFIX-yyyyMMddHHmmssSSS` (17 digits). Collision-free, self-sorting, no registry.
| Type | Example |
|------|---------|
| Task | `TASK-20250420120000000` |
| Epic | `EPIC-20250420120100000` |
| ADR | `ADR-20250420120200000` |

**Preview next IDs before creating:**
```bash
bunx @lythos/project-cortex next-id
```
Output:
```
📋 Timestamp ID Format:

  Task: TASK-20260502110420008
  Epic: EPIC-20260502110420009
  ADR:  ADR-20260502110420009

  Format: PREFIX-yyyyMMddHHmmssSSS (17 digits)
```

## Command Output Examples

Agents should expect the following output patterns when invoking CLI commands.

### Creating a document
```bash
bunx @lythos/project-cortex adr "Choose database"
```
Output:
```
✅ Created: cortex/adr/01-proposed/ADR-20260502110308316-Choose-database.md
🏛️  ADR ID: ADR-20260502110308316
```

```bash
bunx @lythos/project-cortex task "Fix login bug"
```
Output:
```
✅ Created: cortex/tasks/01-backlog/TASK-20260502110308316-Fix-login-bug.md
📝 Task ID: TASK-20260502110308316
```

```bash
bunx @lythos/project-cortex epic "User auth system"
```
Output:
```
✅ Created: cortex/epics/01-active/EPIC-20260502110308316-User-auth-system.md
🎯 Epic ID: EPIC-20260502110308316
```

### Project statistics
```bash
bunx @lythos/project-cortex stats
```
Output:
```
📊 Project Statistics:

Tasks:
  Backlog        : 3
  In Progress    : 1
  Review         : 0
  Completed      : 5
  Suspended      : 0
  Terminated     : 0
  Archived       : 2

Epics:
  Active         : 1
  Archived       : 0

ADRs:
  Proposed       : 2
  Accepted       : 1
  Rejected       : 0
  Superseded     : 0

Wiki:
  Patterns       : 4
  FAQ            : 1
  Lessons        : 0
```

### Consistency probe (read-only)
```bash
bunx @lythos/project-cortex probe
```
Output when consistent:
```
🔍 Probing cortex consistency...
✅ All documents consistent.
```
Output when mismatches found:
```
🔍 Probing cortex consistency...
⚠️  1 inconsistency found:

  cortex/tasks/01-backlog/TASK-20260502110308316-Fix-login-bug.md
    Status History claims: 02-in-progress
    Actual directory:      01-backlog
    → File location does not match latest status record
```
## Task State Machine (FSM)

Directory location is the source of truth. Status History mirrors the directory.

```
backlog ──start──► in-progress ──deliver──► review ──accept──► completed ──archive──► archived
    │                   │                      │
    │                   └────block────► suspended
    │                                          │
    │                                          └──resolved──► in-progress
    │
    └────────────────────────────cancel────────────────────► terminated
```

### Transition Table

| From | To | Who | Trigger | CLI Command |
|------|----|-----|---------|-------------|
| backlog | in-progress | Subagent | Begins implementation | `bunx @lythos/project-cortex start TASK-xxx` |
| in-progress | review | Subagent | Core deliverables done, committed with task ID | `bunx @lythos/project-cortex review TASK-xxx` |
| review | completed | User/System | Exit criteria met, acceptance passed | `bunx @lythos/project-cortex done TASK-xxx` |
| any | completed | Trailer/Hook | Commit trailer closes task | `bunx @lythos/project-cortex complete TASK-xxx` |
| in-progress | suspended | Any | Blocked by external dependency | `bunx @lythos/project-cortex suspend TASK-xxx` |
| suspended | in-progress | Any | Blocker resolved | `bunx @lythos/project-cortex resume TASK-xxx` |
| any | terminated | User/System | Task cancelled or obsolete | `bunx @lythos/project-cortex terminate TASK-xxx` |
| completed | archived | User/System | Long-term storage | `bunx @lythos/project-cortex archive TASK-xxx` |
| review | in-progress | User/System | Deliverables rejected, re-work required | `bunx @lythos/project-cortex reject TASK-xxx` |
## Commit Trailer Integration

Cortex governance is **commit-driven** via git trailers parsed by `.husky/post-commit`:

```
Closes: TASK-<id>        # Any status → completed (task), proposed → accepted (ADR), active → done (epic)
Task: TASK-<id> <verb>   # Explicit task verb
ADR: ADR-<id> <verb>     # ADR verb: accept, reject, supersede
Epic: EPIC-<id> <verb>   # Epic verb: done, suspend, resume
```

Example:
```bash
git commit -m "feat(api): add endpoint

Closes: TASK-20260503010227902"
```

The post-commit hook auto-dispatches to `cortex` CLI and creates a follow-up commit with the state changes. Malformed trailers print warnings but do not block.

## Epic Lane Discipline

- **Dual-track lanes**: `lane: main` (current iteration focus, max 1 active) and `lane: emergency` (unavoidable urgent insert, max 1 active).
- **5-question checklist** at creation: outcome clear? / closable in 1-3 weeks? / fits 1-3 week size? / not a task? / not an ADR?
- Lane-full = rejection unless `--override "<reason>"` is provided.
- `cortex probe` warns when >1 active epic per lane.

## Git Integration (Critical)
Commits **must** include task ID in the message title:
✅ `git commit -m "feat(api): add endpoint (TASK-20250422143321029)"`
❌ `git commit -m "feat(api): add endpoint"`
This enables: traceability (code ↔ task), audit (`git log --grep TASK-`),
rollback by task scope, automation parsing.
After user says "LGTM": `git tag -a v0.X.0 -m "feat: description"`
## Role Separation
| Role | Can do | Operates on |
|------|--------|-------------|
| **User/System** | Create epics/ADRs, archive, final review, mark done | epics/, adr/, tasks/04-completed/ |
| **Subagent** | Execute tasks, drive status forward | tasks/01-backlog/ → 02-in-progress/ → 03-review/ |

**Subagent workflow** (delegate with: "Execute TASK-xxx"):
1. `bunx @lythos/project-cortex start TASK-xxx`
2. Implement, commit with task ID in message
3. `bunx @lythos/project-cortex review TASK-xxx`
4. **Stop here.** Never use `done` — that requires user acceptance.
## Milestone Protocol (Prevents Fake Completion)
Every task must define at creation:
- **Exit criteria**: one sentence defining "done enough"
- **Deliverables table**: what was produced + how to verify
- **Explicitly not delivering**: scope excluded from this milestone
- **Exit reason**: why stop now (links to exit criteria)
**Anti-patterns that cause real failures:**
| Anti-pattern | Example | Consequence |
|-------------|---------|-------------|
| Checklist = done | 5 deliverables planned, 1 built, all boxes checked | Fake completion |
| No "not delivering" | "Let me research more", "Let me polish" | Endless refinement |
| Vague exit criteria | "Good enough" | Agent decides own standard, drift |
| Deliverables in tmp/ | Report written to tmp/, never archived | Lost in next session |
✅ Mark completed when: core deliverables exist, exit reason stated, not-delivering declared.
❌ Do not mark completed when: only checkboxes ticked, exit criteria is "roughly done",
undeclared TODOs remain.

**Always use CLI commands to move tasks.** Never `mv` files manually or edit Status History by hand.
The CLI enforces valid FSM transitions, appends Status History, and regenerates INDEX.md automatically.
## Gotchas
**Always use CLI for all state changes.** Creating documents, moving tasks, archiving — everything goes through CLI.
Never `mv` or edit files manually. Manual changes bypass FSM validation and cause probe mismatches.
The CLI handles template alignment, correct timestamp IDs, and initial directory
placement. Manual creation risks ID collision and template drift.
**probe does not auto-fix.** It only surfaces inconsistencies between file location
and internal status. Human decides whether to move the file or update the record.
This is deliberate — status ambiguity requires human judgment.
**Templates in assets/, not in SKILL.md.** If you need to see the template format,
read `${CLAUDE_SKILL_DIR}/assets/TASK-TEMPLATE.md` (or ADR/EPIC). Or look at
existing files in cortex/ — the playground examples are real CLI output.
**INDEX.md is generated, not hand-edited.** Run `bunx @lythos/project-cortex index`
after any status change. Manual edits will be overwritten.
## Supporting References
Read these **only when the specific topic arises**:
| When you need to… | Read |
|--------------------|------|
| Understand ADR/Epic/Task template fields in detail | [references/template-guide.md](./references/template-guide.md) |
| Write good Epics, ADRs, or Tasks (best practices) | [references/writing-guide.md](./references/writing-guide.md) |
| Perform session handoff or onboard a new agent | [references/session-handoff.md](./references/session-handoff.md) |
| Use Wiki for knowledge capture after task completion | [references/wiki-workflow.md](./references/wiki-workflow.md) |
| See a complete end-to-end workflow example | [references/example-workflow.md](./references/example-workflow.md) |
| Understand the milestone protocol in full detail | [references/milestone-protocol.md](./references/milestone-protocol.md) |
