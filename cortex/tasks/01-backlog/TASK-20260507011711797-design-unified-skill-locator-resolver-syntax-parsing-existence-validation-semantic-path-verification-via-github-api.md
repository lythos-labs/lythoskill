# TASK-20260507011711797: Design unified skill-locator resolver: syntax parsing + existence validation + semantic path verification via GitHub API

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-06 | Created |

## 背景与目标
<!-- 填写背景：为什么需要这个任务？解决什么问题？ -->

## 需求详情
- [ ] 需求1
- [ ] 需求2

## 技术方案
<!-- 填写实现方案、关键决策、参考资源 -->

## 验收标准
- [ ] 标准1
- [ ] 标准2

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260507011711797)

- Detail 1
- Detail 2
```

## 设计洞察（待展开）

### Agent-friendly CLI error design

CLI 错误信息不仅是给人类读的，更是给 agent 读的感知接口。当前 `Skill not found` 这种模糊错误让 agent 无法自主修复。

目标：resolver 的验证层输出**结构化诊断报告**而非布尔值，包含：
- 错误类型/代码
- 检测到的实际状态（repo 存在但 path 不对、repo 不存在、path 存在但 SKILL.md 缺失…）
- 建议修复选项
- 相关文档链接

参考：本次 session 中 `findSkillDir` 探测到 Cocoon-AI 的 `architecture-diagram/` 子目录时，理想输出应为：

```
[deck:skill-not-found] path="github.com/Cocoon-AI/architecture-diagram-generator"
Reason: repo cloned, but no SKILL.md at repo root
Detected: 1 subdirectory with SKILL.md: architecture-diagram/
Suggestion: update locator to ".../architecture-diagram-generator/architecture-diagram"
```

### 参考资源
- `cortex/wiki/03-lessons/2026-05-07-real-world-skill-repo-structure-survey.md`
- `packages/lythoskill-deck/src/add.ts` 的 `findSkillDir` 实现

## 相关设计
- [cold-pool-unified-facility-design.md](../../wiki/01-patterns/cold-pool-unified-facility-design.md) — 完整基础设施层设计案，含实施顺序 P0-P4

## 备注
