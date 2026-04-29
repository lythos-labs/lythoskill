# Template Field Guide
Templates live in `${CLAUDE_SKILL_DIR}/assets/`. The CLI populates them
automatically. This reference explains what each field means.
## Task Template Fields
| Field | Purpose |
|-------|---------|
| **Status History** | Table tracking status transitions with dates and notes |
| **Background** | Link to parent EPIC or ADR. Why does this task exist? |
| **Requirements** | Checklist of what must be built |
| **Technical Approach** | Implementation details, file paths, design notes |
| **Acceptance Criteria** | Checklist of verifiable conditions for completion |
| **Progress** | Timestamped updates during execution |
| **Related Files** | Files to modify or create |
| **Git Commit** | Suggested commit message with task ID |
| **Milestone Declaration** | Exit criteria, deliverables, not-delivering, exit reason |
## Epic Template Fields
| Field | Purpose |
|-------|---------|
| **Background Story** | Why does this feature exist? What problem does it solve? |
| **Requirement Tree** | Workflowy-style nested requirements with trigger/requirement/output |
| **Related Tasks** | Table linking derived tasks with status |
| **Lessons Learned** | Retrospective notes after completion |
| **Archive Criteria** | Checklist defining when the epic is "done" |
Use `#in-progress`, `#done`, `#blocked` tags on requirement tree nodes.
## ADR Template Fields
| Field | Purpose |
|-------|---------|
| **Status** | Checkbox: Proposed / Accepted / Rejected / Superseded |
| **Context** | What problem prompted this decision? |
| **Options** | Each option with Pros/Cons analysis |
| **Decision** | Which option was chosen and why |
| **Consequences** | Positive, negative, and follow-up actions |
ADR lifecycle: create in `01-proposed/`, move to `02-accepted/` (or `03-rejected/`)
after decision. If later replaced, move to `04-superseded/` and link to the new ADR.
## Viewing Real Examples
The CLI generates playground examples during `init`:
- `cortex/tasks/01-backlog/TASK-*-playground-task.md`
- `cortex/epics/01-active/EPIC-*-playground-epic.md`
These are real CLI output, not hand-crafted samples.
