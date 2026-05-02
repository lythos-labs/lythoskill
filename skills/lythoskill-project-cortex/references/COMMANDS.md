<!-- AUTO-GENERATED -->
📋 lythoskill-project-cortex — Project management CLI

Commands:
  init                  Initialize cortex workflow directories
  task "<title>"        Create a new Task
  epic "<title>"        Create a new Epic
  adr "<title>"         Create a new ADR
  list                  List all tasks and epics
  stats                 Show project statistics
  next-id               Display timestamp ID format example
  index                 Generate INDEX.md and wiki/INDEX.md
  index wiki            Generate wiki/INDEX.md only
  probe                 Check status consistency (dir vs Status History)
  done <task-id>        Move task to completed and regenerate index

Examples:
  lythoskill-project-cortex init
  lythoskill-project-cortex task "Fix login bug"
  lythoskill-project-cortex epic "User auth system"
