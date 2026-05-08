# ADR-20260508074057834: Deck link working_set path resolution + absolute-path logging

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-08 | Created from agent feedback — surprising behavior when --deck points to subdirectory |
| accepted | 2026-05-08 | Accepted |

## 背景

当前 `link.ts:148`: `const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : dirname(DECK_PATH)`

`working_set`（默认 `".claude/skills"`）被相对于 `PROJECT_DIR` 展开。

- **默认**：deck.toml 通过 `findDeckToml(cwd)` 在项目根发现 → `PROJECT_DIR` = cwd → 正确
- **`--deck ./decks/my.toml`**（无 `--workdir`）：`PROJECT_DIR` = `./decks/` → `working_set` 解析到 `./decks/.claude/skills/` → **反直觉**

多个 agent 报告了对此行为的惊讶。

## 决策驱动

1. 默认行为（deck 在项目根）正确，不应改变
2. `--deck` 显式指向非 cwd 位置时，用户期望"用这个 deck，但在当前目录工作"
3. Agent 不应推理 working_set 解析规则——日志直接输出绝对路径即可（内文档化）

## 选项

### 方案 A: 始终 deck-file-relative（现状）
- 优点: 语义统一
- 缺点: `--deck ./decks/my.toml` 时反直觉。— **Rejected**

### 方案 B: 始终 cwd-relative
- 优点: 语义统一
- 缺点: 破坏向后兼容，deck 在其他项目根时行为错误。— **Rejected**

### 方案 C: `--deck` 显式时 fallback 到 cwd + 日志输出绝对路径 — Selected

```ts
const PROJECT_DIR = cliWorkdir
  ? resolve(cliWorkdir)
  : cliDeck                   // --deck explicitly passed
    ? process.cwd()
    : dirname(DECK_PATH)      // default
```

link 结束时输出关键路径：

```
📋 deck:      /absolute/path/to/skill-deck.toml
📁 working_set: /absolute/path/to/.claude/skills
🗄️  cold_pool:   /absolute/path/to/cold-pool
```

若 `dirname(DECK_PATH) !== cwd` 且无 `--workdir`，追加引导：
> 💡 working_set 相对于当前目录。若期望跟随 deck 文件位置，使用 `--workdir <dir>`

## 决策

**选择**: 方案 C。`--deck` 显式时 PROJECT_DIR = cwd。同时 link 日志显式输出绝对路径——agent 看到路径就知道技能装哪了，不需要推理解析规则。

## 影响

- 正面: `--deck ./decks/my.toml` 符合直觉；agent 自文档化
- 负面: 行为变更——依赖 deck-file-relative 的脚本需加 `--workdir`

## 后续
1. 实现方案 C + 日志
2. 更新 README 和 deck skill 参考
