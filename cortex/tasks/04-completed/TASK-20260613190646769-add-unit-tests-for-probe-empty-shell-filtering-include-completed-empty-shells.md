# TASK-20260613190646769: Add unit tests for probe empty-shell filtering (--include-completed-empty-shells)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created |
| in-progress | 2026-07-09 | Started |
| review | 2026-07-09 | Deliverables committed |
| completed | 2026-07-09 | Done |

## 背景与目标

probe 的 empty-shell 检测逻辑（`detectEmptyShells`）在 2026-06-13 的 `a74f5f8` 中增加了默认过滤：completed/terminated/archived/suspended/done/accepted/rejected/superseded 等终端目录中的空壳默认不显示。

这个过滤逻辑有三个层级：
1. **默认模式**：排除所有终端状态目录的空壳（只显示 backlog/in-progress/review/proposed 中的空壳）
2. **`--suspicious` 模式**：只显示 backlog/in-progress/proposed 中的空壳（比默认更严格，连 review 都排除）
3. **`--include-completed-empty-shells` 模式**：显示全部，不做过滤

本任务要求为这些过滤逻辑添加单元测试，确保：
- 默认模式下终端目录的空壳被正确过滤掉
- `--suspicious` 模式下只显示在途空壳
- `--include-completed-empty-shells` 模式下不过滤

## 需求详情

- [ ] 提取 `detectEmptyShells` 的过滤逻辑为可测试的纯函数
- [ ] 为三种过滤模式编写单元测试
- [ ] 测试覆盖边界情况（空输入、混合目录、无匹配等）

## 技术方案

在 `packages/lythoskill-project-cortex/src/commands/probe.ts` 中，`detectEmptyShells` 目前是直接操作 `emptyShells` 数组的副作用函数。为了测试，可以将过滤逻辑提取为一个纯函数 `filterEmptyShells(shells: string[], mode: 'default' | 'suspicious' | 'all'): string[]`。

或者，如果保持现有结构，可以通过创建临时文件 + 调用 `probeStatus` 的集成测试方式来验证。但纯函数单元测试更轻量、更快。

## 验收标准

- [ ] 新增测试文件 `packages/lythoskill-project-cortex/src/commands/probe.test.ts`
- [ ] 测试覆盖三种模式的过滤行为
- [ ] 测试覆盖空壳检测的正则匹配（PLACEHOLDER_、需求1、<!-- 填写）
- [ ] 所有测试通过 `bun test`
- [ ] probe 现有功能无回归

## 进度记录

## 关联文件
- 修改: `packages/lythoskill-project-cortex/src/commands/probe.ts`（提取过滤逻辑）
- 新增: `packages/lythoskill-project-cortex/src/commands/probe.test.ts`

## Git 提交信息建议
```
test(cortex): add unit tests for probe empty-shell filtering (TASK-20260613190646769)

- Extract filterEmptyShells pure function from detectEmptyShells
- Test default/suspicious/includeCompleted modes
- Test empty-shell pattern detection
```

## 备注

这是一个**自指任务**——本任务文件自己就是一个空壳（创建时未填充内容），而任务目标正是测试 probe 对空壳的检测能力。填充内容后，probe 将不再报告此文件为空壳。
