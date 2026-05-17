# Analysis Output Template

When reviewing a SKILL.md, produce this table first, then the improvement list.

## Scoring Table

| Dimension | Current | Target | Status | Action |
|-----------|---------|--------|--------|--------|
| Body lines | _n_ | <500 | ✅/⚠️/❌ | _specific fix_ |
| Body tokens (est.) | _n_ | <5000 | ✅/⚠️/❌ | _specific fix_ |
| desc + when_to_use chars | _n_ | <1536 | ✅/⚠️/❌ | _specific fix_ |
| Reference separation | _yes/no_ | yes | ✅/⚠️/❌ | _specific fix_ |
| Conditional triggers | _n/total_ | all | ✅/⚠️/❌ | _specific fix_ |
| One skill one job | _yes/no_ | yes | ✅/⚠️/❌ | _specific fix_ |
| **Type frontmatter** | _standard/flow/missing/other_ | standard or flow | ✅/⚠️/❌ | _add or fix type_ |
| **Custom field prefix** | _yes/no_ | deck_ | ✅/⚠️/❌ | _prefix custom fields_ |
| **deck_skill_type** | _present/consistent_ | declared if combo/transient/fork | ✅/⚠️/❌ | _add or align_ |
| Factual accuracy | _yes/no_ | yes | ✅/⚠️/❌ | _specific fix_ |
| Doc-code consistency | _pass/fail_ | pass | ✅/⚠️/❌ | _specific fix_ |
| Naive agent test | _pass/fail_ | pass | ✅/⚠️/❌ | _specific fix_ |

Status legend:
- ✅ Meets target
- ⚠️ Within 20% of target or minor issue
- ❌ Significantly exceeds target or missing

## Top 3 Improvements

After the table, list the 3 highest-impact fixes with **before/after examples**.

Format for each:

```
### 1. <Short title>
**Problem**: <what's wrong>
**Fix**: <what to change>
**Before**:
<code/example>
**After**:
<code/example>
```

Prioritize by:
1. Token savings (body size reduction)
2. Trigger coverage (missing when_to_use phrases)
3. Reference hygiene (moving deep content to Tier 3)
