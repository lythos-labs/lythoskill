---
lane: main
checklist_completed: false
checklist_skipped_reason: agent execution, checklist verified verbally
---
# EPIC-20260503234346583: Backfill unit test coverage for deck via TDD

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> 用 TDD vertical-slice 方式给 `lythoskill-deck` 补 unit test，覆盖率目标 80%。

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-03 | Created — ADR-20260503180000000 accepted, framework = bun:test |

## 背景故事

`lythoskill-deck` 目前 **0 unit test**。21 个 CLI BDD 场景覆盖的是集成链路（spawnSync + 文件断言），无法定位具体模块的回归问题。

随着 deck CRUD 重构完成（alias、refresh、remove、prune），核心 reconciler 逻辑已经稳定，是时候用 **TDD red-green-refactor** 的方式补 unit 层保险。

**TDD 纪律（本 Epic 执行准则）**:
- **Vertical slices only** — 一个公共接口行为 → 一个测试 → 验证通过 → 下一个。禁止水平切片（禁止一次性写 10 个测试再写实现）。
- **Public interface only** — 测试通过导出函数验证行为，不测试私有实现细节。
- **Tracer bullet first** — 第一个测试必须证明 "bun:test + tmpdir sandbox" 这条路径端到端跑得通。
- **No speculative tests** — 不写"未来可能用到"的测试，只写当前行为需要验证的测试。

## 需求树（Workflowy zoom-in）

> Epic 不是 todo list。下面是可逐级展开的层级大纲，每个叶子节点是一个可验证的行为。

### 主题 A：Tracer bullet — 证明测试路径可行 #backlog
- **触发**: 0 → 1 的第一个测试必须验证 "bun:test 能跑、能断言、能过"
- **需求**:
  - `findDeckToml(cwd)` → 找到/找不到 `skill-deck.toml`
  - `expandHome(path, base)` → `~/` 展开、相对路径 resolve
  - `findSource(name, coldPool, projectDir)` → FQ 路径命中 / 未命中
- **实现**: 纯函数，零 mock，输入 → 输出断言
- **产出**: `src/link.test.ts`（ tracer bullet 阶段，3 个纯函数用例）
- **验证**: `bun test packages/lythoskill-deck/src/link.test.ts` 全绿

### 主题 B：Reconciler 核心链路 — `linkDeck()` #backlog
- **触发**: deck 的心脏逻辑，直接操作文件系统，最需要回归保险
- **需求**:
  - Empty deck → 创建 working set 目录 + `skill-deck.lock`
  - Declared skill + cold pool 存在 → working set 中出现正确 symlink
  - Undeclared skill 留在 working set → 被清理（deny-by-default）
  - Alias collision（同名冲突）→ 按 schema 处理（抛错或覆盖）
  - `max_cards` 超限 → 拒绝或警告
- **实现**: tmpdir sandbox + 模拟 cold pool + 模拟 `SKILL.md`
- **产出**: `src/link.test.ts` 持续追加 reconciler 用例
- **验证**: sandbox 可复现，不依赖真实 `~/.agents/skill-repos`

### 主题 C：命令层公共接口 #backlog
- **触发**: CLI 背后每个 `export function` 都是公共接口
- **需求**:
  - `validateDeck()` → schema error / valid
  - `addSkill()` → deck.toml 更新 + cold pool 下载 + symlink
  - `removeSkill()` → deck.toml 清理 + symlink 删除
  - `refreshDeck()` → 更新已声明 skill
  - `pruneDeck()` → GC 未引用冷池仓库
- **实现**: 按 vertical slice，一个命令一组测试，happy path + 至少一个 error path
- **产出**: `src/validate.test.ts`, `src/add.test.ts`, `src/remove.test.ts`...
- **验证**: `bun test --coverage` 显示 deck 包覆盖率达到 80%

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260503180000000 | Unit Test Framework Selection — bun:test | ✅ Accepted |

## 关联任务（SMART — 一批 commit 一个 task）

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260503235008935 | backlog | **Tracer bullet + 纯函数层**: `findDeckToml` / `expandHome` / `findSource` 测试（3 个纯函数，1 个 test file，1 批 commit） |
| TASK-20260503235009959 | backlog | **Reconciler 核心 A**: `linkDeck()` empty deck & symlink creation（tmpdir sandbox，2 个行为，1 批 commit） |
| TASK-20260503235011219 | backlog | **Reconciler 核心 B**: `linkDeck()` deny-by-default & alias collision（边界行为，2 个行为，1 批 commit） |
| TASK-20260503235012454 | backlog | **命令层 A**: `validateDeck()` + `addSkill()` 测试（2 个命令，1 批 commit） |
| TASK-20260503235013705 | backlog | **命令层 B**: `removeSkill()` + `refreshDeck()` + `pruneDeck()` 测试（3 个命令，1 批 commit） |
| TASK-20260503235014489 | backlog | **Coverage sweep**: 补遗漏边界 case，覆盖率推至 80%（1 批 commit） |

## 经验沉淀

## 归档条件
- [ ] 所有关联 task 完成
- [ ] `bun test --coverage` 显示 deck 包覆盖率 ≥ 80%
- [ ] 每个测试都通过公共接口，不耦合实现细节
- [ ] TDD vertical slice 节奏被记录（哪些行为先测、为什么）
