---
lane: main
checklist_completed: false
checklist_skipped_reason: Non-interactive agent session
---
# EPIC-20260529214429614: Curator CLI IO injection + BDD coverage

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> 将 deck 已验证的 IO 注入模式推广到 curator 所有 CLI entry points，消除直接 console/process 调用，补齐 BDD 测试覆盖。

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-29 | Created |

## 背景故事

Deck 侧已完成 IO 注入改造（runAdd/runFind/runRemove/runSymlink/runSnapshot），所有 CLI entry points 接受 `io: { log, error, exit, confirm }` 注入，测试零 `spyOn(console)`。Curator 侧仅有 `runAdd` 和 `runFind` 完成了注入，其余 entry points（runQuery/runAudit/runTag/runRefreshPlan/runRefreshExecute/backupIndex/restoreIndex/printSchema）仍直接调用 `console.log`/`console.error`/`process.exit`，无法被注入式 BDD 测试覆盖。

此外，curator 的 `runRefreshPlan`/`runRefreshExecute` 使用了 `HEAD...@{upstream}`（三点符号），在 shallow clone 下会 overcount——与 deck 已修复的 TASK-20260529132734903 是同一类 bug。

## 需求树

### T1: runQuery IO 注入 + BDD #backlog
- **触发**: runQuery 直接调用 console/process，无法注入测试
- **需求**: 给 runQuery 添加 `io: CuratorIO` 参数，替换所有直接 IO 调用
- **实现**: 修改 cli.ts runQuery 签名，内部使用 io.log/io.error/io.exit
- **产出**: 可注入测试的 runQuery，零 console/process 直接调用
- **验证**: cli.test.ts 新增 Q1-Q4 测试（schema 打印、SELECT 查询、DB 未找到、非 SELECT 拒绝）；showcase/ 下新增 curator-query-reproduce.sh Agent BDD

### T2: runAudit IO 注入 + BDD #backlog
- **触发**: runAudit 直接调用 console/process
- **需求**: 给 runAudit 添加 `io: CuratorIO` 参数
- **实现**: 修改 cli.ts runAudit 签名，内部使用 io.log/io.error/io.exit
- **产出**: 可注入测试的 runAudit
- **验证**: cli.test.ts 新增 A1-A3 测试（正常审计、空 DB、DB 未找到）；showcase/ 下新增 curator-audit-reproduce.sh Agent BDD

### T3: runTag IO 注入 + BDD #backlog
- **触发**: runTag 直接调用 console/process
- **需求**: 给 runTag 添加 `io: CuratorIO` 参数
- **实现**: 修改 cli.ts runTag 签名，内部使用 io.log/io.error/io.exit
- **产出**: 可注入测试的 runTag
- **验证**: cli.test.ts 新增 T1-T4 测试（tag niche、tag qa、skill 未找到、缺少参数）；showcase/ 下新增 curator-tag-reproduce.sh Agent BDD

### T4: runRefreshPlan/runRefreshExecute IO 注入 + behind count 修复 #backlog
- **触发**: refresh 命令直接 console，且使用 `HEAD...@{upstream}` 三点符号
- **需求**: IO 注入 + 两点符号修复（与 deck TASK-20260529132734903 一致）
- **实现**: 修改两个函数签名，替换 IO 调用，`HEAD...@{upstream}` → `HEAD..@{upstream}`
- **产出**: 可测试的 refresh 命令，shallow clone 下 behind count 准确
- **验证**: cli.test.ts 新增 R1-R3 测试（plan 生成、exec 执行、空 pool）；showcase/ 下新增 curator-refresh-reproduce.sh Agent BDD

### T5: 辅助函数 IO 注入（backupIndex/restoreIndex/printSchema）#backlog
- **触发**: 这些函数被主函数调用，但内部直接 console
- **需求**: 通过参数或闭包传递 io
- **实现**: backupIndex/restoreIndex 接受 io 参数；printSchema 改为返回字符串由调用方输出
- **产出**: 全链路零直接 console/process 调用
- **验证**: 现有测试不回归；showcase/ 下新增 curator-backup-restore-reproduce.sh Agent BDD

### T6: --help 入口 IO 注入 #backlog
- **触发**: --help 直接 console.log + process.exit(0)
- **需求**: 统一为可注入模式
- **实现**: help 文本通过 io.log 输出，io.exit(0) 退出
- **产出**: 完整的 IO 注入闭环
- **验证**: cli.test.ts 新增 H1 测试（help 输出包含关键命令）；showcase/ 下新增 curator-help-reproduce.sh Agent BDD

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260424113917838 | red-green-release heredoc migration | 02-accepted |
| ADR-20260518123403810 | Agent-enriched niches (L3 metadata) | 02-accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260529132734903 | 04-completed | deck refresh behind count + monorepo report |

## SSOT 参考（执行前必读）

> 以下要点已在 Epic 层面确认，各 Task 直接引用，无需重新翻文件。

### 1. IO 注入模式（deck 已验证）
- 所有 CLI entry points 接受 `io: CuratorIO = defaultCuratorIO` 参数
- `CuratorIO` 接口：`{ log?: (msg: string) => void, error?: (msg: string) => void, exit?: (code: number) => never }`
- 默认值 `defaultCuratorIO` 使用 `console.log`/`console.error`/`process.exit`
- 测试注入 `log: capture[]`, `error: capture[]`, `exit: (code) => { throw new Error(\`EXIT:${code}\`) }`
- **禁止** `spyOn(console)` / `spyOn(process)` — 这是架构契约，不是风格偏好

### 2. 目录结构（已稳定，EPIC-20260520124010693）
- 所有 curator 产出跟随 pool：`<pool>/.lythoskill-curator/`
- 文件清单：`REGISTRY.json`, `catalog.db`, `additions.jsonl`, `refresh-plan.md`, backup files
- Fallback 路径仅用于查询兼容：`~/.agents/lythoskill/curator/` (legacy), `~/.agents/lythos/skill-curator/` (pre-0.9.51)
- 多 pool 场景：每个 pool 有自己的 `.lythoskill-curator/` 子目录，天然隔离

### 3. Git behind count（TASK-20260529132734903 已验证）
- `HEAD...@{upstream}`（三点）→ `HEAD..@{upstream}`（两点）
- 原因：shallow clone 下三点符号把 shallow boundary 当作提交计入，overcount
- `A..B` = B 中有 A 没有的提交（方向性，upstream-only）
- `A...B` = 对称差（commits in either not in both）

### 4. Agent BDD 格式（ADR-20260518024500631）
- **reproduce.sh** 替代 `.agent.md`
- IoC handoff：shell 处理 deterministic scaffold（tmpdir、git clone、文件准备）
- stdout `echo` 作为 prompt-injection 通道：`echo "<spawn subagent to ...>"`
- judge 标准在独立 `judge.md`，task agent 不可见
- 人类运行 `bash reproduce.sh` 看到 echo 就停；agent 读到 stdout 识别 role marker 接管
- 采样策略：用真实 repo `git clone --depth=1` 到 TMPDIR，非 mock git

### 5. 代码位置
- 主文件：`packages/lythoskill-curator/src/cli.ts`（1311 行）
- 测试文件：`packages/lythoskill-curator/src/cli.test.ts`（516 行，已覆盖 runAdd/runFind）
- 核心库：`packages/lythoskill-curator/src/curator-core.ts`, `catalog-db.ts`, `guard.ts`
- 已注入函数：runAdd (L973), runFind (L581), runCurator (L308)
- 待注入函数：runQuery (L474), runAudit (L774), runTag (L1172), runRefreshPlan (L888), runRefreshExecute (L920), backupIndex (L255), restoreIndex (L280), printSchema (L399)

## 经验沉淀

- Deck 的 IO 注入改造已验证：测试从 `spyOn(console)` 变为注入 `log: capture[]`，结构更清晰，mock 更轻量
- `CuratorIO` 接口已存在（{ log, error, exit }），只需扩展使用范围
- 两点符号 vs 三点符号：`A..B` = B 中有 A 没有的提交（方向性），`A...B` = 对称差。shallow clone 下三点符号会把 shallow boundary 当作提交计入，导致 overcount
- **Agent BDD 格式**：reproduce.sh（非 .agent.md）。IoC handoff：shell 处理 scaffold，stdout echo 作为 prompt 通道，judge 标准在独立 judge.md 中

## 归档条件
- [ ] T1-T6 全部完成并合并到 main
- [ ] `bun --filter='*' run test` 全绿（13/13 包）
- [ ] cli.test.ts 零 `spyOn(console)` / `spyOn(process)`
- [ ] curator 全 CLI entry points 接受 `CuratorIO` 注入
- [ ] showcase/ 下 6 个 reproduce.sh Agent BDD 全部 PASS
