# ADR-20260509104832428: Remove run --decks CLI-flag mode — keep only run --config arena.toml

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-09 | Created |
| accepted | 2026-05-09 | 0.10.0 batch — rename + CLI-flag removal |

## 背景

`lythoskill-arena` 的 `run` 子命令当前有两条入口：

1. **声明式**: `run --config arena.toml`（推荐，k8s-manifest 风格）
2. **CLI-flag**: `run --task <path> --decks <A,B> --players <A,B> [--criteria ...]`

历史演变：
- T5 已删除 `--skills` 参数（`scaffold` 及其 `--skills` 分支）
- `run` 的 CLI-flag 模式原本是为了在引入 arena.toml 之前提供程序化入口
- 现在 arena.toml 已稳定，`--decks` / `--players` / `--task` 的 flag 组合只是 arena.toml 的命令行投影，没有独立价值

## 心智模型

| 命令 | 心智模型 | 参数 |
|------|---------|------|
| `agent-run` | 单人试车：快速测一副卡组在某个 player 下的表现 | `--deck`（1 个 deck）+ `--player`（1 个 player） |
| `run` | 真人对战：多副卡组 × 多 player 的正式对比 | `--config arena.toml`（声明式表达所有 side） |

`agent-run --player` 保留——它符合"快速切 player 试卡组"的心智。`run` 则应该是声明式的，flag 模式与 arena.toml 功能重叠。

## 选项

### 方案A（选择）：删 CLI-flag，只留 `run --config`

**优点**:
- 减少 1 条执行路径，降低维护成本
- `run` 只有一种用法，降低用户困惑
- arena.toml 是 SSOT，CLI-flag 的任何差异都会导致行为漂移
- 与 `--skills` 已删除的方向一致（CLI surface 持续瘦身）

**缺点**:
- 向后不兼容：依赖 `run --decks` 的脚本需要迁移到 arena.toml
- 简单场景需要写文件（arena.toml），不能一行搞定

**后续**:
- 考虑 `agent-run` 未来改名（如 `try` 或 `test-drive`），进一步对齐心智模型

### 方案B：保留 CLI-flag，但标记 deprecated

保持向后兼容，但文档标注 deprecated 并在下一个 major 删除。

**优点**: 兼容期更长
**缺点**: 拖长过渡期，碎片持续存在

## 决策

**选择**: 方案A

**原因**:
1. `--skills` 已删除，`run --decks` 是最后一个 non-declarative 参数
2. arena.toml 已经足够稳定（经 ADR-20260502110308316 + 后续多轮反馈修正）
3. CLI-flag 的参数组合（`--decks` / `--players` / `--criteria`）在 arena.toml 中都有等价表达
4. 项目已有 `examples/arena/` 提供现成配置模板，上手成本已降低

## 影响

- 正面: CLI 面更小，`run` 只有一种心智模型
- 负面: 无（零用户阶段，不需要向后兼容）

## 后续实施

0.9.x 系列是地基巩固期。所有 CLI surface 变更（`--skills` 已删、`--decks` CLI-flag 待删、命令 rename）**一次性在 0.10.0 发布**。零用户阶段无兼容成本。

### Phase 1（本 ADR）
- 删除 `run --decks` / `--players` / `--task` CLI-flag 模式
- `run` 只剩 `run --config arena.toml`（声明式 SSOT）

### Phase 2（0.10.0 发布时）
命令重命名，彻底对齐心智模型：

| 当前 | 新名 | 心智模型 |
|------|------|---------|
| `agent-run` | `single` | 单人测卡组 —— `single --player kimi --deck ./deck.toml` |
| `run` | `vs` | 真实比赛 —— `vs --config arena.toml` |

重命名后 README 语义自明，不需要额外解释。
旧名直接删除，不保留别名的向后兼容。没有实际用户。

## 涉及文件

| 文件 | 变更 |
|------|------|
| `packages/lythoskill-arena/src/cli.ts` | 删除 `runProgrammaticArena` 的 CLI-flag 分支, 只留 `--config` |
| `packages/lythoskill-arena/README.md` | 更新 Commands 和 Quick Start |
| `packages/lythoskill-arena/skill/SKILL.md` | 更新 CLI-flag 模式文档 |
| `README.md` / `README.zh.md` | A/B 表同步（`run --decks` → `run --config`） |
| 引用 doc | `test-play-model.md`, `agent-autonomous-arena.md` 等 |

## 相关

- 前置 ADR: `ADR-20260502110308316` (arena.toml schema)
- 关联 Epic: `EPIC-20260508222319639` (T5 — --skills 删除)
- 关联 Task: `TASK-20260509104331469` (T6 — 验证计划)
