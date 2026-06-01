TL;DR: **Kimi CLI 在 headless 程序化场景下显著优于 Claude CLI。** Kimi 的 `--print` 模式不会引入 deferred tool 死锁问题，所有内置工具（包括 `SearchWeb`、`FetchURL`、`Agent` 子代理）在 headless 模式下均可正常工作。其 Agent SDK 采用更干净的 Session/Turn/Event 流式架构，支持子代理事件（`SubagentEvent`）的实时监控。在 Bun 环境下，虽然仍需注意 stdin pipe 的潜在问题，但 Kimi CLI 的 `--print` 模式支持通过命令行参数传递 prompt（`-p`），完全规避了 stdin pipe 的风险。权限模型上，Kimi 的 `--yolo`（仅自动批准）和 `--afk`（完全无人值守）分离的语义比 Claude 的单一 `--permission-mode` 更精确。**结论：对于需要在 Bun spawn 模式下使用 Web Search 和子代理的自动化工作流，Kimi CLI 是当前更可靠的选择。**

---

# Kimi CLI 程序化调用深度调研：与 Claude CLI 的对比分析

## 1. 核心定位与架构差异

Kimi Code CLI 和 Claude Code CLI 虽然都是终端优先的 AI 编程代理工具，但在产品定位、开源策略和底层架构上存在显著差异，这些差异直接影响它们在程序化/headless 场景下的表现。

### 1.1 产品定位对比

| 维度 | Kimi Code CLI | Claude Code CLI |
|------|--------------|-----------------|
| **开发方** | Moonshot AI（月之暗面） | Anthropic |
| **开源协议** | Apache 2.0（完全开源） | 闭源专有软件 |
| **定价模型** | API 按量付费（$0.60/$2.50 每百万 token） | Claude Pro $20/月 + API 费用 |
| **模型锁定** | 默认 Kimi K2.5，支持多 provider 配置 | 仅 Claude 系列模型 |
| **IDE 集成** | VS Code、Cursor、Zed、JetBrains（ACP 协议） | 终端唯一 |
| **社区生态** | 6.4K+ GitHub stars，中文社区活跃 | 企业级生态，英文为主 |
| **自托管** | 支持（模型权重开源） | 不支持 |

Kimi Code CLI 的**开源特性**意味着其内部实现完全透明，开发者可以直接阅读源码理解工具加载机制、权限模型和 headless 模式的实现细节。这与 Claude Code 的"黑盒" deferred tool 机制形成鲜明对比——Kimi 的所有工具都是 eagerly loaded（ eagerly 加载），不存在 deferred tool 的间歇性死锁问题。

### 1.2 架构哲学：Eager Tools vs Deferred Tools

这是两者在程序化场景下表现差异的**根本原因**。

**Claude Code 采用 Deferred Tools（延迟加载）架构。** WebSearch、WebFetch、Agent、Skill、ToolSearch 等工具不在会话启动时加载，而是当模型首次尝试调用时通过 ToolSearch 机制动态解析。这一设计在交互式模式下工作，但在 `-p` 无头模式下引入了已确认的间歇性死锁 regression（v2.1.76+）。

**Kimi Code 采用 Eager Tools（ eager 加载）架构。** 所有工具在会话启动时就已加载完毕，`SearchWeb`、`FetchURL`、`Agent` 等工具与 `Bash`、`ReadFile` 等核心工具一视同仁。在 `--print` 模式下，只要配置了相应的服务（如 `services.moonshot_search`），这些工具就能正常工作，不存在 deferred tool 的加载死锁问题。

这一架构差异的深远影响体现在：Kimi CLI 的 `--print` 模式与交互式模式在工具可用性上几乎完全等价；而 Claude CLI 的 `-p` 模式与交互式模式在 deferred tools 上存在功能断裂。

### 1.3 Headless 模式的设计差异

**Claude Code `-p` 模式**的设计定位是"print/headless"，通过 `--output-format json/stream-json` 输出结构化数据。但该模式在 v2.1.76 后引入了 deferred tool 死锁，使得其 headless 能力出现功能性 regression。

**Kimi Code `--print` 模式**的设计同样面向自动化场景，但实现更为稳健。根据官方文档，`kimi --print` 具有以下特性：非交互式执行（自动退出）；隐式启用 `--afk` 模式（所有工具自动批准，`AskUserQuestion` 自动 dismiss）；支持 `text` 和 `stream-json` 输出格式；支持通过命令行参数（`-p`）或 stdin pipe 传递输入。关键差异在于：**Kimi 的 `--print` 模式隐式启用的是 `--afk` 而非 `--yolo`**，这意味着它不仅自动批准工具调用，还会自动 dismiss 用户提问，真正实现"无人值守"。

## 2. Kimi CLI Headless 模式（--print）深度分析

### 2.1 --print 模式的核心特性

Kimi Code CLI 的 `--print` 模式是为程序化集成而设计的第一等公民功能，而非交互式模式的简单降级。

#### 2.1.1 隐式启用 --afk 模式（完全无人值守）

根据 Kimi CLI v1.40.0 的更新日志，`--print` 模式现在使用 runtime AFK 行为（而非 yolo），与其非交互式执行模型匹配。这意味着在 `--print` 模式下：所有工具调用自动批准；`AskUserQuestion` 被自动 dismiss，模型收到 "Running in afk mode. No user is present. Make your own decision." 的固定响应；Plan 模式的进入和退出也自动处理。这与 Claude Code 的 `--permission-mode bypassPermissions` 相当，但语义更精确——AFK 明确表示"用户不在场"，而 bypassPermissions 仅表示"跳过权限检查"。

#### 2.1.2 输入方式：命令行参数 -p 与 stdin pipe

Kimi CLI 提供两种输入方式：通过 `-p`（或 `-c`）命令行参数直接传递 prompt：`kimi --print -p "List all Python files"`；通过 stdin pipe 传递：`echo "Explain this code" | kimi --print`。支持 `--input-format=stream-json` 接收 JSONL 格式的多轮对话输入。这为程序化集成提供了灵活性：对于简单任务，使用 `-p` 参数完全避免 stdin pipe 问题；对于多轮对话，使用 `--input-format=stream-json` 通过 pipe 传递结构化消息。

#### 2.1.3 输出格式：text vs stream-json

`--output-format=text`（默认）：纯文本输出，适合简单脚本集成。`--output-format=stream-json`：JSONL 格式（每行一个 JSON 对象），适合复杂程序化集成。`--final-message-only`：仅输出最终的助手消息，跳过中间的工具调用过程。`--quiet` 是 `--print --output-format text --final-message-only` 的快捷方式。stream-json 的输出示例：
```jsonl
{"role":"assistant","content":"Let me check the current directory.","tool_calls":[{"type":"function","id":"tc_1","function":{"name":"Shell","arguments":"{\"command\":\"ls\"}"}}]}
{"role":"tool","tool_call_id":"tc_1","content":"file1.py\nfile2.py"}
{"role":"assistant","content":"There are two Python files."}
```

### 2.2 工具在 --print 模式下的可用性

#### 2.2.1 核心工具：与交互模式完全等价

`Shell`、`ReadFile`、`WriteFile`、`StrReplaceFile`、`Glob`、`Grep` 等核心文件/系统工具在 `--print` 模式下与交互式模式完全等价。它们 eagerly loaded，不存在任何加载问题。

#### 2.2.2 SearchWeb 工具：需要配置搜索服务

`SearchWeb` 工具在 Kimi CLI 中不是 deferred tool，而是一个常规工具，需要在配置文件中显式启用。配置方式（`~/.config/kimi/config.toml`）：
```toml
[services.moonshot_search]
base_url = "https://api.moonshot.cn/v1"
api_key = "your-search-api-key"
```
当通过 `/login` 命令登录 Kimi Code 平台时，搜索和抓取服务会自动配置。工具参数包括：`query`（搜索关键词）、`limit`（结果数量，默认 5，最大 20）、`include_content`（是否包含页面内容，默认 false）。**关键优势**：由于不是 deferred tool，`SearchWeb` 在 `--print` 模式下完全可用，不会出现 Claude CLI 那样的间歇性死锁。

#### 2.2.3 FetchURL 工具：本地 HTTP + trafilatura 提取

`FetchURL` 工具抓取网页内容并提取主要文本。实现特点：优先使用配置的 `moonshot_fetch` 服务（如果可用）；否则使用本地 HTTP 请求 + `trafilatura` 内容提取；返回元数据（标题、作者、日期等）和提取的正文。工具参数仅需要 `url`。与 Claude 的 WebFetch 类似，但 Kimi 的实现是 eagerly loaded 的常规工具，在 `--print` 模式下完全可靠。

#### 2.2.4 Agent 子代理工具：支持 foreground + background 模式

Kimi CLI 的 `Agent` 工具在 `--print` 模式下可用，且支持 `run_in_background=true` 参数。子代理类型包括：`coder`（通用软件工程）、`explore`（快速只读代码探索）、`plan`（实现规划与架构设计）。子代理与父代理共享 `ApprovalState`（通过 `Runtime.copy_for_subagent` 使用 `approval=self.approval.share()`），因此根会话开启 yolo/afk 时，子代理行为完全一致。这意味着在 `--print` 模式下 spawn 的子代理也能自动批准工具调用，无需交互式确认。

### 2.3 权限模型：--yolo vs --afk 的精确语义

Kimi CLI v1.40.0 对权限模型进行了重要重构，将"自动批准"和"无人值守"分离为两个独立的概念，这比 Claude CLI 的单一 `--permission-mode` 更精确。

| 模式 | 自动批准工具 | 自动 dismiss AskUserQuestion | 适用场景 |
|------|------------|---------------------------|---------|
| **--yolo** | 是 | 否（用户仍可被提问） | 用户在场但不想每次确认 |
| **--afk** | 是 | 是（模型自己做决定） | 真正的无人值守/CI/CD |
| **--print** | 是（隐式 afk） | 是（隐式 afk） | 程序化自动化 |

Claude CLI 的对比：`--permission-mode default`：每次工具调用都提示确认；`--permission-mode acceptEdits`：仅文件编辑自动批准；`--permission-mode bypassPermissions`：所有工具自动批准，但 AskUserQuestion 的行为在 `-p` 模式下不明确；`--dontAsk`：自动拒绝所有需要 "ask" 的工具（包括 WebSearch）；`--dangerously-skip-permissions`：跳过所有权限检查的 flag。Kimi 的分离语义更清晰：`--yolo` 是"信任但保持沟通"，`--afk` 是"完全放手"。

## 3. Kimi Agent SDK 与 Claude Agent SDK 对比

### 3.1 SDK 架构对比

| 特性 | Kimi Agent SDK | Claude Agent SDK |
|------|---------------|------------------|
| **语言支持** | Go, Node.js, Python | TypeScript, Python |
| **核心抽象** | Session → Turn → Event | query() / ClaudeSDKClient |
| **安装包** | `@moonshot-ai/kimi-agent-sdk` | `@anthropic-ai/claude-agent-sdk` |
| **底层通信** | Wire 协议（stdin/stdout JSONL） | stdin/stdout stream-json |
| **依赖要求** | zod (peer dependency) | 无特殊 peer dependency |
| **子代理支持** | SubagentEvent 实时流 | query() 模式 Agent tool bug |
| **会话恢复** | `listSessions` + `parseSessionEvents` | `--continue` / `--resume` |
| **可配置 executable** | `executable` 选项 | `executable` 选项 |

### 3.2 Kimi SDK 的 Session/Turn/Event 流式架构

Kimi Agent SDK 采用更优雅的流式架构：

```typescript
import { createSession } from '@moonshot-ai/kimi-agent-sdk';

const session = createSession({
  workDir: '/path/to/project',
  model: 'kimi-latest',
  thinking: true,
  yoloMode: true,      // 自动批准工具调用
  executable: 'kimi',  // CLI 可执行文件路径
});

// 每个 prompt 创建一个 Turn
const turn = session.prompt('Search the web for React 19 features');

// 通过 async iterator 消费事件流
for await (const event of turn) {
  if (event.type === 'ContentPart' && event.payload.type === 'text') {
    process.stdout.write(event.payload.text);
  }
  if (event.type === 'ToolCall') {
    console.log(`[Tool] ${event.payload.name}:`, event.payload.arguments);
  }
  if (event.type === 'SubagentEvent') {
    console.log(`[Subagent] ${event.payload.agent_id}: ${event.payload.event.type}`);
  }
  if (event.type === 'StatusUpdate') {
    const { token_usage } = event.payload;
    if (token_usage) {
      console.log(`Tokens: ${token_usage.input_other} in, ${token_usage.output} out`);
    }
  }
}

// 获取最终结果
const result = await turn.result;
await session.close();
```

关键设计优势：Session 维护持久状态（上下文、历史、配置）；Turn 代表单次对话回合，可独立中断（`turn.interrupt()`）；Event 流提供细粒度的实时反馈（工具调用、子代理事件、token 用量、审批请求等）。

### 3.3 Claude SDK 的 query() 与 ClaudeSDKClient 模式

Claude Agent SDK 提供两种 API：

**`query()` 模式**：
```typescript
for await (const message of query({ prompt: "...", options: { ... } })) {
  // message.type: "system" | "assistant" | "tool_use" | "tool_result" | "result"
}
```
已知 bug：TypeScript 版本 `query()` 模式下 `Agent` tool 返回 "Unknown tool: Agent" 错误。

**`ClaudeSDKClient` 模式**：Python 版本提供，支持 Agent tool，但 TypeScript 版本缺乏此模式的对等实现。

### 3.4 子代理事件的差异：SubagentEvent vs 无内置事件

**Kimi SDK 原生支持 SubagentEvent**：
```typescript
for await (const event of turn) {
  if (event.type === 'SubagentEvent') {
    const { parent_tool_call_id, event: subEvent } = event.payload;
    // 实时监控子代理状态：spawn、step、tool_call、completion
  }
}
```
Kimi Wire 协议 v1.6 为子代理事件定义了专门的事件类型（`SubagentEvent`），包含 `agent_id`、`subagent_type`、`parent_tool_call_id` 等元数据。

**Claude SDK 缺乏对等机制**。在 `query()` 模式下，子代理的活动被封装在 `tool_use` / `tool_result` 消息中，没有独立的子代理生命周期事件流。需要通过解析 `tool_use` 的输出来推断子代理状态。

## 4. Bun Spawn 兼容性对比

### 4.1 Bun stdin pipe 问题的共同影响

Bun 的 `child_process.spawn()` 在 ARM64 架构（Apple Silicon、ARM64 Linux 容器）上存在已知的 stdin pipe flush 缺陷。这一问题**同时影响 Claude CLI 和 Kimi CLI**——当通过 `stdio: ["pipe", ...]` 向子进程写入 stdin 数据时，数据可能无法正确到达子进程，导致 hang 或 "Input must be provided" 错误。

### 4.2 Kimi CLI 的规避路径：-p 参数传递

**Kimi CLI 的关键优势：可以通过 `-p` 命令行参数直接传递 prompt，完全避免 stdin pipe。**

```typescript
// 完全避免 stdin pipe - 使用命令行参数
const proc = Bun.spawn({
  cmd: ['kimi', '--print', '-p', 'Search the web for React 19', 
        '--output-format', 'stream-json', '--afk'],
  stdout: 'pipe',
  stderr: 'pipe',
  stdin: 'ignore',  // 关键：stdin 设为 ignore，不使用 pipe
});
```

Claude CLI 虽然也支持 `-p` 参数，但由于其 deferred tool 死锁问题，即使避免了 stdin bug，`-p` 模式下仍无法可靠使用 WebSearch/Agent 等工具。

### 4.3 Claude CLI 的规避限制：-p 下 deferred tool 死锁无法绕过

即使通过 `-p` 参数避免了 stdin pipe 问题，Claude CLI 在 v2.1.76+ 的 `-p` 模式下仍有 deferred tool 的间歇性死锁。这意味着：WebSearch 可能 hang 住（0 字节输出，CPU 0%）；Agent tool 无法使用；WebFetch 间歇性失败。这一问题与输入传递方式无关，是 `--print` 模式控制器的事件循环缺陷。

### 4.4 Kimi CLI 在 Bun 下的推荐配置

```typescript
import { spawn } from 'bun';

// 方式 1: 直接使用 Bun.spawn + 命令行参数（最简单）
async function kimiPrintSimple(prompt: string) {
  const proc = spawn({
    cmd: ['kimi', '--print', '-p', prompt, 
          '--output-format', 'stream-json', '--final-message-only'],
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  });
  
  const output = await new Response(proc.stdout).text();
  const result = output.trim().split('\n').pop(); // 取最后一行
  return JSON.parse(result);
}

// 方式 2: 使用 Agent SDK（推荐用于复杂工作流）
import { createSession } from '@moonshot-ai/kimi-agent-sdk';

async function kimiSDKSearch(topic: string) {
  const session = createSession({
    workDir: process.cwd(),
    model: 'kimi-latest',
    yoloMode: true,
    executable: process.platform === 'darwin' && process.arch === 'arm64' 
      ? 'node'  // ARM64 上可选，强制 node 运行 SDK 后端
      : 'kimi',
  });
  
  const turn = session.prompt(`Search the web for ${topic} and summarize`);
  
  for await (const event of turn) {
    if (event.type === 'ContentPart' && event.payload.type === 'text') {
      process.stdout.write(event.payload.text);
    }
  }
  
  await session.close();
}
```

## 5. Web Search 与 Fetch 工具的对比

### 5.1 实现架构对比

| 特性 | Claude WebSearch | Kimi SearchWeb |
|------|-----------------|----------------|
| **加载机制** | Deferred tool（延迟加载） | Eager tool（即时加载） |
| **服务依赖** | Anthropic 服务端搜索 | 可配置的搜索服务（moonshot_search） |
| **Headless 可用性** | 间歇性死锁（v2.1.76+） | 完全可用 |
| **配置方式** | 无需配置（Anthropic 托管） | 需要配置 `services.moonshot_search` |
| **定价** | 包含在 Claude Pro/API 中 | API 按量计费 |
| **结果数量** | 不可控 | `limit` 参数（1-20） |

| 特性 | Claude WebFetch | Kimi FetchURL |
|------|---------------|---------------|
| **加载机制** | Deferred tool | Eager tool |
| **实现方式** | 本地 Axios + Haiku 总结 | 本地 HTTP + trafilatura 提取 |
| **Headless 可用性** | 间歇性死锁 | 完全可用 |
| **内容提取** | Haiku 模型总结 | trafilatura 库提取 |
| **预批准域名** | 有（code.claude.com 等） | 无（所有域名统一处理） |

### 5.2 Headless 模式下的可靠性对比

**Claude CLI `-p` 模式**：WebSearch 和 WebFetch 属于 deferred tools，在 `-p` 模式下存在间歇性死锁（regression introduced in v2.1.76）。同一 prompt 可能成功也可能 hang，成功率约 60-70%（依赖重试可达 95%）。

**Kimi CLI `--print` 模式**：SearchWeb 和 FetchURL 是 eagerly loaded 的常规工具，在 `--print` 模式下完全可靠。只要配置了搜索服务，成功率接近 100%。

### 5.3 配置复杂度对比

**Claude**：WebSearch 无需额外配置（Anthropic 服务端托管），但受限于 API 可用性和 deferred tool 死锁。

**Kimi**：需要在配置文件中添加搜索服务：
```toml
[services.moonshot_search]
base_url = "https://api.moonshot.cn/v1"
api_key = "your-api-key"

[services.moonshot_fetch]
base_url = "https://api.moonshot.cn/v1"
api_key = "your-api-key"
```
或者通过 `kimi /login` 登录 Kimi Code 平台时自动配置。额外的配置步骤换来了 headless 模式下的完全可靠性。

## 6. 子代理（Subagent/Agent Tool）的对比

### 6.1 Claude Agent Tool：context fork + 嵌套限制

Claude CLI 的 `Agent` tool（原 `Task` tool）通过 context fork 创建子代理。限制包括：子代理不能 spawn 自己的子代理（防止无限递归）；TypeScript SDK `query()` 模式下 Agent tool 有 "Unknown tool" bug；背景子代理（`run_in_background=true`）工具集受限（仅 7 个工具 vs 前台子代理的 76+）。

### 6.2 Kimi Agent Tool：background mode + 统一 ApprovalState

Kimi CLI 的 `Agent` 工具特性：三种内置类型：`coder`、`explore`、`plan`；支持 `run_in_background=true` 后台运行；子代理与父代理共享 `ApprovalState`（`Runtime.copy_for_subagent` 使用 `approval=self.approval.share()`）；在 `--print` 模式下，由于根会话隐式启用 afk，子代理也自动 afk；Wire 协议 v1.6 提供 `SubagentEvent` 事件流，可实时监控子代理状态。

### 6.3 程序化场景下的子代理可用性

| 场景 | Claude CLI | Kimi CLI |
|------|-----------|----------|
| `-p` / `--print` 模式 spawn 子代理 | **不可用**（Agent tool 不工作） | **可用**（Agent tool 正常工作） |
| TypeScript SDK 子代理 | Bug（"Unknown tool"） | 正常（SubagentEvent 流） |
| 后台子代理工具集 | 受限（仅 7 工具） | 完整（继承父会话工具） |
| 子代理嵌套 | 不支持 | 不支持（共同限制） |
| 子代理状态监控 | 无专门事件 | SubagentEvent 实时流 |

## 7. 实践建议与代码示例

### 7.1 Kimi CLI + Bun spawn 的最佳实践

```typescript
// 最简可靠配置：使用命令行参数传递 prompt，避免 stdin pipe
import { spawn } from 'bun';

async function kimiSearch(query: string): Promise<string> {
  const proc = spawn({
    cmd: [
      'kimi', '--print', 
      '-p', `Search the web for "${query}" and provide a summary with sources`,
      '--output-format', 'stream-json',
      '--final-message-only',
    ],
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',  // 关键：不使用 stdin pipe
  });

  const output = await new Response(proc.stdout).text();
  const lastLine = output.trim().split('\n').pop();
  
  if (!lastLine) throw new Error('Empty output from kimi');
  
  const data = JSON.parse(lastLine);
  return data.content || data.result || '';
}

// 使用示例
const result = await kimiSearch('Python 3.13 new features');
console.log(result);
```

### 7.2 Kimi Agent SDK 完整工作流

```typescript
import { createSession } from '@moonshot-ai/kimi-agent-sdk';

async function researchWithSubagents(topic: string) {
  const session = createSession({
    workDir: process.cwd(),
    model: 'kimi-latest',
    thinking: true,
    yoloMode: true,  // 自动批准所有工具调用
  });

  const turn = session.prompt(
    `Research "${topic}". Search the web for latest information, ` +
    `then spawn a subagent to analyze the codebase for relevant implementation examples. ` +
    `Return a comprehensive report.`
  );

  for await (const event of turn) {
    switch (event.type) {
      case 'ContentPart':
        if (event.payload.type === 'text') {
          process.stdout.write(event.payload.text);
        }
        break;
      
      case 'ToolCall':
        console.log(`\n[Tool: ${event.payload.name}]`);
        break;
      
      case 'ToolResult':
        console.log(`[Result: ${event.payload.content?.substring(0, 100)}...]`);
        break;
      
      case 'SubagentEvent':
        const { agent_id, subagent_type, event: subEvent } = event.payload;
        console.log(`[Subagent ${agent_id} (${subagent_type}): ${subEvent.type}]`);
        break;
      
      case 'StatusUpdate':
        const { token_usage } = event.payload;
        if (token_usage) {
          console.log(`\n[Tokens: ${token_usage.input_other} in / ${token_usage.output} out]`);
        }
        break;
    }
  }

  const result = await turn.result;
  await session.close();
  return result;
}
```

### 7.3 Claude CLI 的降级方案（如果必须使用）

如果由于团队约束必须使用 Claude CLI，建议：使用 Agent SDK `query()` + `executable: "node"` 绕过 Bun stdin bug；避免使用 WebSearch/WebFetch/Agent deferred tools；使用 `Bash` tool + `curl` 作为网络访问的 workaround；实现重试机制（60 秒超时 + 最多 3 次重试）。

## 8. 总结：选择矩阵

| 需求场景 | 推荐方案 | 理由 |
|---------|---------|------|
| **Bun spawn + WebSearch + 子代理** | **Kimi CLI** | Kimi `--print` 模式下所有工具可用，Claude `-p` 模式下 deferred tools 死锁 |
| **完全无人值守 CI/CD** | **Kimi CLI `--print --afk`** | Kimi 的 afk 语义更精确，Claude 的 dontAsk 会拒绝 WebSearch |
| **复杂多轮对话自动化** | **Kimi Agent SDK** | Session/Turn/Event 架构更清晰，子代理事件可监控 |
| **开源/自托管需求** | **Kimi CLI** | Apache 2.0 + 模型权重开源 |
| **已有 Claude 生态投资** | **Claude Agent SDK** | 如果不需要 deferred tools，SDK 是可靠选择 |
| **最大上下文窗口** | **Claude Opus 4.6** | 1M tokens vs Kimi 262K |
| **最低 API 成本** | **Kimi K2.5** | $0.60/$2.50 vs Claude $5/$25 每百万 token |
| **中文场景** | **Kimi CLI** | 中文文档更完善，模型中文能力更强 |

**最终结论**：对于"在 Bun spawn 模式下使用 Web Search 和子代理"这一具体需求，**Kimi CLI 是当前更可靠、更干净的选择**。其 eagerly loaded 的工具架构避免了 deferred tool 死锁，`--print` 模式配合 `-p` 命令行参数完全规避了 stdin pipe 问题，Agent SDK 的 SubagentEvent 流提供了更好的可观测性。如果团队已经深度投入 Claude 生态，可以考虑使用 Claude Agent SDK 的 `query()` 模式并规避 deferred tools，但需接受功能限制和平台风险。