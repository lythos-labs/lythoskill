# TASK-20260828195535425: explain curator degraded entries on scan output

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Registered from the user-sim review of TASK-20260827131734103 (P2: "finding without artifact"). The 2026-08-27 ZK external-onboarding trial found: scanning a real cold pool prints 6 unexplained "degraded" entries — alarming on first contact, and ironically triggered by lythoskill's own skills in the pool. TASK-…34103 fixed the fail-open arg handling and the noisy YAML warning (R1-R3), but the "degraded" entries UX was left unaddressed and unregistered.

A first-time user running `curator` on their pool sees "degraded" with no explanation of what was lost or whether they should care.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Understand first: what makes an entry "degraded" in `packages/lythoskill-curator/src/cli.ts` (frontmatter parse fallback path — see the `parseError` handling around scanSkill). List the 6 lythoskill-own skills that trip it and why
- [ ] R2 (必达) Pick one: (a) print a one-line explanation + remediation hint alongside degraded entries, or (b) fix lythoskill's own skill frontmatter so they stop degrading, or (c) both. Decision recorded in the card
- [ ] R3 (必达) Test: scan fixture with a degraded frontmatter → output explains, not just labels
- **不做**: no index schema changes; no silencing of the degraded signal itself (it's real information)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Entry: `packages/lythoskill-curator/src/cli.ts` — `scanSkill` (~line 90-130) sets parseError and the entry degrades; find where "degraded" is printed (search the scan report path).
- The `{{ PACKAGE_VERSION }}` template placeholders in our own skills' SKILL.md frontmatter are the likely trigger — after the R3 warning suppression in TASK-…34103, parse still fails (or yields stringified keys) → degraded. Verify this hypothesis first.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] Running the local curator CLI on the real cold pool prints either zero unexplained degraded entries, or each with a one-line reason → Verify: `bun packages/lythoskill-curator/src/cli.ts` and read the output
- [ ] `bun --filter='./packages/lythoskill-curator' run test` green → Verify: run it

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Registered from user-sim review P2 (finding without artifact). Origin: ZK onboarding trial 2026-08-27, noted in TASK-20260827131734103 Background.

## Related Files
- Modified: packages/lythoskill-curator/src/cli.ts (pending)
- Added: (none)

## Git Commit Message
```
fix(curator): explain degraded entries on scan output (TASK-20260828195535425)

- one-line reason + remediation hint per degraded entry (or fix own frontmatter if that is the trigger)
```

## Notes
