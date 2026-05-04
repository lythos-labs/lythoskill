# TASK-20260504183646317: T3: Migrate deck Agent BDD to unified runner (single+absolute mode, regression 26/26)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created |
| in-progress | 2026-05-04 | Started |
| completed | 2026-05-04 | Closed via trailer |

## 背景与目标

T1 把 Agent BDD 编排核心搬到 `packages/lythoskill-test-utils/`,T2 用 Zod 锁所有 I/O。T3 让 deck 包**实际消费**新基础设施——证明抽象成立,不是只移位。

deck 包当前 `*.agent.md` scenario 数量(待启动时核实):
```
packages/lythoskill-deck/test/*.agent.md
  agent-adds-a-skill-to-the-deck.agent.md
  agent-introspects-deck-skills-via-checkpoint.agent.md
  agent-prunes-unreferenced-cold-pool-repos.agent.md
  agent-refreshes-a-declared-skill.agent.md
  agent-removes-a-skill-from-the-deck.agent.md
```
5 个 scenario × 1 player × 1 deck = single+absolute 模式。

回归基线(handoff `daily/2026-05-04.md` 测试矩阵):
- deck unit: 49 pass
- deck CLI BDD: 21 pass
- deck Agent BDD: 5 pass(本地)
- 合计本任务相关:**5/5 Agent BDD + 49+21=70 其他** → 任务名说的 "26/26" 是占位,实际门槛是 **5/5 Agent BDD 全绿 + 49+21 不退化**

## 需求详情

- [ ] **修改 `packages/lythoskill-deck/test/runner.ts`** 删去已迁走的 4 个函数(parseAgentMd / buildJudgePrompt / runLLMJudge / runAgentScenario),改为 import `@lythos/test-utils`
- [ ] **保留 deck-specific 部分**:
  - `setupAgentWorkdir`(写 skill-deck.toml + mock skill 链)
  - `buildDeckToml` / `createMockSkill`
  - 任何 deck 独有的 `Scenario` 类型扩展
- [ ] **测试调用形态**(单 + absolute):
  ```ts
  await runAgentScenario({
    scenarioPath: 'test/agent-adds-a-skill-to-the-deck.agent.md',
    agent: useAgent('claude'),
    setupWorkdir: setupAgentWorkdir,    // deck-specific
    baseDir: 'runs/agent-bdd',
  });
  ```
- [ ] **artifact 路径不变**(向后兼容):`runs/agent-bdd/<ts>/<scenario>/{_checkpoints,judge-verdict.json,agent-stdout.txt,agent-stderr.txt}`,确保历史 run 比对仍可读
- [ ] **5 个 `.agent.md` scenario body 0 改动**(只通过 schema 校验,不重写 fixture)
- [ ] **deck CLI BDD(21 pass)和 unit(49 pass)零退化**
- [ ] **如果有 schema 校验失败的 scenario**,**不要绕过**——回到 T2 改 schema 接受现有 fixture,或修 fixture(优先后者,前者只允许补 optional 字段)

## 技术方案

### 改动范围(预估)

`packages/lythoskill-deck/test/runner.ts`(T10 后 759 行):
- **删除**:`parseAgentMd` / `buildJudgePrompt` / `runLLMJudge` / `runAgentScenario`(T1 已搬到 test-utils)
- **保留**:`setupAgentWorkdir` / `buildDeckToml` / `createMockSkill` / `Scenario`(deck-specific)
- **修改**:测试入口改为 `import { runAgentScenario, useAgent } from '@lythos/test-utils';`
- **预期净减**:~200 行(把 4 个函数交给 test-utils 后)

### scenario fixture 不动

不改 `*.agent.md` body。如果 T2 的 `AgentScenario` schema 有可选字段 fixture 没填,**走 default**;如果 schema 必填字段 fixture 漏填,补 fixture(标记为 T3 范围内的修正)。

### 回归门槛(必须全部通过)

| 测试 | 命令 | 基线 |
|---|---|---|
| deck unit | `bun test packages/lythoskill-deck/src/*.test.ts` | 49 pass |
| deck CLI BDD | `bun test packages/lythoskill-deck/test/cli-bdd.test.ts` | 21 pass |
| deck Agent BDD | `bun test packages/lythoskill-deck/test/agent-bdd.test.ts`(或等价入口) | 5 pass |
| test-utils | `bun test packages/lythoskill-test-utils/src/*.test.ts` | T1+T2 全绿 |

### artifact 兼容

T1 的 `runAgentScenario` opts 暴露 `baseDir` 和 `artifactDir` 命名规则。本任务确保:
- `baseDir = 'runs/agent-bdd'`
- 时间戳目录格式 `YYYYMMDD-HHMMSS`(与 `runs/agent-bdd/20260504-172449/` 历史一致)
- 子目录名 = `scenario.name` slug

如果 T1 的 default 已经满足,deck 这边不需要 override。

## 验收标准

- [ ] `packages/lythoskill-deck/test/runner.ts` 删除 4 个迁移函数,行数显著下降
- [ ] `bun test packages/lythoskill-deck/src/*.test.ts` → 49 pass
- [ ] `bun test packages/lythoskill-deck/test/cli-bdd.test.ts` → 21 pass
- [ ] deck Agent BDD 5/5 通过(且 `judge-verdict.json` 通过 Zod 校验)
- [ ] `runs/agent-bdd/<ts>/<scenario>/` 路径形态与历史一致
- [ ] 现有 5 个 `*.agent.md` body 0 改动(可补 frontmatter 必填字段,但不改 Given/When/Then/Judge body)
- [ ] PR 端到端 diff:`packages/lythoskill-deck/test/runner.ts` 净减 ≥ 150 行(import + 删除应用)

## 进度记录

## 关联文件
- 修改:
  - `packages/lythoskill-deck/test/runner.ts`(主战场)
  - `packages/lythoskill-deck/package.json`(确认 `@lythos/test-utils` workspace 依赖已声明)
- 可能修改:
  - `packages/lythoskill-deck/test/*.agent.md`(仅补 frontmatter 必填,不改 body)
- 不修改:
  - `packages/lythoskill-deck/src/`(unit 测试不受影响)

## Git 提交信息建议
```
refactor(deck): T3 migrate Agent BDD to unified test-utils runner (TASK-20260504183646317)

- Remove parseAgentMd/buildJudgePrompt/runLLMJudge/runAgentScenario from deck/test/runner.ts
- Import from @lythos/test-utils with useAgent('claude') and setupAgentWorkdir injection
- Regression: 5/5 Agent BDD + 49 unit + 21 CLI BDD all green
- Artifact paths unchanged for historical comparability

Task: TASK-20260504183646317 complete
```

## 备注

**门槛严格**:回归一旦红任何一档(unit / CLI BDD / Agent BDD),**回退本任务**而非绕过。本任务是抽象正确性的实证,失败不能拿 "T2 schema 太严" 当借口——先调 schema 让 fixture 兼容,而不是降低 schema 强度。

**5 vs 26**:任务标题写的 "26/26" 是早期占位估计,handoff `daily/2026-05-04.md` 实际记录 deck Agent BDD = 5 pass。本任务正文以 5 为准。
