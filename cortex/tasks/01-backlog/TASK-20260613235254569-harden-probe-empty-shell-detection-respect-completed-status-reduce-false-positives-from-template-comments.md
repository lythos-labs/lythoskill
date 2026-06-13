# TASK-20260613235254569: Harden probe empty-shell detection: respect completed status + reduce false positives from template comments

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created |

## 背景与目标

probe 的空壳检测（`detectEmptyShells`）在 audit TASK-20260613185621344 中暴露了严重误报问题：

- **166 个空壳被检测**，其中 **154 个在终端目录**（completed/terminated/done/archived/suspended）
- 这些文件的 Status History 已有 `completed` 记录，但正文仍保留模板占位符（`<!-- 填写...` / `需求1`）
- 根本原因是：早期模板自带这些占位符，而 `Closes:` trailer 可以不经内容填充直接关闭任务

检测逻辑的问题：
1. **不考虑状态上下文**：终端目录 + completed 记录 = 工作已结束，不应再标记为空壳
2. **模式过于宽泛**：`<!-- 填写` 匹配了模板注释，不是真正的"未填充"信号
3. **与过滤逻辑脱节**：`filterEmptyShells` 按目录过滤，但 `detectEmptyShells` 在过滤前已标记

本任务要改进检测逻辑，使其更精确、更少误报。

## 需求详情

- [ ] 修改 `detectEmptyShells` / `isEmptyShell`：终端状态（completed/terminated/done/archived/suspended/accepted/rejected/superseded）且 Status History 有对应关闭记录的文件，不标记为空壳
- [ ] 缩小 `EMPTY_SHELL_PATTERNS`：排除纯模板注释（如 `<!-- 填写背景：`），只保留真正的未填充占位符（如 `⚠️ PLACEHOLDER_`）
- [ ] 或：增加"模板注释 vs 真实占位符"的区分逻辑
- [ ] 更新测试：确保改进后的检测逻辑有单元测试覆盖

## 技术方案

**选项A：状态感知检测（推荐）**
在 `detectEmptyShells` 中，先读取文件内容，检查 Status History：
- 如果最后记录是 `completed` / `terminated` / `done` / `archived` / `accepted` / `rejected` / `superseded`，跳过空壳检测
- 这样终端状态文件永远不会被标记为空壳，无论正文是否有占位符

**选项B：模式细化**
修改 `EMPTY_SHELL_PATTERNS`：
- 移除 `<!-- 填写`（这是模板注释，不是未填充信号）
- 移除 `需求\d`（早期模板自带，不代表未填充）
- 只保留 `⚠️ PLACEHOLDER_`（这是明确的未填充标记）
- 但这样可能漏掉真正未填充的文件（如果模板没有 PLACEHOLDER）

**选项C：两者结合**
- 默认模式：只检测 `⚠️ PLACEHOLDER_`
- `--strict` 模式：检测所有模式（包括 `<!-- 填写` / `需求\d`）
- 终端状态文件始终跳过

## 验收标准

- [ ] `--include-completed-empty-shells` 下，终端状态文件不再被报告为空壳
- [ ] 默认 probe / `--suspicious` 行为不变（已不显示终端空壳）
- [ ] 新增测试覆盖：终端状态文件 + PLACEHOLDER = 不报告；在途文件 + PLACEHOLDER = 报告
- [ ] 测试覆盖：模式细化后的边界情况

## 关联文件
- 修改: `packages/lythoskill-project-cortex/src/commands/probe.ts`
- 修改: `packages/lythoskill-project-cortex/src/commands/probe.test.ts`
- 参考: TASK-20260613185621344（audit 结果）

## 备注

这是一个 probe 检测精度改进，不是功能新增。优先级：P2（当 `--include-completed-empty-shells` 被频繁使用时做）。
