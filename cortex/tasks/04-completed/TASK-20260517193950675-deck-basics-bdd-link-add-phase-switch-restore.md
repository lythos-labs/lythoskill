# TASK-20260517193950675: Deck basics BDD — link/add/phase-switch/restore

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | Closed via trailer |

## 背景与目标
Deck had zero behavioral test coverage. This BDD scenario verifies that an agent can autonomously add a skill to the deck via CLI and sync the working set.

Epic: EPIC-20260517121757041 Theme A (Deck Core Behavior)

## 需求详情
- [x] BDD: agent adds skill-b to deck via toml edit + `deck link` + checkpoint
- [x] Scenario: `packages/lythoskill-deck/test/scenarios/deck-add.agent.md`

## 技术方案
Agent BDD: subagent reads scenario, executes Given/When/Then/Judge in isolated `/tmp` workdir. Verifies: toml updated, symlink created, checkpoint JSONL valid.

## 验收标准
- [x] `deck-add.agent.md` scenario validates: deck link creates symlink for new skill
- [x] Checkpoint shape matches `{step:"deck.add", final_state:{added:"skill-b"}}`
- [x] Cold pool source untouched after add

## 关联文件
- 新增: `packages/lythoskill-deck/test/scenarios/deck-add.agent.md`
- 新增: `packages/lythoskill-deck/test/scenarios/deck-remove.agent.md`
- 新增: `packages/lythoskill-deck/test/scenarios/deck-refresh.agent.md`
- Epic: EPIC-20260517121757041
