---
lane: main
checklist_completed: false
checklist_skipped_reason: backfilled pre-ADR-20260503003315478
---
# EPIC-20260430011158241: Monorepo tooling consistency and config debt cleanup

> Monorepo tooling consistency and config debt cleanup

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-04-29 | Created |
| done | 2026-05-03 | Done |

## 背景故事

由 agent 对 repo 进行 Bun + TypeScript 最佳实践调研时发现，项目中存在若干**配置债务**，它们不是功能缺陷，但会导致：

1. **根 package.json 承载包级依赖** — 违反 Bun monorepo 官方规范，破坏包边界
2. **Bun lockfile 与 pnpm lockfile 共存** — 工具链分叉风险，团队可能用不同命令安装
3. **各包 tsconfig.json 不一致** — 无根基础配置，IDE 无法做全局类型检查，未来包间引用会出问题
4. **package.json 字段不统一** — engines、license、files、exports 各包自行其是

这些债务都是之前 session 中 agent 直接固化的选择，未经最佳实践校验。作为 chore epic，目标是**清理配置、统一规范、降低未来维护成本**，不引入新功能。

## 需求树

### 根依赖下沉 #backlog
- **触发**: Bun 官方文档明确说根 package.json 不应有 dependencies
- **需求**: `@iarna/toml`/`zod` 下沉到 `packages/lythoskill-deck/`，`husky` 评估后要么下沉要么移除
- **实现**: 修改根 package.json + deck package.json，运行 `bun install` 验证
- **产出**: 根 package.json 只剩 `name`/`private`/`workspaces`
- **验证**: `bun install` 后 deck 仍能正常 import `@iarna/toml`

### Lockfile 统一 #backlog
- **触发**: `bun.lock` 和 `pnpm-lock.yaml` 内容已不同步
- **需求**: 二选一，以 Bun 为主工具链则只保留 `bun.lock`
- **实现**: 删掉 `pnpm-workspace.yaml` + `pnpm-lock.yaml`，重新 `bun install`
- **产出**: 单一 lockfile，单一 workspace 配置来源
- **验证**: CI/本地均用 `bun install` 能复现相同依赖树

### tsconfig 统一 #backlog
- **触发**: 5 个包 3 种 tsconfig 变体，无根基础配置
- **需求**: 根目录建 `tsconfig.base.json`，各包 `extends`
- **实现**: 统一 target/module/include，按需加 `composite: true`
- **产出**: 所有包的 tsconfig 一致且可追溯
- **验证**: `bun typecheck`（或未来 tsc --build）全包通过

### package.json 模板化 #backlog
- **触发**: license 重复、engines 缺失、files 不一致
- **需求**: 所有 publishable 包统一字段集合
- **实现**: 更新 `lythoskill-creator` 的 init/add-skill 模板，回刷现有包
- **产出**: 所有包有相同的 engines/files/exports 结构
- **验证**: 每个包 `npm publish --dry-run` 产物一致

## 需求树

### 主题A #backlog
- **触发**:
- **需求**:
- **实现**:
- **产出**:
- **验证**:

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260503132523380 | in-progress | 根 package.json 依赖下沉到具体包 |
| TASK-20260503132524022 | in-progress | 统一 lockfile 和 workspace 配置（Bun-only） |
| TASK-20260503132524651 | in-progress | 创建根 tsconfig.base.json 并统一各包配置 |
| TASK-20260503132525248 | in-progress | 标准化所有 publishable 包的 package.json 模板 |

### 已终止的旧任务（空壳，无内容）
| 任务 | 状态 | 终止原因 |
|------|------|---------|
| TASK-20260430011203412 | terminated | 空模板，无需求详情，重新初始化 |
| TASK-20260430011205130 | terminated | 空模板，无需求详情，重新初始化 |
| TASK-20260430011206610 | terminated | 空模板，无需求详情，重新初始化 |
| TASK-20260430011207805 | terminated | 空模板，无需求详情，重新初始化 |

## 经验沉淀

## 归档条件
- [ ] 所有任务完成
- [ ] 验证通过
