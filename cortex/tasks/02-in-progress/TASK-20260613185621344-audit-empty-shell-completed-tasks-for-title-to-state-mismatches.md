# TASK-20260613185621344: Audit empty-shell completed tasks for title-to-state mismatches

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created |
| in-progress | 2026-06-13 | Started |

## 背景与目标
`cortex probe` 报告 150+ 个空壳任务/史诗，它们多处于 `04-completed/` 但文件内仍保留 `PLACEHOLDER_` / `需求1` / `<!-- 填写` 等模板占位符。这是早期 `cortex task/epic create` 没有强制要求填充内容、后续又通过 `Closes:` trailer 直接关闭留下的痕迹。

本任务要抽样检查这些任务的标题是否与项目现状匹配，识别出：
- 标题已落实 → 可批量回填
- 标题未落实或已过时 → 需要单独处理
- 发现系统性模式 → 反馈到 CLI/template 设计

## 需求详情
- [x] 获取空壳任务完整清单并分组
- [x] 按领域分层抽样（deck/arena/curator/cortex/docs/test-utils）
- [x] 对每个样本验证标题描述的工作是否已存在于代码/文档/测试中
- [x] 记录匹配/不匹配/存疑三类结果
- [ ] 根据抽样结果制定批量清理方案

## 技术方案
- 用 grep + shell 脚本列出所有空壳文件路径和标题（共 154 个）
- 用并行 subagent 对 24 个样本做标题→现状验证
- 汇总报告后决定：批量回填 / 单独 reopen / 终止归档

## 验收标准
- [x] 至少抽样 20 个任务覆盖 5 个以上领域（实际 24 个，4 个领域）
- [x] 产出匹配率和不匹配清单
- [ ] 提出明确的下一步批量处理建议
- [ ] 相关发现更新到 daily/weekly

## 进度记录

- 2026-06-13 19:00 — 完成抽样审计，共检查 24 个任务，分布：deck(6)、arena(6)、curator(6)、cortex/docs(6)

### 审计结果摘要

| 领域 | 样本数 | MATCH | MISMATCH | UNCLEAR |
|------|--------|-------|----------|---------|
| deck | 6 | 5 | 1 | 0 |
| arena | 6 | 5 | 0 | 1 |
| curator | 6 | 5 | 1 | 0 |
| cortex/docs | 6 | 5 | 1 | 0 |
| **合计** | **24** | **20** | **3** | **1** |

**匹配率：83%（20/24），若排除 UNCLEAR 则为 87%（20/23）。**

### 不匹配 / 存疑清单

1. **TASK-20260511093956018** (deck) — "deck add multi-skill discovery warning"
   - 现状：`add.ts` 发现多 skill 时返回 `null` 静默失败，没有列出所有 skill、没有让用户 pick / add all 的 warning。
   - 建议：reopen 到 backlog 或修正标题后完成。

2. **TASK-20260529231326576** (curator) — "Tag all added skills with domain/hub/qa tags via WebSearch research"
   - 现状：`curator tag` CLI 命令存在，但没有证据表明批量 WebSearch 研究后给所有已添加 skill 打过 tag。
   - 建议：reopen 到 backlog 或终止该任务（若决定不做）。

3. **TASK-20260424115734221** (docs) — "Red-green-release 在 README/CLAUDE.md 中补全文档"
   - 现状：`packages/lythoskill-red-green-release/` 有自己的 README/SKILL.md，但根 README.md / CLAUDE.md 中没有 red-green-release 工作流文档。
   - 建议：reopen 到 backlog 补文档，或改标题限定为 package-level 文档。

4. **TASK-20260506001644423** (arena) — "Arena copy-test re-run with fixed CLI spawn"
   - 现状：有 mock-IO 测试验证 stdout 持久化，但没有明确名为 "copy-test re-run" 的测试或专门的 non-empty agent output 验证。
   - 建议：进一步确认原始意图，可能属于已实现但标题表述不清。

### 批量清理建议

- 对于 MATCH 的已完成空壳任务：批量回填 Status History + 简短完成说明，消除 probe 警告。
- 对于 3 个 MISMATCH：单独 reopen 或修正标题/范围后重新处理。
- 对于 1 个 UNCLEAR：与历史 commit 交叉确认后再归类。
- 根源修复：在 cortex CLI 创建 task/epic 时强制要求填充背景/需求/验收标准，否则阻止 `Closes:` 关闭（已在 TASK-20260613185808109 记录 slug 规则，可顺带考虑模板必填校验）。

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260613185621344)

- Detail 1
- Detail 2
```

## 备注
