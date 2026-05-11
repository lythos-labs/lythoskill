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
| done | 2026-05-11 | Done |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| T1 — SSOT test infra | ✅ completed | `TASK-20260508222319664`: package.json scripts + root + CI test.yml |
| T2 — Doc syndication blockers | ✅ completed | `TASK-20260508222319692`: (2 项延后→carry-over) |
| T3 — Doc drift polish | ✅ completed | `TASK-20260508222319717`: root README dup heading + ad-hoc inaccuracies + ref-link orphans |
| T4 — Curator simplification | ✅ completed | `TASK-20260509113254423`: 删 feed-adapters.ts + discover CLI per ADR-20260508230803515 |
| T5 — Arena doc + CLI rename + HATEOAS errors | ✅ completed | `TASK-20260509101438298`: --skills deleted; single/vs rename; agent-friendly errors; examples/arena/ |
| T6 — Arena e2e verification | ✅ completed | `TASK-20260509104331469`: 7/7 scenarios PASS (single/vs/scaffold/docx) |
| T7 — project-cortex HATEOAS errors | 🔲 backlog | `TASK-20260509113255134`: 所有错误加 Usage + 示例 + 引导 |
| T8 — General catch cleanup | 🔲 backlog | `TASK-20260509113256236`: 所有包的 `❌ ${e.message}` 替换为 HATEOAS |
| T9 — URL-first HATEOAS regression playbook | ✅ baseline (T7/T8 待应用) | `TASK-20260509121724330`: v0.9.43 7/7 PASS + dormancy 验证;subagent 隔离 worktree;复用于 T7/T8 |

## Deferred (from T2)
- Multi-platform tagging in SKILL.md frontmatter
- Scripts SSOT alignment (test-report.ts + validate-example-decks.ts → root npm scripts)

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260502012643244 | FQ-only locator | accepted |
| ADR-20260507014124191 | Agent-friendly CLI error | accepted |
| ADR-20260509104832428 | Arena CLI rename + --decks removal | accepted |

## 归档条件
- [ ] T1 ✅ | T2 ✅ | T3 ✅ | T5 ✅ | T6 ✅
- [ ] T4 — curator simplification
- [ ] T7 — project-cortex HATEOAS errors
- [ ] T8 — general catch cleanup
- [ ] T9 — URL-first HATEOAS regression playbook(baseline ✅,T7/T8 应用待跑)
- [ ] T2 deferred resolved or spun off
