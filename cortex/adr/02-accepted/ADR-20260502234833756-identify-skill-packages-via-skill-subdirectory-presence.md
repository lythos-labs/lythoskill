# ADR-20260502234833756: identify skill packages via skill subdirectory presence

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-02 | Created — chained extension of ADR-20260502233119561 |
| accepted | 2026-05-02 | Accepted; codifies `packages/<name>/skill/`-presence as the build-filter rule, orthogonal to monorepo-wide lock-step versioning |

## 背景

实现 ADR-20260502233119561（bump command + lockstep versioning）的过程中，dry-run 暴露了一个 monorepo 现实：`packages/` 下既有 **skill 产品包**（如 `lythoskill-deck`、`lythoskill-creator`），也有 **基础设施/共享包**（如 `lythoskill-test-utils` —— BDD runner 等测试基础设施提取出的内部公共代码，`private: true`，不发布到 npm，没有 `skill/` 子目录）。

这两类包在不同维度有不同行为：

| 维度 | skill 产品包 | 基础设施包 |
|------|------------|-----------|
| Lock-step version | 同步（与 root 一致） | **同样同步**（简单不易出错） |
| `build` 渲染到 `skills/<name>/` dist | ✅ 是 | ❌ 否 |
| 发布到 npm | ✅ 是 | ❌ 否（`private: true`） |
| `{{PACKAGE_VERSION}}` 模板替换 | ✅ 是（SKILL.md 模板） | ❌ 否（无 SKILL.md） |

**Lock-step versioning** 的范围已经在 ADR-20260502233119561 中确定：**所有 `packages/*` + root 同节拍**（一起追赶到目标版本）。这条**不变**。

但 **build 渲染** 不是全员行为 —— 它只针对 skill 产品包。问题是：**如何在代码中识别一个 package 是 skill 产品**？

### 现有事实

- `cli.ts` 的 `build --all` 已经在用一种判定：`name.startsWith('lythoskill-') && existsSync(packages/<name>/skill/)`（双条件）
- `align.ts` 的 SKILL.md 检查段（line 240-257）已经 condition on `existsSync(skillMdPath)`，即隐式按 skill/ 存在跳过
- 新写的 `bump.ts` 在 build 循环里同样加了 `existsSync(skill/)` filter

也就是说，`skill/` 子目录的存在已经事实上是判定标准 —— 但**从未被显式 ADR 化**。

### 用户原话

- "本质就是在说怎么识别一个 packages 下的包是有 skill dist 的"
- "一起提升不容易出问题🤔 只是没有 skill 的就不会 build 到 skills"
- "是 adr 链的扩展"

## 决策驱动

- **单一判定标准**：避免多套规则（`name.startsWith('lythoskill-')` vs `private` 字段 vs 自定义 manifest）
- **物理证据优先**：目录存在与否是 deterministic 的、可验证的、不会被 package.json 字段误声明
- **复用现有约定**：项目已经按 `packages/<name>/skill/` 组织 skill 源文件（ADR-20260423182606313 模板替换 + ADR-20260423124812645 dist 提交策略都基于这个目录布局）
- **lock-step 范围不变**：避免增加复杂度。所有 packages 同 version 是 monorepo invariant，与"是否 skill 产品"无关

## 选项

### 方案A：以 `name.startsWith('lythoskill-')` 命名前缀作为唯一判定

依赖命名约定。所有 skill 产品包都以 `lythoskill-` 开头。

**优点**:
- 检测最快（字符串前缀比较）
- 与 npm scope `@lythos/skill-*` 半对应

**缺点**:
- 名字可以骗人（`lythoskill-test-utils` 也以此前缀开头，但不是 skill 产品）
- 反过来如果将来出现非 `lythoskill-*` 前缀的 skill 包（比如 `cortex-skill`），会被误判

### 方案B：以 `package.json` 的 `private: true` 反向识别

非 private 即视为 skill 产品。

**优点**:
- 自然对应 npm 发布逻辑

**缺点**:
- 混淆维度：`private` 是发布维度，不是 build 维度
- 未来可能出现"public 但非 skill"或"private 但是 skill"的边角

### 方案C：以 `packages/<name>/skill/` 子目录存在为唯一判定（推荐）

**优点**:
- 物理证据，无歧义
- 与 build 流水线的语义直接对应（"有 skill source 才有 skill dist"）
- 与 SKILL.md 模板系统天然耦合（SKILL.md 在 `skill/` 下）
- 已经在多处隐式使用，本 ADR 只是把它正式化

**缺点**:
- 新增 skill 时必须建立 `skill/` 子目录（但这本来就是约定）

## 决策

**选择**: 方案C —— `packages/<name>/skill/` 子目录的存在是 skill 产品包的唯一判定标准。

具体实施：

1. **build 维度**：所有遍历 `packages/*` 调用 `build()` 的地方必须按 `existsSync(packages/<name>/skill/)` 过滤
   - `cli.ts` 的 `build --all`：✅ 已实现（line 28-30）
   - `bump.ts` 的 build 循环：✅ 已实现（实现 ADR-20260502233119561 时同步加入）
   - 未来新增的批处理入口：必须遵循同样规则

2. **lock-step 维度不变**：`align(fix=true)` 和 `bump` 仍然把所有 `packages/*/package.json` 同步到 root version，**不**按 skill/ 过滤。test-utils 这类基础设施包也跟着滚版本号。

3. **publish 维度独立**：本 ADR 不规定 npm publish 的发现规则。`scripts/publish.sh` 当前硬编码列表，未来可独立 ADR 决定是否改用 `private: !true` 自动发现。

4. **辅助 helper 的可选位置**：可以在 `packages/lythoskill-creator/src/util.ts` 加一个 `isSkillPackage(packageDir: string): boolean` 函数封装这个判定，让所有调用点对齐。本 ADR 不强制（先行实现已用 inline 检查）。

## 影响

- 正面:
  - **判定标准入册 ADR 链**：未来 agent 不再凭直觉发明（命名前缀、private 字段等），有 ADR 锚点
  - **现有代码与 ADR 一致**：cli.ts / bump.ts / align.ts 中的 inline 检查从此被 ADR 背书
  - **新增 skill 流程清晰**：`bunx @lythos/skill-creator add-skill <name>` 创建 `packages/<name>/skill/`，自动落入 build target
  - **基础设施包可以自由扩展**：test-utils 之外，未来还可有 BDD runner、mock helpers 等共享包，不会被 build 误处理

- 负面:
  - 无（这是对现状的追认）

- 后续:
  - 考虑在 `util.ts` 加 `isSkillPackage()` helper（DRY，待评估必要性）
  - 考虑在 `align.ts` 的 `checkPackages` 段对非 skill 产品包的检查项做更精确的过滤（例如 `bin` 检查可能不适用 test-utils 等基础设施包 —— 待 audit）

## 相关

- 关联 ADR:
  - ADR-20260502233119561（bump command and lockstep versioning policy）—— 本 ADR 是其链式扩展，回答它在实现时暴露的 "skill 产品包识别" 问题
  - ADR-20260423182606313（SKILL.md template substitution）—— SKILL.md 在 `skill/` 子目录是这一识别规则的物理基础
  - ADR-20260423124812645（dist committed to git）—— `skills/<name>/` dist 输出与 `packages/<name>/skill/` source 一一对应
- 关联 Skill: lythoskill-creator（实现位置）
- 关联 Task: TASK-20260502233741335（bump 实现暴露了本 ADR 的需求）
