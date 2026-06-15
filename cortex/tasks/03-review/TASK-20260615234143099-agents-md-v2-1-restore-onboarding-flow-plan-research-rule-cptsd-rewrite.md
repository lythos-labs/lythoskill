# TASK-20260615234143099: AGENTS.md v2.1: restore onboarding flow, plan-research rule, CPTSD rewrite

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-15 | Created |
| in-progress | 2026-06-15 | Started |
| review | 2026-06-15 | Deliverables committed |

## Background & Goals

回顾 5月1日以来 AGENTS.md 的 140 次修改，发现 1003 行版本 (c2c5802) 中有若干独立章节在 v2 重构 (47a820e) 中被删除，但当前 695 行版本过于精简。需要恢复：
1. **Onboarding for New Agent** 连续流 — 当前 Boot First 太简略，agent 需要完整的 "First 5 Minutes" 引导
2. **Plan must include research** 规则 — 当前埋在 "Git provenance" 里，不够突出
3. **CPTSD 长文** — 当前只有表格，缺少与 TDD/Diagnose 技能的连接解释
4. **Arena 独立章节** — 当前信息分散在 4 个地方

同时保持 v2 的 4-zone 结构 (Z1-Z4) 和激活地图风格。

## Requirements
- [ ] 新增 Z1 §0.5 "Onboarding for New Agent" — 连续执行流，不要分散在 4 个 Zone
- [ ] Z2 Hard rules 新增 #8 "Plan must include research"
- [ ] 重写 "When Internal Signals Fire" — 用 "应该/连接" 替代 "不要/否则"
- [ ] 新增 Z4 §5 "Arena at a Glance" — 3 个常用模式 + HATEOAS/dormancy 说明
- [ ] 更新 Z4 后续章节编号 (6-11)
- [ ] 不恢复 "Current Focus" (KV cache 脆弱性，已确认删除正确)
- [ ] 不恢复 DeepSeek TUI (非重点，用到再说)

## Technical Approach
- 插入点：Z1 Boot First 后面 → Onboarding；Z2 Hard rules 末尾 → Plan research；Z4 Hot Files 前面 → Arena
- 编号调整：Hot Files 6→7, Deck Governance 7→8, Project Structure 8→9, Release & Auth 9→10, Project Skills 10→11, Pointer Index 11→12
- CPTSD 重写：保留表格，新增 "Connection to TDD and Diagnose" 段落，用 "reward patience over speed" 替代对抗语言

## Acceptance Criteria
- [ ] AGENTS.md 行数从 695 → ~750（增量合理，不膨胀）
- [ ] 所有章节编号连续，无跳号
- [ ] `git diff --stat` 显示 AGENTS.md 修改，无其他文件意外改动
- [ ] 快速阅读：新 agent 能在 2 分钟内找到 "First 5 Minutes" 流程
- [ ] 快速阅读：agent 能在 30 秒内找到 "Plan must include research"

## Progress Log
- 2026-06-15 15:45: Implemented all changes:
  - Added Z1 §0.5 "Onboarding for New Agent" (25 lines)
  - Added Z2 Hard rule #8 "Plan must include research"
  - Rewrote "When Internal Signals Fire" with TDD/Diagnose connection
  - Added Z4 §5 "Arena at a Glance" (18 lines)
  - Renumbered Z4 sections 6-11
- 2026-06-15 15:50: Tests pass — 743 pass, 0 fail across all packages
- AGENTS.md: 695 → 744 lines (+49 lines, 净增合理)

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260615234143099)

- Detail 1
- Detail 2
```

## Notes
