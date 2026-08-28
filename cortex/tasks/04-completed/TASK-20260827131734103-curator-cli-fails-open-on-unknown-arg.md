# TASK-20260827131734103: curator-cli-fails-open-on-unknown-arg

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |
| in-progress | 2026-08-28 | Started |
| review | 2026-08-28 | Deliverables committed |
| completed | 2026-08-28 | Done |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Found by ZK external-onboarding trial (2026-08-27, agent-14, evidence in /tmp/zk-onboard-test): the site documented `bunx @lythos/curator scan` (wrong package AND wrong subcommand — docs now fixed). But the CLI itself **fails open**: `lythoskill-curator scan` treats the unknown first arg `scan` as a pool path, prints "Indexed 0 skills" with exit 0, and creates a garbage `scan/.lythoskill-curator/` directory in the user's cwd. A user who doesn't notice "0 skills" now has an empty index and `find` appears broken. Guards must fail loudly (AGENTS.md [GUARD] principle — same class as `|| true`).

Secondary finding from the same trial: scanning a real pool emits a noisy YAML stack-trace warning ("Keys with collection values will be stringified… `{{ PACKAGE_VERSION }}`", cli.ts:105) plus 6 unexplained "degraded" entries — alarming on first contact; ironically triggered by lythoskill's own skills in the pool.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] R1 (必达) Unknown positional arg that is not an existing directory → non-zero exit + loud error ("unknown command or nonexistent pool path: X") listing valid usage
- [x] R2 (必达) Decide and implement the `scan` UX → **decided: reject with pointer** (no alias, keeps surface small); `scan` gets a dedicated "unknown command" error pointing at the positional form
- [x] R3 (可选) Quiet the YAML stringify warning → done: suppress only the "Keys with collection values will be stringified" emitWarning during frontmatter parse (logLevel:'silent' rejected — it would downgrade real syntax errors)
- **不做**: no CLI interface redesign beyond arg validation; no changes to the db schema

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- Entry: `packages/lythoskill-curator/src/cli.ts` — the fall-through is the main-dispatch `else runCurator(args)` (~line 1382-1383): any unknown first arg is treated as pool path. `parseCuratorArgs` (~lines 230-250) consumes any non-dash arg as poolPath; outputDir defaults to `<pool>/.lythoskill-curator` (~line 246); the garbage dir is created by `mkdirSync(outputDir, {recursive:true})` (~line 363)
- Validate the positional arg with `existsSync` before scanning; error path follows the HATEOAS 3-part template (what failed / why / what to do)
- Tests: co-located `*.test.ts` — negative tests for unknown arg, nonexistent path, and the `scan` literal; assert non-zero exit + stderr content, and NO directory created in cwd

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] `cd /tmp/x && bun /Users/chariots/Downloads/lythoskill-main/packages/lythoskill-curator/src/cli.ts scan` → exit non-zero, stderr names the problem, `/tmp/x/scan/` NOT created → covered by negative subprocess tests in cli.test.ts (assert exit 1, stderr content, no dir created)
- [x] `bun packages/lythoskill-curator/src/cli.ts /nonexistent/path` → same loud failure → same test coverage
- [x] `bun --filter='./packages/lythoskill-curator' run test` — all pass incl. new negative tests → canonical gate `bun --filter='*' run test` EXIT=0 (2026-08-28)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Implemented. Positional arg validated with `statSync(..., throwIfNoEntry:false)` BEFORE any mkdir/write side effects; `scan` rejected with pointer to positional form (R2 decision: no alias); YAML "collection values stringified" emitWarning suppressed narrowly during frontmatter parse (R3). Negative subprocess tests in cli.test.ts assert exit 1 + stderr + no garbage dir. Canonical gate EXIT=0.

## Related Files
- Modified: packages/lythoskill-curator/src/cli.ts, packages/lythoskill-curator/src/cli.test.ts
- Added: (none)

## Git Commit Message
```
fix(curator): fail loudly on unknown arg instead of scanning garbage path (TASK-20260827131734103)

- Validate positional pool arg before scan; HATEOAS error on unknown/nonexistent
- Decide `scan` alias behavior; negative tests prove no garbage dir created
```

## Notes
- ZK trial evidence: /tmp/zk-onboard-test (may be cleaned by /tmp rotation); full report in daily/2026-08-27.md
- The site docs that triggered this discovery are already fixed (site/guide + architecture, en+zh)
