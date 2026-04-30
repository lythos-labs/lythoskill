# Milestone Protocol (Full Detail)
## Purpose
Prevents the most common failure mode in agent-executed tasks: **fake completion**
where checkboxes are ticked but actual deliverables don't exist.
## Required Fields at Task Creation
### Exit Criteria (one sentence)
What state means "done enough" for this milestone?
Example: "Auth API returns valid JWT for test credentials and integration test passes."
### Deliverables Table
| Deliverable | Verification | Status |
|-------------|-------------|--------|
| `src/auth/jwt.ts` | `bun test auth.test.ts` passes | ⬜ |
| `docs/auth-api.md` | File exists, >200 words | ⬜ |
### Explicitly Not Delivering
Items excluded from this milestone. Prevents scope creep and endless refinement.
```markdown
- [ ] OAuth2 provider integration → deferred to TASK-XXX
- [ ] Performance benchmarks → "nice to have", not required for v1
```
### Exit Reason
> "Stopping because [exit criteria] is met. Further work (OAuth2, perf benchmarks)
> is tracked in separate tasks, not this one."
## Anti-Pattern Reference
| Anti-pattern | Signal | Real consequence |
|-------------|--------|-----------------|
| **Checklist = done** | All boxes checked, but `ls` shows 1 of 5 files | Downstream tasks fail on missing dependencies |
| **No exclusion list** | "Let me research a bit more" | Session burns 40 turns on tangent |
| **Vague exit criteria** | "It's pretty much done" | Next agent reopens the task, re-does work |
| **Artifacts in tmp/** | `tmp/report-draft.md` never moved to `cortex/` | Next session can't find the deliverable |
## Completion Checklist
Before moving a task to `04-completed/`:
- [ ] Core deliverables from the table exist and pass verification
- [ ] Exit reason is written and links to exit criteria
- [ ] Not-delivering list is declared (even if empty — "nothing excluded")
- [ ] Deliverables are in permanent locations (not tmp/)
- [ ] Git commit includes task ID
