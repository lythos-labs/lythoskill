# TASK-20260518111443694: Standardize layered testing with plan-mode integration layer

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |

## 背景与目标

当前三层测试：
1. **Unit**: 纯逻辑 (702 pass) — mock IO，验证返回值。覆盖充分。
2. **Plan-mode integration**: 构建 plan/command → 验证命令正确（不执行）→ 对比标准答案。**这是缺失层**。
3. **reproduce.sh BDD**: 全 IO + agent (expensive, selective)。覆盖 1/6 deck scenarios。

Plan-mode 的本质：**确认"如果执行，会做正确的事"**。不验证 IO 是否成功（那不是 unit/integration 测试的事），验证 IO Monad 的命令是否符合期望。

举例：`buildRefreshPlan` 对 git 类型 target 应生成 `gitRoot` 指向正确路径 → `executeRefreshPlan` 会调用 `gitPull(gitRoot)` → 但我们不跑 git pull，只验证 gitRoot 正确 + gitPull 收到了正确参数。

## 需求详情
- [ ] 分层测试文档: `TESTING.md` 更新，明确 Unit / Plan / BDD 三层定义 + CI 策略
- [ ] Plan-mode 测试模式标准化: `expect(buildPlan(input)).toMatchReference(expected)` pattern
- [ ] 对已有 plan 函数补充 command 验证测试（至少 2 个包）:
  - `deck/refresh-plan`: verify gitRoot correct for git-type targets
  - `cold-pool/reconcile-plan`: verify reconcile commands match expected locator set
- [ ] Plan-mode 测试文件命名约定: `*.plan-test.ts` 或 co-located in `*.test.ts` with `describe('plan verification')`

## 技术方案

三层测试体系：
```
Unit (fast, CI)     → packages/*/src/*.test.ts     — pure logic, Bun test
Plan (fast, CI)     → packages/*/src/*.test.ts     — build plan, verify command shape
BDD  (slow, manual) → showcase/*-bdd/reproduce.sh  — full IO + agent, selective
```

Plan-mode pattern:
```ts
test('refresh plan generates correct git root for remote skill', () => {
  const plan = buildRefreshPlan(deckWithGitSkill, { coldPool })
  const gitTarget = plan.targets.find(t => t.type === 'git')
  expect(gitTarget!.gitRoot).toContain('github.com/foo/bar')
})
```

Plan 不执行 IO。它验证"如果执行，会做正确的事"。

## 验收标准
- [ ] TESTING.md 包含三层定义
- [ ] 至少 2 个包有 plan-mode command 验证测试
- [ ] Plan-mode 测试在 CI 可运行（不依赖外部服务）
- [ ] 测试命名约定清晰可识别
