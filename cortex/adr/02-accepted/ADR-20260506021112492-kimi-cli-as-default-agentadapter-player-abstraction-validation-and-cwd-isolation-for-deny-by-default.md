# ADR-20260506021112492: Kimi CLI as default AgentAdapter — Player abstraction validation and CWD isolation for deny-by-default

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-06 | Created |
| accepted | 2026-05-05 | Accepted |

## 背景

2026-05-05~06 的 arena grounding 验证暴露了 Claude CLI (`claude -p`) 在 Bun.spawn 模式下的系统性脆弱性：

1. **Deferred tool 死锁** (v2.1.76+ regression): WebSearch/WebFetch/Agent 等在 `-p` 模式下间歇性 hang
2. **Bun stdin pipe bug** (ARM64): `stdio: ["pipe", ...]` 导致 stdin flush 失败
3. **嵌套检测**: `CLAUDECODE` 环境变量阻断子进程启动
4. **Shell 参数引用**: `--disallowedTools "Bash(rm *)"` 含空格需额外处理

6 个 commit 的 monkey patch (env clean → prompt file → shell redirect → quoting → env inheritance) 均未解决。Claude `-p` 在 `Bun.spawn` 下从未产出过有效 agent output。

同时，调研 Kimi Code CLI v1.41.0 发现其架构根本性不同：

- **Eager tool loading**: SearchWeb/FetchURL/Agent 等在会话启动时全部加载，无 deferred tool 死锁
- **`--print --afk` 模式**: 为 headless 场景设计的第一公民功能，隐式全自动审批
- **Apache 2.0 开源**: 工具加载、权限模型完全透明
- **`-p` 命令行参数**: 支持 prompt 直接传参，规避 stdin pipe 问题

实测验证：Kimi adapter 一次跑通 arena 全链路（copy test + deep research + skill introspection），Claude adapter 从未跑通。

详见 `cortex/wiki/03-lessons/kimi-vs-claude-cli-headless-comparison.md`。

## 决策驱动

- Arena 的核心场景是**可靠、可复现的 headless agent 执行**，不是最大化 agent 生态覆盖面
- Player 抽象 (`AgentAdapter` 接口) 的设计目的就是允许换 backend
- Kimi 已验证可靠，Claude 已验证不可靠 — 继续投入 Claude `-p` monkey patch 无边际收益
- CWD 隔离是 deny-by-default 的运行时保障：agent 不应该穿透 arena 的隔离层上溯父项目

## 选项

### 方案A：继续修 Claude -p（已尝试 6 个 commit）

**被拒绝**: 6 个 commit 未解决，Claude -p deferred tool 死锁是 CLI 层面的 regression，非我方可修。

### 方案B：Kimi 作为默认 AgentAdapter（选择）

**实现**: `agents/kimi.ts` 实现 `AgentAdapter` 接口，`useAgent('kimi')` 为默认。

**优点**:
- 一次跑通，全链路验证（文案 + deep research + skill introspection）
- Eager tools 消除 deadlock 类问题
- Apache 2.0 开源，实现透明
- `--print --afk` 为 headless 设计

**缺点**:
- Kimi 是第三方 CLI，版本升级可能引入兼容性变化
- Claude 的某些高级 tool (MCP, hooks) 在 Kimi 上不可用或不同
- 需要用户安装 Kimi CLI (`pip install kimi-cli`)

### 方案C：Claude Agent SDK（未实施）

**优点**: Anthropic 官方推荐路径，未来可能成熟
**缺点**: 当前版本仍 spawn CLI 作为后端（报告 §4.1.1），TypeScript Agent tool 有 bug (§4.1.2)，需要 `executable: "node"` 绕过 Bun 问题

**状态**: 保留为中期选项，EPIC-20260506001552299 T3-T5 追踪。

## 决策

**选择**: 方案B（Kimi 默认）+ CWD 隔离

**CWD 隔离**（配套决策）：arena runner 将 agent workdir 放在 `/tmp/arena-<id>/<side>/` 而非项目树内。阻断 agent 沿目录树上溯发现父项目 `.claude/skills/`，确保 true deny-by-default。

**原因**:
1. **可靠性优先**: arena 需要 deterministic agent execution，Kimi 的 eager tools 架构天然更适合
2. **投入产出比**: Kimi adapter 1 次跑通，Claude -p 6 次失败 — 边际收益明确
3. **Player 抽象验证**: 换 adapter 无需改 arena pipeline — `useAgent()` 路由即可
4. **开源完整性**: Kimi Apache 2.0 → 工具行为可审计，契合 lythoskill 的反作弊定位

## 影响

- **正面**:
  - Arena agent spawn 可靠（3 种 task 类型验证通过）
  - Deny-by-default 运行时验证（CWD 隔离 + skill introspection）
  - Player 抽象验证 — 未来新增 adapter 只需实现接口
- **负面**:
  - 需要 Kimi CLI 安装（新增依赖）
  - Claude 用户需显式配置 `player = "claude"`（不再默认）
- **后续**:
  - Claude Agent SDK adapter 作为中期选项（EPIC 已追踪）
  - MCP server adapter 调研（跨平台互操作）
  - Kimi CLI 版本升级兼容性监控

## 相关

- ADR-20260424120936541 (Player-deck separation — AgentAdapter 接口)
- Wiki: `cortex/wiki/03-lessons/kimi-vs-claude-cli-headless-comparison.md`
- EPIC-20260506001552299 (Agent spawn stabilization)
- EPIC-20260505230149768 (CriterionDef schema)
