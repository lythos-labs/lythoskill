# TASK-20260517121819470: BDD: to-symlink/to-snapshot 切换 + link 行为缺口

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | 2 PASS, 1 PARTIAL FAIL |

## 做了什么

验证 deck 的 `to-symlink` / `to-snapshot` 子命令。Snapshot = cp 目录（pin 版本，不跟随冷池），symlink = 实时链接。原始意图来自 ADR-20260507190157540。

## 怎么做

1. 创建 `/tmp/deck-bdd-snapshot/` 隔离环境
2. skill-deck.toml: innate=lythoskill-deck, tool=critique
3. 三个场景: round-trip / content integrity / snapshot vs link 隔离

## 得到什么结果

### Scenario 1: to-snapshot + to-symlink round-trip — PASS ✅
- critique symlink → `to-snapshot` → directory → `to-symlink` → symlink
- Round-trip 无损失，内容完整

### Scenario 2: to-snapshot content integrity — PASS ✅
- Snapshot 捕获完整 SKILL.md (258行) + example.html (27KB)
- 目录独立于冷池

### Scenario 3: link does not respect per-skill mode (current implementation stage)
- **Given**: critique 是 snapshot (目录)
- **When**: `deck link`
- **Then**: link 备份 snapshot 到 tar.gz，替换为 symlink
- **Why this matters**: 原始两个动机 —
  1. Codex CLI 某些版本对 symlink 支持不完整 → snapshot (cp dir) 是 workaround
  2. 项目不想跟 refresh 更新版本 → pin 在特定 commit
  两者都要求 link 保留 snapshot 形态。当前 link reconciler 一律出 symlink，per-skill mode 尚未接入 metadata 层。

Not a bug — metadata integration for per-skill mode is future work.

**指标**: 29,669 tokens, 28 tool calls, 284s

## 验收标准
- [x] to-snapshot 创建完整目录副本
- [x] to-symlink 恢复为 symlink
- [x] round-trip 无数据损失
- [ ] snapshot 被 link 保留 (行为缺口 — 待确认)

## 关联
- Epic: EPIC-20260517121757041
- ADR: ADR-20260507190157540 (snapshot 原始设计)
- ADR: ADR-20260509144134332 (rename sync/freeze → to-symlink/to-snapshot)
- Report: `/tmp/deck-bdd-snapshot/report.md`
