# ADR-20260423101938000: Thin Skill Pattern - Development/Release Split

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| accepted | 2026-04-23 | Migrated from old format |

## Context

Agent skills 的发布态与开发态存在结构性张力：

- **发布态**：极简目录（SKILL.md + scripts/ + references/），agent 在运行时加载，context window 敏感
- **开发态**：需要 monorepo、测试、lint、type checking，开发体验敏感

社区当前缺乏从开发态到发布态的 build pipeline。agentskills 讨论 #210 和 Skilldex 论文（arXiv:2604.16911）从社区层面确认了这个 gap 的普遍性。

## Options Considered

### Option A: 胖技能模式（Fat Skill）
技能包含所有依赖、源码、构建产物，自包含但笨重。

- **Pros**: 单一目录，安装简单
- **Cons**: 重复 npm/pip 的版本治理；diamond dependency 无法解决；context window 膨胀

### Option B: 全新 Registry（Rejected）
创建独立的 skill registry，带自己的 semver 和 dependency resolver。

- **Pros**: 统一管理
- **Cons**: 重复建设 npm/pip；版本不一致地狱；Maven WAR/EAR 的历史教训

### Option C: Thin Skill Pattern（Selected）
重的逻辑沉淀到 npm/pip 包，技能层只保留轻量 router。SKILL.md 描述意图，scripts 通过 `bunx`/`npx`/`pipx` 调用已发布的包。

- **Pros**: 
  - 零重复版本治理（npm/pip 解决 diamond dependency）
  - Skill 层 immutable，接口不变则 skill 不需升级
  - Hotfix 实现层无需更新 skill
  - Content hash / pinned version 解决静默升级担忧
- **Cons**: 需要一个 build/dist 工具 bridge 开发态和发布态

## Decision

采用 Thin Skill Pattern，并自举一个 `lythoskill` 工具来处理 build/dist。

类比：
- Skill = Spring Controller（路由层，接口契约绑定）
- npm/pip 包 = Spring Service（实现层，自由演进）
- Starter = Spring Boot Starter（BOM，依赖治理 + CLI 入口）

## Consequences

### Positive
- Skill 层 lifecycle 与实现层解耦
- 开发态 monorepo 体验完整
- 发布态零负担
- 可以 content-addressable（`bunx foo@sha256:abc123`）

### Negative
- 需要 `lythoskill` build 工具（本项目自举解决）
- Agent 需要理解 `bunx`/`pipx` 模式

## References
- https://github.com/agentskills/agentskills/discussions/210
- https://arxiv.org/abs/2604.16911 (Skilldex)
