---
lane: main
checklist_completed: false
checklist_skipped_reason: backfilled pre-ADR-20260503003315478
---
# EPIC-20260430012504755: Skill progressive disclosure and quality audit

> Skill progressive disclosure and quality audit

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-04-29 | Created |
| done | 2026-05-03 | Done |

## 背景故事
基于 Claude Code 官方 Agent Skills 文档对项目内所有 SKILL.md 进行质量审计。核心问题：
1. 部分 skill 缺少 `allowed-tools` 声明，导致 agent 执行时权限摩擦
2. 部分 skill 缺少 `version` frontmatter，build 后无法追踪版本漂移
3. reference 文件的条件触发覆盖率需要 review

已完成第一轮 progressive disclosure 改良（deck/cortex/release/scribe 压缩 70%+ body），skill-coach meta-skill 已内置。

## 需求树

### Skill audit fixes #backlog
- **触发**: skill-coach 审计发现 release/scribe 缺少 allowed-tools，cortex/release/scribe 缺少 version
- **需求**: 补齐 frontmatter，消除 agent 执行摩擦
- **实现**: 修改 packages/<name>/skill/SKILL.md + rebuild
- **产出**: 所有 skill 通过 skill-coach 审计
- **验证**: skill-coach 重新审计全绿

### Reference trigger coverage review #backlog
- **触发**: 5 个 skill 共 22 个 references，需要确认条件触发是否足够具体
- **需求**: 每个 reference 都有清晰的一行触发条件
- **实现**: 逐条检查 body 中的 reference table
- **产出**: 无 "See references/ for more details" 式模糊触发
- **验证**: skill-coach conditional triggers 维度全绿

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260430012458517 | backlog | Audit fix: add allowed-tools to release and scribe |
| TASK-20260430012458866 | backlog | Audit fix: add version frontmatter to cortex/release/scribe |
| TASK-20260430012459381 | backlog | Audit fix: review reference conditional trigger coverage |

## 经验沉淀

## 归档条件
- [ ] 所有任务完成
- [ ] 验证通过
