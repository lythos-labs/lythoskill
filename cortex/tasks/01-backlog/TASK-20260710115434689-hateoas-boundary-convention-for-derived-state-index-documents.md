# TASK-20260710115434689: HATEOAS boundary convention for derived-state index documents

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-07-10 | Created |

## Background & Goals

Derived-state index documents (`cortex/INDEX.md`, `cortex/wiki/INDEX.md`, etc.) are curated entry points, not exhaustive listings. ZK Review found new agents misinterpret them as real-time ground truth.

**Problem**: Filename "INDEX" implies "complete listing" in general semantics, but this project uses "INDEX" to mean "portal/entry point". Without explicit boundary declaration, agents assume completeness and are confused by staleness.

**Goal**: Establish a project-wide convention that all derived-state index documents include an explicit HATEOAS-style `**What this file is** / **What this file is NOT**` header. Document this as a reusable pattern.

## Requirements

- [ ] Document the HATEOAS boundary convention in a wiki pattern
- [ ] Apply the convention to all existing derived-state index documents
- [ ] Update `generate-index.ts` to auto-include the header in future generated indexes
- [ ] Reference the convention from AGENTS.md

## Technical Approach

1. Write `cortex/wiki/01-patterns/hateoas-boundary-for-derived-state-index.md`
2. Update `generate-index.ts` to output the header template
3. Apply to existing files: `cortex/INDEX.md`, `cortex/wiki/INDEX.md`, and any future index files
4. The header format:
   ```markdown
   > **What this file is**: [One-line role — curated entry point]
   >
   > **What this file is NOT**: [What it does not cover, with concrete pointers]
   ```

## Acceptance Criteria

- [ ] New agent reading any INDEX.md understands it is a portal, not a dashboard
- [ ] ZK Review of index documents produces no "stale index" false positives
- [ ] Convention is documented and referenced from AGENTS.md
- [ ] Verify: `generate-index.ts` outputs compliant headers

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260710115434689)

- Detail 1
- Detail 2
```

## Notes
