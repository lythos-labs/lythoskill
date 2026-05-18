# TASK-20260518030349939: Phase 3 — BDD coverage dashboard + change-impact probe

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| in-progress | 2026-05-18 | Started |
| review | 2026-05-18 | Deliverables committed |
| completed | 2026-05-18 | Done |

## 背景与目标
Agent BDD 缺少 test framework 级别的"一眼可见"。每次 BDD 跑很贵（LLM 调用），不能像单元测试一样每次 commit 全跑。需要两件事：

1. **Coverage dashboard**: 哪些 scenario 覆盖了哪些 package，上次什么时间跑的，pass/fail 状态
2. **Change-impact probe**: `git diff` → 改了哪些 package → 哪些 scenario 需要重跑

Coverage 映射不需要声明——**文件位置就是映射**。`packages/<name>/test/scenarios/` 下的 scenario 自动关联 `<name>` package。

Refs: ADR-20260518024500631, Phase 2 bdd-runner, ADR-20260505221432740 (co-location)

## 需求详情
- [ ] 扫描脚本: 遍历 `packages/*/test/scenarios/*-bdd-*/reproduce.sh` + `showcase/*-bdd-*/reproduce.sh`
- [ ] 每场景读取 judge-verdict.json → verdict, criteria 明细, 时间戳
- [ ] 聚合: 总 scenario 数, pass/fail/skip 分布, 按 package 分组
- [ ] **Change-impact**: `git diff --name-only` → 提取变更 package → 匹配 co-located scenarios → 输出 "这 N 个 scenario 需要重跑"
- [ ] **Freshness**: 标记 >7 天未跑的 scenario 为 stale
- [ ] 输出: markdown table + JSON（CI 可消费）
- [ ] 零新依赖——filesystem + JSON.parse only

## 技术方案
纯 TypeScript 脚本。Telemetry = artifacts: judge-verdict.json 就是埋点数据，decision-log.jsonl 就是 trace。不需要额外 instrumentation。

Change-impact 核心逻辑：
```
git diff → changed files → extract package names (packages/<name>/)
→ find packages/<name>/test/scenarios/*/reproduce.sh
→ "these scenarios may need re-run"
```

## 验收标准
- [ ] Dashboard 输出 markdown table: scenario, verdict, date, package, criteria summary
- [ ] Change-impact: git diff 后正确列出受影响的 scenario
- [ ] Freshness: >7 天未跑标记 stale
- [ ] JSON 输出 CI 友好
- [ ] 零新依赖

## 关联文件
- 新增: `scripts/bdd-coverage.ts`
- 参考: `showcase/*/judge-verdict.json`
- 参考: ADR-20260505221432740 (test co-location)
- Epic: EPIC-20260518024809887
