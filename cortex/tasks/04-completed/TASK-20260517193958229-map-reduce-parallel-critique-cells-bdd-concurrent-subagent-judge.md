# TASK-20260517193958229: Map-reduce parallel critique cells BDD — concurrent subagent judge

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | Closed via trailer |

## 背景与目标
Arena's comparative judge uses a map-reduce pattern: each criterion dispatched to an independent subagent (map), then verdict assembled from parallel critiques (reduce). This BDD validates the concurrent subagent spawn + judge pipeline works end-to-end.

Epic: EPIC-20260517121757041 Theme B (Snapshot + Arena BDD)

## 需求详情
- [x] BDD: arena comparative judge correctly spawns parallel subagents per criterion
- [x] Scenario: `packages/lythoskill-test-utils/test/scenarios/bdd-runner.agent.md`
- [x] Scenario: `packages/lythoskill-curator/test/scenarios/graduation-exam.agent.md`

## 技术方案
Agent BDD via bdd-runner: spawn multiple subagents simultaneously, each judging one criterion cell. Reduce step merges verdicts. Validates: no race conditions, all criteria evaluated, verdict structure valid. Curator graduation exam validates skill discovery pipeline.

## 验收标准
- [x] `bdd-runner.agent.md`: parallel subagent dispatch produces valid merged verdict
- [x] `graduation-exam.agent.md`: curator skill discovery scenario passes
- [x] All criteria cells evaluated (no silent skips from concurrency bugs)

## 关联文件
- 新增: `packages/lythoskill-test-utils/test/scenarios/bdd-runner.agent.md`
- 新增: `packages/lythoskill-curator/test/scenarios/graduation-exam.agent.md`
- Epic: EPIC-20260517121757041
