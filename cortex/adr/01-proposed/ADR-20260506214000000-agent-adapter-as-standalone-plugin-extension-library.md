# ADR-20260506214000000: AgentAdapter as standalone plugin/extension library

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-06 | Created |

## 背景

### 多 backend 探索历程

arena 的 agent spawn 经历了多轮 backend 探索，每个 backend 都有独特的行为边界：

| Backend | 路径 | 状态 | 怪癖 |
|---------|------|------|------|
| Claude `-p` CLI | `Bun.spawn('claude -p')` | ❌ 不可用 | deferred tool deadlock、env 污染、stdin flush bug — 6 个 commit 从未产出 |
| Kimi `--print` | `Bun.spawn('kimi --print --afk')` | ✅ 稳定 | stream-json 逐行解析，content 类型分 string/array |
| DeepSeek `-p` | `Bun.spawn('deepseek --approval-policy auto')` | ⚠️ text-only | chat completion 模式不执行 tool，需迁移到 `serve --http` |
| Claude SDK | `query()` from `@anthropic-ai/claude-agent-sdk` | ❓ 待实现 | SDK 依赖，但在 AgentAdapter 接口下天然隔离 |

### 耦合问题

当前 `AgentAdapter` 接口 + `useAgent()` registry + 3 个 adapter 实现全部挤在 `@lythos/test-utils/src/agents/`（一个 7 文件的子目录）。这造成几个问题：

1. **怪癖泄漏**: 每个 adapter 的独特行为（Kimi 的 stream-json 解析、Claude 的 retry loop、DeepSeek 的 text-only 标注）挤在同一个包里，通过注释互相解释
2. **依赖污染**: 如果要加 Claude SDK adapter（`@anthropic-ai/claude-agent-sdk`），依赖会拉进 test-utils，影响所有用户
3. **不可扩展**: 第三方无法写自定义 adapter——`useAgent()` 的 registry 是硬编码的
4. **架构不透明**: 这本质是一个 plugin/extension 系统，但被埋在 test-utils 里，不作为一等架构概念存在

## 决策驱动

- `AgentAdapter` 接口是 plugin/extension 架构的契约层——应该作为独立 lib 存在
- 每个 adapter 的怪癖应该内聚在自己的实现里，不污染其他 adapter
- Claude SDK 的依赖问题通过架构解决（隔离在 adapter 包里），不是通过 workaround（optionalDependency）
- `registerAgent()` 开放第三方注册，让 `useAgent()` 成为真正的 extension point
- 多个实现共存才证明抽象不是为某一个 backend 量身定做

## 选项

### 方案A：保持现状，在 test-utils 里加 SDK adapter

**被拒绝**: Claude SDK 的 `@anthropic-ai/claude-agent-sdk` 依赖会强制拉进 test-utils，影响所有用户。且 adapter 怪癖继续泄漏。

### 方案B：optionalDependency（已写入 task card 初稿）

**被拒绝**: 技术上可行但架构上回避了真正问题——AgentAdapter 本身就是一个自包含的 plugin 系统，不应该寄居在 test-utils 里。optionalDependency 是 workaround，不是架构。

### 方案C：AgentAdapter 抽成独立 plugin/extension 库（选择）

**两层结构**:

```
packages/lythoskill-agent-adapter/          ← 核心接口包 (@lythos/agent-adapter)
  dependencies: {}                           ← 零外部依赖
  src/
    types.ts          AgentAdapter, AgentRunResult, CheckpointEntry, ToolDefinition
    registry.ts       registerAgent(), useAgent(), listAgents()
    checkpoint.ts     readCheckpoints()
    adapters/
      kimi.ts          Bun.spawn('kimi --print --afk')
      claude-cli.ts    Bun.spawn('claude -p') — @deprecated
      deepseek.ts      Bun.spawn('deepseek -p') — text-only
    index.ts

packages/lythoskill-agent-adapter-claude-sdk/  ← Claude SDK adapter (独立可选包，未来)
  dependencies: { "@anthropic-ai/claude-agent-sdk": "^x" }
```

**注册模型**:

```typescript
// 核心包暴露
registerAgent(name: string, adapter: AgentAdapter): void
useAgent(name: string): AgentAdapter
listAgents(): string[]

// 内置 adapter 在 import 时自注册
import '@lythos/agent-adapter'  // registers kimi, claude, claude-cli, deepseek

// 第三方 adapter 同样方式
import { registerAgent } from '@lythos/agent-adapter'
registerAgent('hermes', hermesAdapter)
```

**优点**:
- 核心包零依赖，轻量到可以随处使用
- 每个 adapter 的怪癖内聚在自己的文件里
- Claude SDK 依赖隔离在独立包（或不装 SDK 的用户完全不受影响）
- `registerAgent()` 开放第三方扩展——arena runner 只调 `useAgent(playerName)`，不需要知道具体实现
- 向后兼容：`@lythos/test-utils/agents` 保留为 re-export 路径
- 多个 adapter 共存证明 AgentAdapter 接口不是为某一个 backend 量身定做

**缺点**:
- 多一个 workspace package（但 lock-step 版本同步已有成熟 infra）
- test-utils 的 `agents/` 子路径需要维护 re-export（一次性成本）

## 后果

### 正面

- **依赖隔离**: Claude SDK 不再污染 test-utils（需要 SDK 的用户安装 claude-sdk adapter 包）
- **怪癖内聚**: Kimi 的 stream-json 解析、Claude 的 retry loop、DeepSeek 的 text-only 标注各自在自己的文件里
- **可扩展**: 第三方 adapter 通过 `registerAgent()` 注册，arena 自动可用
- **架构可见**: `@lythos/agent-adapter` 作为一等概念存在，README 可以解释 plugin 模式

### 负面

- 多一个包要维护版本同步（但 lock-step 已有 infra，增量成本接近零）
- test-utils 的 re-export 路径需要保留（向后兼容负担）
- Claude SDK adapter 还未实现（TASK-20260506001644316），但核心包提取已完成

### 迁移路径

1. ✅ `packages/lythoskill-agent-adapter/` 核心包已创建（零依赖）
2. ✅ 内置 adapter（kimi、claude-cli、deepseek）已迁移，自注册
3. ✅ `@lythos/test-utils/agents` 改为 re-export，向后兼容
4. ✅ 全部测试通过（test-utils 117 + arena 106 + deck 75 = 298 pass）
5. ⬜ Claude SDK adapter（TASK-20260506001644316 Phase 2）
6. ⬜ 长期：test-utils agents/ 路径标注 deprecated，引导新代码直接 import `@lythos/agent-adapter`
