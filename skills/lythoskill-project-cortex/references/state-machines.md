# State Machine Reference

Complete rules for Task, ADR, and Epic state transitions. Use this when you
need to verify whether a transition is valid or understand CLI error output.

## Task State Machine

Directory location is the source of truth. `cortex` CLI enforces valid
transitions and appends Status History automatically.

### Valid Transitions

| From | To | Command | Notes |
|------|----|---------|-------|
| backlog | in-progress | `start` | Subagent begins work |
| in-progress | review | `review` | Core deliverables committed |
| review | completed | `done` | **Strict**: review → completed only |
| review | completed | `done` (via `Closes: TASK-xxx` trailer) | Commit trailer closes task **after review / LGTM** |
| any | completed | `complete` | **Any-status** close; explicit escape hatch (use sparingly) |
| in-progress | suspended | `suspend` | Blocked by external dependency |
| suspended | in-progress | `resume` | Blocker resolved |
| review | in-progress | `reject` | Deliverables rejected, re-work required |
| any | terminated | `terminate` | Cancelled or obsolete; any status |
| completed | archived | `archive` | Long-term storage |

### Key Distinctions

**`done` vs `complete`**
- `done`: Strict review → completed. Use when user has reviewed and accepted. `Closes: TASK-xxx` trailer resolves to this command.
- `complete`: Any status → completed. Explicit escape hatch for when skipping review is intentional. Not the default for `Closes:`.

**`Review:` vs `Closes:` trailers**
- `Review: TASK-xxx`: in-progress → review. "Development complete, submit for review / internal PR."
- `Closes: TASK-xxx`: review → completed. "Reviewed and approved / LGTM."

**`terminate` vs `archive`**
- `terminate`: Any status → terminated. Abnormal end. Task is dead, not stored.
- `archive`: completed → archived. Normal completion moved to long-term storage.

**`reject` vs `terminate`**
- `reject`: review → in-progress. Task is alive but needs re-work.
- `terminate`: any → terminated. Task is dead.

### Invalid Transition Errors

If you attempt an invalid transition, the CLI emits a HATEOAS-style error:

```
❌ Invalid transition for Task TASK-xxx: in-progress → archived

Allowed targets from "in-progress": review, suspended

What you can do:
  • For any-status close use 'complete' (trailer-driven), 'terminate', or 'archive' (post-completed)
  • Move task through valid intermediate states first
    (e.g. backlog → in-progress → review → completed)
  • If the task truly needs to skip a step, use the corresponding
    any-status verb (above) — there is no `--force` flag.
```

### Not-Found Error

If the task ID does not exist in any status directory:

```
❌ Task not found: TASK-xxx

Searched all status subdirectories under cortex/tasks/.
Common causes:
  • Typo in ID — copy from `cortex list`
  • ID without `TASK-` prefix — both forms are accepted
  • Task already archived/terminated and task dirs differ between repo checkouts

To list all tasks by status: bunx @lythos/project-cortex list
```

## ADR State Machine

ADRs are created in `01-proposed/` and move one-way to a terminal state.

### Valid Transitions

| From | To | Command | Notes |
|------|----|---------|-------|
| proposed | accepted | `adr accept` | Decision ratified |
| proposed | rejected | `adr reject` | Decision rejected |
| proposed | superseded | `adr supersede` | Replaced by newer ADR |
| accepted | superseded | `adr supersede` | Even accepted ADRs can be superseded |

### Supersede Usage

```bash
bunx @lythos/project-cortex adr supersede ADR-xxx --by ADR-yyy
```

The `--by` flag links the old ADR to its replacement. Both ADRs should reference
each other in their Related sections.

### Invalid Transition

Rejected ADRs cannot be revived. If you need to revisit a rejected decision,
create a new ADR.

## Epic State Machine

Epics track high-level initiatives. Only three state-machine verbs exist.

### Valid Transitions

| From | To | Command | Notes |
|------|----|---------|-------|
| active | done | `epic done` | All requirements met |
| active | suspended | `epic suspend` | Paused |
| suspended | active | `epic resume` | Resumed |
| done | archived | `archive` via `cortex epic done` then manual archive or `complete` | Long-term storage |

### Epic Creation Constraints

Epics require `--lane main|emergency` and enforce **max 1 active per lane**.
Lane-full errors include four resolution options plus `--override`:

```
❌ Lane "main" is full (1 active epic(s)). Cannot create another.

Choose one of:
  1. Mark the existing epic done:    cortex epic done <EPIC-ID>
  2. Suspend the existing epic:      cortex epic suspend <EPIC-ID>
  3. Archive the existing epic:      git mv ... cortex/epics/04-archived/
  4. Reclassify as a task on the existing epic (no new epic).
Or, if this is unavoidable, retry with:
  --override "<reason>"
```

## Probe Validation Loop

`cortex probe` compares directory location (source of truth) against internal
Status History. When they diverge:

1. **Probe surfaces the mismatch** with file path, claimed status, and actual directory.
2. **Human decides which is truth** — probe never auto-fixes.
3. **If directory is correct**: Update the Status History table inside the file manually.
4. **If Status History is correct**: Use `cortex move` (e.g. `cortex start TASK-xxx`) to move the file to the correct directory.
5. **Re-run probe** to confirm consistency.

## Commit Trailer State Changes

Git trailers parsed by `.husky/post-commit` trigger automatic state transitions:

| Trailer | Generated Command | Effect |
|---------|-------------------|--------|
| `Review: TASK-xxx` | `task review TASK-xxx` | Task in-progress → review (dev complete, submit for review / internal PR) |
| `Closes: TASK-xxx` | `task done TASK-xxx` | Task review → completed (reviewed and approved / LGTM) |
| `Task: TASK-xxx review` | `task review TASK-xxx` | Task → review (explicit verb form) |
| `ADR: ADR-xxx accept` | `adr accept ADR-xxx` | ADR proposed → accepted |
| `Epic: EPIC-xxx done` | `epic done EPIC-xxx` | Epic active → done |

Trailers are processed after the commit finishes, creating a follow-up commit
with the state change. This is the preferred way to close tasks — it links the
closing action to the actual code commit.
