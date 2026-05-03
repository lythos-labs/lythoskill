# ADR-20260503230522270: LeetCode-style Agent BDD harness with tmpdir sandbox + claude -p driver

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-03 | Identified after deck v0.9.0 release: Agent BDD has zero scenarios, no LLM-in-loop infrastructure; deck add/remove behavior unverified by automated tests |
| rejected | 2026-05-04 | Bypassed existing `@lythos/test-utils` Agent BDD convention (`*.agent.md`, in-loop LLM verification); written without user consultation; would have built parallel bash world instead of extending the 70-LoC TS runner. See "Why Rejected" below. |

## 背景

`packages/lythoskill-test-utils/SCENARIOS.md` 把测试分成三档:

1. **Unit** — 纯函数,bun:test 直跑,CI 必过。
2. **CLI integration BDD** — 子进程 + spawnSync + 文件断言,完全确定性,CI 必过(目前 34 scenario,全绿)。
3. **Agent BDD** — 真实 LLM 在隔离环境跑任务,judge 检查产出。**目前覆盖率 = 0**。

第 3 档的不存在直接导致两类问题验证不到:

1. **指令到行为的鸿沟**:`deck add github.com/foo/bar` 在 unit 层 / CLI 层都过,但 agent 在拿到自然语言任务"加上 pdf skill"时是不是真的会调对 CLI、参数对不对、输出能不能解读 —— 没有自动化验证。
2. **跨 session 一致性**:agent 在新环境 cold start 看到 deck 状态、能否 resume 工作 —— 全靠人工试。

`playground/agent-bdd/` 已经有 `bun:test` + `createProject` / `createAgent` / `createFs` fixture,但 3 个现有 scenario(arena-scaffold / deck-link-ambiguous / deck-link-backup)**没有真实 LLM 参与** —— 它们其实是 CLI integration BDD 的"agent flavored"包装,跑的还是 spawnSync。Agent BDD 名字下挂的是 CLI BDD 的实质。

并且,`packages/lythoskill-arena/` 的 arena 模式给了一个现成的同类问题模板:
- `sides/<run-id>/` 隔离 workspace
- `runs/<run-id>.md` 标准产出位置
- `report.md` judge 输出

Arena = N 个 agent × 同一个 task × judge 多目标评分。
Agent BDD = 1 个 agent × 一个 task × judge 二元 pass/fail。
**两者结构同构,只是 N 和 judge verdict 形式不同。**

## 决策驱动

- **Pareto 前沿**: 隔离强度(Docker > VM > tmpdir > cwd 切换)和环境准备方便性反向 —— 越强隔离环境准备越累。tmpdir + cwd 切换是非支配解(linux-like、POSIX 工具就能做、无外部依赖)。
- **Agent 端零侵入**: 测试不需要 agent 端装任何 SDK / hook,只要能 `claude -p <prompt> -- > OUTPUT.md` 就行。
- **Judge 必须是脚本**: 不能让另一个 LLM 当 judge —— LLM judge 在二元 pass/fail 场景 over-engineered 而且引入新的不确定性。决定性 shell 脚本断言文件状态足够。
- **Bootstrap 顺序**: 先用 `claude -p` 手跑确认问题定义合理 → 再用 `bun.spawn` / `Bun.$` 自动化 → 最后再考虑并行。**不一上来就构建 driver 框架**。
- **与 arena 共享基建**: 两边的 sides/runs/judge 结构对齐,后续可以提取共用 lib(`@lythos/test-utils` 的 leetcode subpath)。
- **服务器 ops 最佳实践**: 初始化脚本用 bash + `set -euo pipefail` + `mktemp` + `trap`,不引入 framework。

## 选项

### 方案A: 强隔离(Docker / firejail / nsjail)

每个 problem 起一个 container,装好 bun + claude CLI,挂载只读 seed,可写 work dir。

**优点**:
- 隔离强,host 完全干净
- 网络可关
- 资源可限

**缺点**:
- 准备一次环境(装 image / 调 mount)就够把人劝退
- claude CLI 在容器里要重新解决 auth / token / 网络
- 测试 deck CLI 而不是测试 docker 自己,工具复杂度 > 测试本身复杂度
- macOS / windows 上跑要 docker desktop,环境要求倒推回来更重
- **过度设计**:deck CLI 在 host 上不 mutate 任何东西(只动 cwd 下的 toml + .claude/skills/),tmpdir 已经够干净

### 方案B: tmpdir + cwd 切换 + bash 初始化(selected)

每个 problem 在 `tmpdir()/lyth-bdd-<problem>-<rand>/work/` 下展开 seed,brief 通过文件给 agent,output 写到 `runs/<problem-id>-<ts>/OUTPUT.md`。Agent 必须 `cd` 进 sandbox 后才允许操作。Judge 是 bash 脚本读 sandbox 状态 + OUTPUT.md。

**目录约定**:

```
playground/agent-bdd/leetcode/
├── README.md
├── bin/
│   ├── init-run.sh          # init-run.sh <problem-id> → 输出 sandbox 路径 + 运行命令
│   └── judge.sh             # judge.sh <run-dir> → 调用 problem 的 judge.sh,exit 0/1
├── problems/
│   └── <problem-id>/
│       ├── brief.md         # agent 看到的题面(只读)
│       ├── seed/            # 初始 sandbox 状态(整体复制进 work/)
│       └── judge.sh         # 题目特化的断言脚本(read-only against work/)
└── runs/                    # gitignored,每次 init 在这里 mktemp 一个 dir
    └── <problem-id>-<ts>/
        ├── brief.md         # 复制自 problem
        ├── work/            # agent 的 cwd —— seed/ 的内容在这
        ├── OUTPUT.md        # agent 写最终报告(claude -p 重定向)
        └── verdict.txt      # judge 写 PASS / FAIL + 原因
```

**优点**:
- 0 外部依赖(bash + bun + claude 已有)
- macOS / linux 都通(POSIX)
- 失败的 run 留在 `runs/` 直接看,不用 docker exec / kubectl logs
- `init-run.sh` 输出明确的 cd + 运行命令,人/脚本都能消费
- 与 arena 的 sides/runs/judge 结构一致 —— 后续可以共抽 lib
- bun shell `Bun.$` 后续自动化时无缝替换 `claude -p` 入口,harness 不变

**缺点**:
- 没有网络隔离 —— problem 必须明确禁用 / 不依赖网络访问(用 localhost cold pool 模拟)
- 没有资源限额 —— pathological agent 行为可能写满 tmpdir(可接受,有 `trap cleanup`)
- 不能跨机重放(tmpdir 路径不可移植)—— 但测试目的是 local CI 不是分布式

### 方案C: bun:test + LLM mock

继续用现有 bun:test fixture,但把 agent 调 LLM 部分 mock 掉,只测 prompt 拼装是否正确。

**优点**:
- CI 可跑
- 确定性

**缺点**:
- mock 的 LLM 不是真实 LLM —— 跟手写 unit test 一样没新增信号
- Agent BDD 的核心价值(验证真实 agent 在不熟悉环境下的行为)直接被 mock 掉
- 跟现有的 CLI integration BDD 重叠

## 决策

**选择**: 方案 B(tmpdir + bash + claude -p driver)。

**原因**:
- 隔离/便利权衡的非支配解 —— 复杂度匹配测试目的
- 服务器 ops 标准模式(bash + tmpdir + trap)经过几十年验证,搬过来零成本
- 跟 arena 同构,两套基建可共抽
- bootstrap 路径清楚:**手跑 claude -p 验证问题定义** → 切换 `Bun.$` 自动化 → 加 problem → 再考虑并行/CI

## 影响

- **正面**:
  - Agent BDD 第 3 档从 0 到 1,有可复用的 problem 模板
  - deck add/remove 的 agent 端语义可被验证(brief 给自然语言任务,judge 看最终状态)
  - `arena` 和 `agent-bdd` 在 sides/runs/judge 上对齐,后续抽 `@lythos/test-utils/leetcode` 自然
  - `claude -p` 作为初始 driver 不锁死 — agent 平台变了换 driver 不动 problem/judge
- **负面**:
  - 不进 CI(每次 run 烧 token + 时间)。以"发版前手动跑套件"或"夜间 cron"对待
  - problem 多了之后 brief 维护成本不可忽视(题面要 self-contained)
  - 没有 sandbox 之外的 chaos engineering(网络抖、磁盘满)—— 留给后续 ADR
- **后续**:
  1. 用 `claude -p` 手跑第一个 problem(`deck-link-from-cold-pool`)端到端验证
  2. 跑通后用 `Bun.$` 替换手跑入口,并行支持留待第 3 个 problem
  3. 加 problem: `deck-add-fq-from-natural-language`(测自然语言→FQ path),`deck-remove-cleans-symlink`(remove 不动 cold pool),`deck-link-after-bare-name-collision`(consume 错误信息建议)
  4. 抽 `@lythos/test-utils/leetcode` 模块,arena 的 sides/runs/judge 复用
  5. 评估 LLM-as-judge 是否值得(暂时倾向不引入,二元 verdict 用 shell 已经够)

## 相关

- 关联 ADR: ADR-20260503222838594(kanban pull mode) — 本 ADR 是新增 testing 类目,不参与 in-progress WIP
- 关联包: `playground/agent-bdd/` (实施位置), `packages/lythoskill-arena/` (结构参照), `packages/lythoskill-test-utils/SCENARIOS.md` (覆盖率定义文件)
- 关联 CLI: `bunx @lythos/skill-deck`(被测) / `claude -p`(driver)
- 关联文档: `playground/agent-bdd/README.md`(harness 用法)

## Why Rejected (2026-05-04)

**Process failure** — written and committed (in `e6c3606`) without user consultation. User's correction:
> "明明可以用ts，学之前的东西吧" / "东西竟然沉淀进不在git管理的playground。应该是个没能好好回忆的session干出来的事"

**Substantive failure** — bypassed existing convention. `packages/lythoskill-test-utils/SCENARIOS.md` already defines the Agent BDD shape and it directly contradicts this ADR's design drivers:

| This ADR proposed | SCENARIOS.md convention |
|---|---|
| 新建 `playground/agent-bdd/leetcode/` 目录(需改 `.gitignore` 例外) | Scenarios live alongside CLI scenarios in `packages/<x>/test/scenarios/`(已 tracked) |
| Bash judge(`init-run.sh` / `judge.sh` / `pre-agent.sh`) | Markdown G/W/T 文件,由 `bdd-runner.ts` (~70 LoC TS) 驱动 |
| 决定性 shell 断言 | Verification 由 in-loop LLM 做(明文写在 SCENARIOS.md "Agent BDD" 段) |
| `bun:test` parallel world (`playground/agent-bdd/scenarios/*.test.ts`) | 统一用同一个 `runCli`/`assertOutput`/`setupWorkdir` |

**Decision drivers that don't survive scrutiny**:

- 第 2 条"Agent 端零侵入" — 真要做 zero-侵入,继续用 `@lythos/test-utils` 的 `runCli`/`spawnSync` 即可,不需要新建 bash 层。
- 第 3 条"Judge 必须是脚本,不能让 LLM 当 judge" — 直接和 SCENARIOS.md "Agent BDD" 段冲突。Agent BDD 的全部信号就来自 in-loop LLM verification;移除 LLM 等于把第 3 档退化成第 2 档。
- 第 5 条"与 arena 共享基建" — 共享 arena 是真问题,但解法是 `@lythos/test-utils` 抽象,不是新开 leetcode 子目录。

**The legitimate concern that survives**: Agent BDD 类目 = 0 scenario,这是真 gap。但解法是写第一个 `*.agent.md` scenario,而不是替换 runner。

## Replacement

延续此 ADR 想解决的问题,但走既有约定:

1. 在 `packages/lythoskill-test-utils/src/bdd-runner.ts` 加一个 `runClaudeAgent(cwd, brief)` helper(`Bun.$` / `Bun.spawn` 拉 `claude -p --dangerously-skip-permissions`)。
2. 第一个 `*.agent.md` scenario 落在 `packages/lythoskill-deck/test/scenarios/skills-introspection.agent.md` —— 取自本 ADR 后续清单第 3 条衍生想法(JSON 自报技能)。
3. SCENARIOS.md "Agent BDD — empty today" 段更新计数。
4. 不再需要 `playground/agent-bdd/leetcode/` 目录、不再需要 `.gitignore` 例外、不再需要单独 ADR(走 SCENARIOS.md 既有规范即可)。
