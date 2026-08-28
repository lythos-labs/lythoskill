# TASK-20260828141622615: PR template with cortex TASK-xxx link validation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260827155909657 (accepted 2026-08-28): Option C pilot. PRs should become first-class participants in the cortex lifecycle: every PR links a `TASK-xxx` (or `ADR-xxx`), the task card stays the SSOT, the PR is the review surface. Today there is no `.github/pull_request_template.md` and no check connecting PRs to governance artifacts.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) `.github/pull_request_template.md` — short, asks for a linked `TASK-xxx`/`ADR-xxx`, explains in one sentence why (task card = SSOT), and gives an escape hatch line for external contributors who have no task ("no cortex task — external contribution")
- [ ] R2 (必达) A validation script (e.g. `scripts/check-pr-cortex-link.ts`) that takes a PR body on stdin/file and exits non-zero when neither a `TASK-`/`ADR-` reference nor the escape-hatch line is present. Negative test required (AGENTS.md [GUARD-SENSITIVE] class: guard scripts ship with a failing fixture)
- [ ] R3 (必达) CI wiring decision — **decide and document in the card**: warn-only annotation vs hard fail on PRs. Recommendation: warn-only (external contributors legitimately lack task IDs; hard-fail would be hostile). Implement the chosen posture in `.github/workflows/test.yml` or a small new workflow triggered on `pull_request`
- [ ] R4 (必达) Document "when to use GitHub Issue vs cortex task" — one short section in `AGENTS.md` (external reporters → Issue; internal/agent work → cortex task; Issue becomes a task via the Option B ingest pilot)
- **不做**: no bot comments on PRs, no auto-creation of tasks from PRs, no status sync back to GitHub (Option D deferred)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Precedent for guard scripts + negative tests: `scripts/check-site-commands.ts` + `.test.ts` (TASK-20260828003758156) — same fail-closed philosophy, subprocess tests redirect via `sh -c` to files (coverage breaks Bun.spawnSync pipe capture, see AGENTS.md [TEST] gotcha).
- Template lives at `.github/pull_request_template.md` (GitHub convention; the repo already keeps workflows there).
- Keep the script dependency-free (regex over text); PR body arrives via `${{ github.event.pull_request.body }}` in the workflow.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `ls .github/pull_request_template.md` exists and mentions TASK-xxx + escape hatch → Verify: read it
- [ ] `echo "random PR body" | bun scripts/check-pr-cortex-link.ts` → exit 1; `echo "Closes: TASK-20260828141622615" | bun scripts/check-pr-cortex-link.ts` → exit 0 → Verify: run both
- [ ] CI workflow references the script with the documented warn-only/fail posture → Verify: `grep -n "check-pr-cortex-link" .github/workflows/*.yml`
- [ ] `grep -n "GitHub Issue vs cortex task" AGENTS.md` (or equivalent heading) → Verify: run it

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as Option C pilot of ADR-20260827155909657.

## Related Files
- Modified: .github/workflows/ (pending), AGENTS.md (pending)
- Added: .github/pull_request_template.md, scripts/check-pr-cortex-link.ts (+ test) (pending)

## Git Commit Message
```
feat(ci): PR template with cortex link validation (warn-only) (TASK-20260828141622615)

- .github/pull_request_template.md with TASK/ADR link + external-contributor escape hatch
- scripts/check-pr-cortex-link.ts with negative test; CI posture documented in card
- AGENTS.md: when to use GitHub Issue vs cortex task
```

## Notes
- If the warn-only posture proves toothless (nobody links), revisit as hard-fail for internal branches only.
