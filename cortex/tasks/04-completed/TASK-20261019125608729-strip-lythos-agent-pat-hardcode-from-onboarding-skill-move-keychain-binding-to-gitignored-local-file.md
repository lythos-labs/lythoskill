# TASK-20261019125608729: strip lythos-agent-pat hardcode from onboarding skill; move keychain binding to gitignored local file

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-19 | Created |
| in-progress | 2026-10-19 | Started |
| review | 2026-10-19 | Deliverables committed |
| completed | 2026-10-19 | Done |

## Background & Goals
Generic skills shipped from this repo must be context-clean; personal credential
bindings belong in gitignored local space. Onboarding Layer 3b (added by
`ee12884d`, TASK-20261013225251343, post-2026-10-13 incident) hardcodes the
keychain service name `lythos-agent-pat` — one developer's personal keychain
entry — into a product consumed by non-lythos projects. Same class of leakage
in committed docs/scripts: AGENTS.md §9 (6 mentions), creator's
release-auth-workflow.md (6 mentions), scripts/publish-github-release.sh.

Root cause (owner's diagnosis, 2026-10-19): positioning confusion — self-
maintenance conventions leaked into a product; the authoring session classified
the skill edit as "docs/SOP" and never loaded "this ships to strangers".
`.private/` was already the planned home for personal bindings; amnesiac
sessions didn't know and hardcoded.

Baseline datum (ZK-verified 2026-10-19): 21 in-scope hits for
`grep -rn "lythos-agent-pat" packages/ skills/ scripts/ AGENTS.md`
(packages 7, skills 7, scripts 1, AGENTS.md 6). Acceptance = 0.

Decision recorded in **ADR-20261019125409359** (proposed; this card's commit
carries the accept trailer).

## Requirements
- [ ] Create machine-local binding `.private/keychain-service` containing `lythos-agent-pat` (gitignored; never committed; single line, trailing newline optional — `$(cat …)` strips it)
- [ ] Cut 1 — onboarding SKILL.md Layer 3b: remove the export line; run `gh run list` on ambient gh auth; document failure semantics (not logged in → `gh auth login`; 401 → token expired; 404 → the logged-in account's token lacks grant for this repo)
- [ ] Cut 2a — AGENTS.md (lines 20, 462-499, 555): reference the service name indirectly via `$(cat .private/keychain-service)`; store/rotate instructions create the binding file first; PAT pre-fill link drops `name=lythos-agent-pat`
- [ ] Cut 2b — creator `release-auth-workflow.md` (lines 39, 46, 55, 75, 262, 270): same indirect references
- [ ] Cut 2c — `scripts/publish-github-release.sh`: read service name from `.private/keychain-service`; skip the keychain step when the file/name is absent (env `GH_TOKEN` may already be set); keep the fallback chain (env → keychain → secret-tool → .github-token); the chain-end no-token error teaches the binding file
- [ ] Build sync: rebuild `skills/lythoskill-project-onboarding` + `skills/lythoskill-creator`
- [ ] Historical records (daily/, completed+suspended cards, drafts/, *.bak) untouched — point-in-time facts

## Technical Approach
Decision + rejected options: **ADR-20261019125409359** (this section references it; it is not the only record).

Mechanics: replace the literal `lythos-agent-pat` with `$(cat .private/keychain-service)`. Guard semantics (ZK P1 reconciliation): "loud" lives in two places only — docs use an unguarded `$(cat …)` so a missing file errors visibly at the command line; `publish-github-release.sh` skips the keychain step when the binding is absent and its chain-end no-token error teaches the binding file. The script does NOT hard-fail when the binding file is missing while env `GH_TOKEN` is present (that would break a valid flow). NO fallback to a baked-in default anywhere — a fallback would re-introduce the binding. The Linux `secret-tool` line stays literal (org-scoped lookup attributes, ADR follow-up). `scripts/publish.sh` audited as the clean baseline (relative paths + loud failure).

Explicit non-goals (sweep card, registered separately):
- P0: `release-auth-workflow.md` carries lythos-private auth values as if they were universal release methodology (per owner 2026-10-19: teaching release governance in the skill is fine; private bindings presented as methodology is not). Fix = parameterize, not remove the doc.
- P1: `calt13.github.com` SSH alias presented as project fact (AGENTS.md:455, release-auth-workflow.md:30).
- P2: absolute `/Users/chariots/...` paths in curator BDD reproduce.sh ×5 (+ showcase ×7).

## Acceptance Criteria
- [ ] `grep -rn "lythos-agent-pat" packages/ skills/ scripts/ AGENTS.md` → 0 hits (baseline was 21)
- [ ] `.private/keychain-service` exists locally with content `lythos-agent-pat`; `git check-ignore .private/keychain-service` confirms ignored; `git status --short` does not list it
- [ ] Built skills in sync → Verify: after `build`, `git status --short -- skills/` shows exactly two modified files: `skills/lythoskill-project-onboarding/SKILL.md`, `skills/lythoskill-creator/references/release-auth-workflow.md`
- [ ] Shell syntax → Verify: `bash -n scripts/publish-github-release.sh` exit 0
- [ ] Full test gate → Verify: `bun --filter='*' run test` — count pass/fail recorded in daily
- [ ] Dogfood CI 尾检 on ambient auth → Verify: `env -u GH_TOKEN gh run list --workflow=CI --limit 1` shows latest main push = success (no export needed)

## Progress Log
- 2026-10-19: Card created after owner report — onboarding CI 尾检 hardcodes keychain service name; same-class leakage found in AGENTS.md §9, creator release-auth-workflow.md, publish-github-release.sh. ADR-20261019125409359 recorded first (owner's two-cut framing).
- 2026-10-19: ZK review round 1 (subagent agent-3, pass-by-reference: card + ADR + AGENTS.md). Verdict: executable after gap fixes. P1 ×1 — card/ADR contradiction on script guard semantics → resolved per reviewer recommendation (skip-keychain when binding absent; loud = docs' bare `$(cat …)` + chain-end error; ADR wording aligned). P2 ×3 — criterion named the two built files; ADR status noted (accept trailer in this card's commit); baseline 21 hits added to Background. P3 — duplicate template sections removed; binding file format noted. All anchors spot-checked exact by reviewer; cut list confirmed complete against repo-wide grep (no fifth carrier).
- 2026-10-19: Executed. Acceptance: grep 0 hits (baseline 21); built skills exactly 2 files modified; `bash -n` OK; test gate 1285 pass / 0 fail / 2912 expect @ Bun 1.3.11; dogfood `env -u GH_TOKEN gh run list --workflow=CI --limit 1` → latest main push success (ambient auth, no export). Same-class siblings registered as TASK-20261019131118492 (sweep).

## Related Files
- Modified: AGENTS.md; packages/lythoskill-project-onboarding/skill/SKILL.md; packages/lythoskill-creator/skill/references/release-auth-workflow.md; scripts/publish-github-release.sh
- Added: .private/keychain-service (gitignored, machine-local — not committed)

## Git Commit Message
```
fix(onboarding,auth): strip lythos-agent-pat hardcode; credential binding moves to gitignored local file (TASK-20261019125608729)

- onboarding Layer 3b: ambient gh auth (cut 1) — drop keychain export, document 401/404 semantics
- AGENTS.md §9 + creator release-auth-workflow + publish-github-release.sh read the service name from .private/keychain-service (cut 2)
- ADR-20261019125409359
```

## Notes
Detection insight (owner, 2026-10-19): the author of a hardcode cannot see it — external/zero-knowledge perspective is the only reliable detector; some leaks are outright low-level mistakes. Carry this into the sweep card as a repeatable review lens, not a one-off.
