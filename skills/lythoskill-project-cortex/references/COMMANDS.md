<!-- AUTO-GENERATED -->
📋 lythoskill-project-cortex — Project management CLI

Commands:
  init                  Initialize cortex workflow directories
  task "<title>"        Create a new Task
  epic "<title>" --lane main|emergency [--override "<r>"] [--skip-checklist "<r>"]
                        Create a new Epic. --lane is required.
                        --override bypasses the lane-full guard (max 1 per lane).
                        --skip-checklist bypasses the 5-question prompt.
  adr "<title>"         Create a new ADR
  list                  List all tasks and epics
  stats                 Show project statistics
  next-id               Display timestamp ID format example
  index                 Generate INDEX.md and wiki/INDEX.md
  index wiki            Generate wiki/INDEX.md only
  wiki "<title>"        Create a new Wiki entry [--category pattern|faq|lesson]
  probe                 Check status consistency (dir vs Status History)
  flow                  Show kanban CFD — count, avg age, WIP limits
  dispatch-trailers     Parse last commit for trailers and dispatch follow-up (used by post-commit hook)

Task state machine:
  start <task-id>       Move task to in-progress
  review <task-id>      Move task to review
  done <task-id>        Move task to completed (must be in review)
  complete <task-id>    Move task to completed (any status; trailer-driven close)
  suspend <task-id>     Move task to suspended
  resume <task-id>      Move suspended task back to in-progress
  reject <task-id>      Move reviewed task back to in-progress (re-work)
  terminate <task-id>   Move task to terminated (any status)
  archive <task-id>     Move completed task to archived

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
