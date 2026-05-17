---
lane: main
checklist_completed: false
checklist_skipped_reason: agent execution, scope aligned with ADR-20260504135256566
---
# EPIC-20260504165156064: Extract cortex husky hooks to testable TypeScript modules

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> Extract cortex husky hooks to testable TypeScript modules

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-04 | Created |
| done | 2026-05-04 | Done |

## 背景故事

`lythoskill-project-cortex` 的产品定位是 GTD-style 治理层，但 **80% 的 Jira-simulation 体验不在包里**——真正自动流转的逻辑躺在本仓库手写的 `.husky/post-commit` + `.husky/pre-commit` 里。

本 epic 用 **TDD 方式**把三块 cortex 自治行为从 shell 提取为可测试 TypeScript：
1. trailer-driven task/ADR/epic 自动流转
2. Epic→ADR 自动接受
3. lane 守护（max-1-active）

素材来源：`.husky/post-commit` 的 `trailer_block()` + `.husky/pre-commit` 的 Epic-ADR coupling block。

## 需求树

### 主题 A: Trailer dispatch — commit message → cortex CLI #backlog
- **触发**: `.husky/post-commit` 中 `trailer_block()` 已手写，但不可测试、不可移植
- **需求**: 解析 `Task:/ADR:/Epic:/Closes:` trailer → 映射为 cortex CLI 命令 → 执行 → follow-up commit
- **实现**: 提取为 `lib/trailer.ts`，含 `parseTrailers(msg)` + `dispatchTrailer(cmd, config)` 纯函数
- **产出**: `src/lib/trailer.ts` + `src/lib/trailer.test.ts`
- **验证**: `bun test` 覆盖 happy path + malformed ID + unknown prefix + recursion guard

### 主题 B: Epic-ADR coupling guard #backlog
- **触发**: `.husky/pre-commit` 第 22–37 行：新 Epic staged → 扫描关联 ADR → 自动 accept
- **需求**: staged active epic 文件 → 匹配 `Epic: <id>` in proposed ADR → `adr accept`
- **实现**: 提取为 `lib/coupling.ts`，含 `findLinkedAdrs(epicId, proposedDir)` + `acceptAdrs(adrIds)`
- **产出**: `src/lib/coupling.ts` + `src/lib/coupling.test.ts`
- **验证**: mock 文件系统，覆盖命中/未命中/多 ADR 关联场景

### 主题 C: Lane guard (max-1-active) #backlog
- **触发**: CLI 层已强制，但 commit-time guard 缺失（手动 `git mv` 可绕过）
- **需求**: 扫描 `cortex/epics/01-active/`，验证 `main`/`emergency` 各 ≤ 1 个 active epic
- **实现**: 提取为 `lib/lane.ts` 的 `validateLaneGuard(config)` 函数（CLI 复用同一函数）
- **产出**: `src/lib/lane.ts` 重构 + `src/lib/lane.test.ts`
- **验证**: 0/1/2 个 active epic 场景，main + emergency 分别验证

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260504135256566 | cortex init ships trailer-driven hooks | proposed |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260504165202852 | backlog | T1: Extract trailer dispatch from post-commit shell to TypeScript with tests |
| TASK-20260504165203797 | backlog | T2: Extract Epic-ADR coupling guard from pre-commit shell to TypeScript with tests |
| TASK-20260504165204731 | backlog | T3: Extract lane guard (max-1-active per track) to TypeScript with tests |

## 经验沉淀

## 归档条件
- [x] 所有任务完成
- [x] 验证通过

## 经验沉淀

- TDD 提取 shell→TS 时，保持 hook 不动、只提取纯函数，是冻结期和 mixin 准备阶段的最小阻力路径
- 脱敏基础设施（sanitize.ts）应在 artifact 产出第一时间接入，而不是事后清理
- 默认 secret 规则保守为主（高置信度匹配），宁可漏报也不要误报
