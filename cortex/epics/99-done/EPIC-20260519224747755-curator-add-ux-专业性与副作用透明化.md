---
lane: main
checklist_completed: false
checklist_skipped_reason: Agent session non-interactive
---
# EPIC-20260519224747755: curator add UX 专业性与副作用透明化

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> curator add UX 专业性与副作用透明化

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-19 | Created |
| done | 2026-05-19 | Done |

## 背景故事
`curator add` 在 clone skill 到 cold pool 的同时，会执行两项隐式全局副作用：追加 `additions.jsonl` 和 write-through cache 到全局 `catalog.db`。这些路径硬编码在源码中，不跟随 `scan --output`，write-through cache 失败也完全静默。

这导致三个 UX 问题：
1. 用户不知道自己的 home 目录被修改了
2. `scan --output ./local` 与 `add` 的索引位置脱节
3. write-through 失败后用户以为已索引，实际 query 搜不到

本 Epic 目标：让 `curator add` 的副作用从"黑盒"变为"白盒"，默认行为不变，新增可选的 `--output` 对齐能力。

## 需求树

### curator add --output 对齐 #backlog
- **触发**: 用户在项目 A 使用 `scan --output ./local-index`，随后 `add` 新 skill，期望索引落到同一位置
- **需求**: `add` 子命令支持 `--output <dir>`，additions.jsonl 和 write-through cache 写入该目录
- **实现**: 修改 `cli.ts` 中 `writeAddition` 和 write-through 区块，接收 `outputDir` 参数（默认仍为 `~/.agents/lythoskill/curator/`）
- **产出**: `curator add` 支持 `--output` 参数
- **验证**: 单元测试覆盖 `--output` 场景；手动验证 additions.jsonl 和 catalog.db 落到指定目录

### 副作用显式声明 #backlog
- **触发**: 用户运行 `add` 后看不到任何关于全局索引被修改的提示
- **需求**: 命令成功后在 stdout 显式打印 additions 和 index 的写入路径
- **实现**: 在 `runAdd` 成功分支追加 `console.log` 输出两条路径信息
- **产出**: 用户明确知道哪些文件被修改了
- **验证**: CLI BDD 测试捕获 stdout 中包含预期路径声明

### write-through 降级提示 #backlog
- **触发**: write-through cache 异常静默吞掉，用户 query 搜不到刚 add 的 skill
- **需求**: cache 失败时不静默，打印降级提示说明"scan 会稍后补齐"
- **实现**: 把空 `catch` 块改为 `console.log('⚠️ Index update skipped (will catch up on next scan)')`
- **产出**: 用户明确知道索引状态
- **验证**: 模拟 catalog.db 锁定/损坏场景，验证 stderr/stdout 包含降级提示

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260519224555402 | curator add 全局副作用显式化与 --output 对齐 | proposed |
| ADR-20260511210000000 | curator output 集中化到 ~/.agents/lythoskill/curator/ | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260519224838606 | backlog | 实现 curator add --output 对齐与副作用显式声明 |

## 经验沉淀
- CLI 副作用透明原则：对用户主目录的修改必须在 stdout 中显式声明路径
- 可选参数优于强制变更：`--output` 是逃生舱，默认值保持向后兼容
- 空 catch 块在 CLI 工具中属于"静默失败"反模式，应至少降级为提示

## 归档条件
- [ ] `curator add --output <dir>` 工作正常，additions 和 cache 落到指定目录
- [ ] 默认场景（无 --output）行为与修改前完全一致
- [ ] write-through cache 失败时打印降级提示
- [ ] 成功时 stdout 显式声明 additions.jsonl 和 catalog.db 的写入路径
- [ ] 单元测试与 CLI BDD 测试通过
- [ ] SKILL.md 文档已更新
