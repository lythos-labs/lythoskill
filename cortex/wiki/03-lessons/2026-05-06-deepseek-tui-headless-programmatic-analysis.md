TL;DR: **DeepSeek-TUI 是四者中 Bun.spawn 兼容性最好、子代理最成熟的工具。** 其 Rust 单二进制架构从根本上规避了 Node.js 生态的 stdin pipe 问题；`deepseek serve --http` 提供原生 HTTP/SSE API，无需 SDK 封装；8 种子代理角色（`general`/`explore`/`plan`/`review`/`implementer`/`verifier`/`custom`）在 headless 模式下完全可用；原生 RLM（`rlm_query`）支持 1-16 个并行子任务；1M token 上下文窗口和 $0.14/1M tokens 的输入价格提供了极高的成本效率。**唯一短板是生态成熟度较低（v0.8.x）和多提供商支持不如 OpenCode 广泛。对于需要大上下文 + 低成本 + 强子代理的 Bun 自动化工作流，DeepSeek-TUI 是当前最优选择。**

---

# DeepSeek-TUI 程序化调用调研：与 Claude Code、Kimi Code、OpenCode 的四方对比

## 1. DeepSeek-TUI 核心架构与定位

### 1.1 产品定位

DeepSeek-TUI 是由独立社区开发的终端原生编程智能体，面向 DeepSeek V4（`deepseek-v4-pro` / `deepseek-v4-flash`）模型构建。与其他三个工具不同，它不是任何大模型公司的官方产品，而是一个由社区驱动的开源项目。

| 维度 | DeepSeek-TUI | Claude Code | Kimi Code | OpenCode |
|------|-------------|-------------|-----------|----------|
| **开发方** | 独立社区（Hmbown） | Anthropic | Moonshot AI | Storia AI |
| **技术栈** | **Rust 单二进制** | Node.js/TypeScript | Node.js/TypeScript | Go |
| **运行时依赖** | **无（自包含）** | Node.js | Node.js | 无（单二进制） |
| **许可证** | **MIT** | Proprietary | Apache 2.0 | MIT |
| **上下文窗口** | **1M tokens** | 200K-1M | 256K-1M | 128K-1M |
| **输入价格** | **$0.14/1M** | $5/1M | $0.60/1M | $3-5/1M |
| **GitHub Stars** | 6.5K+ | N/A（闭源） | 6.4K+ | 9.4K+ |

**关键差异：Rust 单二进制。** DeepSeek-TUI 是一个完全自包含的 Rust 二进制文件，不依赖 Node.js、Python 或任何其他运行时。这意味着它不存在 Node.js 生态中著名的 stdin pipe flush bug——Bun 在 ARM64 上向 Node.js 子进程写 stdin 时的 race condition 问题。对于 Bun.spawn 场景，这是一个巨大的架构优势。

### 1.2 架构：Dispatcher → TUI → Engine → Tools

```
deepseek (调度器 CLI)
    ↓
deepseek-tui (TUI 伴随二进制)
    ↓
ratatui 界面 ↔ 异步引擎
    ↓
OpenAI 兼容流式客户端
    ↓
类型化工具注册表（shell、文件操作、git、web、子代理、MCP）
```

引擎管理：会话状态、轮次追踪、持久化任务队列、LSP 子系统。递归语言模型（RLM）子系统提供沙箱化的 Python REPL 用于批量分类和子 LLM 编排。每次编辑后，LSP 子系统（rust-analyzer、pyright、gopls 等）将诊断信息反馈到模型上下文中。

### 1.3 三种交互模式

| 模式 | 行为 | 类比 |
|------|------|------|
| **Plan** 🔍 | 只读调查；模型先探索并提出计划 | Claude Code Plan mode |
| **Agent** 🤖 | 默认交互模式；多步工具调用带审批 | Claude Code default |
| **YOLO** ⚡ | 在可信工作区自动批准工具 | Claude Code bypassPermissions |

## 2. Headless 模式深度分析

DeepSeek-TUI 提供了**四种** headless/程序化入口，比任何其他工具都丰富。

### 2.1 `deepseek "prompt"`：One-shot 模式

最简单直接的 headless 使用方式，类似于 `claude -p` 和 `kimi --print`：

```bash
deepseek "explain this function"                          # 一次性提示
deepseek --model deepseek-v4-flash "summarize"            # 指定模型
deepseek --yolo "refactor auth module"                    # 自动批准工具
```

所有 eagerly loaded 工具在此模式下可用，包括 web search、子代理、MCP 工具。

### 2.2 `deepseek serve --http`：HTTP/SSE 运行时 API

**这是 DeepSeek-TUI 最强大的程序化入口。** 提供完整的 REST API + SSE 事件流：

```bash
deepseek serve --http [--host 127.0.0.1] [--port 7878] [--workers 2]
```

**核心端点**：

| 类别 | 端点 | 功能 |
|------|------|------|
| **Health** | `GET /health` | 健康检查 |
| **Threads** | `POST /v1/threads` | 创建线程 |
| | `GET /v1/threads` | 列出线程 |
| | `GET /v1/threads/{id}` | 获取线程 |
| | `PATCH /v1/threads/{id}` | 更新线程配置 |
| | `POST /v1/threads/{id}/fork` | 分叉线程 |
| **Turns** | `POST /v1/threads/{id}/turns` | 发送消息 |
| | `POST /v1/threads/{id}/turns/{id}/steer` | 引导/修正 |
| | `POST /v1/threads/{id}/turns/{id}/interrupt` | 中断 |
| **Events** | `GET /v1/threads/{id}/events?since_seq=0` | **SSE 事件流** |
| **Tasks** | `POST /v1/tasks` | 创建后台任务 |
| | `GET /v1/tasks` | 列出任务 |
| | `POST /v1/tasks/{id}/cancel` | 取消任务 |
| **Automations** | `POST /v1/automations` | 创建定时自动化 |
| | `POST /v1/automations/{id}/run` | 手动触发 |
| **Introspection** | `GET /v1/apps/mcp/tools` | 列出 MCP 工具 |
| **Usage** | `GET /v1/usage?group_by=day` | Token/成本聚合 |

**SSE 事件类型**：
```json
{
  "seq": 42,
  "timestamp": "2026-02-11T20:18:49.123Z",
  "thread_id": "thr_1234abcd",
  "turn_id": "turn_5678efgh",
  "item_id": "item_90ab12cd",
  "event": "item.delta",
  "payload": { "delta": "partial output", "kind": "agent_message" }
}
```

事件名称：`thread.started`, `thread.forked`, `turn.started`, `turn.lifecycle`, `turn.steered`, `turn.interrupt_requested`, `turn.completed`, `item.started`, `item.delta`, `item.completed`, `item.failed`, `item.interrupted`, `approval.required`, `sandbox.denied`, `coherence.state`。

### 2.3 `deepseek serve --acp`：ACP Stdio 适配器

为 Zed 等编辑器提供的 Agent Client Protocol 适配器：JSON-RPC 2.0 over newline-delimited stdio；支持 `initialize`, `session/new`, `session/prompt`, `session/cancel`；有意保守：不暴露 shell 工具、文件写入、checkpoint replay。

### 2.4 `deepseek serve --mcp`：MCP Stdio 服务器

将 DeepSeek-TUI 的工具暴露为 MCP tools，供其他 MCP 客户端使用。

### 2.5 与 Claude/Kimi/OpenCode 的 Headless 模式对比

| 维度 | Claude `-p` | Kimi `--print` | OpenCode `run`/`serve` | **DeepSeek-TUI** |
|------|-----------|---------------|----------------------|-----------------|
| **One-shot CLI** | ✅ `claude -p` | ✅ `kimi --print` | ✅ `opencode run` | ✅ `deepseek "prompt"` |
| **HTTP API** | ❌ | ❌ | ✅ `opencode serve` | ✅ **`deepseek serve --http`** |
| **SSE 事件流** | ❌ | ❌ | ❌ | ✅ **原生 SSE** |
| **Stdio 适配器** | ❌ | ❌ | ❌ | ✅ **`serve --acp`** |
| **MCP 服务器** | ❌ | ❌ | ✅ `serve --mcp` | ✅ **`serve --mcp`** |
| **后台任务** | ❌ | ❌ | ⚠️ 有限 | ✅ **`/v1/tasks`** |
| **定时自动化** | ❌ | ❌ | ❌ | ✅ **`/v1/automations`** |

## 3. Web Search 与 Fetch 工具

### 3.1 内置工具集

DeepSeek-TUI 提供完整的 eagerly loaded 工具集：文件操作（读、写、编辑）、Shell 执行、Git 管理、**Web search / browse**、**fetch_url**、Apply-patch、子代理（8 种角色）、MCP 服务器、RLM 查询。

### 3.2 Web Search：Eager Tool，Headless 完全可用

与 Claude Code 的 deferred WebSearch 不同，DeepSeek-TUI 的 web search/browse 工具是 eagerly loaded 的常规工具。在 `deepseek "prompt"` one-shot 模式和 `deepseek serve --http` 模式下均完全可用，不存在 deferred tool 的间歇性死锁问题。

### 3.3 FetchURL：Eager Tool，SSRF 保护

`fetch_url` 工具支持网页内容抓取，并内置了 SSRF（服务器端请求伪造）保护（由社区贡献者 Hafeez Pizofreude 实现）。这在 headless/自动化场景下是一个重要的安全特性。

### 3.4 四工具 Web 工具对比

| 特性 | Claude | Kimi | OpenCode | **DeepSeek-TUI** |
|------|--------|------|----------|-----------------|
| **加载机制** | Deferred | Eager | Eager | **Eager** |
| **Headless 可用** | ⚠️ 死锁 | ✅ | ✅ | **✅** |
| **搜索后端** | Anthropic 服务端 | moonshot_search | Exa AI | **DeepSeek API** |
| **Fetch 实现** | Axios + Haiku | HTTP + trafilatura | HTTP + trafilatura | **HTTP + SSRF 保护** |

## 4. 子代理（Subagent）系统：四工具中最成熟

DeepSeek-TUI 的子代理系统是目前四工具中**最成熟、最精细**的。

### 4.1 八种子代理角色

| 角色 | 立场 | 写文件？ | 运行 Shell？ | 典型用途 |
|------|------|---------|------------|---------|
| `general` | 灵活，执行父代理指令 | 是 | 是 | 默认；多步任务 |
| `explore` | 只读；快速映射代码 | 否 | 是（只读） | "找到所有 `Foo` 的调用点" |
| `plan` | 分析并制定策略 | 最少 | 最少 | "设计迁移方案，不执行" |
| `review` | 只读评审，严重度评分 | 否 | 否 | "审计 PR 中的 bug" |
| `implementer` | 精确落地最小改动 | 是 | 是 | "重写 `bar.rs::Foo::bar`" |
| `verifier` | 运行测试/验证 | 否 | 是（测试） | "运行 cargo test，报告结果" |
| `custom` | 显式工具白名单 | 取决于配置 | 取决于配置 | 严格受限的自定义调度 |

### 4.2 子代理工具面

- `agent_spawn` — 创建子代理（带 `agent_type` 和 `allowed_tools`）
- `agent_wait` — 等待完成
- `agent_result` — 获取结果
- `agent_cancel` — 取消
- `agent_list` — 列出活跃代理
- `agent_send_input` — 向运行中的代理发送输入
- `agent_resume` — 恢复中断的代理
- `agent_assign` — 重新分配任务

### 4.3 并发与生命周期

- **并发上限**：默认 10，可配置，硬上限 20
- **生命周期**：Pending → Running → Completed | Failed | Cancelled | Interrupted
- **后台任务模式**：`agent_spawn` 创建 durable background job 记录，父代理可以继续工作
- **Cancellation**：子代理继承 `CancellationToken::child_token()`，取消父代理同时取消所有后代
- **持久化**：`~/.deepseek/subagents.v1.json`，进程重启后可恢复

### 4.4 原生 RLM（Recursive Language Model）

**这是 DeepSeek-TUI 独有的功能。** `rlm_query` 工具利用现有 API 客户端并行调度 1-16 个低成本的 `deepseek-v4-flash` 子任务，用于批量分析和并行推理。这本质上是一种"在代理内部使用更便宜的模型做批处理"的优化机制。

### 4.5 四工具子代理对比

| 维度 | Claude | Kimi | OpenCode | **DeepSeek-TUI** |
|------|--------|------|----------|-----------------|
| **Headless 可用** | ❌ | ✅ | ⚠️ serve bug | **✅** |
| **角色种类** | 5 种 | 3 种 | 多种 | **8 种 + custom** |
| **后台模式** | ⚠️ 工具受限 | ✅ | ⚠️ | **✅（first-class）** |
| **并发上限** | 未知 | 未知 | 未知 | **10（可配，上限 20）** |
| **持久化** | 否 | 否 | 否 | **✅（重启可恢复）** |
| **RLM 并行** | ❌ | ❌ | ❌ | **✅（1-16 个 flash）** |
| **输出格式** | 文本 | 文本 | 文本 | **标准化 5 段式** |

## 5. Bun.spawn 兼容性：四工具中最佳

### 5.1 Rust 单二进制的优势

DeepSeek-TUI 是 Rust 编译的单二进制文件，不依赖 Node.js 运行时。这意味着：不存在 Node.js 的 stdin pipe flush bug；不存在 `CLAUDECODE` / `KIMICODE` 等嵌套检测环境变量；进程启动极快（Rust 二进制 vs Node.js 启动）；内存占用更小（Rust vs Node.js + V8）。

### 5.2 Bun.spawn 推荐配置

**方式一：One-shot（最简单）**
```typescript
const proc = Bun.spawn({
  cmd: ['deepseek', '--yolo', 'Search the web for React 19 features'],
  stdout: 'pipe',
  stderr: 'pipe',
  stdin: 'ignore',
});
const output = await new Response(proc.stdout).text();
```

**方式二：HTTP API（推荐用于复杂工作流）**
```typescript
// 启动 server
const server = Bun.spawn({
  cmd: ['deepseek', 'serve', '--http', '--port', '7878'],
});

// 等待 server 就绪
await new Promise(r => setTimeout(r, 2000));

// 通过 HTTP API 交互（完全无 stdin/stdout 问题）
const thread = await fetch('http://127.0.0.1:7878/v1/threads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ workspace: process.cwd(), mode: 'yolo' }),
}).then(r => r.json());

await fetch(`http://127.0.0.1:7878/v1/threads/${thread.id}/turns`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Search the web for React 19 features' }),
});

// SSE 事件流
const events = new EventSource(
  `http://127.0.0.1:7878/v1/threads/${thread.id}/events?since_seq=0`
);
events.onmessage = (e) => {
  const event = JSON.parse(e.data);
  console.log(`[${event.event}]`, event.payload);
};
```

### 5.3 四工具 Bun 兼容性对比

| 维度 | Claude | Kimi | OpenCode | **DeepSeek-TUI** |
|------|--------|------|----------|-----------------|
| **stdin pipe bug** | ⚠️ ARM64 | ⚠️ ARM64 | ✅ | **✅（Rust 非 Node）** |
| **规避方式** | `executable: "node"` | `-p` 参数 | HTTP API | **HTTP API / one-shot** |
| **子进程启动速度** | 慢（Node.js） | 慢（Node.js） | 快（Go） | **最快（Rust）** |
| **内存占用** | 高 | 高 | 中 | **低** |
| **HTTP API** | ❌ | ❌ | ✅ | **✅** |

## 6. 独特功能：LSP 诊断、沙箱、成本追踪

### 6.1 LSP 诊断

DeepSeek-TUI 在每次编辑后通过语言服务器（rust-analyzer、pyright、typescript-language-server、gopls、clangd）提供内联错误/警告。这在四工具中是独一无二的——其他工具没有内置的 LSP 集成。对于 headless 场景，诊断信息通过 SSE 事件流输出。

### 6.2 沙箱支持

- macOS：`macos_seatbelt` 沙箱
- Linux：可选的沙箱隔离
- 通过 `deepseek doctor --json` 报告 `sandbox.available` 和 `sandbox.kind`

### 6.3 实时成本追踪

按轮次和会话统计 token 用量与成本估算，含缓存命中/未命中明细。HTTP API 的 `/v1/usage` 端点提供聚合数据。

### 6.4 工作区回滚

通过 side-git 记录每轮前后快照，支持 `/restore` 和 `revert_turn`，不影响项目自己的 `.git`。这是 DeepSeek-TUI 的独特功能。

## 7. 权限模型

| 模式 | 自动批准 | 适用场景 |
|------|---------|---------|
| **Plan** | 否（只读） | 探索性分析 |
| **Agent** | 否（需审批） | 默认交互 |
| **YOLO** | 是 | CI/CD / 可信工作区 |

HTTP API 中通过 `auto_approve` flag 控制：
```json
PATCH /v1/threads/{id}
{
  "auto_approve": true,
  "mode": "yolo"
}
```

子代理继承父代理的 `auto_approve` 设置。

## 8. 四工具综合评分与选择矩阵

### 8.1 加权评分

| 维度 (权重) | Claude | Kimi | OpenCode | **DeepSeek-TUI** |
|------------|--------|------|----------|-----------------|
| **WebSearch Headless** (20%) | 2 | 9 | 9 | **9** |
| **Subagent Headless** (20%) | 1 | 8 | 6 | **9** |
| **Bun.spawn 兼容性** (15%) | 4 | 7 | 9 | **9** |
| **SDK/API 质量** (10%) | 7 | 8 | 9 | **8** |
| **多模型支持** (5%) | 2 | 5 | 10 | **5** |
| **开源/可定制** (5%) | 0 | 8 | 10 | **10** |
| **上下文窗口** (10%) | 10 | 7 | 7 | **10** |
| **成本效率** (10%) | 3 | 8 | 7 | **9** |
| **生产成熟度** (5%) | 9 | 7 | 7 | **6** |
| **加权总分** | **3.3** | **7.7** | **8.0** | **8.7** |

### 8.2 场景选择矩阵

| 场景 | 推荐工具 | 理由 |
|------|---------|------|
| ** Bun.spawn + WebSearch + 子代理** | **DeepSeek-TUI** | Rust 二进制无 stdin bug，HTTP API，子代理最成熟 |
| **最大上下文（1M）+ 最低成本** | **DeepSeek-TUI** | $0.14/1M vs $0.60-$5，1M tokens |
| **多模型切换（Claude/Gemini/本地）** | OpenCode | 75+ 提供商支持 |
| **已有 Claude 生态投资** | Claude SDK | Agent SDK 稳定，避开 deferred tools |
| **中文场景 + 搜索** | Kimi / DeepSeek-TUI | 中文优化，搜索服务完善 |
| **Production CI/CD（大规模）** | OpenCode / DeepSeek-TUI | Cloudflare 验证 / Rust 稳定 |
| **需要 LSP 诊断反馈** | **DeepSeek-TUI** | 独一无二的功能 |
| **后台任务 + 定时自动化** | **DeepSeek-TUI** | `/v1/tasks` + `/v1/automations` |
| **快速批处理（RLM）** | **DeepSeek-TUI** | `rlm_query` 并行 1-16 个 flash |

### 8.3 最终结论

对于"在 Bun spawn 模式下使用 Web Search 和子代理"这一核心需求，**DeepSeek-TUI 以 8.7 的加权总分成为当前最优选择。** 其 Rust 单二进制架构从根本上规避了 Node.js 生态的技术债务，HTTP/SSE API 提供了最干净的程序化集成路径，八种子代理角色和原生 RLM 提供了最强大的并行推理能力，而 $0.14/1M tokens 的输入价格和 1M token 上下文窗口提供了极高的成本效率。

**选择优先级**：
1. **DeepSeek-TUI**：Bun 自动化 + 子代理 + 大上下文 + 低成本
2. **OpenCode**：多模型切换 + HTTP API + 生产验证
3. **Kimi Code**：中文场景 + `--print` 模式稳定
4. **Claude Code**：已有生态投资 + 最大模型能力（但避开 headless deferred tools）