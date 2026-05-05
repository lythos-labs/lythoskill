TL;DR: 在 Bun spawn 模式下直接运行 `claude -p` 并调用 WebSearch、WebFetch 等 deferred tool 存在**系统性兼容性问题**，包括 Bun 的 stdin pipe 处理 bug、Claude CLI 的嵌套检测机制、以及 `-p` 模式下 deferred tool 的间歇性死锁。推荐**使用 Agent SDK 直接调用 `query()`** 替代 Bun spawn CLI 的方案，这能提供完整的工具访问能力并避免子进程管理的复杂性。如果必须使用 CLI spawn，应通过 PTY（如 `node-pty`）分配伪终端或使用 `executable: "node"` 强制 Node.js 运行时。

---

# Bun Spawn 模式下运行 Claude Code CLI 的 Web Search 工具：深度调研报告

## 1. 核心问题概述

在 Bun 运行时环境中通过子进程调用 Claude Code CLI（`claude -p`）并期望其执行 WebSearch、WebFetch 等网络工具时，开发者会面临一个多层叠加的技术障碍矩阵。这些障碍并非来自单一组件的缺陷，而是源自 **Bun 的进程间通信实现**、**Claude Code CLI 的无头模式设计限制**、以及 **Anthropic Agent SDK 的架构选择**三者的交叉作用。理解这些交互的复杂性是设计可靠自动化方案的前提。本报告通过系统性调研，梳理了从环境变量冲突到工具可用性缺失的完整问题链，并提供了四种可行的架构替代方案。核心发现可归纳为三个层面：Bun 作为父进程在标准输入输出管道管理上存在已确认的 platform-specific 缺陷，特别是在 ARM64 架构下子进程 stdin 无法正常 flush；Claude Code CLI 为防止会话嵌套设置的多重环境变量检测机制会阻断从任何父 Claude 进程发起的合法子进程调用；而最关键的，`claude -p` 无头模式在 2026 年 3 月后引入了对 deferred tools（包括 WebSearch、WebFetch、Agent、Skill、ToolSearch）的间歇性死锁回归，使得这些工具在自动化场景下的可用性降至"不稳定"状态。这些发现直接指向一个结论：直接使用 `Bun.spawn()` 启动 `claude -p` 来执行需要网络工具的任务，是一个需要大量 workaround 才能勉强运行的脆弱方案，而非生产级别的可靠选择。

### 1.1 问题定义：Bun spawn + claude -p + WebSearch 的三重交叉

该问题的复杂性源于三个技术层面的交叉叠加，每一层都引入了独立的约束和潜在的故障点。首先，**Bun 的 spawn 实现**并非 Node.js 的 drop-in replacement，尤其是在处理需要交互式 TTY 的子进程时存在显著差异。Bun 的 `child_process` 模块在 stdin 管道管理上有已知的平台特定缺陷：在 ARM64 Linux 和 macOS 上，通过 `Bun.spawn()` 启动的子进程可能出现 stdin 数据无法正确 flush 的情况，导致子进程永远等待输入而 hang 住。这一问题直接影响到向 `claude -p` 传递 prompt 和后续交互数据。其次，**Claude Code CLI 的嵌套检测机制**会在启动时检查 `CLAUDECODE`、`CLAUDE_CODE_ENTRYPOINT`、`CLAUDE_CODE_SESSION` 等多个环境变量，如果检测到任何一项，就会拒绝启动以防止会话嵌套。这意味着从已有的 Claude Code 会话（包括通过 Agent SDK 创建的会话）中再 spawn 一个 `claude` 进程会立即失败。第三，**`claude -p` 无头模式的工具可用性限制**是最核心的功能缺失。WebSearch 和 WebFetch 属于 deferred tools（延迟加载工具），它们在交互式会话中按需加载，但在 `-p` 模式下，由于缺少交互式的权限确认流程和工具初始化机制，这些工具要么完全不可用，要么在调用时导致间歇性死锁（regression introduced in v2.1.76）。三重交叉的结果是：即使在 Bun 中成功启动了 `claude -p` 子进程，也无法可靠地使用 WebSearch 等核心功能，使得整个方案在实践层面不可行。

### 1.2 关键结论速览

经过对 GitHub Issues、官方文档、社区实践和源码泄露信息的综合分析，本调研得出以下关键结论。**结论一：Bun spawn 存在已确认的 stdin pipe 缺陷。** 在 ARM64 架构（包括 Apple Silicon 和 ARM64 Linux 容器）下，Bun 作为父进程通过 pipe 向子进程传递 stdin 时存在 flush 问题，这会导致 `claude -p` 子进程 hang 住或报 "Input must be provided" 错误。强制使用 `executable: "node"` 或切换到 Node.js 的 `child_process.spawn` 可以规避此问题。如果坚持使用 Bun，需要设置 `stdio: ["ignore", "pipe", "pipe"]` 并通过命令行参数而非 stdin 传递输入。**结论二：嵌套检测需要系统性清理环境变量。** 从任何已存在的 Claude Code 会话中 spawn 子 CLI 进程时，必须显式清除 `CLAUDECODE`、`CLAUDE_CODE_ENTRYPOINT`、`CLAUDE_CODE_SESSION`、`CLAUDE_CODE_PARENT_SESSION` 以及 `CLAUDE_CODE_OAUTH_TOKEN` 等环境变量。仅清除 `CLAUDECODE` 是不够的，残留的其他变量可能导致认证失败或行为异常。**结论三：`-p` 模式下 deferred tools 存在间歇性死锁。** 自 Claude Code v2.1.76 起，`claude -p` 模式下调用 WebSearch、WebFetch、Agent、Skill 等 deferred tools 会导致间歇性死锁（0 字节输出，进程挂起）。这是一个已确认的 regression，影响所有依赖这些工具的自动化工作流。**结论四：Agent SDK 的 `query()` 模式有 Agent tool 的执行 bug。** TypeScript 版本的 Agent SDK 在 `query()` 模式下，虽然会在工具列表中列出 `Agent` tool，但实际调用时返回 "Unknown tool: Agent" 错误。Python 版本的 `ClaudeSDKClient` 没有此问题。这意味着在 TypeScript 中通过 Agent SDK 使用子代理功能需要额外的 workaround。**结论五：存在多个成熟替代方案。** 按推荐程度排序：直接使用 Agent SDK `query()` 调用（无需 spawn）、使用 `claude-code-controller` 通过 PTY 和文件系统协议控制真实 CLI 实例、在交互式 Claude 会话中使用内置 `Agent` tool 进行任务委托、或使用 `node-pty` 为 `claude -p` 分配伪终端。

### 1.3 推荐方案排序

基于稳定性、功能完整性和实现复杂度的综合评估，以下是针对"在 Bun 环境中程序化使用 Claude Code 的 Web Search 能力"这一需求的推荐方案排序。**首选方案：直接使用 Agent SDK 的 `query()` 函数。** 这是最干净、最可靠的方案。`@anthropic-ai/claude-agent-sdk` 提供了对 WebSearch、WebFetch 等所有内置工具的完整访问，无需手动管理子进程，无需处理 TTY/PTY 问题，且天然支持流式输出。关键点：在 Bun 环境下使用时应显式设置 `executable: "node"` 以避免 stdin pipe bug，或者在 Node.js 进程中运行 Agent SDK 代码。此方案绕过了 `-p` 模式的所有限制，直接使用 Anthropic 的代理引擎。详细的工具可用性矩阵对比和四种架构的深入分析将在后续章节展开，帮助读者根据具体场景做出最合适的技术选型。

| 排名 | 方案 | 核心优势 | 主要限制 | 适用场景 |
|------|------|---------|---------|---------|
| **1** | **Agent SDK `query()`** | 无需 spawn 管理；完整工具访问；流式输出；无 TTY 问题 | TypeScript 中 Agent tool 有 bug；SDK 本身 spawn CLI 作为后端 | 大多数自动化任务 |
| **2** | **`claude-code-controller`** | 运行真实完整 CLI；所有工具可用；持久化会话；Web UI | 需要额外部署；架构较复杂 | 需要完整交互能力的自动化 |
| **3** | **PTY + `claude -p`** | 使用 `-p` 但获得完整 TTY 支持 | 需要 node-pty；Bun 兼容性仍需处理；`-p` deferred tool bug | 必须控制 CLI 的场景 |
| **4** | **交互式会话中的 `Agent` tool** | 利用内置子代理；无需额外进程 | 需要人工启动交互会话；子代理不能嵌套 | 人机协作工作流 |
| **5** | **直接使用 `Bun.spawn claude -p`** | 最直接；零依赖 | 工具受限；Bun stdin bug；嵌套检测；不稳定 | 简单只读任务 |


## 2. Bun Spawn 与 Claude CLI 的兼容性分析

Bun 作为 JavaScript 运行时以其高性能和 Node.js 兼容性而闻名，但在处理需要复杂进程间交互的场景时，尤其是 spawn 一个交互式 CLI 工具（如 Claude Code）时，其兼容性问题会变得显著。本节深入分析 Bun 的 `spawn` 实现与 Claude Code CLI 在多个维度的冲突，包括已知的 stdin pipe 缺陷、TTY/PTY 需求、嵌套检测机制，以及 stdout 的解析问题。这些问题共同构成了直接使用 `Bun.spawn` 启动 `claude -p` 的技术壁垒。

### 2.1 Bun spawn 的已知问题

Bun 的进程管理在高吞吐量场景下表现优异，但在处理需要精细 stdio 控制的子进程时，与 Node.js 存在 behavior differences，其中一些已被确认为 bugs 并有对应的 workaround。

#### 2.1.1 stdin pipe 处理缺陷（stdin flush 问题）

**这是最关键的技术障碍。** 多个独立报告确认，在 ARM64 架构（Apple Silicon Mac 和 ARM64 Linux 容器）下，Bun 作为父进程通过 `stdio: ["pipe", ...]` 向子进程写入 stdin 数据时，存在 flush 时序问题。具体表现为：Bun 的 `child.stdin.write()` 和 `child.stdin.end()` 调用可能在子进程实际读取之前完成，导致子进程 hang 住等待输入，或者父进程在子进程尚未处理完输入时就关闭了管道。在 Claude Code 的场景下，这表现为 spawn 了 `claude` 进程但它立即报错 "Input must be provided" 然后退出，或者没有任何输出地 hang 住直到超时。问题根因在于 Bun 的异步管道写入机制与 ARM64 上的底层系统调用交互存在 race condition。这一现象在 Archon 项目的 Issue #1378 中有详细记录：当 Claude Agent SDK（在 Bun 环境下）尝试 spawn CLI 子进程时，ARM64 Docker 中的会话永远 hang 住。诊断证据清楚表明：直接运行 `node cli.js --print` 可以工作，但通过 Bun spawn 同样命令则 hang 住；而在 SDK 选项中显式设置 `executable: "node"` 强制使用 Node.js 作为运行时后，问题立即消失。

#### 2.1.2 ARM64 Linux 上的 stdin 数据无法到达子进程

该问题是 2.1.1 缺陷的特定表现平台。在 ARM64 Linux（包括 Docker on Apple Silicon）上，Bun 的 `spawn` 实现的 stdin 管道问题尤为严重。Archon 项目的调研数据显示，当 SDK 默认使用 `bun` 作为 executable 时，在 ARM64 Linux 容器上 spawn 的 Claude CLI 子进程"never receives its input and hangs indefinitely"。根本原因在于 Bun 的 `child_process` stdin pipe 实现没有正确处理平台特定的 buffer flush 语义。在 x86_64 Linux 上这一问题可能不那么明显，但在 ARM64 上由于不同的内核系统调用路径和内存排序保证，race condition 被放大到几乎 100% 复现。对于需要在 ARM64 服务器或 Apple Silicon 开发机上部署的自动化工作流，这是一个阻断性问题。**解决方案是在调用 Agent SDK 时显式设置 `executable: "node"`：** `query({ prompt: "...", options: { executable: "node", ... } })`。这会强制 SDK 使用 Node.js 而非 Bun 来运行其后端的 CLI 进程，从而完全绕过 Bun 的 stdin pipe 问题。对于直接使用 `Bun.spawn()` 的情况，替代方案是将输入数据写入临时文件然后通过 `--prompt-file` 参数传递，或者通过命令行参数直接传递 prompt（如果长度允许），避免使用 stdin pipe。

#### 2.1.3 Bun 的 TTY/PTY 支持限制

Claude Code CLI 是一个交互式 TUI（Text User Interface）应用，它依赖终端的控制序列来渲染界面、处理键盘输入、执行行编辑等。当通过 `claude -p` 运行时，虽然不渲染 TUI，但某些内部机制（尤其是涉及子代理 spawn、权限提示模拟、以及某些工具的输出渲染）仍然假设自己运行在一个 TTY 环境中。Bun 的 `Bun.spawn()` 不提供 PTY（伪终端）分配能力，它只能创建管道（pipe）或继承（inherit）父进程的标准流。这意味着当 `claude -p` 内部的某些代码路径尝试执行 `process.stdin.isTTY` 检查或调用需要 TTY 的终端 API 时，会失败或表现异常。相比之下，`node-pty` 这样的库可以在 Node.js 中分配一个完整的 PTY，让子进程认为自己连接到了一个真实终端。`claude-code-controller` 项目正是利用了这一技术来完整控制 Claude Code 实例。对于 Bun 用户，一个可行的 workaround 是在 spawn 之前使用 `expect` 命令包装：`expect -c 'spawn claude -p "your prompt"; interact'`。`expect` 会为子进程分配一个 PTY，使其能够正确检测 TTY 并执行所有需要终端交互的代码路径。

#### 2.1.4 stdout 继承与捕获的冲突

当使用 `stdio: 'inherit'` 让子进程直接使用父进程的 stdout/stderr 时，在 Bun 下可能遇到输出冲突。Bun 的 `process.stdin` 实现有一个已知问题：即使移除了所有 `'readable'` 事件监听器，Bun 仍会继续从 fd 0 读取数据。当随后 spawn 一个 `stdio: 'inherit'` 的子进程时，父进程和子进程会竞争同一个 stdin 流，导致子进程接收到的输入不完整或出现乱序。这个问题在需要向子进程传递交互式输入的场景下尤为致命。对于 `claude -p` 这种非交互但仍需读取输入的模式，虽然竞争 stdin 的问题不那么直接，但 stdout 的继承模式也有其局限：当父进程（你的 Bun 脚本）需要同时捕获子进程的输出进行处理时，`inherit` 模式无法满足需求，而 `pipe` 模式又面临前述的 stdin bug。这形成了一个两难：既需要向子进程传递输入（pipe），又需要捕获子进程的输出（pipe），但 pipe 模式的 stdin 在 Bun 下有 bug。

### 2.2 Claude CLI 的嵌套检测机制

Claude Code CLI 设计为不允许多个实例在同一终端会话中嵌套运行，这是为了防止资源冲突（如共享的会话状态、配置文件锁、API 配额竞争）和意外的递归调用。该机制通过检查一组特定的环境变量来实现。

#### 2.2.1 CLAUDECODE=1 环境变量检测

这是最主要的嵌套检测信号。当 Claude Code CLI 启动时，它会向自身的环境中注入 `CLAUDECODE=1`。任何从该进程派生的子进程都会继承这个环境变量。当子进程中再次尝试启动 `claude` 时，新实例检测到 `CLAUDECODE=1` 就会立即拒绝启动，并输出错误信息："Claude Code cannot be launched inside another Claude Code session. Nested sessions share runtime resources and will crash all active sessions."。这个检测机制在 CLI v2.1.41 中被引入，并在后续版本中持续存在。这是一个全局性的硬性限制，无论子进程的启动意图是交互式还是会话嵌套。即使父进程是一个通过 Agent SDK 创建的完全独立的代理会话，只要它底层是通过 Claude CLI 实现的，就会设置这个标志。这意味着在使用 Agent SDK 的 `query()` 或 `ClaudeSDKClient` 时，如果需要在同一个工作流中再 spawn 一个独立的 `claude` CLI 进程，必须显式处理这个环境变量。多个 Issue 报告了这个问题：从 Claude Code 的 Bash tool 中运行使用 Agent SDK 的脚本会失败，从 Claude Code hooks/plugins 中调用 SDK 会失败，以及从任何设置了 `CLAUDECODE` 的环境中 spawn Claude 都会失败。

#### 2.2.2 CLAUDE_CODE_ENTRYPOINT 及其他检测变量

除了 `CLAUDECODE` 之外，Claude Code 还设置了其他用于追踪会话来源的环境变量，这些变量同样会影响子进程的行为。这些变量共同构成了一个嵌套检测环境矩阵，需要在 spawn 子进程时系统性清理。特别是 `CLAUDE_CODE_OAUTH_TOKEN` 和 `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`，如果从 Claude Desktop 启动的 shell 中运行程序，这些变量会指示 CLI 使用 Desktop 提供的 OAuth token 而非本地存储的凭证，当 token 过期或不匹配时会导致 401 认证失败。完整的环境变量清理清单包括：必须清除 `CLAUDECODE`（嵌套检测主开关）、`CLAUDE_CODE_ENTRYPOINT`（入口点追踪）、`CLAUDE_CODE_SESSION`（会话 ID）、`CLAUDE_CODE_PARENT_SESSION`（父会话 ID）、`CLAUDE_CODE_OAUTH_TOKEN`（可能导致认证冲突的 token）、`CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`（主机管理标志）。仅清除 `CLAUDECODE` 可能不足以解决所有问题，特别是当 spawn 发生在 Claude Desktop 启动的 shell 中，或者父进程本身是通过 Claude Agent SDK 创建的 CLI 实例时。系统性清理所有 `CLAUDE_CODE_*` 变量是最安全的做法。

#### 2.2.3 嵌套检测的绕过方法

目前 Claude Code CLI 没有提供 `--allow-nested` 或类似的官方 flag 来显式跳过嵌套检测。社区中讨论过的 workaround 主要有两种：环境变量清理和工作目录隔离。最可靠的方法是在 spawn 子进程之前，显式地将相关环境变量设为空字符串或从 `env` 对象中删除。如果使用的是 Agent SDK，可以通过 `env` 选项传递覆盖值：`options: { env: { CLAUDECODE: "", CLAUDE_CODE_ENTRYPOINT: "", CLAUDE_CODE_SESSION: "" } }`。对于直接使用 `Bun.spawn` 或 `child_process.spawn` 的情况，应该在传递给子进程的 `env` 对象中排除这些变量。构建干净环境对象的示例代码如下：首先复制 `process.env` 到一个新对象，然后遍历并删除所有以 `CLAUDE_CODE_` 开头的键（保留可能需要的例外如 `CLAUDE_CODE_GIT_BASH_PATH`），最后将清理后的对象作为 `env` 选项传递给 spawn。这种方法比逐个变量处理更 robust，能防止未来新增检测变量导致的意外失败。有用户在 GitHub 上提议添加 `--allow-nested` CLI flag，但截至报告日期，Anthropic 尚未采纳此建议。因此，环境变量清理是当前唯一可行的绕过方法。

### 2.3 Bun spawn claude -p 的 stdout 处理

当成功启动 `claude -p` 子进程后，需要从其 stdout 中捕获和解析输出。Claude Code 提供了多种输出格式，选择合适的格式对后续处理至关重要。

#### 2.3.1 --output-format json 的输出捕获

`--output-format json` 是 `claude -p` 最常用的输出模式。在这种模式下，Claude Code 会在任务完成后输出一个单一的 JSON 对象，包含 `result`（文本结果）、`session_id`、`usage`（token 使用统计）、`structured_output`（如果使用了 `--json-schema`）等字段。当通过 `Bun.spawn` 使用 `stdio: [..., "pipe", ...]` 时，这个 JSON 会出现在子进程的 `stdout` 流中。可以使用 `proc.stdout.text()` 或 `proc.stdout.getReader()` 来读取完整输出，然后用 `JSON.parse()` 解析。一个典型的 `Bun.spawn` 调用如下：设置 `cmd: ["claude", "-p", "your prompt", "--output-format", "json", "--dangerously-skip-permissions"]`，`stdout: "pipe"`，`stderr: "pipe"`。等待进程退出后，`const output = await new Response(proc.stdout).text()` 获取输出，`const data = JSON.parse(output)` 进行解析，最后访问 `data.result` 获取结果文本。需要注意的是，如果 Claude Code 在启动过程中输出了任何额外的日志信息（如 hook 执行信息），这些信息可能会混入 stdout 导致 JSON 解析失败。使用 `--output-format stream-json` 模式可以更好地处理这种情况，因为它使用 newline-delimited JSON 格式，每个事件是一行独立的 JSON。

#### 2.3.2 --output-format stream-json 的流式处理

`--output-format stream-json` 模式为每个代理事件（如 assistant message delta、tool use、tool result、system message）输出一行 JSON，这种格式更适合需要实时进度反馈的场景。在 Bun 中可以通过 `ReadableStream` 的 reader 来逐行读取和处理这些事件。流式解析的实现使用 `proc.stdout.getReader()` 获取 reader，然后循环 `reader.read()` 直到 `done`，将每次读取的 `Uint8Array` 解码为字符串并累积到 buffer 中。当 buffer 中包含换行符时，就提取完整行并用 `JSON.parse()` 解析为事件对象。根据 `event.type` 的不同（`assistant`、`tool_use`、`tool_result`、`system` 等），调用相应的处理逻辑。这种模式的优点是能够实时了解代理的工作进度，看到每个工具调用的参数和结果，而无需等待整个任务完成。对于长时间运行的任务（如代码重构、大规模搜索），流式输出能提供更好的用户体验和调试能力。一个完整的流式处理实现可以参考社区分享的代码片段，这些片段展示了如何使用 Node.js 的 `spawn` 配合 stream-json 模式来实现实时输出处理。

#### 2.3.3 非 JSON 输出的解析挑战

如果不指定 `--output-format`，`claude -p` 默认输出纯文本。这种模式下，Claude Code 可能会在输出中包含 TUI 转义序列、颜色代码、进度指示器等 artifacts，使得纯文本输出的解析变得复杂且脆弱。特别是在代理执行了多个工具调用时，输出中可能穿插工具调用的描述性文本（如 "I'll search the web for..."），这些文本与实际结果混在一起，难以用正则表达式可靠地提取。因此，**强烈建议在自动化场景下始终使用 `--output-format json` 或 `stream-json`**，避免解析纯文本输出的不确定性。JSON 格式提供了结构化的、可预测的数据，是程序化集成的最佳选择。


## 3. claude -p 模式下 Tool 的可用性深度调研

`claude -p`（又称 headless 或 print 模式）的设计目标是在非交互式环境中运行 Claude Code，但这一定位导致了其在工具可用性方面与交互式模式存在显著差异。本节深入分析 `-p` 模式下内置工具、deferred tools、以及权限系统的具体行为，揭示 WebSearch 等工具在该模式下的真实可用状态。

### 3.1 内置工具在 -p 模式下的表现

Claude Code 的工具可分为核心工具（core tools）和延迟加载工具（deferred tools）。两类工具在 `-p` 模式下的表现截然不同。

#### 3.1.1 Core Tools (Bash, Read, Edit, Write, Glob, Grep) 的可用性

**核心工具在 `-p` 模式下工作正常。** 这些工具包括 `Bash`（执行 shell 命令）、`Read`（读取文件）、`Edit`（编辑文件）、`Write`（写入文件）、`Glob`（文件模式匹配）和 `Grep`（文本搜索）。它们是 Claude Code 的基础操作能力，不依赖交互式 UI 或延迟加载机制。在 `-p` 模式下，只要通过 `--allowedTools` 或 `--permission-mode bypassPermissions` / `--dangerously-skip-permissions` 授予了权限，这些工具就会被自动批准并执行。它们的输出会通过 stdout/stderr 正常返回，不会出现 hang 或死锁。这些工具的稳定性使得 `-p` 模式适合执行纯本地文件系统操作的任务，如代码重构、测试运行、文件分析等。GitHub Issue #35262 的系统性测试结果证实了这一点："Simple text response (no tools)" 和 "Core tool use (Bash, Read)" 在 `-p` 模式下"Always works"。

#### 3.1.2 Deferred Tools (WebSearch, WebFetch, Agent, Skill, ToolSearch) 的加载机制

**延迟加载工具（deferred tools）在 `-p` 模式下存在严重问题。** 这些工具不会在会话启动时加载到工具列表中，而是在模型首次尝试调用时通过 `ToolSearch` 机制动态解析和加载。这一设计在交互式模式下工作良好，因为 UI 可以处理动态工具发现、权限确认和加载状态提示。但在 `-p` 模式下，缺少了这一交互层后，deferred tools 的加载过程会进入一个不确定状态。根据对 Claude Code 源码泄露信息的分析和多个 GitHub Issue 的报告，deferred tools 的加载依赖于一个异步的初始化流程，该流程在 `-p` 模式下可能因为缺少事件循环的某些交互式假设而永远无法完成。这导致了 GitHub Issue #35262 中描述的"intermittent deadlock"现象：当模型决定使用 WebSearch 或 Agent tool 时，`claude -p` 进程有时会 hang 住，产生 0 字节输出，CPU 占用为 0，表明事件循环卡在了等待某个永远不会完成的异步操作上。

#### 3.1.3 v2.1.76 后 deferred tools 的间歇性死锁问题（回归缺陷）

**这是一个已确认的 regression。** 在 Claude Code v2.1.76（2026 年 3 月 14 日更新）之前，`-p` 模式下使用 deferred tools 是正常工作的。从 v2.1.76 开始，引入了间歇性死锁。该问题的根因被推测为 print 模式控制器中的 event loop / do-while 循环在处理 deferred tool 初始化或 `in_process_teammate` 任务时进入了无限等待状态。问题的间歇性（race condition 特征）使得它特别难以调试和稳定复现：同一 prompt 可能第一次成功，第二次 hang，第三次又成功。影响范围涵盖所有 deferred tools：Agent、Skill、WebSearch、WebFetch、ToolSearch。截至报告日期，官方尚未发布修复。推荐的 workaround 包括：启动检查 + 重试机制（如果 60 秒内无输出则 kill 并重试，最多 3 次，约 95% 可靠性）；限制仅使用核心工具（在 prompt 中明确指示 Claude 只使用 Bash/Read/Write 等核心工具）。对于依赖 WebSearch 的自动化工作流，这一回归使得 `-p` 模式在当前版本（v2.1.76+）下不可靠。

### 3.2 WebSearch 与 WebFetch 的具体实现

Claude Code 的两个网络工具在实现架构上有显著差异，这影响了它们在不同模式下的可用性。

#### 3.2.1 WebSearch：Anthropic 服务器端搜索代理

**WebSearch 完全依赖 Anthropic 的服务端基础设施。** 当 Claude Code 调用 WebSearch 时，它会向 Anthropic API 发送一个工具使用请求，API 端会执行实际的搜索（可能使用 Brave Search 作为后端），然后将搜索结果（标题、URL、摘要）返回。这个过程需要：活跃的 Anthropic API 连接；服务端搜索工具的可用性（对 Bedrock/Vertex 用户可能不可用）；以及在交互式模式下处理服务端响应的 UI 流程。在 `-p` 模式下，虽然 API 调用可以正常进行，但由于 deferred tool 的加载死锁问题，WebSearch 工具本身可能根本无法被调用。即使工具被成功调用，返回的结果格式在 `-p` 模式下也可能与交互式模式不同（例如缺少某些服务端添加的元数据）。此外，对于使用 Bedrock 或 Vertex AI 的用户，WebSearch 工具可能被完全隐藏，因为这些平台不支持 Anthropic 的服务端搜索工具。

#### 3.2.2 WebFetch：本地 Axios + Haiku 模型处理

**WebFetch 的实现与 WebSearch 截然不同，它主要在本地执行。** 当调用 WebFetch 时，Claude Code 使用本地的 Axios HTTP 客户端抓取指定 URL 的内容，然后使用 Claude Haiku 模型对内容进行总结和提取。这一流程的本地执行特性意味着它不依赖 Anthropic 服务端搜索基础设施，理论上在任何 API 后端（Anthropic 直连、Bedrock、Vertex）上都可用。然而，WebFetch 同样是一个 deferred tool，因此在 `-p` 模式下同样受间歇性死锁问题的影响。此外，WebFetch 的权限模型与 WebSearch 不同：对于预批准的域名（如 `code.claude.com`、GitHub、主流文档站点），WebFetch 的 `checkPermissions()` 直接返回 `allow`，无需确认；对于非预批准域名，则返回 `passthrough`，在交互式模式下转为 `ask`（提示用户确认），在 `dontAsk` 模式下转为 `deny`。这一差异解释了为什么在某些配置下 WebFetch 可以工作而 WebSearch 被拒绝。

#### 3.2.3 两工具的权限模型差异（passthrough vs allow）

| 工具 | 权限检查行为 | 预批准域名 | 非预批准域名 | dontAsk 模式下 |
|------|------------|-----------|-------------|--------------|
| **WebSearch** | `passthrough` | N/A | 转为 `ask`（交互式）/ `deny`（dontAsk） | **总是被拒绝** |
| **WebFetch** | `allow`（预批准）/ `passthrough`（其他）| 直接 `allow` | 转为 `ask`（交互式）/ `deny`（dontAsk） | **预批准域名可用** |

这一差异意味着在 `dontAsk` 模式下，WebSearch 完全不可用，而 WebFetch 对预批准域名仍然可用。在 `bypassPermissions` 模式下，两者都应该可用，但仍受 deferred tool 死锁问题影响。

### 3.3 权限系统在 -p 模式下的行为

`-p` 模式下的权限管理是自动化场景的核心关注点，需要精确配置以平衡安全性和执行能力。

#### 3.3.1 --permission-mode bypassPermissions 与 --dangerously-skip-permissions

`bypassPermissions` 是最高权限模式，跳过所有权限检查。在 `-p` 模式下使用此模式时，需要同时传递 `--dangerously-skip-permissions` flag（或设置 `allowDangerouslySkipPermissions: true` 在 SDK 中），否则 CLI 会拒绝启动。在此模式下，所有工具调用（包括文件写入、命令执行、网络访问）都会自动执行，不会提示确认。这是 CI/CD 场景最常用的模式，因为它确保了自动化流程不会被权限提示中断。然而，需要注意的是，即使在此模式下，`-p` 模式的 deferred tool 死锁问题仍然存在。因此，`bypassPermissions` 可以解锁所有工具的权限，但不能解决工具加载层面的问题。

#### 3.3.2 --allowedTools 参数的作用与限制

`--allowedTools` 参数定义了哪些工具可以被自动批准使用。它的语法支持工具名（如 `Bash`）、带前缀匹配的工具名（如 `Bash(git diff *)`）、以及 MCP 工具名（如 `mcp__playwright__navigate`）。在 `bypassPermissions` 模式下，`--allowedTools` 实际上不起作用，因为所有工具都被允许。但在其他模式下（如 `default` 或 `acceptEdits`），它控制哪些工具可以不提示直接执行。一个需要注意的点是，`--allowedTools` 在 `claude-code-action` 的 GitHub Actions 环境中存在 bug：即使明确列出了 `WebFetch,WebSearch`，这些工具仍然被默认禁用，因为 action 的 `DISALLOWED_TOOLS` 环境变量优先于 CLI 参数。这个问题在 PR #1033 中被修复但尚未合并。对于一般 CLI 使用，`--allowedTools` 按预期工作。

#### 3.3.3 dontAsk 模式下 WebSearch 被拒绝的根因

`dontAsk` 模式的设计意图是"不询问用户，只允许预批准的工具"。在此模式下，任何需要 `ask` 行为的工具调用都会被自动拒绝。WebSearch 的 `checkPermissions()` 方法总是返回 `passthrough`（无论域名如何），该行为在权限管道中被转换为 `ask`，然后在 `dontAsk` 模式下转换为 `deny`。这就是 WebSearch 在 `dontAsk` 模式下不可用的技术根因。相比之下，WebFetch 对预批准域名返回 `allow`，绕过整个权限管道，因此在 `dontAsk` 模式下对预批准域名仍然可用。这一设计选择表明 Anthropic 有意将 WebSearch 视为一个需要用户确认的"敏感"操作（可能是因为它涉及向外部搜索服务发送查询），而 WebFetch 对可信域名的访问则被视为安全。


## 4. 替代方案深度分析

鉴于直接使用 `Bun.spawn claude -p` 的多重技术障碍，本节深入分析四种替代架构方案，评估它们在工具完整性、实现复杂度、稳定性和 Bun 兼容性方面的表现。

### 4.1 方案一：直接使用 Agent SDK（query() / ClaudeSDKClient）

这是本调研最推荐的方案。Anthropic 提供的 `@anthropic-ai/claude-agent-sdk`（TypeScript）和 `claude-agent-sdk`（Python）是专为程序化使用 Claude Code 能力而设计的官方库。

#### 4.1.1 SDK 架构：spawn CLI 作为后端 vs 纯库调用

**Agent SDK 并非纯 API 客户端——它在底层仍然 spawn Claude Code CLI 进程作为其后端执行引擎。** 当调用 `query()` 或 `ClaudeSDKClient` 的方法时，SDK 会启动一个隐藏的 CLI 实例，通过 stdin/stdout 与其通信，使用 `--output-format stream-json` 和 `--input-format stream-json` 进行双向数据交换。这意味着 SDK 本质上是对 "spawn CLI + 管理进程生命周期 + 解析 JSON 流" 这一模式的封装。封装带来的好处是开发者无需手动处理进程管理、信号处理、JSON 解析、会话恢复等复杂逻辑。SDK 提供了类型化的消息流、内置的错误处理、自动的 context compaction、以及 hooks 系统。但这也意味着 SDK 继承了 CLI 的某些限制，例如同样需要处理 `CLAUDECODE` 环境变量问题，以及在 SDK 内部使用的 stdin/stdout 管道可能受到 Bun 的 pipe 问题影响。

#### 4.1.2 TypeScript SDK query() 的 Agent tool 执行 bug（"Unknown tool"）

**TypeScript 版本的 SDK 存在一个已知的 bug：在 `query()` 模式下，`Agent` tool（用于 spawn 子代理）虽然会出现在初始化消息的工具列表中，但实际调用时返回 "Unknown tool: Agent" 错误。** 这意味着模型可以看到并决定使用 Agent tool，但 SDK 后端没有为该工具注册执行处理器。这个问题在 `query()` 模式下始终存在，不受工具配置或提示词的影响。相比之下，Python 版本的 `ClaudeSDKClient` 正确地支持 Agent tool 的调用。对于 TypeScript 用户，如果需要子代理功能，目前的 workaround 包括：使用 `ClaudeSDKClient` 替代 `query()`（如果 SDK 提供此 class-based API）；在 prompt 中避免提及子代理或并行任务，让模型在单一会话中完成所有工作；或者使用多个独立的 `query()` 调用来模拟并行执行，但这失去了子代理的上下文隔离优势。此 bug 已在 GitHub Issue #210 中报告，但截至报告日期尚未修复。

#### 4.1.3 SDK 中 allowedTools 的正确配置方法

SDK 通过 `allowedTools` 选项控制工具可用性。与 CLI 的 `--allowedTools` 不同，SDK 的 `allowedTools` 是严格的白名单：只有列出的工具才会对模型可见和可用。要启用 WebSearch 和 WebFetch，需要显式列出：`allowedTools: ["WebSearch", "WebFetch", "Bash", "Read", "Edit", "Write", "Glob", "Grep"]`。如果省略 `WebSearch` 和 `WebFetch`，模型将不知道这些工具的存在。在 `bypassPermissions` 模式下，所有列出的工具都会自动批准。在 `acceptEdits` 模式下，文件编辑工具自动批准，其他工具需要权限确认（但在 `-p` 模式的 SDK 使用中，通常也配合 `bypassPermissions`）。需要注意的是，SDK 的 `query()` 模式下 Agent tool 的 bug 意味着即使将 `"Agent"` 加入 `allowedTools`，调用也会失败。

#### 4.1.4 Bun 兼容性：设置 executable: "node" 绕过 stdin bug

**在 Bun 环境中使用 Agent SDK 时，最关键的配置是显式设置 `executable: "node"`。** 这会强制 SDK 使用 Node.js 而非默认的 Bun 来运行其后端的 CLI 进程。由于 SDK 在后端仍然使用 pipe 与 CLI 通信，Bun 的 stdin pipe bug 会直接影响 SDK 的正常工作。通过强制使用 Node.js，这一问题被完全规避。配置示例如下：`for await (const message of query({ prompt: "Search the web for...", options: { allowedTools: ["WebSearch", "WebFetch"], permissionMode: "bypassPermissions", allowDangerouslySkipPermissions: true, executable: "node" } })) { ... }`。如果不设置 `executable`，SDK 在 Bun 下会默认使用 `bun` 运行后端，在 ARM64 上几乎必然 hang 住。此 workaround 在 Archon 等项目中已被验证有效。

### 4.2 方案二：通过 PTY 控制完整 Claude CLI 实例

如果需要运行完整的交互式 Claude Code（而非仅 `-p` 模式），或者需要所有工具在完全交互环境下的可靠性，PTY（Pseudo-Terminal）方案是最佳选择。

#### 4.2.1 node-pty 库的使用

`node-pty` 是一个跨平台的 Node.js 库，用于分配伪终端并 spawn 进程。它允许子进程认为自己连接到了一个真实终端，从而正确处理所有 TUI 交互。在 Node.js 中，使用 `node-pty` 启动 Claude Code 的代码如下：`import { spawn } from 'node-pty'; const ptyProcess = spawn('claude', [], { name: 'xterm-color', cols: 80, rows: 30, cwd: process.cwd(), env: process.env });`。然后通过 `ptyProcess.onData(data => ...)` 捕获输出，`ptyProcess.write("your input\r")` 发送输入。这种方法可以完整控制 Claude Code 的交互式会话，包括所有斜杠命令、权限确认、TUI 导航等。

#### 4.2.2 claude-code-controller 项目架构解析

`claude-code-controller` 是一个开源项目，它通过 PTY + 文件系统协议实现了对 Claude Code 实例的程序化控制。其核心架构包括：使用 `node-pty` 分配 PTY 并 spawn `claude` 进程；使用文件系统作为消息总线（`~/.claude/teams/{teamName}/inboxes/` 目录下的 JSON 文件）；实现了完整的会话管理、任务分配、权限审批流程。该项目展示了如何通过非 API 方式深度集成 Claude Code，适合需要构建 Claude Code 集群或自动化团队的场景。对于 Bun 环境，`node-pty` 需要 Node.js 运行时（因为它依赖原生模块），所以这一方案实际上需要在 Node.js 进程中实现控制器层，然后通过 IPC 与 Bun 主进程通信。

#### 4.2.3 PTY 方案的优势：完整 TTY 支持，所有工具可用

PTY 方案的最大优势是 **100% 的工具可用性**。因为子进程认为自己运行在真实终端中，所有 deferred tools（WebSearch、WebFetch、Agent 等）的加载和交互都按正常流程执行，不会遇到 `-p` 模式的死锁问题。权限提示也能正常显示和处理（通过编程方式发送 `y`/`n` 响应）。此外，PTY 方案支持 Claude Code 的所有交互式功能，包括 `/commands` 斜杠命令、checkpoint/rewind、多文件编辑确认等。这是所有方案中功能最完整的，但也是最重的——需要管理真实的终端状态和处理 ANSI 转义序列。

#### 4.2.4 Bun 兼容性限制（node-pty 依赖 Node.js）

`node-pty` 是一个带有原生 C++ 绑定的 Node.js 模块，它不能直接在 Bun 中运行。要在 Bun 项目中使用 PTY 方案，需要：在单独的 Node.js 进程中运行 PTY 控制器；通过 Bun 的 IPC 机制（`Bun.spawn` 的 `ipc` 选项）或网络/socket 与该 Node.js 进程通信；或者使用 `child_process.spawn` 从 Bun 中启动 Node.js 脚本。这增加了架构复杂度，但如果是必须运行完整交互式 Claude Code 的场景，这是值得的权衡。

### 4.3 方案三：在交互式 Claude 会话中使用内置 Agent tool

如果工作流允许启动一个交互式 Claude Code 会话（由人触发或在持久化环境中运行），可以利用 Claude 内置的 `Agent` tool（前身为 `Task` tool）来实现子任务委托。

#### 4.3.1 Agent tool（原 Task tool）的调用机制

在交互式 Claude Code 会话中，模型可以调用 `Agent` tool 来 spawn 一个子代理。子代理拥有独立的上下文窗口、独立的工具集（可配置），并执行指定的任务。父代理等待子代理完成后，接收其返回的结果摘要。这一机制在交互式模式下工作稳定，所有工具（包括 WebSearch、WebFetch）在子代理中都可用。调用方式是在与 Claude 的对话中自然语言描述："Search the web for X and report back" 或明确调用：`<Agent><prompt>Search the web for...</prompt><subagent_type>general-purpose</subagent_type></Agent>`。

#### 4.3.2 Subagent 类型：Explore vs general-purpose vs Plan

Claude Code 提供了几种预定义的子代理类型：Explore 用于快速探索代码库（使用 Read、Glob、Grep 等只读工具，限制为 5 步）；general-purpose 用于通用任务（拥有完整工具集，最多 15 步）；Plan 用于规划复杂任务（只读模式，生成执行计划）。可以在调用 Agent tool 时指定 `subagent_type` 来选择合适的类型。对于需要 WebSearch 的任务，`general-purpose` 是最合适的选择。

#### 4.3.3 嵌套限制：子代理不能 spawn 自己的子代理

**一个重要限制是子代理不能再 spawn 自己的子代理。** 这是为了防止无限递归和上下文爆炸。子代理可以使用的工具集不包括 `Agent` tool。因此，这种方案适用于单层委托的场景：一个父代理协调多个并行的子代理任务，每个子代理独立完成自己的工作。如果工作流需要多层嵌套的代理调用，此方案不适用，需要考虑其他架构（如 Agent SDK 的 `agents` 选项，尽管 TypeScript 版本有 bug）。

#### 4.3.4 适用场景：人机协作工作流

此方案最适合 **人机协作的半自动化工作流**。例如：开发者在终端启动 Claude Code 交互会话，提出一个高层任务；Claude 作为协调者，自动 spawn 多个子代理并行执行（如一个搜索网络、一个读取本地文档、一个分析代码）；Claude 汇总所有子代理的结果，向开发者呈现完整报告。这种模式利用了交互式会话的稳定性，同时通过子代理实现了并行化和上下文隔离。它不适用于完全无人值守的自动化（因为需要初始的人工启动），但对于增强开发者生产力的场景非常有效。

### 4.4 方案四：继续使用 Bun spawn 的 Workaround 组合

如果由于特定约束必须使用 `Bun.spawn claude -p`，以下 workaround 组合可以提高成功率，但请记住这仍然是一个脆弱方案。

#### 4.4.1 环境变量清理清单

在 spawn 之前，必须清理所有 Claude Code 相关的环境变量。创建干净 env 对象的函数应该复制 `process.env`，删除 `CLAUDECODE`、`CLAUDE_CODE_ENTRYPOINT`、`CLAUDE_CODE_SESSION`、`CLAUDE_CODE_PARENT_SESSION`、`CLAUDE_CODE_OAUTH_TOKEN`、`CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` 等变量，同时保留其他必要变量如 `PATH`、`HOME`、`ANTHROPIC_API_KEY` 等。

#### 4.4.2 避免 stdin pipe：使用命令行参数传递 prompt

**不要使用 `stdio: ["pipe", ...]`。** 将 prompt 作为命令行参数传递（`claude -p "your prompt here"`），并将 stdin 设置为 `"ignore"`：设置 `stdio: ["ignore", "pipe", "pipe"]`，这样完全避免了 Bun 的 stdin pipe bug。如果 prompt 太长无法放在命令行，可以写入临时文件然后使用 `claude -p --prompt-file /path/to/prompt.txt`。

#### 4.4.3 重试机制应对间歇性死锁

由于 deferred tool 的间歇性死锁，实现一个重试包装器：设置超时（如 60 秒），如果子进程在超时前没有产生输出，kill 它并重试，最多重试 3 次。根据社区报告，这种重试机制可以达到约 95% 的成功率。

#### 4.4.4 降级策略：用 Bash + curl 替代 WebFetch

如果 WebFetch 始终无法工作，可以在 prompt 中指示 Claude 使用 `Bash` tool 执行 `curl` 来获取网页内容：在 prompt 中明确说明 "Use `curl -sL <url>` via the Bash tool to fetch web pages instead of WebFetch"。这是 `claude-code-action` 项目在其 WebFetch 被默认禁用时采用的 workaround。虽然这种方法失去了 WebFetch 的自动内容提取和总结能力，但至少能实现网络访问。需要注意的是，此方法仅适用于 WebFetch，对于 WebSearch（需要搜索能力），curl 无法直接替代，可能需要集成外部搜索 API（如 SerpAPI、Tavily）作为 MCP server。


## 5. 实践建议与代码示例

### 5.1 推荐配置：Agent SDK + executable: "node"

这是生产环境最可靠的配置方式。通过强制 Agent SDK 使用 Node.js 运行时，完全规避了 Bun 的 stdin pipe 问题，同时获得 SDK 提供的完整工具访问和流式输出能力。

#### 5.1.1 安装与初始化

首先确保 Claude Code CLI 已安装（`npm install -g @anthropic-ai/claude-code`），然后在 Bun 项目中安装 SDK：`bun add @anthropic-ai/claude-agent-sdk`。设置 API key：`export ANTHROPIC_API_KEY=your_key`。初始化代码如下：

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  const messages = query({
    prompt: "Search the web for the latest version of React and report the release date",
    options: {
      allowedTools: ["WebSearch", "WebFetch", "Bash"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      executable: "node", // Critical for Bun compatibility
      maxTurns: 10,
    }
  });

  for await (const message of messages) {
    if (message.type === "result") {
      console.log("Result:", message.result);
    } else if (message.type === "assistant") {
      // Stream assistant output
      process.stdout.write(message.message.content
        .filter(c => c.type === "text")
        .map(c => c.text)
        .join("")
      );
    }
  }
}

main();
```

#### 5.1.2 启用 WebSearch/WebFetch 的完整配置

对于需要网络搜索和页面抓取的任务，确保 `allowedTools` 包含 `"WebSearch"` 和 `"WebFetch"`。如果需要子代理功能（TypeScript SDK 中有限制），可以添加 `"Task"` 或 `"Agent"`，但请注意 TypeScript `query()` 模式下 Agent tool 的 bug。完整的配置示例如下：

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function researchTask(topic: string) {
  const result = [];
  
  for await (const message of query({
    prompt: `Research the topic "${topic}". Search the web for current information, ` +
            `fetch relevant pages, and provide a comprehensive summary with sources.`,
    options: {
      allowedTools: [
        "WebSearch",      // Enable web search
        "WebFetch",       // Enable page fetching
        "Bash",           // Enable shell commands
        "Read",           // Enable file reading
        "Write",          // Enable file writing
        "Glob",           // Enable file globbing
        "Grep",           // Enable text search
      ],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      executable: "node",
      cwd: process.cwd(),
      maxTurns: 20,
      env: {
        // Ensure clean environment, prevent nested session issues
        CLAUDECODE: "",
        CLAUDE_CODE_ENTRYPOINT: "",
        CLAUDE_CODE_SESSION: "",
      }
    }
  })) {
    if (message.type === "result") {
      return message.result;
    }
    // Optionally handle other message types for progress
    if (message.type === "tool_use") {
      console.log(`[Tool] ${message.name}:`, message.input);
    }
  }
}
```

#### 5.1.3 流式输出处理示例

处理流式输出以获取实时进度反馈：

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function streamExample() {
  for await (const message of query({
    prompt: "Search for TypeScript 5.5 new features",
    options: {
      allowedTools: ["WebSearch", "WebFetch"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      executable: "node",
    }
  })) {
    switch (message.type) {
      case "system":
        if (message.subtype === "init") {
          console.log(`[Session ${message.session_id} started]`);
        }
        break;
      
      case "assistant":
        // Print assistant text as it streams
        const text = message.message.content
          .filter(c => c.type === "text")
          .map(c => c.text)
          .join("");
        process.stdout.write(text);
        break;
      
      case "tool_use":
        console.log(`\n[Using tool: ${message.name}]`);
        break;
      
      case "tool_result":
        if (message.result) {
          console.log(`[Tool result: ${message.result.substring(0, 100)}...]`);
        }
        break;
      
      case "result":
        console.log(`\n[Done] Usage: ${JSON.stringify(message.usage)}`);
        break;
    }
  }
}
```

### 5.2 降级方案：Bun spawn 的可靠包装

如果必须使用 `Bun.spawn`，以下是经过验证的最可靠配置。

#### 5.2.1 清理环境变量的 helper 函数

```typescript
function createCleanEnv(): Record<string, string> {
  const cleanEnv: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    // Remove all Claude Code specific variables to prevent nesting detection
    if (key.startsWith("CLAUDE_CODE_")) continue;
    if (key === "CLAUDECODE") continue;
    // Keep essential variables
    cleanEnv[key] = value;
  }
  
  return cleanEnv;
}
```

#### 5.2.2 使用 spawnSync 避免异步问题

对于简单任务，使用同步 spawn 可以简化错误处理：

```typescript
import { spawnSync } from "bun";

function runClaudeSafe(prompt: string): string {
  const result = spawnSync({
    cmd: ["claude", "-p", prompt, "--output-format", "json", "--dangerously-skip-permissions"],
    env: createCleanEnv(),
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore", // Critical: avoid stdin pipe issues
  });
  
  if (result.exitCode !== 0) {
    throw new Error(`Claude failed: ${result.stderr.toString()}`);
  }
  
  const output = result.stdout.toString();
  const data = JSON.parse(output);
  return data.result;
}
```

#### 5.2.3 带重试的 spawn 包装器

```typescript
import { spawn } from "bun";

async function runClaudeWithRetry(
  prompt: string, 
  maxRetries = 3, 
  timeoutMs = 60000
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Attempt ${attempt}/${maxRetries}]`);
    
    try {
      const proc = spawn({
        cmd: ["claude", "-p", prompt, "--output-format", "json", "--dangerously-skip-permissions"],
        env: createCleanEnv(),
        stdout: "pipe",
        stderr: "pipe",
        stdin: "ignore",
      });
      
      // Set up timeout
      const timeout = setTimeout(() => {
        console.warn("[Timeout] Killing hung process...");
        proc.kill("SIGTERM");
      }, timeoutMs);
      
      const output = await new Response(proc.stdout).text();
      clearTimeout(timeout);
      
      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
        throw new Error(`Exit code ${exitCode}: ${stderr}`);
      }
      
      if (!output.trim()) {
        throw new Error("Empty output (possible deferred tool deadlock)");
      }
      
      const data = JSON.parse(output);
      return data.result;
      
    } catch (err) {
      console.error(`[Attempt ${attempt} failed]`, err);
      if (attempt === maxRetries) throw err;
      // Wait before retry with exponential backoff
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  
  throw new Error("All retries exhausted");
}
```

### 5.3 何时选择哪种方案

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| **简单自动化脚本**（Bun 环境） | Agent SDK + `executable: "node"` | 最稳定、工具完整、无需手动进程管理 |
| **CI/CD 流水线** | Agent SDK 或 `claude -p`（带重试） | SDK 提供更好的错误处理；`-p` 更简单但需重试 |
| **需要完整交互能力** | PTY + `node-pty` | 唯一支持所有交互式功能的方案 |
| **人机协作增强** | 内置 `Agent` tool | 利用现有交互会话，子代理并行执行 |
| **多代理编排系统** | `claude-code-controller` | 专为多实例控制设计，持久化、可监控 |
| **简单只读查询**（无 WebSearch） | `Bun.spawn claude -p` | 核心工具稳定，无需复杂 workaround |
| **必须使用 Bun 且要 WebSearch** | Agent SDK（唯一可靠选择） | `-p` 模式的 deferred tool 死锁无法完全规避 |


## 6. 相关项目与生态工具

### 6.1 sub-agents-mcp：跨工具的子代理 MCP Server

`sub-agents-mcp` 是一个 MCP（Model Context Protocol）服务器，它将 Claude Code 的子代理功能暴露为标准的 MCP tools，使得任何 MCP 客户端（如 Cursor IDE、Claude Desktop、Windsurf 等）都可以使用 Claude Code 的子代理能力。该项目支持配置不同的执行引擎（Claude CLI、Cursor CLI、Gemini CLI、Codex CLI），通过 Markdown 文件定义代理行为，并提供了会话管理和错误处理。对于需要跨工具复用子代理定义的场景，这是一个有价值的抽象层。它本质上是在 MCP 层面实现了"CLI 内部 subagent"的模式，但使其可移植到任何 MCP 兼容的客户端。

### 6.2 claude-code-controller：PTY + 文件系统协议的完整方案

`claude-code-controller` 是目前最成熟的 Claude Code 程序化控制方案。它通过 `node-pty` 分配伪终端，使用 Claude Code 的内部 teammate 协议（基于 `~/.claude/teams/` 目录下的 JSON 文件）进行通信，提供了 REST API、TypeScript SDK 和 Web Dashboard 三种控制接口。该方案的独特优势是运行"真实的" Claude Code 实例（非 `-p` 模式的简化版），因此拥有完整的工具访问能力和所有交互式功能。它适合构建需要长期运行、多实例协作、持续监控的自动化系统。其 Bun 兼容性限制是需要在 Node.js 进程中运行 PTY 层。

### 6.3 Claude CLI 内置的 Agent Teams 模式（实验性）

自 2026 年 2 月起，Claude Code 内置了实验性的 Agent Teams 功能。通过设置 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 环境变量启用，用户可以在交互式会话中创建代理团队，让多个 Claude 实例并行协作完成复杂任务。Agent Teams 提供了 `TeamCreate`、`TaskCreate`、`SendMessage` 等工具，支持任务依赖、队友间直接通信、进度跟踪等高级功能。 teammate 模式支持 `in-process` 和 `tmux` 两种显示模式。虽然 Agent Teams 是交互式功能，但它展示了 Anthropic 在多代理编排方面的演进方向，也为构建自动化系统提供了设计参考。目前限制包括： teammates 不能 spawn 自己的 teams，没有 session 恢复能力，以及每个 teammate 都是独立的 API 调用（token 消耗较高）。

### 6.4 codex-subagents-mcp：将 Codex subagent 暴露为 MCP tool

与 `sub-agents-mcp` 类似，`codex-subagents-mcp` 将 OpenAI Codex CLI 的子代理功能暴露为 MCP tools。这反映了 CLI agent 工具互操作性的行业趋势：不同厂商的 CLI 工具通过 MCP 协议实现 tool-level 的互调用。对于同时使用了 Claude Code 和 Codex 的团队，这种桥接工具可以实现跨平台的 agent 协作，例如让 Claude Code 调用 Codex 执行特定任务，或反之。


## 7. 总结与展望

### 7.1 当前状态评估

截至 2026 年 5 月，在 Bun 环境中通过 `Bun.spawn` 运行 `claude -p` 并期望使用 WebSearch 等 deferred tools 的方案处于**不推荐状态**。主要障碍包括：Bun 的 stdin pipe 处理在 ARM64 上存在已确认缺陷；Claude Code v2.1.76+ 在 `-p` 模式下对 deferred tools 存在间歇性死锁回归；嵌套检测机制需要从环境层面系统性地处理。核心工具（Bash、Read、Edit 等）在 `-p` 模式下工作稳定，但涉及网络访问的 deferred tools 不可靠。**Agent SDK 是当前最成熟、最可靠的替代方案**，特别是配置 `executable: "node"` 后在 Bun 环境中也能稳定工作。

### 7.2 已知问题跟踪

| Issue | 状态 | 影响 |
|-------|------|------|
| Bun stdin pipe flush (ARM64) | **Confirmed, workaround available** | 阻塞 spawn 通信 |
| `-p` mode deferred tool deadlock (v2.1.76+) | **Confirmed regression, no fix yet** | WebSearch/Agent 不可用 |
| Agent SDK `query()` Agent tool "Unknown tool" (TS) | **Confirmed bug, no fix yet** | 子代理功能受限 |
| `--allowedTools` vs `DISALLOWED_TOOLS` (GH Action) | **PR pending** | WebSearch 被错误禁用 |
| `dontAsk` mode WebSearch denied | **By design** | 需要 bypassPermissions |

### 7.3 未来演进方向

**Anthropic 正在积极推动 Agent SDK 作为程序化使用 Claude Code 的主要接口。** 可以预期 SDK 的功能会持续增强（如修复 Agent tool bug、增加更多内置工具），而 `-p` 模式的定位可能更偏向于简单的脚本集成而非复杂的代理工作流。**Agent Teams 的正式 GA（General Availability）** 将为多代理编排提供官方支持，可能取代当前社区基于 `Task` tool 的各种 workaround 方案。**Bun 与 Claude Code 的兼容性**有望随着 Bun 的成熟度提升而改善，特别是 stdin pipe 处理和 TTY 支持方面。对于构建生产级自动化系统的开发者，建议以 Agent SDK 为核心，密切关注 Anthropic 的官方更新，并在需要完整交互能力时考虑 PTY 方案。