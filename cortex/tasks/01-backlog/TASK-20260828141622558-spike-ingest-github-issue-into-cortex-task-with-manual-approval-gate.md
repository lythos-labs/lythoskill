# TASK-20260828141622558: spike ingest GitHub Issue into cortex task with manual approval gate

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ADR-20260827155909657 (accepted 2026-08-28, now in `cortex/adr/02-accepted/`): cortex stays the only SSOT; GitHub Issues/PRs become inbound/outbound channels via **experimental pilots**. This card is the **Option B pilot**: external contributors file GitHub Issues; an agent ingests them into `cortex/tasks/01-backlog/` cards and posts exactly one "Tracked as TASK-xxx" comment back.

Safety constraint from the ADR: **no automated outbound mutation of GitHub until the inbound flow is proven safe**. Everything outward-facing in this spike is print-not-execute.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) A spike script (e.g. `scripts/ingest-issues.ts` — spike grade, not a cortex subcommand) that lists open issues of `lythos-labs/lythoskill` via `gh issue list --json number,title,body,url,labels` and drafts one task-card skeleton per issue into a staging dir (e.g. `/tmp/issue-drafts/`), each card pre-filled with Background (issue body summary + URL) and empty Requirements for a human/agent to complete. The script pre-assigns a `TASK-<timestamp>` ID per draft (same `yyyyMMddHHmmssSSS` format `cortex task` generates) and uses it in both the draft filename and the printed comment command.
- [ ] R2 (必达) Dedup: skip issues whose URL already appears in any existing `cortex/tasks/**/*.md` (grep-based; an issue already tracked must not produce a second card)
- [ ] R3 (必达) Manual approval gate: the script never writes to `cortex/tasks/` directly and never posts comments. It PRINTS the exact `gh issue comment <n> --body "Tracked as TASK-xxx"` commands for a human to run after reviewing the staged cards
- [ ] R4 (必达) Fixture mode: `--json-file <path>` reads issue JSON from a file (same shape as `gh issue list --json ...` output) instead of hitting the network. The dedup negative test runs entirely offline against a fixture — the repo currently has 0 open issues, and creating a real test issue would itself be an outbound GitHub mutation, which this pilot forbids.
- **不做**: no webhook/daemon, no label/close/edit mutations on GitHub, no PR handling (Option C is TASK-20260828141622615), no bidirectional sync (Option D explicitly deferred by the ADR)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Auth: `export GH_TOKEN="$(security find-generic-password -s 'lythos-agent-pat' -w)"` (AGENTS.md §9); PAT already carries `issues=write`, but this spike only needs read — the comment commands are printed, not run. (Verified 2026-08-28: token authenticates as calt13, `gh issue list` works, 0 open issues.)
- Card skeleton must follow the cortex task template (see any card in `cortex/tasks/01-backlog/`); note in each staged card that Requirements MUST be filled by a human before the card enters the repo (ZK Review Gate applies on import).
- Follow repo script conventions: plain `process.argv.slice(2)`, ESM, no frameworks (AGENTS.md Z1). Spike-grade scripts live in `scripts/` (precedent: `check-site-commands.ts`).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `bun scripts/ingest-issues.ts` against the real repo prints the issue list + staged draft paths + printed comment commands, and writes NOTHING under `cortex/` → Verify: `git status --short cortex/` unchanged after run
- [ ] Negative: `bun scripts/ingest-issues.ts --json-file /tmp/fake-issues.json` with a fixture containing an issue whose URL is pre-seeded into a staged fake card → that issue is skipped (log line says so) → Verify: run it
- [ ] Spike report appended to this card's Progress Log: how many open issues, how many drafts, what filtering was missing → this informs whether Option B graduates from pilot

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Created as Option B pilot of ADR-20260827155909657.
- 2026-08-28: gh auth verified — keychain `lythos-agent-pat` authenticates as calt13, `gh api user` + `gh issue list --repo lythos-labs/lythoskill` both OK (currently 0 open issues). Write scopes (issues=write etc.) per AGENTS.md §9 token table; only read exercised here.
- 2026-08-28: ZK review round 1 — P1 (dedup test infeasible with 0 open issues) → R4 fixture mode added; P2 (TASK-ID provenance) → pre-assignment folded into R1; P3 (Related Files vs AC3 contradiction) fixed.

## Related Files
- Modified: this card (Progress Log spike report)
- Added: scripts/ingest-issues.ts (pending)

## Git Commit Message
```
feat(scripts): spike GitHub Issue -> cortex task ingest with manual approval gate (TASK-20260828141622558)

- Read-only gh issue list (or --json-file fixture); staged card drafts in /tmp; dedup against existing cards
- Comment commands printed, never executed (ADR-20260827155909657 safety constraint)
```

## Notes
- Pilot exit criteria (for the review conversation): drafts needed little hand-editing, dedup had no false positives, and the printed-comment gate felt acceptable.
