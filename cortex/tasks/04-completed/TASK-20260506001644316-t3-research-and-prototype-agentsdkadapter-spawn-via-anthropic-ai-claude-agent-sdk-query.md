# TASK-20260506001644316: T3: Extract AgentAdapter as standalone plugin lib + Claude SDK adapter

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-05 | Created |
| scoped | 2026-05-06 | Scope expanded: extract AgentAdapter to lib first, then Claude SDK |
| completed | 2026-05-06 | Closed via trailer |

## 背景

### 问题一：Claude `-p` CLI 是死胡同

6 个 commit 的 monkey-patch（env clean、prompt file、shell redirect、quoting 修复、env inheritance 修复、retry loop）从未产出非空输出。根因是 deferred tool deadlock（report.md §2.1.3）+ CLI 版本脆弱。Kimi `--print` 和 DeepSeek `-p` 都不存在这个问题——它们是独立实现的 headless 模式。

### 问题二：AgentAdapter 耦合在 test-utils 里

当前 `AgentAdapter` 接口 + `useAgent()` registry + 3 个 adapter 实现全部挤在 `@lythos/test-utils/src/agents/`。这是一个自包含的 plugin/extension 系统，但被埋在 test-utils 里，无法独立演进。

### 架构洞察

`useAgent()` 完全是经典的 plugin/extension 架构：

```
interface AgentAdapter { spawn(), invokeTool?() }
registry: Record<string, AgentAdapter>
useAgent(name) → lookup → adapter
```

接口定义契约，registry 是 extension point，每个 adapter 是实现。这和 `skill-deck` 的 skill type 注册、VS Code extension、webpack loader 是同一个模式。应该作为独立 lib 存在，而不是 test-utils 的子目录。

## 各 adapter 怪癖清单（内聚依据）

每个 adapter 有自己的独特行为和边界条件，塞在同一个文件/包里只会互相污染：

| Adapter | 机制 | 怪癖 | 可靠性 |
|---------|------|------|--------|
| kimi | `kimi --print --afk` | stream-json 逐行解析，content 可能是 string 或 array | ✅ 稳定 |
| claude (CLI) | `claude -p` | deferred tool deadlock、env 污染、stdin flush bug、重试包装 | ❌ 不可用 |
| claude (SDK) | `query()` | SDK 依赖、API key 来源、tool 声明方式不同于 CLI | ❓待验证 |
| deepseek | `deepseek -p` | text-only（不执行 tool）、`--approval-policy auto` 非 `--yolo` | ⚠️ 受限 |
| [future] hermes | ? | ? | ? |
| [future] MCP server | ? | ? | ? |

这些怪癖应该各自内聚在自己的 adapter 包里，而不是写在一个共享文件的注释里互相解释。

## 架构：两层拆分

```
packages/lythoskill-agent-adapter/          ← 核心接口包 (npm: @lythos/agent-adapter)
  dependencies: {}                           ← 零外部依赖
  src/
    types.ts          AgentAdapter, AgentRunResult, ToolDefinition, CheckpointEntry
    registry.ts       useAgent(), registerAgent(), listAgents()
    index.ts

packages/lythoskill-agent-adapter/adapters/ ← 内置 adapter 实现（同包，零额外依赖）
    kimi.ts            Bun.spawn('kimi --print --afk')
    claude-cli.ts      Bun.spawn('claude -p') — 保留但标注 deprecated
    deepseek.ts        Bun.spawn('deepseek -p')

packages/lythoskill-agent-adapter-claude-sdk/ ← Claude SDK adapter (可选包)
  dependencies: { "@anthropic-ai/claude-agent-sdk": "^x" }
  src/
    claude-sdk.ts       import { query } from '@anthropic-ai/claude-agent-sdk'
```

### 为什么内置 adapter 和核心接口同包

Kimi / Claude-CLI / DeepSeek 都只依赖 `Bun.spawn`，零外部依赖。拆成独立 npm 包是过度工程化——它们不会独立安装、独立版本、独立发布。Claude SDK adapter 不同——它拉了一个重型 SDK 依赖，必须是独立包（或至少 optionalDependency）。

### 注册模型

```typescript
// 核心包暴露
export function registerAgent(name: string, adapter: AgentAdapter): void
export function useAgent(name: string): AgentAdapter
export function listAgents(): string[]

// 内置 adapter 在包加载时自注册
import { registerAgent } from '../registry'
registerAgent('kimi', kimiAdapter)

// 第三方 adapter 同样方式
import { registerAgent } from '@lythos/agent-adapter'
import { hermesAdapter } from './hermes-adapter'
registerAgent('hermes', hermesAdapter)
```

arena runner 不 import 具体 adapter，只 `useAgent(playerName)`。这就是 plugin 架构。

## 需求详情

### Phase 1: 提取核心包

- [ ] 从 `@lythos/test-utils/src/agents/types.ts` 提取 `AgentAdapter` 等类型 → 新包
- [ ] `useAgent()` + `registerAgent()` + `listAgents()` registry
- [ ] 内置 adapter 迁移：kimi、claude-cli、deepseek（保持 Bun.spawn 实现不变）
- [ ] test-utils 改为 re-export 新包（向后兼容）
- [ ] `packages/lythoskill-agent-adapter/README.md` — plugin 架构说明 + 自定义 adapter 示例

### Phase 2: Claude SDK adapter

- [ ] 调研 `@anthropic-ai/claude-agent-sdk` 的 `query()` API
- [ ] 决定独立包 vs optionalDependency
- [ ] 实现 `AgentAdapter` 接口的 `spawn()` via `query()`
- [ ] smoke test：Hello World → 自报 Skill 两段验证

### Phase 3: 清理

- [ ] `claude-cli` adapter 标注 `/** @deprecated */`
- [ ] arena runner 切换引用路径
- [ ] test-utils agents 子路径向后兼容 deprecation warning

## 验收标准

- [ ] `@lythos/agent-adapter` 包零外部依赖，独立可用
- [ ] `useAgent('kimi')` 行为与拆分前一致
- [ ] `registerAgent('custom', myAdapter)` 第三方注册可用
- [ ] `useAgent('claude-sdk')` Hello World 产出非空
- [ ] `useAgent('claude-sdk')` 自报 Skill 正确列出 deck skills
- [ ] SDK 未安装时（claude-sdk 包不存在）不影响 kimi/deepseek 正常使用
- [ ] `@lythos/test-utils` 原有 import 路径不 broken

## 关联文件

| 操作 | 路径 |
|------|------|
| 新建 | `packages/lythoskill-agent-adapter/` (核心包) |
| 新建 | `packages/lythoskill-agent-adapter-claude-sdk/` 或 optionalDependency |
| 迁移 | `packages/lythoskill-test-utils/src/agents/types.ts` → 新包 |
| 迁移 | `packages/lythoskill-test-utils/src/agents/index.ts` → 新包 registry |
| 迁移 | `packages/lythoskill-test-utils/src/agents/kimi.ts` → 新包 adapters/ |
| 迁移 | `packages/lythoskill-test-utils/src/agents/claude.ts` → 新包 adapters/claude-cli.ts |
| 迁移 | `packages/lythoskill-test-utils/src/agents/deepseek.ts` → 新包 adapters/ |
| 修改 | `packages/lythoskill-test-utils/src/agents/index.ts` → re-export + deprecation notice |
| 修改 | arena runner 引用路径 |

## 参考

- `report.md` §1.3: Agent SDK `query()` 排推荐方案第一
- `packages/lythoskill-test-utils/src/agents/types.ts` — 当前 AgentAdapter 接口
- `packages/lythoskill-test-utils/src/agents/kimi.ts` — 唯二稳定参考实现
- `AGENTS.md` → "Hello World → 自报 Skill 烟测 pattern"
- `cortex/wiki/03-lessons/kimi-vs-claude-cli-headless-comparison.md`
- `cortex/wiki/01-patterns/player-abstraction-agent-swappable-backend.md`
