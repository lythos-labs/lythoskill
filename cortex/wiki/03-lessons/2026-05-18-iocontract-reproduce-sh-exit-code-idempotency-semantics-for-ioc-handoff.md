---
created: 2026-05-18
updated: 2026-05-18
category: lesson
---

# IoContract: reproduce.sh exit code + idempotency

**Source**: Zero-knowledge subagent roundtrip on deck-to-symlink-to-snapshot BDD.
**Lesson**: reproduce.sh IoC instructions must explicitly state idempotency expectations.

## The Gap

`to-snapshot` when already in snapshot mode returns exit 0 (no-op). The subagent
flagged this ambiguity — judge.md accounted for it via `"already in X mode" OR exit code unchanged`,
but the subagent had to INFER this from context. A fresh agent shouldn't need to infer.

## The Fix

reproduce.sh IoC instructions should include an idempotency note:

```bash
echo "  Note: all commands are idempotent. Exit 0 = success (including no-op)."
echo "  'already in snapshot mode' is PASS, not a warning."
```

## IoC Contract Principles

| Element | Spec |
|---------|------|
| Exit 0 | Success (including no-op / already-in-state) |
| Exit non-0 | Failure (agent should diagnose and retry) |
| Idempotency | judge.md criteria accept both "already in X" AND exit 0 |
| Clarity | echo instructions state expectations explicitly |

## Why This Matters

reproduce.sh is executed by agents with ZERO prior context. Every assumption a human
would "just know" must be stated in the IoC instructions. The subagent reads literally.

## Related

- wiki `zero-knowledge-reproduce-sh-handoff.md` — the pattern this lesson refines
- Coach principle: "close-specific-failure" — subagent found the exact edge case
