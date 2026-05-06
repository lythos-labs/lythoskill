---
lane: main
checklist_completed: false
checklist_skipped_reason: report.md analysis confirmed ground truth issues, user aligned on three-pronged approach
---
# EPIC-20260506001552299: Stabilize agent spawn: CLI workaround + AgentSdkAdapter + MCP fallback + pre-flight

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-06 | Created |
| suspended | 2026-05-06 | Suspended |
| active | 2026-05-06 | Resumed |
| done | 2026-05-06 | Done |

## 背景故事

### 触发

Arena grounding smoke tests（2026-05-05）暴露 `claude -p` 在 Bun spawn 下产出空 stdout。引入 `report.md` 系统分析后确认了多层技术障碍：

1. **Bun stdin pipe flush bug (ARM64)**: `stdio: ["pipe", ...]` 下 stdin 无法正确到达子进程 → hang
2. **嵌套检测**: `CLAUDECODE` 等 env 未清理 → CLI 拒绝启动
3. **`-p` deferred tool 死锁 (v2.1.76+)**: WebSearch/WebFetch/Agent/Skill 间歇性 0 字节输出
4. **dontAsk 模式 WebSearch 被拒**: checkPermissions() 返回 passthrough → deny

### 推荐方案（来自 report.md）

| 优先级 | 方案 | 理由 |
|--------|------|------|
| **1** | Agent SDK `query()` | 最稳定，完整工具，无 spawn 管理 |
| **2** | PTY + `node-pty` | 完整交互能力，所有工具 |
| **3** | Bun spawn + workaround | env 清理 + stdin ignore + 重试 |

### 我们的三线并进策略

```
短期 (本周): CLI spawn workaround 组合 → arena 能跑起来
中期 (下周): AgentSdkAdapter → 生产级可靠性
备选: MCP server adapter → 跨平台互操作
```

- **短期稳一下**: 修 `buildClaudeCommand` — 清 env、`stdin: ignore` + prompt file、`--output-format json`、重试包装
- **中期走 SDK**: `AgentSdkAdapter` 实现 `AgentAdapter` 接口，`spawn()` 内部调 `@anthropic-ai/claude-agent-sdk` 的 `query()`
- **备选 MCP**: 研究通过 MCP server 暴露 agent 能力，跨 Claude/Cursor/Windsurf 生态

### 相关 ADR

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260424120936541 | Player-deck separation (AgentAdapter 接口设计) | accepted |
| ADR-20260504200632939 | Structured judge schema (Zod-first) | accepted |

## 需求树

### 主题A: CLI spawn workaround (短期)
- **触发**: arena grounding stdout 空
- **需求**: `buildClaudeCommand` 生成可靠 spawn 命令
- **实现**: 清 CLAUDE_CODE_* env、prompt 走 argv 或 file 而非 stdin、`--output-format json`、重试包装
- **产出**: arena 能用 CLI spawn 跑 tool 任务
- **验证**: arena copy-test 产出非空 agent output

### 主题B: AgentSdkAdapter (中期)
- **触发**: report.md 首推 Agent SDK
- **需求**: 新的 `AgentAdapter` 实现，`spawn()` 内部调 `query()`
- **实现**: `agents/claude-sdk.ts`，实现 `spawn` + `invokeTool`，`useAgent('claude-sdk')` 路由
- **产出**: 稳定 agent spawn，所有 tool 可用
- **验证**: arena deep-research task 产出完整报告

### 主题C: MCP adapter (备选)
- **触发**: 用户提及 "实在不行还能走 MCP 模式"
- **需求**: 调研 MCP server 方式暴露 agent 能力
- **实现**: TBD — 先调研 `sub-agents-mcp`、`claude-code-controller`
- **产出**: 可行性评估 + 原型
- **验证**: 跨 Claude/Cursor 互操作验证

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260506001644250 | backlog | T1: Fix buildClaudeCommand (env, stdin, json, retry) |
| TASK-20260506001644285 | backlog | T2: Arena pre-flight (deck link + skill check) |
| TASK-20260506001644316 | backlog | T3: Research AgentSdkAdapter prototype |
| TASK-20260506001644356 | backlog | T4: AgentSdkAdapter implementation |
| TASK-20260506001644390 | backlog | T5: useAgent() routing for claude-sdk |
| TASK-20260506001644423 | backlog | T6: Arena re-run verification |
| TASK-20260506001644451 | backlog | T7: MCP adapter feasibility |

## 归档条件
- [ ] CLI spawn workaround 实现 + 测试
- [ ] AgentSdkAdapter 实现 + 测试
- [ ] Arena 能跑 tool 密集型任务并产出非空 output
- [ ] MCP fallback 可行性评估
