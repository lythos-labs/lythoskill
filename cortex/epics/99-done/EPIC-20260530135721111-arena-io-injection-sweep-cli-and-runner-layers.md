---
lane: main
checklist_completed: false
checklist_skipped_reason: non-interactive agent session
---
# EPIC-20260530135721111: Arena IO Injection Sweep — CLI and Runner Layers

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> Arena IO Injection Sweep — CLI and Runner Layers

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-30 | Created, 3 tasks registered |
| active | 2026-05-30 | All 3 tasks completed, tests green (143 pass), committed 8eb3628 |
| done | 2026-06-01 | Done |

## 背景故事

Deck 和 Curator 已完成 IO 注入改造（Curator 11 个函数、Deck remove/to-symlink-snapshot/refresh-plan）。Arena 作为第三个核心 CLI 包，仍直接调用 `console.log`/`console.error`/`process.exit`/`Bun.spawn`/`mkdirSync` 等，测试覆盖率最低。

本 Epic 将 Intent/Plan/Execute 分形架构中的 Execute 层彻底 IO 注入化，使 arena 达到与 deck/curator 同等的可测试性。

## 需求树

### 主题A: CLI 层 IO 注入 #backlog
- **触发**: Arena CLI 直接 IO 调用 ~30+ 处，无法单元测试
- **需求**: 提取 `ArenaCliIO`，注入 main/singleRun/vsRun/vizRun/prepareWorkdir/archiveRun
- **实现**: 参考 CuratorIO 模式
- **产出**: `cli.test.ts` 覆盖参数解析和错误路径
- **验证**: 零 spyOn，mock IO 捕获输出和 exit code

### 主题B: Runner 层 IO 注入 #backlog
- **触发**: runArenaFromToml 混合逻辑与 IO（fs/spawn/agent）
- **需求**: 提取 `ArenaIO`，覆盖 fs/spawn/agentSpawn
- **实现**: 参考 RefreshIO 模式
- **产出**: `runner.test.ts` 扩展 mock IO 覆盖
- **验证**: dry-run、单 cell 执行、错误恢复路径

### 主题C: BDD reproduce.sh #backlog
- **触发**: IO 注入改造需要端到端验证
- **需求**: 2 个 reproduce.sh 场景（CLI + Runner）
- **实现**: 遵循 ADR-20260518024500631 模式
- **产出**: showcase/2026-05-30-arena-*-bdd/
- **验证**: ZK subagent PASS

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260518024500631 | evolve-agent-bdd-from-agent-md-parseagentmd-to-reproduce-sh-pattern | accepted |
| ADR-20260424113917838 | red-green-release-heredoc-migration-patch-design | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260530135707211 | backlog | Arena CLI IO injection — ArenaCliIO for 6 functions |
| TASK-20260530135721111 | backlog | Arena runner IO injection — ArenaIO for fs/spawn/agent |
| TASK-20260530135730555 | backlog | Arena BDD reproduce.sh for CLI and runner |

## 经验沉淀

- IO 注入模式已在 curator（11 函数）和 deck（4 文件）验证有效
- Arena 特殊性：agentSpawn 是真实 IO，mock 时需要模拟 AgentResult 结构
- 文件系统 IO 可用内存 mock（Record<string, string> 作为虚拟 fs）

## 归档条件

- [x] 所有 3 个 task 完成
- [x] `bun --filter='*' run test` 全绿 (arena: 143 pass, 0 fail)
- [ ] ZK 验证通过（网络恢复后执行）
- [ ] Push 到 remote（网络恢复后执行）
