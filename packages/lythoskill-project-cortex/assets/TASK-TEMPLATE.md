# TASK-XXX: Task Title

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | YYYY-MM-DD | Created |
| in-progress | YYYY-MM-DD | Started |
| completed | YYYY-MM-DD | Verified |

## Background & Goal

Link to EPIC-XXX / ADR-XXX

Why does this task exist? What problem does it solve?

## Requirements

### Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### Non-functional Requirements
- Performance:
- Compatibility:
- Constraints:

## Cross-Package Impact Checklist

> Any change to schema, convention, or shared interface must explicitly
> list consumers and verify they're updated. Pre-commit only tests
> changed packages — cross-cutting changes need full test run.

- [ ] Consumer audit: `grep -rn "<old_convention>" packages/` find all consumers
- [ ] Synchronized update: all consumers in same PR / atomic commit
- [ ] Full test: `bun --filter='*' run test` passes (per-package filter is not enough)

## TDD Cycles

> Vertical slices: one behavior → one test → one implementation.
> Do NOT write all tests first, then all implementation. That's
> horizontal slicing — produces tests of imagined behavior.
>
> See TDD skill: tracer bullet first, then incremental loop.

### Cycle 1: [First behavior name]
- **Test**: What behavior does this test?
- **Expected output/state**: 
- **Minimal implementation**:
- **Status**: ⬜ RED / ⬜ GREEN / ⬜ Refactored

### Cycle 2: [Second behavior name]
- **Test**: 
- **Expected output/state**: 
- **Minimal implementation**:
- **Status**: ⬜ RED / ⬜ GREEN / ⬜ Refactored

### Cycle N: [...]

## Acceptance Criteria

> Final verification — all cycles complete, full test suite passes.

- [ ] Criterion 1 (specific, testable)
- [ ] Criterion 2
- [ ] Criterion 3

## Progress Record

<!-- Subagent updates below -->

### Checkpoint 1 - YYYY-MM-DD HH:MM
- [x] Completed: ...
- [ ] Blocked by: ...
- Next: ...

### Checkpoint 2 - YYYY-MM-DD HH:MM
...

## Related Files

- **Modify**: `src/path/to/file.ts`
- **Create**: `src/path/to/new-file.ts`
- **Reference**: `src/path/to/reference.ts`

## Git Commit Message（⚠️ 强制）

```
type(scope): description (TASK-XXX)

- Detail 1
- Detail 2
- Detail 3

Refs: EPIC-XXX, ADR-XXX
```

### 强制要求

**标题必须包含 `(TASK-XXX)`**

✅ 正确: `feat(api): add endpoint (TASK-001)`
❌ 错误: `feat(api): add endpoint`

**Subagent 执行 `git commit` 前必须自我检查：标题中有 Task ID 吗？**

## Notes

- Priority: High/Medium/Low
- Estimated effort:
- Blocked by:
