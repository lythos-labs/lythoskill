# TASK-20260908232322136: bump rebuilds only 6 skills - pure-skill package version fields lag until pre-commit hook

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-08 | Created |

## Background & Goals

`bunx @lythos/skill-creator bump` prints "Rebuilt 6 skill(s)" — it only
re-renders skill outputs for a subset of packages. Pure-skill packages
(writer, sober, red-green-release, and peers with no `package.json`) keep
a stale `version:` field in their built `skills/<name>/SKILL.md` frontmatter
until the next pre-commit hook run happens to rebuild them. Observed during
the v0.19.1 release (2026-09-08): three skill outputs still said `0.19.0`
after the bump commit; the following unrelated commit's pre-commit hook
silently swept them up.

Self-healing in practice, but it violates lock-step semantics: a release
commit can ship skill outputs that claim the previous version.

## Requirements

- [ ] `bump` rebuilds ALL skill products (identification per ADR-20260502234833756: `packages/<name>/skill/` exists), not a hardcoded/partial subset
- [ ] After a bump, zero `skills/*/SKILL.md` files carry a `version:` different from the new release version (verifiable via grep)

## Technical Approach

Investigate `packages/lythoskill-creator/src/bump.ts` rebuild step: it likely
filters packages by some criterion (e.g. has `package.json` / is publishable)
instead of the ADR-20260502234833756 `skill/` directory test. Reuse the same
`build --all` package selection the pre-commit hook uses so both paths agree.

## Acceptance Criteria

- [ ] `bump patch --dry-run` lists all 14 skill products as rebuild targets (or the real run's "Rebuilt N skill(s)" equals the skill-product count)
- [ ] Immediately after a bump commit, `grep -L "version: <new>" skills/*/SKILL.md` returns empty
- [ ] Existing bump tests updated; no regression on `{{...}}` placeholder protection

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
fix(creator): bump rebuilds all skill products, not publishable subset (TASK-20260908232322136)

- bump.ts rebuild step uses the skill/-exists test (ADR-20260502234833756)
  instead of filtering by package.json presence
- aligns bump rebuild set with pre-commit hook's build --all
```

## Notes
Discovered during v0.19.1 release; daily/2026-09-08.md addendum.
