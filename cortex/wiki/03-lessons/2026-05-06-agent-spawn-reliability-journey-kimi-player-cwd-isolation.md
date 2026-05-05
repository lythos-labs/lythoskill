# Agent Spawn 可靠性探险：从 6 次 monkey patch 到 1 次 Player 替换

> 2026-05-06，arena grounding 验证。一个晚上，6 个 commit 修 Claude CLI，从未跑通。
> 换 Kimi CLI，1 次跑通。Player 抽象的价值就在这里。

## 出发：arena 能跑吗？

arena pipeline 设计好了 — agent spawn → task execution → per-cell judge → comparative judge。IO 注入的 plan 层测试 95% 覆盖。该验证 IO 层了。

第一个 arena run：`claude -p` 产出空 stdout。两个 agent 都 0 字节。Judge 正确识别为 FAIL/ERROR，但 agent 根本没做事。

从 daily handoff 看，这个问题早就知道："claude -p 子进程做 web research 时 stdout 为空"。但没深究过根因。

## 6 次 monkey patch 之旅

### Attempt 1: `--output-format text`
以为缺少这个 flag。加上。测试：claude -p 纯文本 prompt 可以产出。Arena 实测：0 字节。

### Attempt 2: env cleaning + prompt file
读了 report.md（Bun spawn + Claude CLI 兼容性分析）。知道要清理 `CLAUDECODE` 环境变量、用 prompt file 替代 stdin pipe。加了 `buildCleanEnv`，加了 `--prompt-file`。测试：shell redirect 可以产出。Arena 实测：0 字节。

### Attempt 3: shell redirect
Bun ARM64 stdin pipe bug — 换成 `sh -c "claude ... < promptfile"`。测试：shell redirect 可以产出。Arena 实测：0 字节。

### Attempt 4: quote `--disallowedTools`
Shell 命令里 `Bash(rm *)` 含空格，`sh -c` 拆词了。加引号保护。测试：从 shell 可以产出。Arena 实测：0 字节。

### Attempt 5: inherit parent env
`buildCleanEnv` 传了子集 env → 丢了 `ANTHROPIC_API_KEY`。改用默认 env 继承。Arena 实测：0 字节。

### Attempt 6: positional arg
`--prompt-file` 不存在于 claude v2.1.128。换成 `claude -p "prompt"` 位置参数。测试：直接 claude -p 可以产出。Arena 实测：0 字节 — prompt 太长（~900 chars），命令行限制。

### 根因分析

不是我们修的不够。是 `claude -p` 在 Bun.spawn 模式下对 tool 密集型任务有**系统性兼容问题**：

- Deferred tool 死锁（v2.1.76+ regression）：WebSearch/WebFetch 间歇性 0 字节
- Bun stdin pipe flush bug（ARM64）
- 嵌套检测环境变量阻断
- Shell 参数引用敏感

每一个都可以 work around，但组合起来就成了无限调试循环。

## 转折：Kimi CLI

用户提示：试试 Kimi CLI。`kimi --version` → v1.41.0，已安装。

关键架构差异：
```
Claude: deferred tools — 会话启动时不加载，模型首次调用时动态解析 → 死锁
Kimi:   eager tools   — 所有工具启动时加载完毕 → 无死锁
```

`kimi --print --afk --output-format stream-json < promptfile` — 一次跑通。

### 对比验证

| | Claude -p | Kimi --print |
|---|-----------|-------------|
| 文案任务 | ❌ 0 bytes | ✅ output.md, 87 字 |
| Deep research (SearchWeb) | ❌ 从未跑过 | ✅ Bun v1.3.13, judge PASS 95 |
| Skill 自省 | ❌ 从未跑过 | ✅ 2 global + 1 deck |
| commit 数量 | 6 (全部失败) | 1 (adapter 实现) |

## Player 抽象的价值

`AgentAdapter` 接口在 test-utils 里早就设计好了：

```typescript
interface AgentAdapter {
  name: string
  spawn(opts: { cwd, brief, timeoutMs }): Promise<AgentRunResult>
}

useAgent('kimi')    // 默认，可靠
useAgent('claude')  // 保留，不推荐
```

arena runner 一行代码没改。换 backend 就是实现一个 adapter，注册到 registry。这验证了 Intent/Plan/Execute 的三层分离：Execute 层的 IO 是可替换的。

## CWD 隔离：deny-by-default 的运行时保障

第二个发现：agent 在 arena workdir 里能发现父项目的 skills。Kimi（和 Claude）会沿目录树上溯查找 `.claude/skills/`。arena workdir 在项目树内 → agent 穿透隔离。

修复：`/tmp/arena-<id>/<side>/` 作为 workdir。没有任何父级 `.claude/skills/`。验证结果：

| | 修复前 | 修复后 |
|---|--------|--------|
| bare deck | 2 global + 9 deck (父项目) | 2 global + 0 deck ✅ |
| with-copy-skill | 2 global + 10 deck (9父+1) | 2 global + 1 deck ✅ |

## agent-run：最简路径

从两天的探索中提取出的最简使用方式：

```bash
bunx @lythos/skill-arena agent-run --task task.md --deck deck.toml
```

三个参数：deck + task + (可选的) player。agent 执行，judge 评估，结果落盘。比 `arena.toml` 的完整对比模式更轻量，适合快速验证。

## 经验

1. **不要 monkey patch CLI**。如果 spawn 一个 CLI 需要 3+ 个 workaround，换一个 CLI 可能只需要 1 行 adapter。Player 抽象就是为了这个。

2. **Plan 层测试覆盖不能替代 IO 层 grounding**。我们的 plan 层 95%+ 覆盖，但 arena 第一次真实 run 就冒烟。IO 层的可靠性只能通过真实 agent 执行来验证。

3. **Eager > Deferred**。对于 headless/自动化场景，选择 eager loading 的工具架构。Deferred loading 在交互模式下是好设计，在无头模式下是 bug。

4. **CWD 隔离是 deny-by-default 的物理保障**。不在代码层面阻断，在文件系统层面阻断。简单、有效、可验证。

5. **Agent BDD 就是 IO 层的期望规格书**。三个 pre-flight 问题（skill 存在性、deck link、agent smoke）可以写成 `.agent.md` 场景，每次改动前跑一次。

## 相关

- `cortex/wiki/03-lessons/kimi-vs-claude-cli-headless-comparison.md` (技术对比报告)
- `cortex/wiki/01-patterns/player-abstraction-agent-swappable-backend.md` (Player 模式)
- ADR-20260506021112492 (Kimi 默认决策)
- `packages/lythoskill-test-utils/src/agents/kimi.ts` (Kimi adapter 实现)
