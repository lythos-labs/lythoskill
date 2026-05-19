---
lane: main
checklist_completed: false
checklist_skipped_reason: non-interactive agent session
---
# EPIC-20260519164518898: entropy-check CLI/agent边界清晰化 — 传感器只报告事实，不替agent做判断

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> entropy-check CLI/agent边界清晰化 — 传感器只报告事实，不替agent做判断

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-19 | Created |

## 背景故事

entropy-check 的架构方向正确（传感器→agent 跨 session 引导），但当前实现混淆了 CLI 和 agent 的边界：

1. **Remediation 抢判断权** — 每个 check 的 `remediation` 字段告诉 agent "你应该做X"，把传感器变成了任务分发器。Agent 应该自己基于事实做判断。
2. **W21 on 周二** — missing-weekly 检测到文件不存在就 warn，不懂"周二写周报没意义"。因为脚本替 agent 做了判断（"缺失→去写"），而不是只报告事实（"W21 完成度 16%"）。
3. **`stat -c` GNU-ism** — symlink 检测在 macOS 上静默失效，暴露了跨平台可靠性问题。
4. **probe 噪音** — 162 items 全量 dump，agent 要自己区分信号和噪声。`stats` 命令已经提供了更紧凑的摘要格式。

**核心原则：Script 提供工具能力 + 数据结构，Agent 提供判断 + 行动决策。Script 永远不说"你应该做X"。**

## 需求树

### 主题A — 剥离 remediation，强化事实输出
- **触发**: checks.ts 每个函数返回 `<spawn subagent>` + Context + Goal，替 agent 做判断
- **需求**: CheckResult 只描述事实（数据 + 状态），不包含行动建议
- **实现**: 删除 `CheckResult.remediation` 字段，execute.ts 删除 `printRemediationSummary()`；每个 check 的 message/details 提供 agent 判断所需的数据密度
- **产出**: 5 个 check 的 remediation 全部移除，message/details 增强
- **验证**: `bun scripts/entropy-check/*.test.ts` 37 tests 仍 pass；agent 阅读输出后能自主决策

### 主题B — 修复跨平台兼容性
- **触发**: `stat -c '%F'` 在 macOS 上 `illegal option`，stderr 被丢弃，symlink 永不被检测
- **需求**: symlink 检测跨平台可靠
- **实现**: 用 Node `fs.lstatSync` 替代 shell `stat -c '%F'`
- **产出**: checkSymlinksInSkills 在 macOS/Linux 均正确检测
- **验证**: 手动创建 symlink → 检测到 fail；删除 → pass

### 主题C — cortex-probe 改用启发式摘要
- **触发**: probe 输出 162 items，agent 无法快速判断是否需要行动
- **需求**: 用 `stats` 替代 `probe`，或者 probe 增加 `--summary` 模式
- **实现**: checkCortexProbe 调用 `stats` 获取计数 + 用 `probe` 只过滤 actionable 信号（empty shells、proposed ADRs）；只报告需要 agent 关注的异常项
- **产出**: cortex-probe check 输出 ≤ 20 行
- **验证**: 输出中信号/噪声比明显提升

### 主题D — missing-weekly 加入时间感知
- **触发**: W21 周二就 warn 缺失，agent 看到觉得荒谬
- **需求**: check 报告"文件不存在"的事实 + 周完成度，让 agent 判断
- **实现**: 计算 week completion %（当前是第几天/7），作为 details 输出；不改变 warn/fail 判定
- **产出**: 输出格式 `W21: not yet written (week is 2/7 days, 29% complete)`
- **验证**: 周二运行看到 29%，agent 判断"不值得做"；周五看到 86%，agent 判断"该写了"

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260519165746212 | cortex probe --suspicious 模式 | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260519164655956 | completed | 删除 remediation 字段 + printRemediationSummary |
| TASK-20260519164659220 | completed | symlink检测跨平台 (stat -c → lstatSync) |
| TASK-20260519164702541 | completed | cortex-probe 改用 stats + probe --suspicious |
| TASK-20260519164705587 | completed | missing-weekly 加入周完成度百分比 + 导航 |

## 经验沉淀

## 归档条件
- [ ] 所有 4 个 task 完成
- [ ] `bun scripts/entropy-check/*.test.ts` 37 tests pass
- [ ] `bun scripts/entropy-check/index.ts --force` 输出中无 `<spawn subagent>` 字样
