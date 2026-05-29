# ADR-20260529215906255: Curator catalog resolution context — deck-aware vs independent discovery

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-29 | Created during EPIC-20260529214429614 T1 review. Catalog location is stable (<pool>/.lythoskill-curator/), but "which pool" discovery is implicit and fragile. |
| accepted | 2026-05-29 | Accepted |

## 背景

Curator 的 catalog.db 位置已稳定为 `<pool>/.lythoskill-curator/`（EPIC-20260520124010693）。但 "pool 是什么" 的解析路径存在多层隐式 fallback：

1. `--db` 显式指定 → 直接用
2. `./catalog.db` 存在 → 用
3. `~/.agents/skill-repos/.lythoskill-curator/catalog.db` → 默认 pool
4. `~/.agents/lythoskill/curator/catalog.db` → legacy global
5. `~/.agents/lythos/skill-curator/catalog.db` → pre-0.9.51 legacy

这个设计在"默认场景"工作良好（大多数用户不改 cold pool 位置），但在以下场景产生困惑：

- **场景 B**：当前目录有 `skill-deck.toml`，用户跑 `curator query` 期望自动找到 deck 声明的 cold pool 对应的 catalog —— 实际不读 deck.toml，可能命中默认 pool 的空 catalog
- **场景 C**：arena 指定了 `--deck`，curator 子命令无法感知该 deck 的 cold pool
- **场景 D**：deck wizard 先空配（只有 cold_pool/working_set），用户尚未 scan，curator 命令报错 "DB not found" —— 错误信息不提示 "你的 deck 声明了 cold_pool=X，需要先 scan"
- **场景 E**：多个项目用不同 cold pool，用户在 project A 目录跑 `curator find` 却命中 project B 的 catalog（因为默认 pool 相同）

Root cause：`resolveDbPath()` 不读 `skill-deck.toml`，curator 和 deck 的 cold pool 配置是断开的。这是"分散参数和隐式优先级堆积"的典型表现。

## 决策驱动

- **心智模型一致性**：用户认为 "我在 project 目录，curator 应该知道我的 deck 配置"
- **Starter 模型威力**：curator 作为 npm package 可以依赖 deck 的 parser，通过 `bunx` 调用形成 FaaS 效果 —— 这不是耦合，是组合
- **错误信息质量**：当前 "Catalog DB not found" 不告诉用户"你的 deck 说 cold pool 在 X"
- **多 pool 隔离**：不同 project 用不同 cold pool 时，默认 pool fallback 造成交叉污染

## 选项

### 方案A：curator 跟随 deck（deck-aware discovery）

`resolveDbPath` 增加一步：如果当前目录（或向上递归）有 `skill-deck.toml`，读取 `cold_pool` 字段，优先找 `<cold_pool>/.lythoskill-curator/catalog.db`。

搜索顺序变为：
1. `--db` 显式指定
2. 当前目录 `./catalog.db`
3. **从 skill-deck.toml 读 cold_pool → `<pool>/.lythoskill-curator/catalog.db`** ← 新增
4. 默认 pool `~/.agents/skill-repos/.lythoskill-curator/catalog.db`
5. legacy fallback 路径

**优点**:
- 符合用户心智模型：project 目录下 curator 命令自动对齐 deck 配置
- arena `--deck` 场景自然解决：arena 在 project 目录运行，curator 子命令自动找到对应 catalog
- 错误信息可改进："未找到 catalog，你的 deck 声明 cold_pool=X，尝试 `curator <pool>`"
- 多 pool 隔离：不同 project 目录自动隔离 catalog

**缺点**:
- curator 包需要依赖 deck.toml parser（或内联轻量解析）
- 引入跨包概念耦合：curator 需要知道 "skill-deck.toml 是什么"
- 向上递归找 deck.toml 可能有性能开销（虽然极小）
- 如果用户故意想在 project A 目录查 project B 的 catalog，需要显式 `--db`

### 方案B：curator 保持独立，改进错误信息（independent discovery）

不读 deck.toml，保持 curator 完全独立。但改进 "DB not found" 错误信息：

```
❌ Catalog DB not found.

Searched:
  ./catalog.db
  ~/.agents/skill-repos/.lythoskill-curator/catalog.db

If you have a skill-deck.toml in this directory:
  cold_pool = "./my-pool"  → try: curator query --db ./my-pool/.lythoskill-curator/catalog.db
  Or run: curator ./my-pool

To scan default pool:
  lythoskill-curator
```

**优点**:
- 零耦合：curator 不依赖 deck 任何知识
- 架构清晰：curator 是独立工具，deck 是独立工具，通过显式参数组合
- 实现简单：只改错误信息字符串

**缺点**:
- 不解决场景 B/C/E 的隐性错位
- 每次都要用户手动算路径 `--db <pool>/.lythoskill-curator/catalog.db`
- 违背 "工具应理解上下文" 的 UX 原则

### 方案C：混合 — deck 感知作为可选层（opt-in deck-aware）

默认行为不变（方案B），增加 `--deck` flag：`curator query --deck ./skill-deck.toml <SQL>`

**优点**:
- 向后兼容，不破坏现有行为
- 显式契约：用户明确说"用这张 deck 的上下文"
- 实现简单：只在显式 `--deck` 时解析

**缺点**:
- 增加 CLI 参数表面
- 用户仍然需要知道 `--deck` 存在 —— 发现成本
- 不解决"我在 project 目录，为什么 curator 不知道"的困惑

## 决策

**选择**: 方案A（deck-aware discovery）

**原因**:
- 默认 cold pool 位置不变的用户不受影响（搜索顺序中 deck-aware 步骤在默认 pool 之前，但如果没 deck.toml 就 fallback 到默认 pool）
- 有 deck.toml 的用户获得"自然"体验：curator 命令在 project 目录自动对齐
- Starter 模型的威力体现：curator package 可以依赖 `@lythos/skill-deck` 的 parser（或内联 TOML 读取 cold_pool 字段），通过 npm 依赖管理组合，不是硬编码耦合
- 错误信息改进是附带收益：即使 DB 未找到，也能提示 "你的 deck 说 cold_pool=X"
- 向上递归找 deck.toml 是常见模式（类似 git 找 .git 目录），用户熟悉

## 影响

- 正面:
  - project 目录下 curator 命令自动对齐 deck 配置
  - arena 场景 curator 子命令自然找到正确 catalog
  - 多 pool 隔离：不同 project 自动隔离
  - 错误信息可引用 deck 配置，降低用户排查成本
- 负面:
  - curator 包增加 deck.toml 解析依赖（或内联轻量 TOML 读取）
  - 需要定义"向上递归到多少层"（建议：到文件系统根或找到为止，类似 git）
- 后续:
  - 实现 `findDeckToml(cwd)` 辅助函数（纯函数，可单元测试）
  - 更新 `resolveDbPath` 集成 deck 感知步骤
  - 更新 CLI 错误信息模板
  - BDD 覆盖：有 deck.toml 的目录、无 deck.toml 的目录、显式 --db 覆盖

## 相关
- 关联 ADR: ADR-20260424000744041 (curator output is personal environment scan), ADR-20260519224555402 (curator add 副作用显式化)
- 关联 Epic: EPIC-20260529214429614 (curator CLI IO injection + BDD coverage)
- 关联 Task: 本 ADR 实现应注册为新 Task，挂在 EPIC-20260529214429614 下或独立 Epic
