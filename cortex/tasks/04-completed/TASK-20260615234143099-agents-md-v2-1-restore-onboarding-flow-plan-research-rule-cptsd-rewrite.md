# TASK-20260615234143099: AGENTS.md v2.1: restore onboarding flow, plan-research rule, CPTSD rewrite

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-15 | Created |
| in-progress | 2026-06-15 | Started |
| review | 2026-06-15 | Deliverables committed |
| completed | 2026-06-15 | Done |

## Background & Goals

回顾 5月1日以来 AGENTS.md 的 140 次修改，发现 1003 行版本 (c2c5802) 中有若干独立章节在 v2 重构 (47a820e) 中被删除，但当前 695 行版本过于精简。需要恢复：
1. **Onboarding for New Agent** 连续流 — 当前 Boot First 太简略，agent 需要完整的 "First 5 Minutes" 引导
2. **Plan must include research** 规则 — 当前埋在 "Git provenance" 里，不够突出
3. **CPTSD 长文** — 当前只有表格，缺少与 TDD/Diagnose 技能的连接解释
4. **Arena 独立章节** — 当前信息分散在 4 个地方

同时保持 v2 的 4-zone 结构 (Z1-Z4) 和激活地图风格。

## Requirements
- [x] 重构 Z1 Boot First — 合并执行命令和"执行后阅读指南"，删除独立的 §0.5
- [x] Z2 Hard rules 新增 #8 "Plan must include research"
- [x] 重写 "When Internal Signals Fire" — 用 "应该/连接" 替代 "不要/否则"
- [x] 新增 Z4 §5 "Arena at a Glance" — 3 个常用模式 + HATEOAS/dormancy 说明
- [x] 更新 Z4 后续章节编号 (6-11)
- [x] 不恢复 "Current Focus" (KV cache 脆弱性，已确认删除正确)
- [x] 不恢复 DeepSeek TUI (非重点，用到再说)
- [x] Boot First 新增 probe drift 解释 — "drift 如果是因为 scribe 本身产生的，是正常的"
- [x] Boot First 新增 "agent 应该自己看 git log 判断 drift 是否大事" — 鼓励探索精神

## Technical Approach
- 插入点：Z1 Boot First 后面 → Onboarding；Z2 Hard rules 末尾 → Plan research；Z4 Hot Files 前面 → Arena
- 编号调整：Hot Files 6→7, Deck Governance 7→8, Project Structure 8→9, Release & Auth 9→10, Project Skills 10→11, Pointer Index 11→12
- CPTSD 重写：保留表格，新增 "Connection to TDD and Diagnose" 段落，用 "reward patience over speed" 替代对抗语言

## Acceptance Criteria
- [x] AGENTS.md 行数从 695 → ~730（增量合理，不膨胀）
- [x] 所有章节编号连续，无跳号
- [x] `git diff --stat` 显示 AGENTS.md 修改，无其他文件意外改动
- [x] 快速阅读：新 agent 能在 2 分钟内找到 "First 5 Minutes" 流程
- [x] 快速阅读：agent 能在 30 秒内找到 "Plan must include research"
- [x] ZK 执行测试：agent 执行 boot 命令后，知道 "probe drift 如果是刚提交的，是正常的"
- [x] ZK 执行测试：agent 被鼓励用 `git log` 自己判断 drift 严重性，而不是等待指令

## Progress Log
- 2026-06-15 15:45: Implemented all changes:
  - Added Z1 §0.5 "Onboarding for New Agent" (25 lines)
  - Added Z2 Hard rule #8 "Plan must include research"
  - Rewrote "When Internal Signals Fire" with TDD/Diagnose connection
  - Added Z4 §5 "Arena at a Glance" (18 lines)
  - Renumbered Z4 sections 6-11
- 2026-06-15 15:50: Tests pass — 743 pass, 0 fail across all packages
- 2026-06-15 16:00: ZK Review A/B test (execution test) revealed §0.5 position problem — agent executes Boot First then never reads §0.5
- 2026-06-15 16:05: Merged §0.5 into Boot First as "After executing — now read" + added probe drift explanation + encouraged agent to use git log to judge drift severity
- 2026-06-15 16:10: Final tests pass — 728 lines, clean structure
- AGENTS.md: 695 → 728 lines (+33 net, optimized from +49 after merge)

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
