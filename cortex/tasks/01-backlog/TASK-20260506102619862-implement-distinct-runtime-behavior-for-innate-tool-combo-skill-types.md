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
- [ ] **`innate` = eager mode**: 初始化/compaction 阶段抢先加载常驻。meta-governance skill（deck, cortex, onboarding, scribe）。agent 不可移除
- [ ] **`tool` = lazy mode**: 当前默认行为。agent 按需调用。capability skill（pdf, docx, web-search）
- [ ] **`combo`**: 命名组 + 协调 prompt。`{ skills: [...], prompt: "how they work together" }`。agent 读 prompt 自行编排，不需要代码层。Schema 已支持 union type (SkillEntry | ComboEntry)
- [ ] **`transient`**: 已有 expires 字段，需要实际过期检查 + 自动清理

### eager vs lazy 设计

```
Session start
  → deck link 发现 innate skills
  → 抢先 symlink + 初始化 (eager)
  → agent 启动时 innate skills 已就位
  
Runtime
  → agent 需要 tool skill
  → 发现 skill-deck.toml 已声明
  → 该 tool 已在 working set 中 (所有 skill 都 symlink)
  → agent 读取 SKILL.md 并调用
```

**为什么不是物理隔离**: innate/tool 的区分不在 symlink 层（所有声明都 symlink），而在 agent 的行为语义：
- innate 在 session 启动时由 deck hook 确保常驻
- tool 由 agent 在运行时自主决定是否读取 SKILL.md
- lock 文件中的 `type` 字段告知 agent 该 skill 的优先级

## 技术方案

1. lock 文件已有 `type` 字段 → 标记 innate/tool/combo/transient
2. `deck link` 对 innate 额外写 `.claude/skills/.innate` manifest 文件
3. Agent 端读取 manifest 确定 eager skill 列表
4. `combo` toggle 通过 `deck combo enable/disable <name>` CLI 实现
5. `transient` 过期检查在 `link.ts` 加 `Date.now() > expires` 比较

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
