# TASK-20260828220646204: curator add post-clone index records hardcoded parsed status

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

ZK review of TASK-20260828195535425 (degraded-entry fix) surfaced a pre-existing inconsistency: the `curator add` post-clone index path hardcodes `$status: 'parsed'` / `$parse_error: null` (`packages/lythoskill-curator/src/cli.ts:~1279,1282`) even when `scanSkill` returned a degraded meta. So `curator add` of a frontmatter-less or bad-YAML skill records `parsed` until the next full scan corrects it. The new incomplete/no-frontmatter semantics from …35425 make this drift more visible.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) The add post-clone index write uses the `status`/`parseError` from the `scanSkill` result it already has, instead of hardcoded 'parsed'/null
- [ ] R2 (必达) Test: `runAdd` of a skill whose SKILL.md has no frontmatter → catalog record carries `incomplete` + reason, not `parsed`
- **不做**: no change to scan-time classification rules; no schema migration (status is free TEXT, no CHECK constraint — verified during …35425 review)

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- `packages/lythoskill-curator/src/cli.ts` — the add flow around lines 1270-1290: find where scanSkill's return is available and thread its status/parseError into the catalog write.
- Existing test style: `runAdd` C1-C6 cases in cli.test.ts (~line 300+) with tmp pool + io injection.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] New test: add of a frontmatter-less skill → catalog row status='incomplete' → Verify: `bun test packages/lythoskill-curator/src/cli.test.ts`
- [ ] `bun --filter='./packages/lythoskill-curator' run test` green → Verify: run it

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Registered from ZK skeptic review of TASK-20260828195535425 (P3, pre-existing inconsistency exposed by the new incomplete semantics).

## Related Files
- Modified: packages/lythoskill-curator/src/cli.ts, cli.test.ts (pending)
- Added: none

## Git Commit Message
```
fix(curator): add post-clone index uses scanSkill status, not hardcoded parsed (TASK-20260828220646204)

- degraded skills added via curator add no longer record 'parsed' until next full scan
```

## Notes
