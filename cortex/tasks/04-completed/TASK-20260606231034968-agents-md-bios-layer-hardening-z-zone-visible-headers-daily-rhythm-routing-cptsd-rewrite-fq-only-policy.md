# TASK-20260606231034968: AGENTS.md BIOS-layer hardening: Z-zone visible headers, Daily Rhythm routing, CPTSD rewrite, FQ-only policy

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-06 | Created |
| in-progress | 2026-06-06 | Started |
| completed | 2026-06-06 | Closed via trailer |

## 背景与目标
AGENTS.md 作为 agent BIOS，需要在 boot 时自描述。当前缺陷：
1. CPTSD 反模式用临床标签，agent 被拽入错误 frame
2. Z-zone 标题藏在 HTML 注释里，agent 可能忽略信息梯度
3. 日常操作流分散在 §4、§6、memory、conventions.md 四处，agent 不知道今天该干嘛
4. FQ-only locator 硬规则只在 conventions.md 里，agent 写 deck 时可能用 bare name
5. CLAUDE.md 装了 5 样东西，其中 3 样是纯重复

## 需求详情
- [x] CPTSD 反模式 → 正向指令：去掉临床标签，每行从"禁止"翻到"你应该怎么做"
- [x] Z-zone 标题可见化：Z1-Z4 从 HTML 注释提升到 `##` 标题，章节降一级
- [x] Daily Rhythm 新增到 §4：四阶段 session 叙事（Boot → Incoming → Working → Closing）
- [x] FQ-only locator policy 补到 §6：禁止 bare name，locator 必须是 fully-qualified
- [x] CLAUDE.md 瘦身到纯 redirect：只留 memory 路径说明和 onboarding order

## 技术方案
- Edit 工具逐节替换，保持 indentation 和 heading 层级一致
- Z-zone 转换后需验证：bash grep 确认所有 `##` `###` `####` 层级正确
- 无新增文件，无依赖变更，无测试修改

## 验收标准
- [x] ZK Review 模拟：spawn subagent 读取 AGENTS.md，能准确复述 Daily Rhythm 四阶段 → **UNBLOCKED**：改用 Claude Sonnet subagent 成功完成。Round 1 发现 4 个 gaps（git status 不一致、Closing 序列、§6 引用、 trivial 示例）；Round 2 验证全部修复。剩余 observation：Boot/Start of Session/Closing 存在合理重复（BY DESIGN），可接受。
- [x] Probe 通过：`bun packages/lythoskill-project-cortex/src/cli.ts probe` 无新增 state drift（3 个历史警告为 pre-existing）
- [x] Pre-commit hook：ADR check + path-safety + README version 全部通过；AGENTS.md 不属于任何 package，test gate 按设计跳过

## 进度记录
- 2026-06-06: 全部改动完成

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260606231034968)

- Detail 1
- Detail 2
```

## 备注
