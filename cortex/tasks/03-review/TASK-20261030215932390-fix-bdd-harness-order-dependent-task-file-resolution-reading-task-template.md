# TASK-20261030215932390: fix BDD harness order-dependent task-file resolution reading TASK-TEMPLATE

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-30 | Created |
| in-progress | 2026-10-30 | Started |
| review | 2026-10-30 | Deliverables committed |

## Background & Goals
CI went red on main starting 2026-10-30 (`4683b8ee` onward, 9 consecutive
failures at time of writing) — but NOT because of any commit in that range.
Both failures are the two Status-History BDD scenarios asserting on
`cortex/tasks/TASK-TEMPLATE.md` (last record "backlog", expected
"in-progress"). The scenario content, the fixture bytes, and the runner
code are all unchanged since 2026-09-11 and passed CI on 2026-10-23.

Root cause: `resolveTaskFileForAssertion` in `test/runner.ts` picks
`findAllTaskFiles(workdir)[0]`, and `findAllTaskFiles` matches ANY
`TASK-*.md` — which includes `TASK-TEMPLATE.md` (copied into
`cortex/tasks/` by `cortex init`). Which file lands at index 0 depends on
raw `readdirSync` order, which is filesystem-defined: creation order on
APFS (local: dirs first → card wins → green), hash order on ext4/overlayfs
(CI: `TASK-TEMPLATE.md` first → template wins → red). A GitHub runner-image
update flipped exactly this order — the code's latent order-dependence was
exposed, not introduced. Verified locally: fresh tmpdir on APFS returns
`[02-in-progress, 01-backlog, 04-completed, TASK-TEMPLATE.md, 03-review]`.

Goal: make assertion file-resolution independent of filesystem readdir
order, and stop matching the template as if it were a task card.

## Requirements
- [x] `findAllTaskFiles` matches only real cards (`TASK-<17-digit-id>-<slug>.md`), excluding TASK-TEMPLATE.md
- [x] Walk and result are sorted — no raw readdir order anywhere in resolution
- [x] The `04-completed` early-return branch sorts before taking `[0]` (same latent bug, trailer scenarios)
- [x] Cortex BDD 33/33 locally; CI returns to green on the fix commit (the mutation pin is CI itself flipping)

## Technical Approach
Minimal harness fix in `packages/lythoskill-project-cortex/test/runner.ts`.
No product-code change, no decision content (C1–C6 = 0, no ADR). The regex
anchors on the timestamp-ID shape (`TASK-` + 17 digits + `-`), which the
template filename cannot match. Mutation pin: on an fs whose readdir puts
TASK-TEMPLATE.md first, the old code fails exactly as CI did; the new code
cannot select the template under any order.

## Acceptance Criteria
- [x] AC1 `grep -n "TASK-\\\\\\\\d{17}" packages/lythoskill-project-cortex/test/runner.ts` matches (card-only regex in place)
- [x] AC2 `bun packages/lythoskill-project-cortex/test/runner.ts` → 33/33 passed; `bun --filter='@lythos/project-cortex' run test` → 219 tests exit 0
- [x] AC3 CI run on the fix commit → success (verified by watching the Actions run, per AGENTS.md never end on "CI running") — run 41068223783 on `6c99fc9e` completed/success, watched to terminal state.

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20261030215932390)

- Detail 1
- Detail 2
```

## Notes
