# ADR-20260518024500631: Evolve Agent BDD from .agent.md+parseAgentMd to reproduce.sh pattern

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-18 | Created |
| accepted | 2026-05-17 | Accepted |

## 背景

Agent BDD 当前使用 `.agent.md` 作为 scenario 格式——Given/When/Then/Judge 四段式 markdown，由 `parseAgentMd`（正则）解析后注入 BDD runner。这个架构在实践中累积了四个结构性缺陷：

### 1. 命名冲突
`.agent.md` 和 `AGENTS.md`（agent 操作手册）文件名近似。agent 在搜索 "read the agent markdown for this project" 时频繁读到错误的文件。

### 2. Judge 与 Task 耦合（同 arena 已解决的问题）
ADR-20260514050300（已 accept）指出 arena 的 task 和 judge 不应在同一文件——judge 被 task content 污染。arena 已将 criteria 迁移到 `arena.toml` 的 `judge` 字段。但 Agent BDD 的 `.agent.md` 仍然把 `## Judge` 嵌入 markdown——**arena 修了，BDD 没修**。

### 3. 正则解析脆弱性
`parseAgentMd` 用正则从 markdown 提取 Given/When/Then/Judge。任何 markdown 格式变化都会导致静默解析失败。正则不是 parser。

### 4. 不可自执行
`.agent.md` 需要 BDD runner（`bdd-runner.ts`）才能执行。人类和 agent 都不能 `bash scenario.agent.md`。

### reproduce.sh 模式（已涌现）
showcase/ 目录中 agent 自然地写了 7 个 `reproduce.sh` 脚本。模式共性：
- 自包含：一个 shell 脚本包含 deck 创建、arena 调用
- 可执行：`bash reproduce.sh` → 出结果
- agent-native：agent 不需要被教写 markdown——agent 本来就写 shell
- Judge 分离：criteria 在外部（arena.toml judge 字段），不在 task prompt 里

最初选择自制 BDD 而非 Cucumber/Gherkin 类框架，就是出于心智模型优先——agent 的"测试"不是人类的 Given/When/Then，而是可复现的执行 + 可验证的 verdict。reproduce.sh 证明了这个选择是对的。

Refs: ADR-20260514050300 (arena judge separation), wiki 2026-05-17-arena-cli-archaeology

## 决策驱动

1. 命名冲突是真实的——`.agent.md` 和 `AGENTS.md` 在 agent conversation 中频繁混淆
2. arena 已证明 Judge 分离可行——BDD 应该跟进，不重复发明
3. 正则解析是技术债——shell 脚本不需要 parser
4. Agent 自然行为就是写脚本——reproduce.sh 不是被发明的，是被发现的（7 个独立涌现实例）
5. **零知识复现验证**：2026-05-18，一个无 prior context 的 subagent 仅通过 `bash reproduce.sh` + 读取 stdout 即完成完整 BDD 场景（create + test + judge → PASS, 12 tool calls, 80s）。Agent 原生语言 = shell echo，不是 markdown
6. 可复现性是闭环的前提——主流测试框架的 coverage dashboard 要求可执行 + 可追踪

## 选项

### 方案 A：修补 .agent.md（重命名 + 移除 ## Judge） — Rejected

重命名为 `.bdd.md`，移除 `## Judge` section，criteria 从外部注入。保留 parseAgentMd。

- 优点：改动最小，向后兼容
- 缺点：仍然是正则解析，仍然不是可执行文件，只是给旧方案打补丁

### 方案 B：reproduce.sh 作为一等公民 — Selected

`reproduce.sh` 不是全自动测试脚本——它是 **shell scaffold + IoC handoff**：
- Shell 负责确定性操作（deck 创建、prepare-workdir、archive）
- stdout 作为 agent prompt injection 通道——当 agent 读到 `echo "<spawn subagent to ...>"` 时，它识别这是自己的角色并接管推理
- 人类 `bash reproduce.sh` 看到的是不完整的 echo——只有 agent 能完成

这个模式不是被设计的，是被发现的。zero-knowledge arena e2e 的 reproduce.sh 里，第一个 subagent 自发写了 `echo` 作为 prompt 通道，重放 agent 在没有 schema 的情况下理解了这个约定。

```
showcase/<date>-<name>/
├── reproduce.sh          # scaffold + IoC handoff（Step 3 = agent trigger）
├── README.md             # 人类可读描述 + verdict checklist
├── decision-log.jsonl    # agent 推理日志（agent 在 Step 3 产出）
└── judge.md              # criteria（可选，arena.toml judge 字段引用）
```

arena / BDD runner 执行 reproduce.sh，在 stdout 中识别 IoC 标记 → 接管 agent 步骤 → 收集 decision-log.jsonl → 写入 verdict。

- 优点：IoC 原生、无 parser、agent-native、人类可读但不完全可执行
- 缺点：BDD runner 需要理解 IoC handoff 约定（识别 stdout 中的 agent trigger 标记）

### 方案 C：混合 — reproduce.sh 新场景，.agent.md 现存不动 — Transition

新 scenario 用 reproduce.sh，旧的 `.agent.md` 继续由 parseAgentMd 维护，渐进迁移。

## 决策

**选择：方案 B（reproduce.sh 一等公民），方案 C 作为过渡期并存。**

1. reproduce.sh 是 agent 的 IoC 原生输出——shell 做确定性 scaffold，stdout 做 prompt injection 触发 agent 推理。不需要教 agent 学新格式
2. 解决命名冲突（`.agent.md` 消亡，不与 `AGENTS.md` 混淆）
3. arena 已走通 Judge 分离路径，BDD 直接复用——judge 从 stdin/brief 中消失
4. IoC handoff 模式可被 BDD runner 标准化识别（stdout 中的 `<spawn subagent>` 等约定标记）
5. Coverage dashboard 扫 `showcase/*/reproduce.sh` → 在 IoC 标记处注入 agent → 收集 decision-log → 汇总 verdict

**实施优先级**：
1. Phase 1: reproduce.sh 契约规范（exit code、stdout 格式、metadata 约定）
2. Phase 2: bdd-runner.ts 新增 reproduce.sh 执行路径（Bun.spawn + verdict 收集）
3. Phase 3: Coverage dashboard（扫 showcase/ → 执行 → 汇总 → markdown table）
4. Phase 4: 现有 .agent.md 场景按需迁移（不强制）
5. Phase 5: 废弃 parseAgentMd 的 `## Judge` 正则解析

## 影响

**正面**：
- 命名冲突彻底解决
- Judge 分离覆盖到 BDD
- 人类可直接 `bash reproduce.sh` 复现任何场景
- Coverage dashboard 可实现

**负面**：
- 需要构建新的 runner 路径（轻量）
- 迁移期两个系统并存

## 相关

- ADR-20260514050300 (arena judge criteria separation) — 同一问题类的 arena 侧解
- wiki `shell-stdout-as-agent-prompt-injection.md` — reproduce.sh 的 IoC 机制：shell 做 scaffold，stdout 做 prompt injection，agent 在 echo 标记处接管推理。不是被设计的，是被发现的
- wiki `control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md` — OS 隐喻：CLI = user space (确定性操作)，Agent = kernel space (推理)。stdout/stderr 是 interrupt vector，三种中断类型（Prompt Injection / Error as Interrupt / Guard Violation）
- wiki `annotation-mindset-agent-facing-code-annotations-as-ioc-for-agent-behavior.md` — agent-facing 代码注释作为 IoC
- wiki `2026-05-17-arena-cli-archaeology-and-agent-os-design-principles.md` — arena CLI 地层学：agent 行为灾难驱动出的防御性架构
- 关联 EPIC: EPIC-20260518024809887
