# TASK-20260503010231988: BDD 覆盖 cortex trailer + lane FSM(用 test-utils + subagent)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |

## 背景与目标

ADR-20260503003314901 后续 T6,ADR-20260503003315478 后续 7。

用 `@lythos/test-utils` BDD harness 覆盖:
- Trailer 触发的 task / ADR / epic 三类文档 verb 流转
- Trailer 缺失 / 格式错的 fallback
- Lane FSM(空 / 满 / override / checklist skip / checklist 全过)

参考 `packages/lythoskill-deck/test/runner.ts` runner pattern。拉 subagent 跑 sample,验证 agent + skill + CLI 控制回路一致。

## 需求详情

- [ ] 新增 `packages/lythoskill-project-cortex/test/runner.ts`(沿用 deck 风格)
- [ ] Scenarios(.feature 或 markdown,据 test-utils 当前格式):
  - `Closes: TASK-XXX` → task done + 跟随 commit
  - `Task: TASK-XXX review` → task review
  - `ADR: ADR-XXX accept` → ADR 移 accepted + Status History 更新
  - `Epic: EPIC-XXX done` → epic 移 done + Status History
  - 多条 trailer 同 commit 串行执行
  - 格式错(`Closes: not-an-id`)→ warn,无跟随 commit
  - 状态非法(对 backlog 直接 done)→ warn,无跟随 commit
  - Lane: 空 → epic create 通过
  - Lane: main 已满 → 拒绝
  - Lane: main 已满 + override → 通过,reason 入 frontmatter
  - Checklist: 跳过 → 通过 + warn + reason 入 frontmatter
  - Checklist: 全过 → 通过,frontmatter 标 completed
- [ ] Subagent(Agent tool with subagent_type=general-purpose)跑每条 scenario 一次:读 SKILL.md → 调 cortex CLI / 模拟 commit → 看结果 → 验证状态闭环
- [ ] 至少 1 条 scenario 在 cortex SKILL.md 中作为示例引用

## 技术方案

- 复用 `@lythos/test-utils` BDD primitives;不引入 Cucumber / Vitest(参考 memory: `project_test_utils_bdd_control_loop.md`)
- 测试 fixture 用 tmpdir 初始化 git + cortex 目录(避免污染主项目)
- Subagent 输入仅:task 卡 + AGENTS.md + cortex skill SKILL.md(验证 task = bootloader 假设)

## 验收标准

- [ ] 12+ scenarios 全绿
- [ ] Subagent 跑至少 3 条 scenarios 成功(trailer 正常 / lane 满 / checklist skip),无人工干预
- [ ] runner 可独立 `bun packages/lythoskill-project-cortex/test/runner.ts` 跑出结果
- [ ] CI(若有)能跑这套测试

## 进度记录

(执行时追加)

## 关联文件

- 新增: `packages/lythoskill-project-cortex/test/runner.ts`
- 新增: `packages/lythoskill-project-cortex/test/scenarios/*.{feature,md}`
- 可能修改: `packages/lythoskill-test-utils/src/*`(若 BDD primitive 需要扩展)

## 引用

- ADR: ADR-20260503003314901(后续 T6)、ADR-20260503003315478(后续 7、影响段 BDD 场景列表)
- Epic: EPIC-20260503010218940(主题E)
- 模板参考: `packages/lythoskill-deck/test/runner.ts`
- Memory: `project_test_utils_bdd_control_loop.md`(为什么 BDD 而不 Cucumber)
- Sibling: TASK-20260503010227902(T1)、TASK-20260503010228602(T2)、TASK-20260503010229362(T3)、TASK-20260503010230554(T4)— 实现完成后 scenarios 才能跑通

## Git 提交信息建议

```
test(cortex): BDD coverage for trailer + lane FSM with subagent samples (TASK-20260503010231988)

Closes: TASK-20260503010231988
```

## 备注

- 软依赖 T1-T4 实现完成
- 可与 T5 文档同步推进 — T5 examples 应从本 task scenarios 抽取
