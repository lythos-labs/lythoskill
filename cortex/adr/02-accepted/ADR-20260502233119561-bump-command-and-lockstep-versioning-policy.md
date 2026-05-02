# ADR-20260502233119561: bump command and lockstep versioning policy

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-02 | Created |
| accepted | 2026-05-02 | Approved by user — proceed with implementation as TASK-20260502233741335 |

## 背景

本 monorepo 自第一天起就以 **lock-step（整体滚动）** 方式管理版本：root `package.json` 与 `packages/*/package.json` 始终保持同一个版本号（截至 2026-05-02 全部为 `0.7.2`）。这一约定隐含在多处设计中：

- ADR-20260423182606313（SKILL.md 模板替换）以 `package.json.version` 作为 SSOT，并通过 `{{PACKAGE_VERSION}}` 注入到 `skills/*/SKILL.md`，**前提就是各 package 版本一致**，否则模板渲染会出现断层
- `packages/lythoskill-creator/src/align.ts` 已经实现"以 root version 为基准、向下同步所有 packages"的 `align --fix` 能力，并刻意跳过含 `{{` 的 SKILL.md（防止把占位符写死）
- `scripts/publish.sh` 一次性发布 6 个 packages，假设它们处于同一版本节拍

但这条策略**从未被写入任何 ADR**。结果出现两类反复发生的问题：

### 问题 1：Lock-step 策略被反复遗忘

Claude / agent session 在缺乏显式 ADR 的情况下，会按"npm 工作区单独 bump"的默认心智操作 —— 只改某个被修改 package 的 version，留下其他 packages 在旧版本，破坏 lock-step 不变量。

### 问题 2：即使被提醒，执行方式仍是 jq/python 手工拼接

被纠正后，agent 仍倾向于用 `jq`、`python -c`、`sed -i` 这类一次性命令在 7 个 `package.json` 上手工拼接，操作次数多、易错、难以审计、且无法保护 SKILL.md 模板占位符。用户原话："用非常 python jq 的方式做"。

### 问题 3：反向破坏占位符的风险

部分 agent 在"对齐版本"时会对 `packages/*/skill/SKILL.md` 做正则替换，把 `version: {{PACKAGE_VERSION}}` 改成 `version: 0.7.2` 这类字面值，**摧毁模板**。下一次构建时模板系统失效，dist 与 source 永久脱钩。

### 问题 4：现有半成品未被串成可调用入口

`align.ts` 已经具备"对齐到 root version"的能力，但缺少一个"先把 root version 推到目标值"的入口。手动改 root + 跑 align + 跑 build 的三步操作没有合约化，等于把组合责任甩给每次的 agent。

## 决策驱动

- **单一职责（参考 Maven `versions:set`）**：bump 命令只负责"设置 root version"这一件事，不掺杂 git、tag、push、publish 副作用
- **复用而非重写**：`align(fix=true)` 与 `build('--all')` 已存在且经过 pre-commit hook 长期验证，bump 应该编排它们而非另写一份逻辑
- **防呆（占位符保护）**：bump 内部不能直接改 `packages/*/skill/SKILL.md`；所有 SKILL.md 同步必须经过 `align`（已含 `if (!hasTemplates)` 保护）和 `build`（模板系统的正确入口）
- **稳定合约**：命令形态、参数、退出行为可预测；agent 在 N 次 session 后仍能照同一份 ADR 调用，不必"自己设计"
- **可测试 / 可干跑**：`--dry-run` 必须支持，便于 review 版本变化

## 选项

### 方案A：维持现状（jq/python/sed 手工拼接）

每次 bump 由 agent 现场用 `jq` 或 `python` 在 7 个 `package.json` 上做替换。

**优点**:
- 不需要新代码

**缺点**:
- 已经验证不可持续：同一类错误在多次 session 中重复发生
- 没有占位符保护，`{{PACKAGE_VERSION}}` 随时可能被误改成字面量
- 不可审计、不可干跑、不可复用

### 方案B：独立 bash 或 ts 脚本放在 `scripts/`

类似 `scripts/publish.sh`，写一个 `scripts/bump.sh` 或 `scripts/bump.ts`。

**优点**:
- 不修改现有 package
- 路径直观（`scripts/` 是项目级杂项工具的惯例位置）

**缺点**:
- 与已有 `align.ts` / `build.ts` 形成两个并列入口，认知负担大
- 跨包 import 路径需要从 `scripts/` 反向引用 `packages/lythoskill-creator/src/*`，破坏 creator 的边界
- 不符合 creator 自身的工具角色定位（creator 已经是处理 package 元数据 + 构建管道的中心）

### 方案C：作为 `lythoskill-creator` 的 `bump` subcommand（推荐）

在 `packages/lythoskill-creator/src/bump.ts` 新增一个 `bump` subcommand，与 `init` / `add-skill` / `build` / `align` 并列。

**命令形态**:

```
bunx @lythos/skill-creator bump <X.Y.Z>     # 显式版本
bunx @lythos/skill-creator bump patch       # 0.7.2 → 0.7.3
bunx @lythos/skill-creator bump minor       # 0.7.2 → 0.8.0
bunx @lythos/skill-creator bump major       # 0.7.2 → 1.0.0
bunx @lythos/skill-creator bump --dry-run patch   # 仅打印变化，不写文件
```

**内部流水线（精确职责分离）**:

```
1. 读 root package.json，计算 newVersion
   - 显式 X.Y.Z：直接采用（验证 semver 格式）
   - patch / minor / major：按 semver 增量
2. 写 root package.json — 仅修改 version 字段
3. await align(true)
   - 已实现：把所有 packages/*/package.json 同步到 root version
   - 已实现：跳过含 {{ 的 SKILL.md（占位符保护）
4. await build('--all')
   - 已实现：用新 version 重渲染 skills/*/SKILL.md
5. 不 commit、不 tag、不 push、不 publish
```

**优点**:
- 复用已有半成品（`align` + `build`），新增代码估计 80 行内
- 占位符保护**强制**经过 `align` 路径（不可绕过）
- 与 creator 的工具定位一致：creator 本就是处理 package 元数据
- agent 调用入口与已有命令同形（`bunx @lythos/skill-creator <verb>`），心智成本低
- `--dry-run` 易实现：read root → 计算 newVersion → 打印 diff，不调 align/build

**缺点**:
- creator 体积略增（一个 subcommand）
- 用户必须手动 git commit；但这正是单一职责的代价（避免脚本暗中触碰 git）

## 决策

**选择**: 方案C

**原因**:

1. **Lock-step versioning 自此正式入册**：本 ADR 同时追认"所有 packages + root 共享一个 version"作为正式策略，不再是隐含约定。后续任何 bump 必须维持此不变量。

2. **bump 是 lock-step 的执行机制，不是重新发明**：`align.ts` 已经把 lock-step 的"对齐"半边做完，bump 只是补上"推 root version"的另一半。整体加起来才是完整的 Maven `versions:set` 等价物。

3. **占位符保护必须强制路径**：通过让 bump 内部强制走 `align`（不直接改 SKILL.md），把"占位符不被写死"从"agent 自觉"升级为"工具级不变量"。这从根本上消除问题 3。

4. **不 commit / 不 tag**：单一职责。git 操作有自己的 review 流程（commit message 是版本变更最重要的元数据载体），不应被脚本静默执行。用户在 bump 之后可以正常 `git diff` 审核，再 `git commit -m "chore(release): vX.Y.Z"`。

5. **拒绝 `scripts/`**：creator 已经是 thin-skill monorepo 的"元数据处理中心"（`init` / `add-skill` / `build` / `align`），bump 是这一组 verb 的自然成员。新建 `scripts/bump.*` 会形成两个并列入口，违反单一来源。

## 影响

- 正面:
  - **Lock-step 策略获得显式 ADR 锚点**：未来 agent 可以基于 ADR 编号锁定策略，不再需要"猜"
  - **bump 操作获得稳定合约**：命令形态、输入、输出、副作用全部明文
  - **占位符不可能被写死**：bump → align 路径强制保护
  - **审计性提升**：所有版本变更可在 git diff 中清晰看到（root + 6 packages 的 version 字段 + skills/*/SKILL.md 的渲染输出）
  - **替换 jq/python 反模式**：agent 在 ADR 提示下会调用 `bunx @lythos/skill-creator bump`，不再手工拼接

- 负面:
  - 用户须手动 commit；但这是设计而非缺陷（见决策原因 4）
  - bump 当前不联动 internal `@lythos/*` dependencies 的版本号；如果未来 packages 之间出现固定 dependency 引用（非 workspace:*），需要再开一个 ADR 决定是否扩展

- 后续:
  1. 实现 `packages/lythoskill-creator/src/bump.ts`（新增）
  2. 在 `cli.ts` 注册 `bump` 命令并在 `--help` 输出中列出
  3. 在 SKILL.md（creator）的命令列表中加入 `bump`
  4. 考虑在 publish.sh 顶部增加提示："publish 之前请先运行 bump"
  5. 创建 Task 跟踪实现工作

## 相关

- 关联 ADR:
  - ADR-20260423182606313（SKILL.md template variable substitution）—— 本 ADR 把其隐含的 lock-step 前提显式化
  - ADR-20260423124812645（dist committed to git）—— skills/ 作为 build 输出，bump 后必须重渲染
  - ADR-20260501090811296（pre-commit auto-rebuild）—— bump 流水线最后调用的 build 与 hook 中的命令一致
- 关联 Epic: EPIC-20260430012504755-skill-progressive-disclosure-and-quality-audit（skill 一致性是其覆盖范围）
- 关联 Skill: lythoskill-creator（实现位置）
