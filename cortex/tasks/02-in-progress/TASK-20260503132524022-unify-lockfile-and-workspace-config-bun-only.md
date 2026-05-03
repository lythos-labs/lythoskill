# TASK-20260503132524022: Unify lockfile and workspace config — Bun-only

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| in-progress | 2026-05-03 | Started |

## 背景与目标

当前仓库同时存在 `bun.lock`、`pnpm-lock.yaml` 和 `pnpm-workspace.yaml`。团队技术栈已明确为 **Bun + pnpm workspaces**（`pnpm-workspace.yaml` 定义 workspace），但 Bun 的 runtime 和 `bun install` 也是核心工具。

lockfile 分叉的风险：不同开发者用不同命令安装会产生不同的依赖树，导致「在我机器上能跑」。

## 需求详情
- [ ] 决策：以 Bun 为主工具链（`bun install` 生成 `bun.lock`），还是保留 pnpm workspaces 但只用 pnpm 安装
- [ ] 删除不用的 lockfile 和 workspace 配置文件
- [ ] 若选 Bun：删除 `pnpm-lock.yaml` + `pnpm-workspace.yaml`，确认 `bun.lock` 能完整描述 workspace
- [ ] 若选 pnpm：删除 `bun.lock`，保留 `pnpm-workspace.yaml`，更新 `packageManager` 字段
- [ ] 更新 `AGENTS.md` 中的安装命令说明

## 技术方案

**推荐方向：Bun 为主**

理由：
- 运行时已经是 Bun（`bunx`、`bun run`）
- `bun.lock` 是 Bun 原生 lockfile，速度更快
- 但 pnpm workspace 的 YAML 配置比 Bun 的 workspace 字段更灵活（如 `catalog:`）

**执行步骤**：
1. 备份并删除 `pnpm-lock.yaml`
2. 评估 `pnpm-workspace.yaml` 是否可被 Bun workspace 替代：
   - Bun 支持 `workspaces` 字段在根 `package.json` 中
   - 若当前 `pnpm-workspace.yaml` 无特殊配置（如 `catalog:`），可迁移
3. 运行 `bun install` 重新生成 `bun.lock`
4. 验证所有包能正常 build/run

## 验收标准
- [ ] 仓库中仅存一种 lockfile（`bun.lock` 或 `pnpm-lock.yaml`）
- [ ] 新 clone 后，单条命令（`bun install` 或 `pnpm install`）能复现完整依赖树
- [ ] CI 脚本与本地开发命令一致
- [ ] `AGENTS.md` 的 Common Commands 章节只推荐一种安装方式

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `package.json`（workspace 字段）、`AGENTS.md`
- 删除: `pnpm-lock.yaml` 或 `bun.lock`
- 可能删除: `pnpm-workspace.yaml`

## Git 提交信息建议
```
chore(monorepo): unify lockfile to Bun-only (TASK-20260503132524022)

- Remove pnpm-lock.yaml
- Remove pnpm-workspace.yaml (workspace declared in package.json)
- Regenerate bun.lock with latest deps
```

## 备注

> **关联 Epic**: EPIC-20260430011158241 Monorepo tooling consistency and config debt cleanup
> **阻塞决策**: 需确认 `pnpm-workspace.yaml` 中是否有 Bun 不支持的特性（如 `catalog:`）
