# TASK-20260827131734103: curator-cli-fails-open-on-unknown-arg

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Found by ZK external-onboarding trial (2026-08-27, agent-14, evidence in /tmp/zk-onboard-test): the site documented `bunx @lythos/curator scan` (wrong package AND wrong subcommand — docs now fixed). But the CLI itself **fails open**: `lythoskill-curator scan` treats the unknown first arg `scan` as a pool path, prints "Indexed 0 skills" with exit 0, and creates a garbage `scan/.lythoskill-curator/` directory in the user's cwd. A user who doesn't notice "0 skills" now has an empty index and `find` appears broken. Guards must fail loudly (AGENTS.md [GUARD] principle — same class as `|| true`).

Secondary finding from the same trial: scanning a real pool emits a noisy YAML stack-trace warning ("Keys with collection values will be stringified… `{{ PACKAGE_VERSION }}`", cli.ts:105) plus 6 unexplained "degraded" entries — alarming on first contact; ironically triggered by lythoskill's own skills in the pool.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Unknown positional arg that is not an existing directory → non-zero exit + loud error ("unknown command or nonexistent pool path: X") listing valid usage
- [ ] R2 (必达) Decide and implement the `scan` UX: either accept `scan` as an explicit alias (docs historically said `curator scan`) or reject it with a pointer to the positional form — one behavior, tested
- [ ] R3 (可选) Quiet the YAML stringify warning for our own skills' frontmatter, or print a one-line explanation of "degraded" entries with a remediation hint
- **不做**: no CLI interface redesign beyond arg validation; no changes to the db schema

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Entry: `packages/lythoskill-curator/src/cli.ts` main dispatch (~line 543+ usage errors; scan path handling where first positional arg is consumed as pool path)
- Validate the positional arg with `existsSync` before scanning; error path follows the HATEOAS 3-part template (what failed / why / what to do)
- Tests: co-located `*.test.ts` — negative tests for unknown arg, nonexistent path, and the `scan` literal; assert non-zero exit + stderr content, and NO directory created in cwd

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `cd /tmp/x && bunx @lythos/skill-curator scan` → exit non-zero, stderr names the problem, `/tmp/x/scan/` NOT created → Verify: run the command, check exit code + `ls /tmp/x`
- [ ] `lythoskill-curator /nonexistent/path` → same loud failure → Verify: same
- [ ] `bun --filter=@lythos/skill-curator run test` — all pass incl. new negative tests → Verify: run it

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified: (pending)
- Added: (pending)

## Git Commit Message
```
fix(curator): fail loudly on unknown arg instead of scanning garbage path (TASK-20260827131734103)

- Validate positional pool arg before scan; HATEOAS error on unknown/nonexistent
- Decide `scan` alias behavior; negative tests prove no garbage dir created
```

## Notes
- ZK trial evidence: /tmp/zk-onboard-test (may be cleaned by /tmp rotation); full report in daily/2026-08-27.md
- The site docs that triggered this discovery are already fixed (site/guide + architecture, en+zh)
