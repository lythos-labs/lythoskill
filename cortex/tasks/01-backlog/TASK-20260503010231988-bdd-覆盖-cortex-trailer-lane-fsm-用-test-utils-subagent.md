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

## ⚠️ 仓库现状 vs Spec 冲突点(T1-T3 经验,必读)

T6 已知 4 个冲突点,**按以下处理**(发现新冲突点 → **先报告再动手**)。

### 冲突 1: `@lythos/test-utils` 极其轻量

仓库现状:`packages/lythoskill-test-utils/src/` 只有 3 个 export:`runCli`/`assertOutput`/`setupWorkdir`。没有 markdown parser、没有 scenario DSL、没有 git fixture helper。

**处理**:runner.ts 自己实现 markdown scenario 解析(frontmatter + Given/When/Then 分块)和 git fixture setup。不要引入 Cucumber / Vitest / Jest。保持和 deck runner 一样的"自研轻量"风格。

### 冲突 2: tmpdir 无法装真实 husky hook

仓库现状:post-commit hook 依赖 `.husky/post-commit` 存在 + `git` 配置。tmpdir 里 `git init` 不会自动装 husky。

**处理**:hook 行为用**等价 CLI 命令直接调用**来模拟,而不是真的装 hook + 做 commit。例如 "Closes: TASK-XXX" 的测试等价于直接跑 `bun cli.ts complete TASK-XXX` 并断言文件移动。这是 trunk 实现;完整 hook end-to-end 测试留给后续扩展。

### 冲突 3: runner.ts 已经是骨架代码

仓库现状:`packages/lythoskill-project-cortex/test/runner.ts` 已有类型定义 + 空函数签名 + TODO 注释。3 个 scenario markdown 文件已创建。

**处理**:填充骨架实现,不要重写文件结构。scenario 解析器读 `test/scenarios/*.md`,提取 frontmatter + Given/When/Then 块。

### 冲突 4: 测试 ID 不能和真实文档冲突

仓库现状:cortex 里已有大量真实 task/epic/adr。测试若用真实 timestamp ID 可能撞车。

**处理**:测试 fixture 用 fake ID 格式(`TASK-TEST-001`、`EPIC-TEST-001`、`ADR-TEST-001`),不走 CLI 的 timestamp 生成。fixture setup 直接写文件到 tmpdir 的 cortex/ 下,绕过 `cortex task` 创建命令。

### 通用规则:遇到未列出的冲突点

- 不要自己发明 migration 或引入新测试框架
- 在本卡 "进度记录" 段追加 note 或新写 note 文件
- 报告中明确说"我看到 X 与 Y 冲突,我建议方案 Z,但没动手"

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

- 已有骨架: `packages/lythoskill-project-cortex/test/runner.ts`(类型定义 + TODO)
- 已有场景: `packages/lythoskill-project-cortex/test/scenarios/*.md`(3 个 markdown 文件)
- 实现位置: 填充 runner.ts 的 TODO 函数
- 引用: `packages/lythoskill-deck/test/runner.ts`(deck runner pattern 参考)
- 引用: `packages/lythoskill-test-utils/src/bdd-runner.ts`(现有 primitives: runCli / assertOutput / setupWorkdir)

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
