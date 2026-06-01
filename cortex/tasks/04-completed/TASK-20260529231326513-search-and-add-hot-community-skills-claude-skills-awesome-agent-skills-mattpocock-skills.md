# TASK-20260529231326513: Search and add hot community skills (claude-skills, awesome-agent-skills, mattpocock/skills)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-29 | Created |
| in-progress | 2026-05-29 | Started |
| completed | 2026-06-01 | Closed via trailer |

## 背景与目标

社区技能池已注册 alirezarezvani/claude-skills (338 skills)、mattpocock/skills (20+)、VoltAgent/awesome-agent-skills (索引)。但只有少量被 curator scan 发现。需要识别热门高质量技能，clone 入库，打 tag。

## 需求详情
- [x] WebSearch 识别社区热门/高 star 技能（top 5-10）
- [x] Clone 热门技能到 cold pool
- [x] curator scan 入库（修复 deck-aware DB resolution）
- [x] curator tag 打 domain/QA 标签
- [x] 记录到 REGISTRY.json
- [x] 修复 resolveDbPath: 实现 ADR-20260529215906255 方案A（deck-aware discovery）

## 技术方案

1. WebSearch 搜索 "best claude skills 2026" + 浏览 awesome-agent-skills 索引
2. curator add <locator> 逐个入库
3. curator scan 刷新索引
4. curator tag 标注领域

## 验收标准
- [ ] 至少 5 个新热门技能进入 cold pool
- [ ] curator scan 可见
- [ ] domain tag 已标注

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260529231326513)

- Detail 1
- Detail 2
```

## 备注
