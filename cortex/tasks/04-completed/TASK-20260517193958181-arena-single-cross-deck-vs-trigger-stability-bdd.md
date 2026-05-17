# TASK-20260517193958181: Arena single + cross-deck vs trigger stability BDD

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | Closed via trailer |

## 背景与目标
Arena's `single` mode (agent-orchestrated) and cross-deck comparison need BDD validation. Verify that arena can spawn subagents correctly and that trigger stability (consistent desc→activation) survives across deck configurations.

Epic: EPIC-20260517121757041 Theme B (Snapshot + Arena BDD)

## 需求详情
- [x] BDD: arena single produces valid output for a given task
- [x] BDD: arena cross-deck comparison yields comparative verdict
- [x] Scenario: `packages/lythoskill-arena/test/scenarios/arena-single-task.agent.md`
- [x] Scenario: `packages/lythoskill-arena/test/scenarios/arena-docx-output.agent.md`

## 技术方案
Agent BDD: subagent runs arena single with a deck, verifies output structure (verdict, criteria, scores). Cross-deck: same task, two decks, comparative judge. docx-output validates agent can use arena-linked skills to produce formatted documents.

## 验收标准
- [x] `arena-single-task.agent.md`: arena produces structured output (verdict + criteria)
- [x] `arena-docx-output.agent.md`: agent produces valid .docx file via arena-linked deck
- [x] Cross-deck trigger stability: same task with different decks produces comparable results

## 关联文件
- 新增: `packages/lythoskill-arena/test/scenarios/arena-single-task.agent.md`
- 新增: `packages/lythoskill-arena/test/scenarios/arena-docx-output.agent.md`
- Epic: EPIC-20260517121757041
