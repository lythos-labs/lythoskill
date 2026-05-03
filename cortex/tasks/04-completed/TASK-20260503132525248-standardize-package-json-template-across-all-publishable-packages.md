# TASK-20260503132525248: Standardize package.json template across all publishable packages

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| in-progress | 2026-05-03 | Started |
| completed | 2026-05-03 | Closed via trailer |

## 背景与目标

当前各包的 `package.json` 字段参差不齐：
- `engines`：部分缺失，部分版本号不一致
- `license`：重复硬编码，无统一来源
- `files`：有的包含 `src/`，有的只包含 `dist/`
- `exports`：格式不统一，有的缺 `types` 字段
- `bin`：有的用相对路径 `./src/cli.ts`，有的缺少 shebang

这会导致 npm publish 产物不一致，甚至某些包漏发关键文件。

## 需求详情
- [ ] 定义 publishable 包的 `package.json` 标准字段集合
- [ ] 回刷所有现有 publishable 包（`packages/*`，排除 `test-utils`）
- [ ] 更新 `lythoskill-creator` 的 `init.ts` / `templates.ts`，让新建项目自动继承标准模板
- [ ] 验证每个包 `npm publish --dry-run` 的产物一致且完整

## 技术方案

**标准字段模板**：
```json
{
  "name": "@lythos/<skill-name>",
  "version": "{{VERSION}}",
  "description": "...",
  "type": "module",
  "license": "MIT",
  "engines": {
    "bun": ">=1.0.0"
  },
  "files": [
    "src",
    "skill",
    "assets",
    "references",
    "scripts"
  ],
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "bin": {
    "<bin-name>": "./src/cli.ts"
  }
}
```

**关键决策**：
- `files` 数组应包含 `src/` 还是 `dist/`？当前 Bun 直接跑 TypeScript，无需编译，所以包含 `src/`
- `test-utils` 不 publish，是否也需要统一？建议也统一但标记 `"private": true`

## 验收标准
- [ ] 所有 publishable 包的 `package.json` 包含一致的 `engines`/`license`/`files`/`exports`
- [ ] `npm publish --dry-run` 每个包都能成功，且产物结构一致
- [ ] `lythoskill-creator init` 生成的新项目自动继承标准模板
- [ ] 根 `package.json` 的 `workspaces` 字段正确引用所有包

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/*/package.json`, `packages/lythoskill-creator/src/templates.ts`
- 新增: 无

## Git 提交信息建议
```
chore(monorepo): standardize package.json template across all packages (TASK-20260503132525248)

- Define standard fields for publishable packages
- Backfill all existing packages
- Update creator templates for new projects
```

## 备注

> **关联 Epic**: EPIC-20260430011158241 Monorepo tooling consistency and config debt cleanup
> **阻塞**: 需先确认哪些包是 publishable（有 `skill/` 目录的），哪些是 private infra（如 `test-utils`）
