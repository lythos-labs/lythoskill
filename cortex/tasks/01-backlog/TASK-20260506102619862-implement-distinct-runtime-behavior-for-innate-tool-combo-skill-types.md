# TASK-20260506102619862: Implement distinct runtime behavior for innate/tool/combo skill types

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-06 | Created |

## 背景与目标

当前 `skill-deck.toml` 支持 `[innate]`、`[tool]`、`[combo]`、`[transient]` 四种 section，但运行时行为完全一致 — 所有 skill 都被 symlink 到 `.claude/skills/`，没有区分。

README 已诚实标注 "innate/tool/combo currently have identical runtime behavior"。2026-05-06 agent-review 建议明确区分语义。

## 需求详情
- [ ] `innate`: 始终加载，agent 不可覆盖。可能实现为物理 symlink + lock 保护
- [ ] `tool`: 当前默认行为。agent 可自行决定是否使用
- [ ] `combo`: 命名组，toggle 一组 skill。实现为同时 add/remove 多个
- [ ] `transient`: 已有 expires 字段，需要实际过期检查 + 自动清理

## 技术方案

`deck link` reconciler (`link.ts`) 当前统一处理所有 section。方案：
1. 不改 symlink 机制 — 所有 skill 都 symlink
2. 在 lock 文件中标记 type (`skill-deck.lock` 已有 `type` 字段)
3. Agent 端（未来）可以读取 lock 决定优先级
4. `combo` 的 toggle 行为可通过 CLI 命令实现（`deck combo enable/disable`）
5. `transient` 过期检查在 `link.ts` 加时间比较

## 验收标准
- [ ] `innate` skill 在 lock 中标记为 `type: "innate"`
- [ ] `combo` toggle CLI 能一次操作多个 skill
- [ ] `transient` 过期 skill 在 `deck link` 时有 warning
- [ ] 测试覆盖新行为

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260506102619862)

- Detail 1
- Detail 2
```

## 备注
