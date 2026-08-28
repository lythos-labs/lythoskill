# TASK-20260828141622615: PR template with cortex TASK-xxx link validation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260827155909657 (accepted 2026-08-28, now in `cortex/adr/02-accepted/`): Option C pilot. PRs should become first-class participants in the cortex lifecycle: every PR links a `TASK-xxx` (or `ADR-xxx`), the task card stays the SSOT, the PR is the review surface. Today there is no `.github/pull_request_template.md` (`.github/` contains only `workflows/`) and no check connecting PRs to governance artifacts.

Sequencing note: the ADR says Option C is the next experiment "after B is stable" (B = TASK-20260828141622558). This card deliberately prepares C **in parallel** (template + script are inert artifacts) — rollout judgment happens after B's pilot report.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) `.github/pull_request_template.md` — short, asks for a linked `TASK-xxx`/`ADR-xxx`, explains in one sentence why (task card = SSOT), and gives an escape-hatch line for external contributors. The exact escape-hatch string lives as an exported constant in the validation script and is copied verbatim into the template (single source, no drift)
- [ ] R2 (必达) A validation script (e.g. `scripts/check-pr-cortex-link.ts`) that takes a PR body via stdin and exits non-zero when neither a `TASK-`/`ADR-` reference nor the escape-hatch line is present. Negative test required (AGENTS.md [GUARD-SENSITIVE]: guard scripts ship with a failing fixture)
- [ ] R3 (必达) CI wiring — **decided: warn-only** (external contributors legitimately lack task IDs; hard-fail would be hostile). Mechanism: the script's CI invocation always exits 0 but emits `echo "::warning::…"` annotations when the link is missing (no in-repo precedent yet — this card establishes it). Wire into `.github/workflows/test.yml` (it already triggers on `pull_request`, lines 3-6) or a small new workflow
- [ ] R4 (必达) Document "when to use GitHub Issue vs cortex task" — one short section in `AGENTS.md` Z3 §4 (Task Lifecycle, near the commit-trailer table): external reporters → Issue; internal/agent work → cortex task; Issue becomes a task via the Option B ingest pilot
- **不做**: no bot comments on PRs, no auto-creation of tasks from PRs, no status sync back to GitHub (Option D deferred)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Precedent for guard scripts + negative tests: `scripts/check-site-commands.ts` + `.test.ts` (TASK-20260828003758156) — same fail-closed philosophy; subprocess tests redirect via `sh -c` to files (coverage breaks Bun.spawnSync pipe capture, AGENTS.md [TEST] gotcha).
- Keep the script dependency-free (regex over text). In the workflow, pass the PR body safely: `env: PR_BODY: ${{ github.event.pull_request.body }}` then `echo "$PR_BODY" | bun scripts/check-pr-cortex-link.ts` — never inline-interpolate into the run command (injection).
- Template lives at `.github/pull_request_template.md` (GitHub convention).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `ls .github/pull_request_template.md` exists and mentions TASK-xxx + the exact escape-hatch string from the script's constant → Verify: read it + grep the constant
- [ ] `echo "random PR body" | bun scripts/check-pr-cortex-link.ts` → exit 1; `echo "Closes: TASK-20260828141622615" | bun scripts/check-pr-cortex-link.ts` → exit 0 → Verify: run both
- [ ] CI workflow references the script in warn-only posture (exit 0 + `::warning::`) → Verify: `grep -n "check-pr-cortex-link" .github/workflows/*.yml`
- [ ] `grep -n "GitHub Issue vs cortex task" AGENTS.md` (or equivalent heading) in Z3 §4 → Verify: run it

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as Option C pilot of ADR-20260827155909657.
- 2026-08-28: ZK review round 1 — P2s fixed (B/C sequencing deviation documented; warn-only mechanism specified as ::warning::+exit 0; AGENTS.md placement pinned to Z3 §4), P3s applied (escape-hatch string as shared constant; env+pipe pattern for PR body).

## Related Files
- Modified: .github/workflows/ (pending), AGENTS.md (pending)
- Added: .github/pull_request_template.md, scripts/check-pr-cortex-link.ts (+ test) (pending)

## Git Commit Message
```
feat(ci): PR template with cortex link validation (warn-only) (TASK-20260828141622615)

- .github/pull_request_template.md with TASK/ADR link + external-contributor escape hatch (string shared with script constant)
- scripts/check-pr-cortex-link.ts with negative test; CI warn-only via ::warning:: annotations
- AGENTS.md Z3: when to use GitHub Issue vs cortex task
```

## Notes
- If the warn-only posture proves toothless (nobody links), revisit as hard-fail for internal branches only.
