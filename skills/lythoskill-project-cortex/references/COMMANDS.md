<!-- AUTO-GENERATED -->
📋 lythoskill-project-cortex — Project management CLI

Commands:
  init                  Initialize cortex workflow directories
  task "<title>"        Create a new Task
  task create "<title>"  Create a new Task (explicit)
  task list              List all tasks and epics (same as 'list')
  task <verb> <task-id>  Task state transition (start/review/done/complete/suspend/resume/reject/terminate/archive)
  epic "<title>" --lane main|emergency [--override "<r>"] [--skip-checklist "<r>"]
                        Create a new Epic. --lane is required.
                        --override bypasses the lane-full guard (max 1 per lane).
                        --skip-checklist bypasses the 5-question prompt.
  epic list              List all tasks and epics (same as 'list')
  adr "<title>"         Create a new ADR
  adr list               List all tasks and epics (same as 'list')
  list                  List all tasks and epics
  stats                 Show project statistics
  next-id               Display timestamp ID format example
  index                 Generate INDEX.md and wiki/INDEX.md
  index wiki            Generate wiki/INDEX.md only
  wiki "<title>"        Create a new Wiki entry [--category pattern|faq|lesson]
  probe                 Check status consistency (dir vs Status History)
                        --suspicious   Only report suspicious patterns (empty shells, stale, drift)
                        --include-completed-empty-shells  Include empty shells in completed/terminal dirs
                        --include-completed-checklists    Include checklist drift in completed tasks
  flow                  Show kanban CFD — count, avg age, WIP limits
  dispatch-trailers     Parse last commit for trailers and dispatch follow-up (used by post-commit hook)

Task state machine:
  task start <task-id>       Move task to in-progress
  task review <task-id>      Move task to review
  task done <task-id>        Move task to completed (must be in review)
  task complete <task-id>    Move task to completed (any status; trailer-driven close)
  task suspend <task-id>     Move task to suspended
  task resume <task-id>      Move suspended task back to in-progress
  task reject <task-id>      Move reviewed task back to in-progress (re-work)
  task terminate <task-id>   Move task to terminated (any status)
  task archive <task-id>     Move completed task to archived

  (Legacy aliases also work: start, review, done, complete, suspend, resume, reject, terminate, archive)

ADR state machine:
  adr accept <adr-id>                  Move ADR to accepted
  adr reject <adr-id>                  Move ADR to rejected
  adr supersede <adr-id> [--by <new-id>]  Move ADR to superseded

Epic state machine:
  epic done <epic-id>     Move epic to done
  epic suspend <epic-id>  Move epic to suspended
  epic resume <epic-id>   Move suspended epic back to active

Examples:
  lythoskill-project-cortex init
  lythoskill-project-cortex task "Fix login bug"
  lythoskill-project-cortex epic "User auth system"
  lythoskill-project-cortex adr accept ADR-20260502234833756
  lythoskill-project-cortex epic done EPIC-20260503010218940
