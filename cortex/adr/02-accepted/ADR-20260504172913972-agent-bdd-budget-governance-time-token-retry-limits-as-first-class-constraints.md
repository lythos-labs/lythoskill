# ADR-20260504172913972: Agent BDD budget governance — time/token/retry limits as first-class constraints

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-04 | Created |
| accepted | 2026-05-04 | Accepted |

## 背景

当前 Agent BDD 只有**单一硬 timeout**（默认 300s）。prune 场景暴露了两个问题：

1. **测试"飘"了**: agent 陷入网络等待（git clone 假 repo）或 stdin 阻塞，300s 内 stdout 全空，但 runner 傻等到硬 timeout 才 kill。
2. **无预算意识**: 不知道 agent 在"思考"、"执行"、"网络 IO"各花了多少时间；无法判断是"agent 慢"还是"基础设施 hang"。

用户洞察：**测试应该像函数式计算图一样可观测，像预算制一样有约束**。

## 决策驱动

- **可观测性**: LLM agent 是黑箱，必须拆解为"节点"（setup → agent-plan → agent-exec → judge → assert），每个节点记录耗时、token、出口状态。
- **fail-fast**: stdout 30s 无输出 = 大概率 hang，应该 idle-timeout kill，而不是傻等 300s。
- **网络操作特别危险**: `deck refresh` 逐个 git pull，任何冲突/超时都是不可控变量，需要独立预算。
- **不重试就没法区分"agent 错"和"infra 抖"**: 偶发网络抖动导致失败，单次失败不应直接判红。

## 选项

### 方案 A: 维持现状（单一硬 timeout）

**优点**:
- 实现简单

**缺点**:
- 测试时间不可预测（61s ~ 336s 浮动）
- hang 场景浪费 300s 才失败
- 无法区分 agent 质量问题和基础设施问题

### 方案 B: 引入预算制 + 计算图 + metrics

**预算层**（每层超预算即 fail-fast）：
| 预算项 | 建议值 | 触发条件 |
|--------|--------|----------|
| idle-timeout | 30s | stdout+stderr 无新内容 |
| total-timeout | 300s | 总时间上限（兜底） |
| exec-timeout | 60s | 单个 Bash 命令（如 git pull） |
| retry | 2 次 | 同一 scenario 失败时重试 |
| token-budget | 待测算 | 单 scenario 的 LLM token 上限 |

**计算图层**（DAG 节点，每个节点可观测）：
```
setupWorkdir → [agent-plan] → agent-exec(cmd1) → agent-exec(cmd2) → write-checkpoint → [llm-judge] → assert
```
每个节点记录：duration, token-in, token-out, exit-code, stdout-size。

**metrics 输出**（`metrics.json` 与 `judge-verdict.json` 并列）：
```json
{
  "scenario": "prune",
  "budget": { "idle_timeout_ms": 30000, "total_timeout_ms": 300000, "max_retries": 2 },
  "dag": [
    { "node": "setup", "duration_ms": 120, "status": "ok" },
    { "node": "agent-exec:deck_link", "duration_ms": 45000, "status": "ok" },
    { "node": "agent-exec:deck_prune", "duration_ms": 8000, "status": "ok" },
    { "node": "llm_judge", "duration_ms": 3500, "token_in": 800, "token_out": 200, "status": "ok" }
  ],
  "total_duration_ms": 58000,
  "retry_count": 0
}
```

**优点**:
- 精准定位瓶颈（是 agent 慢、网络 hang、还是 judge 慢）
- 30s idle-timeout 节省大量无效等待
- retry 过滤偶发失败，提高稳定性
- token-budget 防止 agent 无限思考

**缺点**:
- 实现复杂度增加
- token 计数需要接入 LLM API 的 usage 字段（或估算）

## 决策

**选择**: 方案 B 作为长期方向，但分阶段实施。

**阶段 1（即时）**: idle-timeout（30s）+ 计算图 duration 记录。成本低，收益高。
**阶段 2（后续）**: retry（2 次）+ exec-timeout（单命令 60s）。需要重构 runner.ts。
**阶段 3（远期）**: token-budget。需要 LLM API 支持或自估算。

**原因**:
prune timeout（336s → 实际 30s 内已 hang）是"预算制缺失"的典型案例。不引入分层约束，Agent BDD 无法从"能跑"进化到"可信赖"。

## 影响

- 正面: 测试时间可预测、失败根因可定位、稳定性提升
- 负面: runner.ts 复杂度增加；需要维护 budget 配置
- 后续: 与 CI 集成时，budget 超支可触发告警

## 相关

- 关联 ADR: ADR-20260504135256566（cortex init hooks — 预算制可复用于 husky-mixin 的 commit-time guard）
- 关联 Epic: EPIC-20260504170744839（Agent BDD stability）
- 关联 Task: TASK-20260504170113207（prune timeout 调查 — 本 ADR 是其系统性解法）
