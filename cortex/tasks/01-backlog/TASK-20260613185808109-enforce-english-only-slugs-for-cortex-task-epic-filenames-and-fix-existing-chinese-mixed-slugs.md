# TASK-20260613185808109: Enforce English-only slugs for cortex task/epic filenames and fix existing Chinese-mixed slugs

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created |

## 背景与目标
当前 cortex task/epic 文件名（slug）混用中英文，例如 `TASK-...-重-io-提取到-injectable-function-...md`。这类文件名对跨 CLI/跨 agent 的文件路径处理、URL 引用、搜索和排序都不友好，也是早期 agent 没有明确约束留下的痕迹。

本任务要确立"slug 必须全英文"的固定规则，并统一修复已有的中文混合 slug。

## 需求详情
- [ ] 在 cortex CLI 创建逻辑中加入 slug 校验：仅允许 `[a-z0-9-_.]`，拒绝中文字符
- [ ] 在 pre-commit 或 probe 中加入 slug 格式检查
- [ ] 扫描并列出所有含中文的 task/epic 文件名
- [ ] 对已有中文 slug 进行批量重命名（保持 ID 不变，只改 slug 部分）
- [ ] 更新 `AGENTS.md` governance 章节，明确 slug 全英文规则
- [ ] 更新 `packages/lythoskill-project-cortex/skill/SKILL.md`，在创建 task/epic 的示例/约束中重复声明 slug 全英文规则
- [ ] 更新 CLI 模板提示，默认生成全英文 slug

## 技术方案
- CLI 侧：在 `task`/`epic` create 命令的 slug 生成/接受处加正则校验
- Guard 侧：pre-commit 或 probe 扫描文件名中的非 ASCII 字符
- Migration：脚本批量 `git mv` 旧文件名 → 新文件名（ID 部分保留）
- 文档：在 AGENTS.md governance 章节和 cortex SKILL.md 中追加规则

## 验收标准
- [ ] 新增 task/epic 时中文 slug 被阻止并给出清晰错误
- [ ] 所有历史 task/epic 文件名不含中文字符
- [ ] `cortex probe` 能检测或不再报告中文 slug
- [ ] 文档明确声明 slug 全英文规则

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260613185808109)

- Detail 1
- Detail 2
```

## 备注
