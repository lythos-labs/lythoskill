# TASK-20260504190000001: Extract generic Agent BDD infra from deck to test-utils

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created from arena discussion |

## 背景与目标

Deck 的 Agent BDD 已跑通 26/26（5 Agent 场景），但 infra 全部耦合在 `packages/lythoskill-deck/test/runner.ts` 里。Arena、curator 等包想用同一套 `.agent.md` + LLM Judge 能力，却无法复用。

目标：把通用部分沉淀到 `lythoskill-test-utils`，让任何包都能写自己的 Agent BDD。

## 需求详情

- [ ] 提取 `parseAgentMd()` → test-utils（`.agent.md` 格式解析是通用的）
- [ ] 提取 `runLLMJudge()` 骨架 → test-utils（Judge prompt 构建、claude 调用、verdict 解析）
- [ ] 提取 `runAgentScenario()` 通用框架 → test-utils（When 执行 → 产物持久化 → Then 验证 → Judge）
- [ ] deck runner 保留适配层：`setupAgentWorkdir()`、`./deck` wrapper、checkpoint schema
- [ ] arena 作为第一个外部消费者：写 tracer bullet `.agent.md`，验证 infra 可复用

## 技术方案

### 方向 A: 提取通用 runner 框架

```
test-utils/
  src/
    agent-bdd.ts      # parseAgentMd, runLLMJudge, AgentScenario types
    agent-bdd-runner.ts # runAgentScenario 通用骨架（接受 setupWorkdir 回调）

deck/test/runner.ts   # 导入通用框架，注入 deck 特定的 setupAgentWorkdir
arena/test/runner.ts  # 导入通用框架，注入 arena 特定的 setupArenaWorkdir
```

### 方向 B: Judge 输入/输出结构化（更关键）

当前 `.agent.md` 的 `## Judge` 是自然语言，LLM 输出 JSON 的可靠性不高（已出现 "API Error" 非 JSON 回退）。

替代方案：让 `## Judge` 本身用 TOML/JSON 定义 criteria，Judge prompt 构建完全程序化，LLM 输出也要求严格的结构化格式（或直接用 function calling）。

这样 `parseAgentMd` 从 markdown 文本解析 → 结构化 schema 解析，judge 的脆弱性大幅降低。arena 的 `parseReportMd` 问题同理 — 如果 judge 直接输出 TOML/JSON，就不需要手写 markdown table parser。

**决策待做**：先按方向 A 提取框架，还是同时推进方向 B 的结构化？

## 验收标准

- [ ] `bun test packages/lythoskill-test-utils/src/agent-bdd*.test.ts` 通过
- [ ] deck 的 Agent BDD 仍 26/26 GREEN（回归验证）
- [ ] arena 至少 1 个 `.agent.md` tracer bullet 跑通

## 关联

- 前置: deck Agent BDD 已稳定（26/26）
- 后续: arena Agent BDD 场景（parseReportMd 端到端验证）
- 相关 ADR: ADR-20260504135256566（cortex init hooks）
