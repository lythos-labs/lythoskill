---
created: 2026-05-15
updated: 2026-05-15
category: lesson
---

# Curator catalog accuracy — findSkillDirectories recursion bug and scanSkill frontmatter resilience

> Session 4 seed bootstrap exposed that subagent could not reliably query catalog.db for skill discovery. Root cause: catalog.db was silently missing 93 skills vs filesystem ground truth. Two independent bugs compounded.

## Context

Seed bootstrap graduation exam (Session 4) sent a subagent to discover skills from the cold pool. The agent tried querying `~/.agents/skill-repos/.catalog/catalog.db` but found only 346 skills, while the filesystem had 439 SKILL.md files. The agent fell back to filesystem scanning, which worked but was slower and less structured.

This lesson documents the two bugs, the fix, and the verification.

## Bug 1: findSkillDirectories stopped recursion on first SKILL.md

### Symptom
`ColdPool.findSkillDirectories()` returned 380 skills; `buildListPlan` (pure function) returned 435. Gap of 55 skills — all from repos that had both a root-level SKILL.md (standalone) **and** nested sub-directory skills.

### Root cause
In `packages/lythoskill-cold-pool/src/cold-pool.ts`, the `walk` function used an `if/else` that stopped recursing when a directory contained SKILL.md:

```typescript
if (existsSync(join(sub, 'SKILL.md'))) {
  push(sub)
} else {
  walk(sub, push)  // only recursed when NO skill.md
}
```

When `github.com/gstack/SKILL.md` existed, `gstack` was pushed but its 50+ sub-directories (autoplan, benchmark, etc.) were never scanned.

### Fix
Always recurse — a directory with SKILL.md is a skill, but its children may also be skills:

```typescript
if (existsSync(join(sub, 'SKILL.md'))) {
  push(sub)
}
walk(sub, push)  // always recurse
```

### Verification
After fix: `findSkillDirectories` = 435, matching `buildListPlan`.

## Bug 2: scanSkill threw on malformed frontmatter

### Symptom
Curator scan indexed 431 skills but reported "Skipped 4 skill(s) with unreadable or missing frontmatter". Two had valid-looking frontmatter with YAML syntax errors; two had no frontmatter at all.

### Root cause
`scanSkill` called `YAML.parse(rawFm._raw)` without try/catch. Any YAML syntax error threw out of `scanSkill`, causing the skill to be silently skipped.

Examples of failing frontmatter:
- `argument-hint: [product-name] [competitor-url]` — two adjacent flow sequences
- `description: >` with nested mappings later in the body

### Fix
Wrap YAML.parse in try/catch and fall back to empty frontmatter. The skill still gets indexed with path-derived defaults (name = basename(path), source = inferSource(path), etc.):

```typescript
let frontmatter: Record<string, unknown> = {}
try {
  frontmatter = YAML.parse(rawFm._raw as string) || {}
} catch {
  // Frontmatter parse failed — use empty frontmatter, derive basics from path.
}
```

### Verification
After fix: scan indexed 435 skills (was 431). The 4 previously-skipped skills now appear in both catalog.db and REGISTRY.json with empty/default metadata.

## Final state

| Source | Count | Notes |
|--------|-------|-------|
| Filesystem (all SKILL.md) | 439 | includes 4 in hidden dirs (.claude, .codex, etc.) |
| findSkillDirectories | 435 | excludes hidden dirs by design |
| buildListPlan | 435 | matches findSkillDirectories |
| catalog.db | 435 | matches findSkillDirectories |
| REGISTRY.json | 435 | matches catalog.db |

The 4 hidden-dir skills are intentionally excluded (`d.name.startsWith('.')` filter). They are meta-data directories, not primary skills.

## Files changed

- `packages/lythoskill-cold-pool/src/cold-pool.ts` — fix `findSkillDirectories` recursion
- `packages/lythoskill-curator/src/cli.ts` — add try/catch around `YAML.parse` in `scanSkill`

## When to Apply / When Not to Apply

- **Apply**: Any skill repo layout where a standalone skill (SKILL.md at repo root) coexists with nested sub-skills (monorepo-style subdirectories).
- **Not apply**: If the design decision changes to "one repo = one skill, no nesting", this recursion becomes unnecessary.

## Related

- `cortex/wiki/01-patterns/cold-pool-unified-facility-design.md` — cold pool layout conventions
- `cortex/wiki/03-lessons/2026-05-07-real-world-skill-repo-structure-survey.md` — 5 repo layout patterns
- ADR-20260502012643244 (FQ-only locator) — locator precision that makes this fix safe
