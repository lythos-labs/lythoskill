# TASK-20260730140801284: npm 0.17.2 workspace-protocol leak republish and publish-pipeline regression guard

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-30 | Created |
| in-progress | 2026-07-30 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

**External consumers are broken NOW.** Every published `@lythos/*@0.17.2` package that has internal deps shipped its manifest with `workspace:*` specifiers unrewritten — `bunx @lythos/skill-deck@latest link` fails with `Workspace dependency "@lythos/cold-pool" not found` / `@lythos/cold-pool@workspace:* failed to resolve` (reported by user 2026-07-30; `npm install` fails likewise).

Leak map (verified via `npm view <pkg>@0.17.2 dependencies`, 2026-07-30):
- @lythos/skill-deck: cold-pool, infra
- @lythos/skill-arena: cold-pool, infra, test-utils
- @lythos/skill-curator: cold-pool, infra
- @lythos/cold-pool: infra
- @lythos/test-utils: agent-adapter
- @lythos/agent-adapter-claude-sdk / -deepseek-serve / -codex: 1 each
- Clean: hello-world, agent-adapter, infra, project-cortex, skill-creator (no internal deps)

**Timeline**: rewrite exists since 9c1bf4a9 (2026-05-13); 0.15.7 (05-29) leaked, 0.16.1/0.17.0 (06-15) clean, 0.17.2 (07-10 10:10 +08, bump ccdb5ca0 10:02) leaked. publish.sh unchanged since 2026-05-18 and its rewrite step **works today** (verified by hand on deck's package.json). So the 07-10 publish somehow did not apply the rewrite (script bypassed, e.g. manual `npm publish` per package — `build.ts` prints `npm publish --access public` as a next-step hint that an agent could naively follow — or E2E passed falsely via bunx cache). Exact deviation not recorded in any daily.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] R1 (必达) Republish all packages with rewritten manifests as a patch release (0.17.3) via the official flow: `bunx @lythos/skill-creator bump` → `bun install` → commit → push → `./scripts/publish.sh`. **Requires explicit user release intent** — never bump unprompted.
- [ ] R2 (必达) Post-publish verification from a CLEAN environment (not the publishing machine — bunx cache can mask leaks): `npm view @lythos/skill-deck@0.17.3 dependencies` shows no `workspace:`; ideally a clean-vm/container `bunx @lythos/skill-deck@0.17.3 link --help`.
- [ ] R3 (必达) Regression guard so a leaked manifest can never ship silently again: a script (e.g. `scripts/check-published-manifests.ts`) that asserts zero `workspace:` in `npm view` deps for every published @lythos package; wire it into the release submit checklist (AGENTS.md) and/or CI.
- [ ] R4 (可选) Root-cause note: record in this card why publish.sh's E2E gate didn't catch 0.17.2 (bunx cache hypothesis vs script bypass) if recoverable; if not, say so.
- **不做**: no unpublish attempts (>72h window long past); no `npm deprecate` unless user asks; no changes to the rewrite script itself unless a defect is found (none found 2026-07-30).

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->
- R1 is a release — follow `packages/lythoskill-creator/skill/references/release-auth-workflow.md` exactly (npm publish BEFORE github push is not applicable here since code is already pushed; this is a manifest-only republish).
- R3 guard: read `scripts/publish.sh` PACKAGES array as the package list (SSOT), `npm view <name>@latest dependencies` per package, fail loudly on any `workspace:` match. Keep it dumb (Intent/Plan/Execute).
- Consider also adding the guard as the LAST step of publish.sh itself (belt-and-braces alongside the existing bunx E2E).

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] `npm view @lythos/skill-deck@0.17.3 dependencies` (and the 7 other leaked packages) contains no `workspace:` → Verify: publish.sh trailing guard output "✅ 13 published package(s) @0.17.3: no workspace: specifiers in manifests" (2026-07-31 run, exit 0)
- [x] External resolution works from clean env → Verify: `HOME=$(mktemp -d) bunx @lythos/skill-deck@latest link` in empty tmp dir → "Resolving dependencies / Resolved, downloaded and extracted [26]" → expected `❌ skill-deck.toml not found` (resolution fixed; error is correct no-deck behavior); `@lythos/skill-arena@latest --help` (6 internal deps) → 234 deps resolved, help printed
- [x] Regression guard exists and fails on the 0.17.2 state → Verify: `bun scripts/check-published-manifests.ts 0.17.2` → exit 1, exactly the 8 leaked packages listed; `@0.17.3` via publish.sh → exit 0
- [x] AGENTS.md Release Submit checklist references the guard → Verify: `grep -n "LEAK" AGENTS.md` → `[LEAK]` gotcha + Release line tripwire mention

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-07-30 — Registered after user report (`bunx @lythos/skill-deck@latest link` → workspace resolution errors). Leak map verified by hand (see Background). Rewrite script proven working; pipeline intact; 07-10 deviation path unrecoverable from docs.
- 2026-07-30 — Guard implemented (`scripts/check-published-manifests.ts` + 6 unit tests, IO-injectable); wired as publish.sh's final step (belt-and-braces after bunx E2E, which a warm cache can mask); AGENTS.md `[LEAK]` gotcha + Release line. Live negative test vs @0.17.2: exit 1, exactly 8 leaked packages.
- 2026-07-31 — **0.17.3 published** (two token iterations: first replacement token lacked publish 2FA-bypass → E403; granular token with bypass-2FA → success). All 13 packages published; bunx E2E 13/13 resolved; manifest guard clean. Clean-env verification with isolated HOME: user's original failing command now resolves. Post-release `refresh --exec` + `link` done.

## Related Files
- Modified: `scripts/publish.sh` (maybe), `scripts/check-published-manifests.ts` (new), `AGENTS.md` (checklist line)
- Added:

## Git Commit Message
```
fix(release): republish with rewritten manifests + published-manifest guard (TASK-20260730140801284)

- 0.17.3 republish via official flow
- check-published-manifests guard + release checklist wiring
```

## Notes
Related: publish.sh header documents the original 0.11.0 instance of this same bug class. Today's in-flight work (TASK-…610/…556, in 03-review) is untouched by this.
