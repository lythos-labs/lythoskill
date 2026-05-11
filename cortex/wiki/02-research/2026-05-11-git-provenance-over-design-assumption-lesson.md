---
created: 2026-05-11
updated: 2026-05-11
category: lesson
---

# Git Provenance Over Design Assumption

> When you see code that looks wrong, don't assume "it was designed this way."
> Use git tools to find out. Small commits make this fast and conclusive.

## The Anti-Pattern

Agent encounters suspicious code → assumes it's intentional ("someone must have had
a reason") → works around it or leaves it alone → bug persists.

## The Pattern

Agent encounters suspicious code → `git log --oneline -5 <file>` → `git show <hash>`
→ reads the commit message → understands the real intent → judges whether the fix
was correct or over-broad.

## Case Study: `|| true` in pre-commit-test.ts (2026-05-11)

`|| true` in the pre-commit test gate looked like intentional error suppression.
A quick `git log --oneline scripts/pre-commit-test.ts` traced it to:

```
a671b8cb fix(pre-commit): handle packages with no test files
```

One commit, one message, one line diff: `|| true` was added to handle the
`creator` package which has no `.test.ts` files (`bun test` exits 1 in that case).

Without git provenance, three failure modes:

1. **"Don't touch it"**: assume `|| true` serves a critical purpose, leave the
   dead gate in place. Real test failures continue passing pre-commit.

2. **"Remove it blindly"**: delete `|| true` without understanding the edge case,
   reintroduce the original `creator`-no-test-files false positive.

3. **"Rewrite from scratch"**: replace the whole script with a new approach,
   losing the accumulated edge-case knowledge embedded in the commit history.

With git provenance, the correct fix was trivial: parse `N fail` from stdout
instead of relying on exit code. Two lines changed, both edge cases handled.

## Why Small Commits Matter Here

This only works because each commit has one intent:

- `git blame` points to the exact commit that changed the line
- `git show <hash>` shows a 1-line diff, not a 500-line refactor
- The commit message explains WHY, not just WHAT
- `git bisect` can pinpoint behavioral regressions to a single commit

If `|| true` was buried in a "fix various issues" commit alongside 20 other
changes, the provenance trail would be useless — you'd know which commit touched
the line, but not why.

## The Workflow

```bash
# 1. Find who touched this line and when
git log --oneline -5 -- scripts/pre-commit-test.ts

# 2. See what they changed
git show a671b8cb

# 3. Read the commit message for intent
git log -1 --format="%B" a671b8cb

# 4. Judge: was the fix correct, or did it introduce a broader problem?
```

Three commands, under 5 seconds. Replaces hours of guessing.

## When to Apply

- Any guard/gate/validation code that looks suspicious
- Error suppression patterns (`|| true`, `.catch(() => {})`, empty except blocks)
- Magic numbers or seemingly arbitrary thresholds
- "Why is this package excluded?" patterns

## When NOT to Apply

- Obvious typos or one-character fixes (the commit message adds no value)
- Code you just wrote yourself
- Patterns you've already traced in the same session

## Related

- ADR-20260423101950000 (ESM-only) — another case where git log reveals
  the decision timeline
- `2026-05-11-test-infrastructure-audit-real-counts-dead-gates.md` — full
  audit that uncovered this bug
