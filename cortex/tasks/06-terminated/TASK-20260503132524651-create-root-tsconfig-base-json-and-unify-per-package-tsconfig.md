# TASK-20260503132524651: Create root tsconfig.base.json and unify per-package tsconfig

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| in-progress | 2026-05-03 | Started |
| terminated | 2026-05-03 | Terminated |

## 背景与目标

当前 5 个包有 3 种 `tsconfig.json` 变体，无根基础配置。后果：
- IDE 无法做跨包全局类型检查
- 新增包时「复制哪个 tsconfig」没有标准答案
- 未来包间引用（如 `test-utils` 被其他包 import）时类型路径会出错

## 需求详情
- [ ] 在根目录创建 `tsconfig.base.json`，定义所有包共享的编译选项
- [ ] 各包 `tsconfig.json` 改为 `"extends": "../../tsconfig.base.json"`
- [ ] 统一 `target`、`module`、`moduleResolution`、`types`、`strict` 等关键字段
- [ ] 按需为 publishable 包开启 `composite: true`（为 future `tsc --build` 做准备）
- [ ] 验证 `bun typecheck`（或 `tsc --noEmit`）在全包通过

## 技术方案

**根 `tsconfig.base.json` 应包含**：
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

**各包 tsconfig**：
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**关键决策**：
- `composite: true` 现在加还是以后加？建议现在加，因为成本极低且启用 `tsc --build`
- `strict: true` 是否会导致现有代码报错？需先跑一次 `tsc --noEmit` 评估

## 验收标准
- [ ] 根目录存在 `tsconfig.base.json`
- [ ] 所有包的 `tsconfig.json` 都 `extends` 根配置
- [ ] 各包 tsconfig 仅包含差异化字段（`outDir`、`include`、`composite` 等）
- [ ] `tsc --noEmit` 或 `bun typecheck` 在全包零错误通过
- [ ] 新增包时有明确模板可抄

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 新增: `tsconfig.base.json`
- 修改: `packages/*/tsconfig.json`

## Git 提交信息建议
```
chore(monorepo): add root tsconfig.base.json and unify per-package configs (TASK-20260503132524651)

- Create tsconfig.base.json with shared compilerOptions
- All packages extend from root base
- Enable composite for future tsc --build
```

## 备注

> **关联 Epic**: EPIC-20260430011158241 Monorepo tooling consistency and config debt cleanup
> **风险**: `strict: true` 可能暴露现有代码中的隐式 any，需先评估修复成本
