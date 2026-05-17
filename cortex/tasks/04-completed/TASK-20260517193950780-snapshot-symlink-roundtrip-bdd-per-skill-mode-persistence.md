# TASK-20260517193950780: Snapshot symlink roundtrip BDD — per-skill mode persistence

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | Closed via trailer |

## 背景与目标
`to-symlink` / `to-snapshot` subcommands let users switch between symlink and directory-copy modes per skill. Need BDD validation that roundtrip and content integrity work correctly. Snapshot mode is critical for Codex CLI compatibility (symlink bug #11314) and version pinning.

Epic: EPIC-20260517121757041 Theme B (Snapshot + Arena BDD)

## 需求详情
- [x] BDD: to-snapshot creates complete directory copy, to-symlink restores symlink
- [x] Scenario: `packages/lythoskill-deck/test/scenarios/deck-to-symlink-to-snapshot.agent.md`
- [x] Verify content integrity: 258-line SKILL.md + 27KB example.html survive roundtrip

## 技术方案
Agent BDD in `/tmp/deck-bdd-snapshot/` isolation: critique skill as symlink → `to-snapshot` → verify directory with full content → `to-symlink` → verify symlink restored. Discovery: `deck link` reconciler doesn't yet respect per-skill mode (uses symlink for everything) — documented as behavior gap, not a bug (per TASK-20260517122556223).

## 验收标准
- [x] to-snapshot creates complete directory copy with all files intact
- [x] to-symlink restores symlink pointing to cold pool source
- [x] Roundtrip (symlink→snapshot→symlink) preserves all content
- [ ] Snapshot preserved by `deck link` (behavior gap — future work)

## 关联文件
- 新增: `packages/lythoskill-deck/test/scenarios/deck-to-symlink-to-snapshot.agent.md`
- ADR: ADR-20260507190157540 (snapshot 原始设计)
- ADR: ADR-20260509144134332 (rename sync/freeze → to-symlink/to-snapshot)
- Epic: EPIC-20260517121757041
