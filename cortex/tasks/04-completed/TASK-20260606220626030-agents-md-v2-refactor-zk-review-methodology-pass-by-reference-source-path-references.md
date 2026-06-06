# TASK-20260606220626030: AGENTS.md v2 refactor: ZK Review methodology + pass-by-reference + source-path references

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-06 | Created |
| in-progress | 2026-06-06 | Started |
| completed | 2026-06-06 | Closed via trailer |

## 背景与目标

AGENTS.md 已从 1283 行膨胀到难以维护。需要重构为 v2：4-zone 结构，每个 section 触发明确行为。同时把 ZK Review 方法论从隐式实践提升为显式规范，并解决引用路径不一致问题（之前指向 `.claude/skills/` 但 agent 可能还没 `deck link`）。

## 需求详情

- [x] 重构 AGENTS.md 为 Z1/Z2/Z3/Z4 四区结构（Foundation/Frameworks/Operations/Reference）
- [x] 加入 ZK Review Gate 完整操作指南（WHAT/WHY/HOW + 4 required content types）
- [x] 加入 ZK Validation Pattern（文档可读性验证）
- [x] 加入 "Pass by reference, not by value" 元方法论（subagent 传文件路径而非内容）
- [x] 加入 Side Decks 模式（examples/decks/ 作为临时技能集传给 subagent）
- [x] 所有引用路径从 `.claude/skills/` 改为 `packages/*/skill/references/`（source of truth）
- [x] 修复 ZK Review 发现的 broken links（release-auth-workflow.md、thin-skill-pattern.md、COMMANDS.md）
- [x] 同步新 ref docs 到 `skills/` 和 `.claude/skills/`
- [x] 加入 Troubleshooting 小节
- [x] 统一所有命令路径（full path + shorthand parenthetical）

## 技术方案

- 从当前 AGENTS.md 剪切内容到 5 个 ref docs（thin-skill-pattern、intent-plan-execute、arena-runtime、release-auth-workflow、project-hotspots）
- AGENTS.md 保留 TL;DR + activation map，详细内容通过 pointer index 引用
- 新增 `packages/lythoskill-creator/skill/references/` 目录存放 source ref docs
- 用 ZK Review 自身验证 AGENTS.md v2 draft（两轮：第一轮发现 gaps，第二轮验证修复）

## 验收标准

- [x] AGENTS.md 所有 markdown 链接指向的文件真实存在（25/25 resolved）
- [x] ZK subagent 能独立理解 AGENTS.md 并执行 Start of Session 流程
- [x] `bun --filter='*' run test` 通过（文档变更不应破坏测试）
- [x] 新 ref docs 同步到 `packages/`、`skills/`、`.claude/skills/` 三处

## 进度记录

- 2026-06-06: ZK Review round 1 — 发现 4 broken links + 5 critical gaps
- 2026-06-06: 修复 gaps + 路径标准化
- 2026-06-06: ZK Review round 2 — reference integrity 验证通过（25/25）

## 关联文件
- 修改: AGENTS.md, INDEX.md, packages/lythoskill-project-cortex/skill/SKILL.md, packages/lythoskill-project-scribe/skill/SKILL.md, skill-deck.toml
- 新增: packages/lythoskill-arena/skill/references/arena-runtime.md, packages/lythoskill-creator/skill/references/release-auth-workflow.md, packages/lythoskill-creator/skill/references/thin-skill-pattern.md, packages/lythoskill-deck/skill/references/intent-plan-execute.md, packages/lythoskill-project-cortex/skill/references/zk-review.md, cortex/wiki/04-ssot/project-hotspots.md, weekly/2026-W24.md
