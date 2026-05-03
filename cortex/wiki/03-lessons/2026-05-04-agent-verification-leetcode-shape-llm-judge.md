# Agent Verification = LeetCode Shape + Checkpoint Substrate + LLM Judge

> Date: 2026-05-04
> Trigger: Rejecting ADR-20260503230522270 (leetcode-style bash harness) and expanding the deck-verification epic to two-sided scope. The reject 教训 was: 把 leetcode 范式抄对了一半,中间一格(judge substrate)选错衬底。

## The 三层模型

Agent verification 的形态是 leetcode-shape("submit work → verify → verdict"),但**只有三层中的两层能直接抄过来**,中间那一层必须替换。

| 层 | LeetCode | Agent BDD(deck 等行为类) | 能否照抄 |
|---|---|---|---|
| **Pattern**(形态) | submit code, judge runs, AC/WA verdict | submit agent run, judge inspects, pass/fail | ✅ 同形 |
| **Substrate**(被判物) | hidden test cases — 脚本断言整数/数组/字符串相等 | **结构化 checkpoint 产物 + 文件系统状态** | ❌ **必须换衬底** |
| **Judge**(判官) | 脚本(deterministic) | LLM(SCENARIOS.md "Agent BDD" 段) | ❌ **必须换判官** |

## 为什么中间那一格必须换

LeetCode 的 judge 能脚本化,是因为代码题输出形态**是定义死的**(整数、数组、字符串相等)。

Agent 完成 "`deck add` 应该新增一个 cold pool 软链" 这类任务时,**输出形态本身是语义的**:

- 文件名带 timestamp / hash → 每次都不一样
- 绝对路径取决于 cwd / `$HOME` / 项目位置 → 每次都不一样
- stdout 措辞由 agent 自由发挥 → "已添加 / Successfully added / 加好了" 都对
- 副作用顺序、辅助文件、日志格式 → agent 决策空间内的合理变化

**只有"语义上做对了"才是要判的事**。

如果像原 ADR 想做的那样,把脚本断言塞进 judge,要么:
- 死板地 grep 字面量 → 一次 agent 措辞调整就红
- 写一堆 regex 兜底 → 维护成本爆炸,且依然漏
- 把"语义对错"压扁成 "exit code = 0" → 退化成 CLI integration BDD,丢掉了 Agent BDD 这一档存在的理由

所以 judge 那一格必须是 LLM。这就是 SCENARIOS.md 段首明文 *"LLMs read Given/When/Then natively — no Cucumber, no plugin layer"* 的全部理由。

## 但 LLM judge 不是裸眼看 stdout

如果只给 judge "agent 跑完了 / 这是 stdout 一坨 / 你判一下",会出三个问题:

1. **不可 replay**:同一 stdout 给两个不同 LLM judge,判决可能不同。无法 audit、无法回归。
2. **不可 review**:人类要 review 一次 scenario 跑得对不对,得通读 N 屏 stdout。
3. **不可 debug**:scenario 失败时,定位"agent 哪一步偏了"得回放整个上下文。

**解法是中间层:agent 输出 checkpoint 产物作为 judge 的 substrate**。

## Checkpoint = "我做完了 / 位置在 / 你看"

一个 checkpoint 不是冷数据,是 **agent 主动留下的自陈+定位+邀请验证**三件套:

| 字段 | 语义 | 例子 |
|---|---|---|
| `step` | 我做了什么 | `"step": "deck.add"` |
| `tool` / `args` | 我用了什么工具 / 什么参数 | `"tool": "bunx @lythos/skill-deck add", "args": ["--as", "X", "/path/Y"]` |
| `exit_code` / `stdout_summary` | 这一步结果 | `"exit_code": 0, "stdout_summary": "added X"` |
| `fs_mutations[]` | 我动了什么文件(按相对路径) | `[{"action": "modify", "path": "skill-deck.toml"}, {"action": "create-symlink", "path": ".claude/skills/X", "target": "../../cold/Y"}]` |
| `final_state` | 我自陈最终的状态 | `{"deck_lines_added": 1, "symlinks_created": 1, "all_alias_unique": true}` |

JSONL 形式输出到 `<cwd>/_checkpoints/*.jsonl`。Arena 的 `runs/run-A.md` + 评分 JSONL 是这个 substrate 的**已存在范本**——本课不是发明新模式,是把 arena 已经在做的事识别出来、写进 SCENARIOS.md "Agent BDD" 工具链。

## 三层共同发挥的效果

- **可视化**: human 一眼看 `_checkpoints/` 的 5-10 行 JSONL,就知道 agent 走过什么步骤;不用读 stdout
- **可 review**: 第二个 LLM judge 拿同一 brief + checkpoint 重判,判决一致性可测
- **可 replay / debug**: scenario 失败时,checkpoint 标记了精确出错步骤;可单独提取那一步的 fs state 复查
- **不退化**: judge 仍是 LLM(语义判),但读的是结构化产物,不是裸眼 stdout

## 反例(原 ADR-20260503230522270 把哪一格抄错了)

原 ADR 把 leetcode 范式整套搬过来,但**没识别中间那一格的衬底差异**:

| 它做对的 | 它做错的 |
|---|---|
| Pattern 选对(submit work / verify / verdict) | **Substrate 抄成 hidden test cases**(假设输出形态死的) |
| 想要"agent 隔离" | **Judge 选成 bash 脚本**(`init-run.sh` / `judge.sh`) |
| 想复用 arena pattern | **新建 `playground/agent-bdd/leetcode/` 目录**(脱离既有 `bdd-runner.ts` + `*.agent.md` 约定;脱离 git 跟踪) |

把它放在 03-rejected/ 是对的,但**它揭示的真问题(deck 包 0 个 Agent BDD scenario)是真 gap**。本 epic 主题 D 就是真 gap 的正确解。

## 设计准则(产生于本 lesson)

设计或评估任何"验证 agent 行为"的机制时,先过这张 checklist:

- [ ] **Pattern**: 是不是 leetcode-shape("submit work → verify → verdict")?如果不是,可能漏了"agent 自陈完成"这一步
- [ ] **Substrate**: agent 留下的可被判物**是不是结构化产物**(JSONL / fs state),还是只有自由文本 stdout?
- [ ] **Judge**: 判官是 LLM 还是脚本?如果是脚本,**输出形态是不是真的死的**(像 leetcode 题)?——如果 agent 行为输出含语义自由度,脚本判官会退化
- [ ] **Reuse**: 有没有用既有 `bdd-runner.ts` + `*.agent.md` + arena 三件套?**新起的 bash / 子目录就是失败信号**
- [ ] **Tracked**: 产物是不是在 git tracked 路径下?`playground/` 这种 .gitignored 目录意味着压缩后会失忆

## 关联文档

- [SCENARIOS.md "Agent BDD" 段](../../packages/lythoskill-test-utils/SCENARIOS.md) — 三档测试中第三档定义,LLM in-loop verification 的源头
- [arena `agent-autonomous-arena.md`](../../packages/lythoskill-arena/skill/references/agent-autonomous-arena.md) — "Judge = Agent, Agent = Judge",同 agent 不同 mode 评分
- [arena `test-play-model.md`](../../packages/lythoskill-arena/skill/references/test-play-model.md) — leetcode-shape 在 deck duel / pick-add-cut-swap 上的具体 mapping
- [ADR-20260503230522270](../../adr/03-rejected/ADR-20260503230522270-leetcode-style-agent-bdd-harness-with-tmpdir-sandbox.md) — 反例
- [ADR-20260503180000000](../../adr/02-accepted/ADR-20260503180000000-unit-test-framework-selection-curator-mind.md) — Unit test framework(bun:test);第 4 条决策明文 "Agent BDD tests remain on custom test-utils runner"
- [EPIC-20260503234346583](../../epics/01-active/EPIC-20260503234346583-backfill-unit-test-coverage-for-deck-via-tdd.md) — 本 lesson 用于其主题 D 的设计指导
