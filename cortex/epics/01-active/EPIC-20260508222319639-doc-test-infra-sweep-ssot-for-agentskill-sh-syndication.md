---
lane: main
checklist_completed: false
checklist_skipped_reason: Continuation of showcase epic; tasks T1/T2/T3 break down phases
---
# EPIC-20260508222319639: Doc + test infra sweep — SSOT for agentskill.sh syndication

> Doc + test infra sweep — SSOT for agentskill.sh syndication + arena CLI surface alignment

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-08 | Created; T1/T2/T3 completed, T2 items deferred, T4/T5 added 2026-05-09 |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| T1 — SSOT test infra | ✅ completed | `TASK-20260508222319664`: package.json scripts + root + CI test.yml |
| T2 — Doc syndication blockers | ✅ completed | `TASK-20260508222319692`: (2 项延后→carry-over) |
| T3 — Doc drift polish | ✅ completed | `TASK-20260508222319717`: root README dup heading + ad-hoc inaccuracies + ref-link orphans |
| T4 — Curator simplification | ⏳ backlog | 删 feed-adapters.ts + discover CLI per ADR-20260508230803515 |
| T5 — Arena doc + `--skills` deprecation + example decks | ✅ completed | `TASK-20260509101438298`: --skills deleted; examples/arena/ created; 6 doc files updated |

## Deferred (from T2)
- Multi-platform tagging in SKILL.md frontmatter
- Scripts SSOT alignment (test-report.ts + validate-example-decks.ts → root npm scripts)

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260502012643244 | FQ-only locator | accepted |

## 归档条件
- [ ] T1 ✅ | T2 ✅ | T3 ✅
- [ ] T4 — curator simplification
- [ ] T5 — arena doc fix
- [ ] T2 deferred resolved or spun off
