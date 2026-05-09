# ADR-20260509144134332: Rename deck sync/freeze to to-symlink/to-snapshot for action-explicit verbs

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-09 | Created |
| accepted | 2026-05-09 | Accepted |

## 背景

ADR-20260507190157540 引入了 cold pool 双模式（snapshot = cp pinned, symlink = live），
并配套两个单 skill 切换命令：`deck sync <alias>`（snapshot → symlink）和
`deck freeze <alias>`（symlink → snapshot）。v0.9.45 已带这两个命令上线。

写文档时发现两个问题：

1. **`sync` 与 `link` 语义重叠**。`deck link` 才是真正做 working set
   reconciliation/同步的主命令；`deck sync` 只是单 skill 的模式切换，根本不"同步"任何
   东西。同一 CLI 下两个命令共享同义动词，是 anti-pattern。
2. **Agent batch-replace 风险**。Agent 在大改时容易把 `sync` 视为"同步"通用语义并
   反射式 find-replace；歧义命令名会跨整个代码库放大错误半径。
3. **schema 字段已经有正解**。`schema.ts` 里 `mode: z.enum(["symlink","snapshot"])`
   是这两种模式的规范命名。CLI 动词应该对齐 schema，而不是引入第三套术语
   （`sync`/`freeze`）。

## 决策驱动

- **消除 `link` ↔ `sync` 命名冲突**：保留 `link` 作为唯一表达"同步/调和"的动词
- **agent-friendly 无歧义命名**：避免一个 token 的语义歧义跨代码库扩散
- **CLI 动词对齐 schema 字段**：减少术语层数（schema / CLI / docs 三处一致）
- **pre-1.0、低 blast radius**：v0.9.45 刚发，pinned 用户不受影响；此时 break 比
  1.0 后 break 便宜得多

## 选项

### 方案 A：保持 `sync` / `freeze`，仅文档强化区分

**优点**：
- 零代码改动
- 已发布命令稳定不变

**缺点**：
- 没解决 agent batch-replace 风险根因
- 文档说明负担永远存在（每次有人读都得记一遍消歧）
- 新 agent / 新 contributor 仍会反复中招

### 方案 B：硬重命名为 `to-symlink` / `to-snapshot`，无 alias（**选中**）

**优点**：
- 命令动词明确描述目标状态，与 schema `mode` 字段一一对应
- `link` 不再与任何子命令同义
- 命名本身自带消歧，无需文档维护
- 符合 CLAUDE.md "no BC shims" 原则；pre-1.0 阶段允许 break

**缺点**：
- v0.9.45 用户脚本里的 `deck sync` / `deck freeze` 在升级到 v0.9.46+ 后会失效
- 历史 ADR / 旧 daily 文件仍引用旧名（接受作为时间切片记录，不回填）

### 方案 C：双名并存 + deprecation warning

**优点**：
- 老脚本不立即 break

**缺点**：
- 留下永久的命名歧义遗物（agent 看到 `sync` 不知道是 deprecated 还是 active）
- 与 CLAUDE.md "no BC shims" 显式冲突
- v0.9.45 用户极少（昨天才发），保留期收益 < 维护成本

## 决策

**选择**: 方案 B（硬重命名 + 无 alias）

**原因**: pre-1.0、v0.9.45 刚发布、无外部生态依赖；此时硬切换比留任何 BC shim 都
干净。新名 `to-symlink` / `to-snapshot` 是动作 + 目标状态的形式，跟 schema 字段名
1:1 对齐，且不与其他子命令同义。

## 影响

- **正面**：
  - `deck link` 成为唯一的"同步/调和"动词；命名空间清爽
  - CLI 命令名 ↔ schema mode 字段名 ↔ lock 文件 mode 字段三处对齐
  - 降低 agent 误读 / 批量替换风险
- **负面**：
  - v0.9.45 已 publish，老命令名留在 npm registry；任何 pin 在 0.9.45 的用户用旧名
    继续可工作，但下个版本起脚本要改
  - 历史 ADR-20260507190157540 / 旧 daily 文件继续用 `sync`/`freeze`，作为时间切片
    保留不回填
- **后续**：
  - 实施范围：`packages/lythoskill-deck/src/cli.ts`、`sync-freeze.ts` (重命名为
    `to-symlink-snapshot.ts`)、对应 test 文件、`packages/lythoskill-deck/README.md`、
    `packages/lythoskill-deck/skill/SKILL.md`、`AGENTS.md`、agent BDD scenario
  - 函数名同步重命名：`syncSkill` → `toSymlinkSkill`，`freezeSkill` → `toSnapshotSkill`
  - 不改 schema（已经是 `symlink`/`snapshot`）；不改 `--mode` 标志值（已对齐）
  - 关联 task：TASK-20260509155623694

## 相关
- 关联 ADR: ADR-20260507190157540（cold pool 双模式 + 旧 sync/freeze 命名来源）
- 关联 Task: TASK-20260509155623694
- 关联 Memory: `feedback_avoid_synonymous_command_names.md`
