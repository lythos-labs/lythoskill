# TASK-20260518030349909: Phase 2 — bdd-runner.ts reproduce.sh path

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| terminated | 2026-05-18 | Terminated |

## 背景与目标
bdd-runner.ts 当前只支持 `.agent.md` via parseAgentMd。新增 reproduce.sh 执行路径：spawn 脚本 → 检测 IoC handoff → agent 接管智能步骤 → 收集 verdict。与现有路径并存，返回相同 verdict 格式。

Refs: ADR-20260518024500631, Phase 1 contract

## 需求详情
- [ ] `executeReproduceSh(scenarioDir)`: `Bun.spawn('bash reproduce.sh')` → 流式读 stdout
- [ ] IoC 标记检测: stdout 中出现 `<spawn subagent>` 或 `Agent:` → 暂停 shell，yield 给 agent 上下文
- [ ] Agent 在 workdir 执行 → 产出 decision-log.jsonl
- [ ] 恢复 shell → 完成 archive
- [ ] 收集 judge-verdict.json
- [ ] 与 parseAgentMd 路径共存，统一 verdict 格式

## 技术方案
轻量 wrapper。IoC handoff = stdout 中的单个 pattern match。运行 bdd-runner 的 agent **本身就是** subagent——无需额外 spawn。

## 验收标准
- [ ] `executeReproduceSh()` 跑 demo 返回 PASS
- [ ] IoC 标记检测正确识别 Step 3
- [ ] Verdict 格式兼容 parseAgentMd 输出
- [ ] 纯 shell reproduce.sh（无 IoC）直接透传

## 关联文件
- 修改: `packages/lythoskill-test-utils/src/bdd-runner.ts`
- 参考: `showcase/2026-05-18-bdd-reproduce-sh-smoke-test/reproduce.sh`
- Epic: EPIC-20260518024809887
