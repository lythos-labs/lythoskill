---
lane: emergency
checklist_completed: true
checklist_skipped_reason: Root test/scenarios was only 2 arena agent BDD files — moved to packages/lythoskill-arena/test/scenarios/
lane_override_reason: "Test convention drift — ADR/AGENTS.md mandate co-located tests"
---
# EPIC-20260515001514240: Emergency: migrate test/scenarios/ to src/ co-located unit tests

> Emergency: migrate test/scenarios/ to src/ co-located unit tests

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-14 | Created |
| done | 2026-05-17 | Root test/ eliminated, scenarios co-located with packages |
| done | 2026-05-17 | Done |

## 背景故事
Root `test/scenarios/` held agent BDD files (`*.agent.md`) that belonged under specific packages. TESTING.md already mandated co-location: unit tests in `src/*.test.ts`, CLI BDD in `packages/<name>/test/scenarios/`. Root test/ layer was drift — agent BDD files for arena were at project root instead of `packages/lythoskill-arena/test/scenarios/`.

No blocker besides priority. Fix was trivial: 2 file moves + cleanup.

## 需求树

### 主题A: Move root test/scenarios to packages #completed
- **产出**: arena-docx-output.agent.md, arena-single-task.agent.md → packages/lythoskill-arena/test/scenarios/
- **产出**: Root test/ directory eliminated
- **验证**: TASK-20260517194318952

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260517194318952 | completed | Move root test/scenarios to package-co-located test directories |

## 归档条件
- [x] Root test/scenarios/ eliminated
- [x] All agent BDD scenarios co-located with their packages
- [x] TESTING.md conventions enforced
