# TASK-20260423170056315: Add add-skill command to lythoskill-creator

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-04-23 | Created |
| in-progress | 2026-04-23 | Implementation started |
| completed | 2026-04-23 | All acceptance criteria met |

## 背景与目标

`init` 命令只创建第一个 skill 的框架，但 lythoskill monorepo 的核心价值是容纳多个 skills。

当前要在现有 monorepo 中增加新 skill，只能手动 `mkdir` + `cat` 硬写文件——没有命令可用。

## 需求详情
- [x] 新增 `add-skill` 命令：`lythoskill-creator add-skill <name>`
- [x] 在现有 monorepo 的 `packages/<name>/` 下创建 Starter 包 + `skill/` 层
- [x] 复用 `init` 的模板逻辑（替换变量即可）
- [x] 不重复创建 workspace 根文件（package.json, pnpm-workspace.yaml 等）

## 技术方案

参考 `packages/lythoskill-hello-world/` 作为模板：
- `packages/<name>/package.json`
- `packages/<name>/tsconfig.json`
- `packages/<name>/src/cli.ts`
- `packages/<name>/src/index.ts`
- `packages/<name>/skill/SKILL.md`
- `packages/<name>/skill/scripts/run.sh`

实现就是 heredoc 一份模板，替换 `<name>` 变量。

## 验收标准
- [x] `add-skill` 命令能在现有 monorepo 中创建新 skill
- [x] 创建后能直接 `build` 输出到 `skills/<name>/`
- [x] 不破坏已有文件

## 进度记录
<!-- 执行时更新，带时间戳 -->
- 2026-04-23 16:49: Created `add-skill.ts`, updated `cli.ts` routing, updated `SKILL.md`
- 2026-04-23 16:50: Verified build works and no-overwrite behavior is correct
- 2026-04-23 16:51: Cleaned up test artifacts, moved task to completed

## 关联文件
- 修改: `packages/lythoskill-creator/src/cli.ts`, `packages/lythoskill-creator/skill/SKILL.md`
- 新增: `packages/lythoskill-creator/src/add-skill.ts`

## Git 提交信息建议
```
feat(scope): description (TASK-20260423170056315)

- Detail 1
- Detail 2
```

## 备注
