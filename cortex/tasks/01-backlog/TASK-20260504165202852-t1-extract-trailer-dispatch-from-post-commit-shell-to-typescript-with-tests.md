# TASK-20260504165202852: T1: Extract trailer dispatch from post-commit shell to TypeScript with tests

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created |

## 背景与目标
将 `.husky/post-commit` 中 `trailer_block()` 的解析+映射逻辑提取为纯函数 TypeScript 模块，使其可单元测试、可独立维护。

## 需求详情
- [x] `parseTrailers(msg)` — 解析 commit message 中的 `Task:/ADR:/Epic:/Closes:` trailer
- [x] `buildDispatchCommands(trailers)` — 将解析结果映射为 cortex CLI 命令字符串
- [x] 覆盖 happy path + malformed ID + unknown prefix + missing verb + recursion guard

## 技术方案
- 纯函数设计：输入字符串 → 输出结构化结果，无副作用
- 递归守卫：`Triggered by:` 存在时直接返回 `skip: true`
- ID 校验：`^[A-Z]+-[0-9]+$`
- Closes 隐式动词映射：TASK→complete, ADR→adr accept, EPIC→epic done
- ADR/Epic 显式动词自动加前缀：accept → adr accept

## 验收标准
- [x] `bun test packages/lythoskill-project-cortex/src/lib/trailer.test.ts` 全部通过
- [x] 覆盖率 100%（lines + funcs）
- [x] 警告格式与原有 shell 脚本保持一致

## 进度记录
- 2026-05-04 19:xx — 创建 `trailer.test.ts`（TDD red）
- 2026-05-04 19:xx — 实现 `trailer.ts`，18 tests 全绿，100% 覆盖

## 关联文件
- 修改:
- 新增: `packages/lythoskill-project-cortex/src/lib/trailer.ts`, `packages/lythoskill-project-cortex/src/lib/trailer.test.ts`

## Git 提交信息建议
```
feat(scope): description (TASK-20260504165202852)

- Detail 1
- Detail 2
```

## 备注
