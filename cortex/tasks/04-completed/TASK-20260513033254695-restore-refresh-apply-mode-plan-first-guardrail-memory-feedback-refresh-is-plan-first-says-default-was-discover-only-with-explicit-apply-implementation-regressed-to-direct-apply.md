# TASK-20260513033254695: Restore refresh apply-mode — plan-first guardrail (memory feedback_refresh_is_plan_first says default was discover-only with explicit --apply; implementation regressed to direct apply)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-12 | Created |
| in-progress | 2026-05-14 | Architecture clarified: plan → agent-driven apply with per-step probe; ADR updated with scheme E |
| completed | 2026-05-14 | Implemented: refresh default = plan-only (behind counts + probe), `--exec` triggers execution; 94 tests pass |

## 背景与目标

当前 `deck refresh` 实现 regressed 为直接 `git pull`（`executeRefreshPlan` 内部调用 `gitPull`）。

ADR-20260507110332805 决策的 plan-first UX 被丢失。需要恢复为：
1. **Plan**: discover-only，输出每个 skill 的 behind count + 网络可达状态
2. **Apply**: 不是 `--apply` flag，而是**触发 agent 按 plan 执行 migration**
3. **Probe**: plan+execute 内部还能 probe（确认 git remote 实际状况），和写死 script 不同

## 正确架构（非 parity，是 differentiation）

```
deck refresh
  → buildRefreshPlan() → RefreshDiscoveryReport
    → per-skill: behind count, remote reachable?, last fetch time
  → agent 读取 report，决策哪些 pull、哪些跳过、哪些需要人工处理
  → agent 执行 plan（probeConnectivity 验证每个 remote 后再 git pull）
  → 失败时 agent 可以尝试修复（mirror 切换、auth 提示、conflict 处理）
```

和 curator `runRefreshPlan` + `runRefreshExecute` 的区别：
- curator: plan 写入文件 → 人执行 `refresh-execute`
- deck refresh (new): plan 作为结构化数据 → **agent 执行**，每步可 probe、可修复

## 验收标准

- [ ] `deck refresh` 默认输出结构化 plan（JSON 或 markdown table），不执行 git pull
- [ ] plan 包含 per-skill behind count + remote 可达状态（probeConnectivity）
- [ ] 无 `--apply` flag（apply 是 agent 行为，不是 CLI flag）
- [ ] 当前 direct-apply 代码路径移除或改为显式 opt-in（如 `deck refresh --exec`）
- [ ] 测试覆盖：discover-only 默认、plan 结构、probe 集成

## 关联文件

- 修改: `packages/lythoskill-deck/src/refresh.ts`
- 修改: `packages/lythoskill-deck/src/refresh-plan.ts`
- 参考: `packages/lythoskill-curator/src/cli.ts` (`runRefreshPlan` / `runRefreshExecute`)
- ADR: `ADR-20260507110332805`

## Git 提交信息建议
```
fix(deck): restore refresh plan-first UX — discover-only default, agent-driven apply (TASK-20260513033254695)

- deck refresh default: output structured plan, no git pull
- plan includes per-skill behind count + probeConnectivity reachability
- remove --apply flag; apply is agent behavior
- old direct-apply path removed
```

## 备注

- 和 prune 的对偶关系：`prune` = audit heredoc（ADR-20260507110332770）；`refresh` = agent-driven plan+probe+execute
- 和 curator refresh 的关系：curator 是 human-readable todo file；deck refresh 是 agent-consumable structured report
- probeConnectivity 已 wire（TASK-20260513033256305），refresh plan 可以直接复用
