# ADR-20260423124812645: Build output should live in skills/ and be committed to Git

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-23 | Created |
| accepted | 2026-04-23 | Approved: commit skills/ build output to Git (architecture pivoted from dist/ to skills/) |
| superseded-partial | 2026-05-01 | CI portion (方案G) superseded by ADR-20260501090811296 — pre-commit hook becomes the formal solution

## 背景

lythoskill 的 thin-skill 模式将 skill 分为三层：
- `packages/<name>/` = Starter 实现（npm 包，含 CLI、模板、重逻辑）
- `packages/<name>/skill/` = Skill 源码（SKILL.md + scripts，开发态）
- `skills/<name>/` = Build 产物（从 `packages/<name>/skill/` 生成，发布态）

**架构演进**：最初 build 命令输出到 `dist/`，随后发现 `dist/` 是冗余的——在 thin-skill 模式中，Skill 源码本身就应该是轻量的，不需要二次过滤。最终架构改为：
- build 输入：`packages/<name>/skill/`
- build 输出：`skills/<name>/`

问题变为：**`skills/` 是构建产物，是否应该提交到 Git？**

## 决策驱动

1. **最终用户友好性**：agent 用户克隆仓库后，是否能直接使用 skill，无需安装 Bun 或运行 build？
2. **单一真相来源**：如果 `packages/<name>/skill/` 和 `skills/<name>/` 内容不一致，以谁为准？
3. **Git 历史整洁性**：构建产物是否会让 diff 和 blame 变得嘈杂？
4. **开发-发布同步成本**：开发者修改 skill 源码后，忘记运行 build 的概率有多大？如何检测？
5. **发布灵活性**：是否需要支持多版本并行？

## 选项

### 方案 A：提交 dist/ 到 main 分支（当前做法）

`dist/` 作为普通文件提交到 main 分支，与 `skills/`、`packages/` 并列。

**优点**：
- 用户克隆仓库后立即可用，零构建步骤
- agent 可直接读取 `dist/<name>/SKILL.md`，无需理解 lythoskill 构建流程
- 与 GitHub 直接集成：Release 时可打包整个 repo（含 dist）

**缺点**：
- `skills/` 和 `dist/` 内容高度重复（简单 skill 的 diff 几乎为空），造成 git 冗余
- 开发者可能修改 `skills/` 后忘记运行 build，导致 `dist/` 滞后（source drift）
- Git diff 中混入大量 generated 文件噪音

### 方案 B：忽略 dist/，要求用户 build

`.gitignore` 中加入 `dist/`，用户克隆后手动运行 `bunx lythoskill build <skill>`。

**优点**：
- Git 仓库完全干净，只有源码
- 单一真相来源明确：`skills/` 永远是 truth
- 符合传统软件工程"不提交构建产物"的规范

**缺点**：
- 对最终用户极不友好：必须安装 Bun、理解 build 命令、手动运行
- 与"thin skill"轻量哲学矛盾：用户为了用一个 SKILL.md 要先装整个工具链
- 无法通过 `git clone` + 直接 symlink 到 `.claude/skills/` 的方式使用

### 方案 C：GitHub Releases / 附件发布

`dist/` 忽略，每次 release 时通过 CI 打包 dist 产物上传到 GitHub Release Assets。

**优点**：
- 源码和产物彻底分离
- 支持版本化管理（v1.0.0-dist.zip、v2.0.0-dist.zip）

**缺点**：
- 用户需要额外下载步骤，无法直接用 Git 子模块或 symlink
- 需要 CI 基础设施（当前项目无 CI）
- 开发与发布的耦合变弱：本地测试 dist 产物时需要手动打包

### 方案 D：专门的发布分支（如 `dist` 分支）

main 分支忽略 dist/，CI 在 push 时自动 build 并 force-push 到 `dist` 分支。

**优点**：
- main 分支干净
- dist 分支始终是最新构建产物

**缺点**：
- 用户需要知道该用哪个分支（main vs dist），增加认知负担
- 本地开发时无法直接测试 dist 分支内容
- 切换分支麻烦，如用户所说"切换起来好像也不是什么好事"

### 方案 E：dist/ 作为独立 repo / Git submodule

每个 skill 的 dist 作为独立仓库（如 `lythoskill/dist-project-cortex`），主仓库用 submodule 引用。

**优点**：
- 完全解耦，主仓库体积可控
- 每个 dist 可独立版本化

**缺点**：
- 管理复杂度爆炸：N 个 skill = N 个 dist repo
- submodule 是 Git 反模式，协作痛苦
- 与 thin-skill"轻量"哲学背道而驰

### 方案 F：提交 dist/ + pre-commit hook 自动 build

保留 dist/ 在 main 分支，但增加 git pre-commit hook：如果 `skills/` 有变更，自动运行 build 更新 `dist/`。

**优点**：
- 兼具方案 A 的用户友好性和方案 B 的同步保证
- dist/ 始终与 skills/ 保持一致（除非 bypass hook）
- 零额外基础设施（纯本地 hook）

**缺点**：
- 需要 Bun 运行时才能提交（对只有 Node.js 的开发者不友好）
- 大 skill 的 build 可能耗时，影响 commit 体验
- hook 可被 `--no-verify` bypass

### 方案 G：提交 dist/ + CI 一致性检查（推荐）

保留 dist/ 在 main 分支，CI（如 GitHub Actions）在 PR 时检查：`skills/` 的当前状态与 `dist/` 是否一致。不一致则阻塞合并。

**优点**：
- 用户友好（clone 即用）
- 不强制本地 build（开发者可本地跳过 build，CI 兜底）
- 不污染 commit 流程
- 可扩展：未来 CI 还可自动 build 并 push dist 更新

**缺点**：
- 需要 CI 基础设施（当前没有，但未来必然需要）
- 首次设置有成本

## 决策

**选择**：方案 A + G（提交 skills/ 到 main 分支 + CI 一致性检查），过渡期采用方案 F（pre-commit hook）作为临时保障。

**原因**：

1. **最终用户优先**：skill 的最终消费者是 agent，agent 需要读取本地文件。要求用户先装 Bun 再 build 是荒谬的——这就好比要求读者先装 LaTeX 才能看 PDF。

2. **架构演进消除了 dist/ 冗余**：最初设计有 `dist/` 目录，但后来发现 thin-skill 的 Skill 层本身就是轻量的，不需要二次过滤。build 命令的输入改为 `packages/<name>/skill/`，输出改为 `skills/<name>/`。`skills/` 既是构建产物，也是发布产物。

3. **skills/ 体积极小**：SKILL.md + 几个 shell 脚本，通常 < 50KB。对 Git 仓库体积的影响可忽略不计。

4. **一致性必须自动化**：人为保证 `packages/<name>/skill/` 和 `skills/<name>/` 同步是不现实的。必须通过自动化（hook 或 CI）强制收束。

5. **分支/Release/Submodule 都过度工程**：当前项目规模小，引入分支策略或独立 repo 是杀鸡用牛刀。

## 影响

### 正面
- 用户 `git clone` 后可直接 symlink `skills/<name>/` 到 `.claude/skills/`，零构建
- skills/ 作为"发布产物"存在于版本历史中，可追溯
- 未来可扩展为多 skill 仓库（monorepo 中多个 skills/ 子目录）

### 负面
- PR review 时需要忽略 skills/ 的 generated 内容（可通过 `.gitattributes` 标记 `linguist-generated`）

### 后续
- [ ] 创建 `.github/workflows/check-skills.yml`：检查 packages/<name>/skill/ 与 skills/<name>/ 一致性
- [ ] 或创建 `.husky/pre-commit`：本地自动 build
- [ ] 在 `AGENTS.md` 中更新：skills/ 是 build 产物，必须提交
- [ ] 考虑 `skills/lythoskill-creator/` 的 source 迁移到 `packages/lythoskill/skill/`（旧架构遗留）

## 相关
- 关联 ADR: ADR-20260423101938000-thin-skill-pattern.md（thin-skill 三层架构定义）
- 关联 Epic: EPIC-20260423102000000-lythoskill-bootstrap.md（MVP 迭代）
- 关联 Task: TASK-20260423124059736（skill 模板生态建设，dist 是其中一环）
