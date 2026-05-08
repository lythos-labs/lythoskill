# TASK-20260508155101016: Arena agent-run full e2e with deepseek serve

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-08 | Created |

## 背景与目标

`@lythos/agent-adapter-deepseek-serve` 已实现 actor-model daemon 适配器（PID lock、自动启动/复用/健康检查、session→thread 映射），并通过 27 个 FSM 单元测试。但 arena 的 `agent-run` 完整端到端尚未跑通——当前 serve 启动正常，SSE 事件收集需要 `eventsource` 库优化。

目标： arena 通过 deepseek serve 完成至少 2 个真实场景的端到端 agent-run 测试，验证 player 抽象在 daemon 模式下的可用性。

## 需求详情

- [ ] arena `useAgent('deepseek-serve').spawn()` 完成完整 e2e（task → thread → turns → SSE → output）
- [ ] 覆盖至少 2 个场景：
  1. Skill introspection（简单文本任务，验证基础工具链）
  2. Cookie recipe + radar chart（复杂多步骤任务，验证文件操作和 subagent）
- [ ] SSE 事件流收集稳定（处理 disconnect、重连、超时）
- [ ] 与 claude-sdk player 的结果可比（同 deck 同任务，输出质量对比）

## 技术方案

- 复用现有 arena BDD 场景，仅切换 player 为 `deepseek-serve`
- SSE 收集使用 `eventsource` 库或原生 `fetch` + ReadableStream 解析
- 参考已验证的 claude-sdk player 路径：`packages/lythoskill-test-utils/src/agents/claude.ts`
- CWD 隔离：arena runner 已在 `/tmp/arena-<id>/<side>/` 运行，防止向上发现 `.claude/skills/`
- DeepSeek serve 的 `--approval-policy auto` 替代已移除的 `--yolo`

## 验收标准

- [ ] `arena run --player deepseek-serve --deck <deck> --task "..."` 成功产出结果文件
- [ ] Skill introspection 场景 PASS（输出包含预期的 skill 列表）
- [ ] Cookie recipe 场景产出正确（.docx + radar chart）
- [ ] 单次 e2e 执行时间 < 5 分钟（与 claude-sdk 同级）
- [ ] 失败后能自动清理 serve 进程（避免僵尸进程）

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件

- 修改: `packages/lythoskill-arena/src/runner.ts`
- 修改: `packages/lythoskill-arena/src/player.ts`（BUILTIN_PLAYERS 映射）
- 参考: `packages/lythoskill-agent-adapter-deepseek-serve/src/deepseek-serve.ts`
- 参考: `packages/lythoskill-test-utils/src/agents/claude.ts`
- 参考: `packages/lythoskill-test-utils/src/agents/types.ts`
- 参考: `cortex/wiki/01-patterns/2026-05-08-agent-adapter-as-actor-daemon-lifecycle-facade-pattern-for-multi-player-cli-backends.md`

## Git 提交信息建议

```
feat(arena): deepseek-serve player e2e (TASK-20260508155101016)

- Arena agent-run full e2e with deepseek serve daemon
- SSE event collection stable across scenarios
- 2 verified scenarios: skill introspection + cookie recipe

Closes: TASK-20260508155101016
```

## 备注

当前状态：deepseek serve 启动和单元测试正常。主要剩余工作是 SSE 收集的稳定性。可参考已跑通的 claude-sdk agent-run 作为对标基准。
