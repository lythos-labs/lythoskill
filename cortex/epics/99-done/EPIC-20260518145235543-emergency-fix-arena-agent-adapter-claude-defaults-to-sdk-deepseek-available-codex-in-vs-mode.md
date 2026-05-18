---
lane: emergency
checklist_completed: false
checklist_skipped_reason: "Urgent fix for cross-player arena vs — production broken for deepseek and claude-sdk"
---
# EPIC-20260518145235543: Emergency: fix arena agent-adapter — claude defaults to SDK, deepseek available, codex in vs mode

> **Epic 是什么**:1-3 周可结案的 outcome
> **双轨**:`lane: emergency`

> Emergency: fix arena agent-adapter — claude defaults to SDK, deepseek available, codex in vs mode

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-18 | Created |
| done | 2026-05-18 | Done |

## 背景故事

Arena cross-player vs 实际运行发现 3 个 adapter 问题：

1. **Claude 用了废弃的 CLI spawn**：`resolvePlayer('claude')` → `'claude'` → `claude-cli` adapter（`claude -p < prompt`），而非 `claude-sdk`（SDK 直调）。`claude-sdk` 早已实现并被注册为 `'claude-sdk'`，但 player resolver 的 BUILTIN_PLAYERS 映射从未更新。

2. **DeepSeek adapter 已实现但 vs 模式不可用**：`@lythos/agent-adapter-deepseek-serve` 完整实现了 deepseek adapter（守护进程模式），但不在 `@lythos/skill-arena` 的 dependencies 中。`bunx` 拉包时动态 import 静默失败，`useAgent('deepseek')` 抛出 Unknown agent。

3. **Codex 在 vs 模式不可用**：`runner.ts`（vs）只导入 `claude-sdk` + `deepseek-serve`，漏掉了 codex adapter。`single` 模式可用但 `vs` 不可用。

4. **localhost FQ 格式残留误导**：多处代码/文档残留 `localhost/<name>`（2-segment bare name）引用。FQ-only 后格式是 `localhost/me/<skill>`（3-segment, host/owner/repo 对齐）。`parse-locator.ts` 注释说支持 2-segment 自动映射但代码拒绝——删除虚假承诺。

## 需求树

### 主题A: Claude player resolver 指向 SDK #backlog
- **触发**: `arena.toml: player = "claude"` → claude-cli spawn 而非 SDK
- **需求**: `resolvePlayer` 将 `'claude'` 解析为 `'claude-sdk'`
- **实现**: BUILTIN_PLAYERS 中 `'claude': 'claude-sdk'`，保留 `'claude-cli': 'claude'` 为显式 opt-in
- **产出**: arena.toml 写 `player = "claude"` 使用 SDK
- **验证**: `resolvePlayer('claude') === 'claude-sdk'`，719 tests pass

### 主题B: DeepSeek + Codex 作为 arena optionalDependencies #backlog
- **触发**: `bunx @lythos/skill-arena vs` 动态 import 失败
- **需求**: `@lythos/agent-adapter-deepseek-serve` 和 `@lythos/agent-adapter-codex` 加入 arena 的 optionalDependencies
- **实现**: package.json 添加两项 workspace:*
- **产出**: bunx 拉包时 deepseek + codex 可用
- **验证**: `npm ls` 确认依赖存在

### 主题C: runner.ts 导入 codex adapter #backlog
- **触发**: vs 模式 codex 不可用
- **需求**: runner.ts 添加 codex 动态导入
- **实现**: `try { await import('@lythos/agent-adapter-codex') } catch {}`
- **产出**: vs 模式支持 codex
- **验证**: 719 tests pass

### 主题D: localhost FQ 格式残留清理 #backlog
- **触发**: `localhost/<name>`（2-segment）残留误导多个 agent 使用错误格式
- **需求**: 所有代码和文档统一为 `localhost/me/<skill>`（3-segment, host/owner/repo 对齐）
- **实现**: 修复 8 处残留（parse-locator.ts, validate-plan.ts, types.ts, README.md, add.ts, cli.ts, cold-pool-setup.md ×2）
- **产出**: 0 处 `localhost/<name>`（bare name）残留
- **验证**: grep 确认

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260502012643244 | FQ-only locator | accepted |
| ADR-20260518123403810 | Curator role re-derivation | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260518145235543-A | completed | 主题A: resolvePlayer claude → claude-sdk |
| TASK-20260518145235543-B | completed | 主题B: deepseek + codex → optionalDependencies |
| TASK-20260518145235543-C | completed | 主题C: runner.ts 导入 codex |
| TASK-20260518145235543-D | completed | 主题D: localhost FQ 残留全仓清理 |

## 经验沉淀

- **FQ-only 是铁律**：`localhost/me/<skill>` = `host/owner/repo` 对齐。任何 2-segment 形式都是 bare name，一概拒绝。Vercel skills.sh 的 `owner/repo` 是独立语法糖，不干扰 localhost 格式。
- **Adapter 注册名 vs player 名是两层**：`resolvePlayer` 是 player 名 → adapter 注册名的映射。没有这个映射，即使 adapter 正确注册也无法使用。
- **optionalDependencies 是 bunx 的命门**：动态 import 依赖必须在 package.json 中声明，否则 npm registry 安装时不包含，静默失败。
- **错误信息是 agent 的路标**：`localhost/<name>` 这个错误信息误导了多个 agent session。错误信息的准确性直接影响 agent 能否 self-heal。

## 归档条件
- [x] 所有任务完成
- [x] 719 tests pass, 0 fail
- [x] grep `localhost/<name>` 在 active code 中 0 残留
