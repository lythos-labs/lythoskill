# TASK-20260613185808109: Enforce English-only slugs for cortex task/epic filenames and fix existing Chinese-mixed slugs

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created |
| in-progress | 2026-06-13 | Started |
| review | 2026-06-13 | Deliverables committed |
| completed | 2026-06-13 | Done |

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
- [ ] 为 slug 校验逻辑添加单元测试（co-located `*.test.ts`）

## 技术方案

### 已完成的代码变更（2026-06-13 session）
以下文件已在 `10c601a` 中修改，但测试和文档收尾未完成：

| 文件 | 变更 |
|------|------|
| `packages/lythoskill-project-cortex/src/lib/fs.ts` | `generateFileName()` 去除中文支持；新增 `hasNonAsciiSlug()` |
| `packages/lythoskill-project-cortex/src/commands/task.ts` | `createTask()` 开头调用 `hasNonAsciiSlug()`，非 ASCII 时 `process.exit(1)` |
| `packages/lythoskill-project-cortex/src/commands/epic.ts` | `createEpic()` 开头调用 `hasNonAsciiSlug()`，非 ASCII 时 `process.exit(1)` |
| `packages/lythoskill-project-cortex/src/commands/probe.ts` | 新增 `nonAsciiSlugs` 扫描段，检测所有 task/epic/adr 文件名中的非 ASCII 字符 |
| `AGENTS.md` | 新增 "English-only slugs" 段落 |
| `packages/lythoskill-project-cortex/skill/SKILL.md` | 新增 English-only slug 强制要求 |

### 剩余工作

1. **扫描现有中文 slug**：
   ```bash
   find cortex/tasks cortex/epics -name '*.md' | grep -P '[\x{4e00}-\x{9fff}]'
   ```
   或 probe 已报告的 `nonAsciiSlugs` 列表。

2. **批量重命名**：
   脚本逻辑：对 probe 报告的每个 `nonAsciiSlugs`，提取 ID，用 `git mv` 重命名为 ASCII-only slug。
   注意：不要改变文件内容，只改文件名。

3. **测试**：
   - 测试 `hasNonAsciiSlug()` 的边界情况（纯 ASCII、含中文、含 emoji、含全角符号）
   - 测试 `generateFileName()` 对中文标题的处理（应去除或替换为 `-`）
   - 测试 probe 的 `nonAsciiSlugs` 检测（应正确识别、不误报）

4. **CLI 模板**：
   检查 `packages/lythoskill-project-cortex/src/lib/template.ts` 中的 task/epic 模板，确认是否包含中文提示。如果有，改为英文提示。

### 关键文件路径

| 职责 | 路径 |
|------|------|
| slug 生成 | `packages/lythoskill-project-cortex/src/lib/fs.ts` — `generateFileName()`, `hasNonAsciiSlug()` |
| task 创建 | `packages/lythoskill-project-cortex/src/commands/task.ts` — `createTask()` |
| epic 创建 | `packages/lythoskill-project-cortex/src/commands/epic.ts` — `createEpic()` |
| probe 检测 | `packages/lythoskill-project-cortex/src/commands/probe.ts` — `nonAsciiSlugs` 段 |
| 模板 | `packages/lythoskill-project-cortex/src/lib/template.ts` — `createTaskTemplate()`, `createEpicTemplate()` |
| 测试 | `packages/lythoskill-project-cortex/src/lib/fs.test.ts`（新建）或 `probe.test.ts` |
| 文档 | `AGENTS.md`, `packages/lythoskill-project-cortex/skill/SKILL.md` |

### 范围边界

- **必达**：CLI 校验、probe 检测、现有中文 slug 扫描、文档更新
- **可选**：pre-commit hook（probe 已覆盖，pre-commit 是备选）
- **不做**：修改已完成任务的内容（只改文件名）
- **不做**：修改非 cortex 的文件名规则（如 daily/weekly 的日期命名不受此约束）
- **ADR 处理**：ADR 文件名也在 probe 检测范围内，但本次任务**只重命名 task/epic**，ADR 的中文 slug 另行处理（若有）
- **引用断裂风险**：其他文件（如 task 卡内的 `关联文件`、wiki 中的链接）可能引用旧文件名。重命名后需运行 `grep -r` 检查并修复。但 `Closes: TASK-xxx` trailer 只引用 ID，不受 slug 影响。
- **错误处理**：`createTask`/`createEpic` 中使用 `console.error + process.exit(1)` 是项目 CLI 层的标准模式（见 `task.ts`/`epic.ts` 现有代码），不是库函数。保持此模式。

## 验收标准
- [ ] 新增 task/epic 时中文 slug 被阻止并给出清晰错误
- [ ] 所有历史 task/epic 文件名不含中文字符
- [ ] `cortex probe` 能检测或不再报告中文 slug
- [ ] 文档明确声明 slug 全英文规则
- [ ] 新增单元测试覆盖 slug 校验逻辑

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
