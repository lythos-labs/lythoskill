# End-to-End Workflow Example
## Scenario: "Add real-time data feature"
### 1. Create Epic
```bash
bunx @lythos/project-cortex epic "Real-time data updates"
# → cortex/epics/01-active/EPIC-20250420120100000-real-time-data-updates.md
```

Fill in: background (why real-time?), requirement tree (SSE, backend job, UI).
### 2. Create ADRs for Technical Decisions
```bash
bunx @lythos/project-cortex adr "SSE vs WebSocket for real-time"
# → cortex/adr/01-proposed/ADR-20250420120200000-sse-vs-websocket.md
bunx @lythos/project-cortex adr "Background job framework"
# → cortex/adr/01-proposed/ADR-20250420120200001-background-job-framework.md
```

After discussion: move accepted ADRs to `cortex/adr/02-accepted/`.

### 3. Derive Tasks from Epic
```bash
bunx @lythos/project-cortex task "Implement SSE endpoint"
bunx @lythos/project-cortex task "Build data generator job"
```

Link each task to the epic and relevant ADR in its Background section.
### 4. Delegate to Subagent
```
Execute: cortex/tasks/01-backlog/TASK-20250422143321029-implement-sse-endpoint.md

Steps:
1. Move to cortex/tasks/02-in-progress/
2. Implement per requirements
3. Update Progress with timestamps
4. Commit with "(TASK-20250422143321029)" in message
5. Move to cortex/tasks/03-review/
```

### 5. Review and Complete
User reviews output. On "LGTM":
- Move task to `cortex/tasks/04-completed/`
- Tag: `git tag -a v0.3.0 -m "feat: real-time data updates"`
- Distill lessons to `cortex/wiki/01-patterns/` if applicable
### 6. Archive Epic
When all archive criteria are met, move epic to `cortex/epics/02-archived/`.
Run `bunx @lythos/project-cortex index` to update INDEX.md.
