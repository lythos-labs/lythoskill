# TASK-20260504005000534: Add/refresh/remove/prune Agent BDD scenarios (4 *.agent.md files)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created — Theme D 写型 scenario,依赖 T7+T8 |

## 背景与目标

T8 把 read-only tracer bullet 跑通后,本卡补齐 deck CLI 的 4 个 mutation 命令的 Agent BDD scenario:`add` / `refresh` / `remove` / `prune`。每条命令一个 `*.agent.md`,验证:

- agent 读 SKILL.md,挑对 CLI 命令
- 命令产生预期 fs mutation(file/symlink/deck.toml)
- agent 落 checkpoint 含 `fs_mutations[]`,LLM judge 读 substrate(checkpoint + 实际 fs)而非 stdout
- 4 条 scenario 互独立(不相互前置 fixture)

依赖:**T7** (`TASK-20260504004947351`) helper + schema、**T8** (`TASK-20260504004954526`) scenario 文件结构与 judge harness 已稳定。

可拆 1 批 commit(4 scenarios)或拆 4 批,执行者权衡。

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 D / D4 末段 | 4 命令一一对应的设计 |
| 前置 task A | `cortex/tasks/01-backlog/TASK-20260504004947351-...md` (T7) | helper + schema |
| 前置 task B | `cortex/tasks/01-backlog/TASK-20260504004954526-...md` (T8) | scenario 文件结构、judge harness |
| Wiki/lessons | `cortex/wiki/03-lessons/2026-05-04-agent-verification-leetcode-shape-llm-judge.md` | mutation 类 substrate 必须含 `fs_mutations[]` |
| 反例 ADR | `cortex/adr/03-rejected/ADR-20260503230522270-...md` | 不要 grep stdout 字面量,judge 读 checkpoint+fs |
| 既有命令实现 | `packages/lythoskill-deck/src/{add,refresh,remove,prune}.ts` | 对应每条 scenario 验证的命令源 |
| 既有 CLI BDD | `packages/lythoskill-deck/test/cli-bdd.ts`(参考) | 已有 21 个 CLI integration 场景作 baseline |
| Bootloader 原则 | `cortex/adr/02-accepted/ADR-20260503003315478-...md` | 4 个 scenario 都是 self-contained |

## 需求详情

每条 scenario **vertical slice**:1 命令 → 1 scenario → judge pass → 下一条。禁止水平切片。

- [ ] **D9.a `add.agent.md`**
  - **Brief**:cwd 含空 `skill-deck.toml` + cold pool 含 X skill;agent 用 deck CLI 把 X 加到 deck(可指定 `--as` alias);落 checkpoint
  - **Expected**:`skill-deck.toml` 有 1 行 `[[skills]]` 指向 X;`.claude/skills/<alias-or-name>` symlink 创建,target 落到 cold pool;checkpoint `fs_mutations[]` 含 1 modify(deck.toml) + 1 create-symlink
- [ ] **D9.b `refresh.agent.md`**
  - **Brief**:cwd 已有 1 个 declared skill,deck 中相对源更新过(模拟版本变化);agent 调 `refresh` 让 working set 重新对齐
  - **Expected**:symlink 仍存在(target 可能不变,因为 fixture 设计可让其内容变 / 路径变);checkpoint 显示 `step: "deck.refresh"` + 命令成功;judge 读 fs 验证 reconciler 输出与 deck 声明一致
  - 设计 fixture 时要确保"refresh 有可观测变化"(否则 scenario 退化为 noop,judge 无意义)
- [ ] **D9.c `remove.agent.md`**
  - **Brief**:cwd 已有 1 个 declared + linked skill;agent 调 `remove` 把它去掉
  - **Expected**:`skill-deck.toml` 那行被删;`.claude/skills/<name>` symlink 被删;checkpoint `fs_mutations[]` 含 1 modify(deck.toml) + 1 delete(symlink);cold pool 仓库**不**被删(那是 prune 的事)
- [ ] **D9.d `prune.agent.md`**
  - **Brief**:cwd 含 deck 已声明 1 个 skill 但 cold pool 还有 2 个未引用的旧仓库;agent 调 `prune --yes` 收割
  - **Expected**:cold pool 那 2 个未引用仓库被删;1 个引用中的仓库不被删;deck.toml 不变;symlink 不变;checkpoint `fs_mutations[]` 含 2 delete
- [ ] **D9.e** SCENARIOS.md "Agent BDD" 段计数 1 → 5(T8 起 1,本卡 +4)
- [ ] **D9.f** harness 跑 4 个 scenario(各自独立 cwd / fixture)全 pass,judge 对 4 条都给一致 pass

## 技术方案

- **文件位置**:`packages/lythoskill-deck/test/scenarios/{add,refresh,remove,prune}.agent.md`(全 git tracked)
- **Fixture 复用**:把 T8 的 `setupAgentBddFixture(name, deckLines)` 参数化,4 scenarios 共用
- **fs_mutations 自检**:在每条 brief 末尾要求 agent **明确列出每一步 mutation**(不要总结"我改了几个文件",要逐项)——这样 judge 可对齐 expected
- **Judge 标准 escalation**:
  - 字段存在 + 数量正确(machine 可检)
  - 路径前缀正确(machine 可检)
  - 路径具体值(LLM judge,因为 alias 可能与 fixture 不同)
- **不要**写"agent 自己想 alias"的 scenario(本卡不测 brief 模糊性,留给后续 epic)
- **每条独立**:scenario 之间不共享 cwd,失败一条不应连带其他

## 验收标准

- [ ] 4 个 `*.agent.md` 文件落地
- [ ] 4 个 scenario 都本地跑通,judge 都给 pass
- [ ] 每个 checkpoint JSONL 含正确 `fs_mutations[]`(对照下表)
  - add: 1 modify + 1 create-symlink
  - refresh: ≥1 noop-or-update mutation(具体看 fixture 设计)
  - remove: 1 modify + 1 delete
  - prune: ≥2 delete(基于 fixture 给的未引用仓库数)
- [ ] SCENARIOS.md 计数 5;每个 scenario 在段中被列
- [ ] **不进 CI**;harness 显式标注
- [ ] judge 二次复算 verdict 一致

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
  - `packages/lythoskill-test-utils/SCENARIOS.md`(计数 + 列举)
  - `packages/lythoskill-deck/test/runner.ts`(或 `agent-bdd-runner.ts`,加 4 个 scenario 的入口)
- 新增:
  - `packages/lythoskill-deck/test/scenarios/add.agent.md`
  - `packages/lythoskill-deck/test/scenarios/refresh.agent.md`
  - `packages/lythoskill-deck/test/scenarios/remove.agent.md`
  - `packages/lythoskill-deck/test/scenarios/prune.agent.md`
  - `packages/lythoskill-deck/test/fixtures/{add,refresh,remove,prune}/...`(每条独立 fixture)

## Git 提交信息建议
```
feat(deck): add Agent BDD scenarios for add/refresh/remove/prune (TASK-20260504005000534)

- 4 *.agent.md scenarios — one per mutation command
- Each verifies fs_mutations[] in checkpoint matches expected mutations
- SCENARIOS.md Agent BDD count 1 → 5
- Independent fixtures, no cross-scenario state coupling

Closes: TASK-20260504005000534
```

## 备注

- **必须**等 T7 + T8 都合入并跑稳定
- **不要**为了 4 条一致而硬写 share fixture——独立 fixture 对失败定位的好处大于代码复用
- 拆 1 批 vs 4 批 commit:首选 1 批(epic 已对齐);若一条 scenario 调试时间长,可单独拆出
- 失败诊断:judge 不一致 → 该条 brief 太模糊,把 expected 字段名收紧;某条 mutation 没出现 → fixture 误差或 reconciler 真有 bug(回流到 white-box 单测)
