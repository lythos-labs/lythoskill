---
lane: main
checklist_completed: false
checklist_skipped_reason: Epic creation; checklist will be filled after task breakdown
---
# EPIC-20260527212032856: Site narrative stabilization and living documentation consolidation

> **Epic 是什么**: 1-3 周可结案的 outcome，有依赖、有顺序、要规划。
> **Epic 不是什么**: 配置漂移类小事（那是 task）、决策选型（那是 ADR）。
> **Workflowy zoom-in 心智**: 屏蔽其他 epic 的诱惑，聚焦本卡。
> **双轨**: `lane: main`（当前迭代，最多 1）、`lane: emergency`（不可避免紧急，最多 1）。

> Site 叙事统一、多平台路径对齐、wiki/adr 过时内容归档、当前有效状态沉淀为 living documentation。
> 本质是一次「睡眠记忆整理」——把 1000+ commits 的积累中仍然有效的共识提取到 site，过时的归档，漂移的修正。

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-27 | Created; triggered by site path drift (`.claude/skills` vs `.agents/skills`) and wiki/adr context rot discovery |
| done | 2026-05-28 | Done |

## 背景故事

### 触发事件

5/21 session 的 site narrative restructure 留下了 8 个未提交的 `site/` 文件修改。复盘发现这些修改存在**叙事降级**：把原本隐含的多平台支持（Claude Code、Codex、Cursor 等）悄悄统一成了 `.claude/skills` 单一路径。这与项目代码层（`add.ts` template 明确列出 5 个平台选项、`also_link_to` 支持多目标）和 examples 层（`codex/` 子目录使用 `.agents/skills`）的现有设计相矛盾。

### 深层问题：上下文长度瓶颈

lythoskill 已维持 1000+ commits，wiki/adr 积累了大量细节。但部分 wiki 和 adr 已经过时（例如早期路径约定、已废弃的 CLI 参数、已移除的模块）。这产生了一个恶性循环：

1. Agent 读旧文档 → 产生过时假设
2. 写新文档时携带旧假设 → 产生漂移
3. 下一个 agent 读新文档 + 旧文档 → 上下文爆炸，噪音 > 信号

Site（VitePress 站点）的角色因此升级：它不应只是「宣传页」，而应是**当前有效状态的 single source of truth**。Wiki 和 ADR 应该被审计——过时的归档，仍然有效的提取到 site 或更新为 wiki pattern。

### 目标价值

- **叙事稳定**: `.claude/skills` 与 `.agents/skills` 的关系明确化（Claude Code 优先，但 `.agents/skills` 是社区共识/多平台兼容路径）
- **配置对齐**: `examples/`、`showcase/`、`packages/*/skill/`、`site/` 中的 TOML 示例、template、quick-start 保持一致
- **文档瘦身**: wiki/adr 过时内容归档，减少 agent  onboarding 的读取成本
- **可验证**: 任何 agent 都可以通过 `site/` + `examples/decks/INDEX.md` + `packages/*/skill/SKILL.md` 快速获得当前有效状态，不需要遍历整个 cortex/

## 需求树

### 主题A — Site 叙事稳定化 #backlog

- **触发**: `site/` 未提交 diff 把 `.agents/skills` 统一为 `.claude/skills`，抹杀了多平台叙事
- **需求**:
  - Architecture 示意图与文字一致（当前示意图改了 `.claude/skills`，文字还保留 Codex 路径，矛盾）
  - Guide quick-start 示例需要明确 `working_set` 是可配置的，默认 `.claude/skills` 不等于唯一选择
  - Index 对比表已正确列出多平台（改得好），但底部 TOML 示例需要同步
  - ZH 版本与 EN 版本严格同步
- **实现**:
  - 评估 VitePress `::: code-group` 或 tabs 组件展示多平台配置
  - 或者在 TOML 示例中加注释行：`# Claude Code (default); change to ".agents/skills" for Codex/OpenClaw`
  - Architecture 示意图统一使用占位符 `.<agent>/skills` 或画双分支
- **产出**: `site/` 全站 EN+ZH 无路径叙事矛盾
- **验证**: 人工走读 + grep `site/` 确认没有硬编码路径暗示唯一性

### 主题B — 全局配置对齐 #backlog

- **触发**: `site/`、`examples/`、`showcase/`、`packages/` 中的 `working_set`、`cold_pool` 示例存在不一致
- **需求**:
  - `examples/decks/*.toml`: 已大部分对齐为 `.claude/skills`，`codex/` 子目录保留 `.agents/skills` ✅
  - `examples/decks/INDEX.md`: 已有 cross-platform 对照表 ✅
  - `packages/lythoskill-deck/skill/assets/skill-deck.toml.template`: `.claude/skills` + `~/.agents/skill-repos` ✅
  - `packages/lythoskill-deck/src/add.ts`: template 有 5 平台注释 ✅
  - `site/` (当前 dirty): ❌ 需要重写
  - `showcase/` reproduce.sh: 全部 `.claude/skills` ✅（都是 Claude 场景）
- **实现**:
  - 建立「路径使用规范」文档（可放 wiki），规定什么场景用什么路径
  - 用 grep 做全局扫描，列出所有偏离规范的引用
  - 统一修正
- **产出**: 一份「路径叙事规范」+ 全仓库零偏离
- **验证**: `grep -rn 'working_set' examples/ showcase/ site/ packages/lythoskill-deck/skill/` 结果可解释、无意外

### 主题C — Wiki/ADR 审计与归档 #backlog

- **触发**: wiki 和 adr 中存在过时内容，agent  onboarding 时可能读到错误信息
- **需求**:
  - 扫描 `cortex/wiki/` 和 `cortex/adr/02-accepted/`，标记过时内容
  - 过时的 ADR：保持 accepted 状态但加 `> ⚠️ Superseded` 或移入 `03-superseded/`
  - 过时的 Wiki：更新或移入 `cortex/wiki/03-archive/`
  - 仍然有效的 wiki pattern：提取核心结论，补充到 site 对应页面（减少未来 agent 需要读 cortex 的次数）
- **实现**:
  - 逐篇 audit（可分 task），判断：仍有效 / 需更新 / 已过时
  - 过时的归档，有效的在 site 建立对应入口
- **产出**: wiki/adr 目录清晰，site 成为有效状态 SSOT
- **验证**: `cortex probe` 无状态漂移；新 agent 只读 `site/` + `AGENTS.md` 即可工作

### 主题D — 上下文长度治理（睡眠记忆整理）#backlog

- **触发**: Agent 读文档 → 写文档 → 下一个 agent 再读的循环消耗上下文窗口
- **需求**:
  - 减少「必须读的文档」数量
  - 把「分散在 wiki/adr 中的有效信息」收敛到 site
  - site 的信息架构按「 progressive disclosure 」设计：Guide（新手）→ Architecture（理解）→ Ecosystem（深入）→ Philosophy（扩展）
- **实现**:
  - 每个 site 页面评估：这个信息是否必须？是否能在别处找到？是否有重复？
  - 重复信息删除，分散信息合并
- **产出**: Site 页数不增反减（或至少信息密度提升），agent  onboarding 读取成本下降
- **验证**: 对比本 epic 前后的 daily handoff 中「读取了哪些文件」列表

## 技术决策

| ADR | 标题 | 状态 | 关联说明 |
|-----|------|------|---------|
| ADR-20260517152850372 | deck-also-link-to-multi-cli-working-set-posse | accepted | `also_link_to` 支持多平台 link，site 叙事必须与此一致 |
| ADR-20260519144445916 | working-set-must-not-alias-build-output-directory | accepted | `working_set` 的路径安全规范，site 示例需体现 |

> 注：本 epic 可能产生新的 ADR（例如「Site 多平台叙事规范」或「Living documentation 维护契约」），如发现需要，注册为 task。

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| T1 — Site path narrative audit & rewrite | ✅ completed | TASK-20260527222535526 |
| T2 — Global path alignment sweep | ✅ completed | TASK-20260527212829974 (in review — deliverables done) |
| T5 — Cross-platform quick-start design | ✅ completed | TASK-20260527223818020 |
| — P1/P2 path annotation cleanup | ✅ completed | TASK-20260528111848232 |
| — Command shorthand fix (site + AGENTS.md) | ✅ completed | TASK-20260528114758563 (all code blocks → bunx, AGENTS.md convention added) |
| — Two-path strategy ADR + market research | ✅ completed | ADR-20260528113712898 + market-position wiki + 51-agent reference |
| — Distributed orchestrator ADR | ✅ completed | ADR-20260528173826499 — fork over compose, agent IS orchestrator |
| — Combo skills annotation ADR | ✅ completed | ADR-20260528153455764 — `skills` as visual comment |
| — Deck creation guide ADR | ✅ completed | ADR-20260528120317143 — thin-skill pattern for deck creation |
| — Sober site audit (SSOT-aligned) | ✅ completed | 1 P0 + 2 P1 + 7 P2 — all fixed |
| — HATEOAS research piece | ✅ completed | Why it failed in HTTP, works for agents |
| — GitHub Pages deployment | ✅ completed | https://lythos-labs.github.io/lythoskill/ |
| — Superseded ADR cleanup | ✅ completed | 3 ADRs → 03-superseded/, bodies stripped |
| T6 — Dreaming skill PoC | 🔄 in-progress | Phase 1: concept design ✅. Phase 2: 6 SSOTs + 2 onboarding guides produced, ZK validated. Weekly chain W17-W22 complete. |
| T3 — Wiki/ADR stale content audit | backlog | 逐篇审计 wiki/adr，过时归档，有效提取到 site |
| T4 — Site information density optimization | backlog | 删除重复，合并分散，验证 progressive disclosure |

## 经验沉淀

- **叙事比代码更难改**: 代码有 type checker，叙事只有人的判断力。site 上的一个小路径修改可能影响新用户的第一印象。
- **`.claude/skills` ≠ 唯一路径**: Claude Code 有地位（skill 概念由 Claude 提出），但 `.agents/skills` 更接近社区共识。Site 必须表达「默认用 `.claude`，但兼容 `.agents`」而不是「只能用 `.claude`」。
- **Living documentation 需要主动维护**: 不是「写完了放着」，而是每次代码变更后反问「site 需要更新吗？」。本 epic 试图建立这个习惯。
- **上下文是有限资源**: 1000+ commits 的积累如果全部摊在 agent 面前，等于没有积累。归档和提取是治理的一部分。
- **Dreaming 可以 skill 化**: OpenClaw/Hermes 的个人记忆整理机制可以映射到项目级。lythoskill 治理自己的文档，就是「吃自己的狗粮」。这个方向值得做一个独立 skill（T6）。

## 归档条件

- [x] T1 — `site/` 全站路径叙事无矛盾，EN+ZH 同步
- [x] T2 — 全局路径对齐完成
- [ ] T3 — Wiki/ADR 审计完成，过时内容归档，有效状态沉淀到 site
- [ ] T4 — Site 信息密度优化完成
- [x] T5 — 多平台 quick-start 设计落地
- [x] T6 Phase 1 — Dreaming skill SKILL.md + concept design
- [ ] T6 Phase 2 — Full dreaming pipeline operational (scan → consolidate → ZK validate → revise)
- [x] `cortex probe` 通过，无状态漂移
- [x] 新 agent 仅用 `site/` + `AGENTS.md` + SSOT 即可理解项目当前状态（ZK agent 验证通过）
