# Skill Cold Pool Catalog

> **Agent 不要直接 scan 冷池。读这个文件。**
>
> CATALOG 是 skill 冷池的「索引卡片系统」—— curator 做了一次昂贵的全表扫描，
> 产出这个浓缩版本。后续 agent 直接查 CATALOG，只有需要深入细节时才回原始 skill。
>
> Scan of `~/.agents/skill-repos/` — indexed by curator gateway protocol v0.1.0
> Generated: 2026-04-23 | Total: 55 skills | Format: 8-layer classification + dao-shu-qi-yong

## Classification System

| Axis | Values |
|------|--------|
| **Layer** | meta → stack-primer → tool → content → domain → combo |
| **Assertiveness** | high (takes control) / medium (guides) / low (assists) |
| **Conflict Risk** | high / medium / low / none |
| **Ecosystem** | lythos / superpowers / anthropic / z-ai / third-party |
| **Dao-Shu-Qi-Yong** | 道(philosophy) / 术(combo/flow) / 器(tool) / 用(primer) |
| **Trust Level** | audited (scanned) / self-declared / unverified |

### Dao-Shu-Qi-Yong 详解

| 层级 | 含义 | Skill 类型 | 处理方式 |
|------|------|-----------|---------|
| **道** | 高主见 orchestration 哲学 | Superpowers TDD、writing-plans | 只能吸收，不可 wrapper |
| **术** | Combo/flow 编排逻辑 | report-generation-combo, arena pipeline | 组合多个器，可移植 |
| **器** | 工具 skills | web-search, ASR, docx, capture-screen | 最中立，标准化分发 |
| **用** | 底漆/stack-primer | lythos-superpowers-stack-primer | 适配层，告诉 agent 怎么用 |

**关键规则**：同一 deck 中只能有一个 **道** 层 skill。多个道层同时激活 = 主见冲突 = agent 不知道听谁的。
**术** 层可以组合多个 **器**。**用** 层负责翻译和冲突预警。

---

## Meta / Orchestration Layer

Skills that manage other skills, projects, or agent workflows.

### skill-curator
- **Ecosystem**: lythos
- **Type**: standard
- **Assertiveness**: low (read-only observer)
- **Conflict Risk**: none
- **Niche**: meta.curation.deck-discovery
- **Description**: Scan cold pools, extract metadata, build indices, recommend combos
- **Managed dirs**: `.cortex/skill-curator/`
- **Key capability**: `--recommend` mode produces tiered candidate pools (Core / Force Multiplier / Optional)
- **Combo patterns**: Pipeline, Modality Stack, Orchestrator-Engine, Temporal Sequence, Triangulation
- **Dao-Shu-Qi-Yong**: 术 (combo/flow orchestration — indexes and recommends skill combinations)
- **Notes**: Frontmatter-first parsing. Deterministic output. LLM-native reasoning for causal chains.

### skill-arena
- **Ecosystem**: lythos
- **Type**: standard
- **Assertiveness**: medium
- **Conflict Risk**: low
- **Niche**: meta.evaluation.skill-comparison
- **Description**: Skill comparison benchmark with control-variable decks
- **Dao-Shu-Qi-Yong**: 术 (combo/flow — orchestrates subagent comparison)
- **Notes**: Generates arena IDs with timestamp. Creates deck per participant + judge persona.

### project-cortex
- **Ecosystem**: lythos
- **Type**: standard
- **Assertiveness**: high (governance layer)
- **Conflict Risk**: high — conflicts with superpowers `writing-plans`
- **Niche**: meta.governance.project-management
- **Dao-Shu-Qi-Yong**: 道 (high-assertiveness governance philosophy — "MUST use CLI", numeric prefixes, timestamp IDs)
- **Description**: GTD-style project management (ADR/Epic/Task/Wiki)
- **Managed dirs**: `cortex/`
- **Notes**: MUST use CLI commands to create docs (not manual). Status dirs use numeric prefixes. Timestamp IDs.

### repomix-handoff
- **Ecosystem**: lythos
- **Type**: standard
- **Assertiveness**: low
- **Conflict Risk**: low
- **Niche**: meta.tooling.repomix
- **Description**: Package project context for handoff using repomix
- **Dao-Shu-Qi-Yong**: 器 (neutral tool — packages files, no orchestration)
- **Notes**: Consumes structured decisions (ADR) from project-cortex.

---

## Stack Primers (Embassy Layer)

Diplomatic shim between ecosystems. Prevents agent from being misled by skill desc.

### lythos-superpowers-stack-primer
- **Ecosystem**: lythos → superpowers
- **Type**: standard
- **Assertiveness**: low (advisory only)
- **Conflict Risk**: none
- **Niche**: meta.stack-primer.superpowers
- **Description**: Lythos embassy to Superpowers ecosystem. 14-skill mental map + conflict matrix + role-switching protocol.
- **Dao-Shu-Qi-Yong**: 用 (primer — tells agent HOW to use superpowers safely, not WHAT to do)
- **Key insight**: Superpowers skills are `orchestration` layer with varying assertiveness. `writing-plans` and `test-driven-development` are HIGH assertiveness and conflict with lythos governance.
- **Role switching**: 立项者 ↔ 执行组长 context switch via prompt hint (not skill unloading)
- **Conflict pairs**:
  - `writing-plans` + `project-cortex`: 规划方式冲突（高）
  - `test-driven-development` + 任何"先写代码"技能: TDD 断言冲突（高）

### lythos-mattpocock-stack-primer
- **Ecosystem**: lythos → mattpocock
- **Type**: standard
- **Assertiveness**: low
- **Conflict Risk**: none
- **Niche**: meta.stack-primer.mattpocock
- **Description**: Lythos embassy to Matt Pocock ecosystem. 15-skill index.
- **Dao-Shu-Qi-Yong**: 用 (primer — diplomatic shim, conflict map, role-switching)
- **Notes**: Similar diplomatic pattern. Maintains `index.json` mental map.

---

## External Orchestration Ecosystems

Full skill suites with their own governance philosophy.

### superpowers
- **Ecosystem**: superpowers (Jesse Vincent / Prime Radiant)
- **Type**: ecosystem-bundle (not single skill)
- **Assertiveness**: very_high (mandatory workflows)
- **Conflict Risk**: high — philosophy differs from lythos
- **Dao-Shu-Qi-Yong**: 道 (high-assertiveness philosophy — agent MUST obey, 94% PR rejection rate)
- **Philosophy**: Mandatory workflows, not suggestions. TDD is non-negotiable. Zero dependencies.
- **Structure**: 14 skills in `skills/` subdir + AGENTS.md + hooks + scripts
- **Key difference from lythos**: 
  - Superpowers = orchestration-first (skills manage the agent)
  - Lythos = tooling-first (agent chooses when to use skills)
  - Superpowers has 94% PR rejection rate — very opinionated
- **Skills**: brainstorming, writing-plans, test-driven-development, systematic-debugging, subagent-driven-development, executing-plans, dispatching-parallel-agents, verification-before-completion, receiving-code-review, requesting-code-review, finishing-a-development-branch, using-git-worktrees, using-superpowers, writing-skills
- **Note**: NO standard SKILL.md at root. Uses AGENTS.md as primary instruction.

---

## Tool Skills

Single-purpose utilities. Low assertiveness, high composability.

### web-search
- **Ecosystem**: third-party
- **Type**: standard
- **Assertiveness**: low
- **Conflict Risk**: none
- **Niche**: tool.search.web
- **Description**: Web search capability
- **Dao-Shu-Qi-Yong**: 器 (neutral tool)

### web-reader
- **Ecosystem**: third-party
- **Type**: standard
- **Assertiveness**: low
- **Conflict Risk**: none
- **Niche**: tool.read.web
- **Description**: Read and summarize web content
- **Dao-Shu-Qi-Yong**: 器 (neutral tool)

### image-generation
- **Ecosystem**: z-ai
- **Type**: standard
- **Assertiveness**: low
- **Conflict Risk**: none
- **Niche**: tool.generate.image
- **Description**: AI image generation via z-ai-web-dev-sdk
- **Dao-Shu-Qi-Yong**: 器 (neutral tool)
- **License**: MIT

### deep-research
- **Ecosystem**: anthropic
- **Type**: standard
- **Assertiveness**: medium
- **Conflict Risk**: low
- **Niche**: tool.research.deep
- **Description**: Deep research with web sources
- **Dao-Shu-Qi-Yong**: 术 (combo/flow — orchestrates multi-source research)
- **Size**: 544 lines (largest single skill)

---

## Content / Media Skills

Multimedia I/O capabilities.

### ASR (asr-transcribe-to-text)
- **Ecosystem**: z-ai
- **Type**: standard
- **Assertiveness**: low
- **Conflict Risk**: none
- **Niche**: tool.transcribe.audio
- **Description**: Speech-to-text using z-ai-web-dev-sdk
- **Dao-Shu-Qi-Yong**: 器 (neutral tool)
- **License**: MIT

### TTS
- **Ecosystem**: third-party
- **Type**: standard
- **Assertiveness**: low
- **Conflict Risk**: none
- **Niche**: tool.synthesize.speech
- **Description**: Text-to-speech
- **Dao-Shu-Qi-Yong**: 器 (neutral tool)

---

## Domain Specific Skills

Vertical expertise for specific domains.

### ai-marketing-skills
- **Ecosystem**: third-party
- **Type**: bundle
- **Assertiveness**: varies
- **Conflict Risk**: low
- **Niche**: domain.marketing
- **Description**: Marketing-specific skills
- **Dao-Shu-Qi-Yong**: 术 (bundle of domain tools, can be composed)
- **Size**: 32 sub-skills (largest bundle)

### color-expert
- **Ecosystem**: third-party
- **Type**: standard
- **Assertiveness**: low
- **Conflict Risk**: none
- **Niche**: domain.design.color
- **Description**: Color theory, naming, spaces, accessibility, conversions
- **Dao-Shu-Qi-Yong**: 器 (neutral domain tool)

---

## Memory / Handoff Skills

Session continuity and context preservation.

### project-scribe
- **Ecosystem**: lythos
- **Type**: standard
- **Assertiveness**: medium (mandates handoff at session end)
- **Conflict Risk**: low
- **Niche**: meta.memory.write
- **Description**: CQRS write side — dump session state to `daily/HANDOFF.md`
- **Dao-Shu-Qi-Yong**: 术 (combo/flow — orchestrates handoff ritual: git → cortex → session → write)
- **Key insight**: Scribe's value is the ~30% exploration cannot recover (pitfalls, true state)
- **Auto-triggers**: "LGTM", milestone, context limit, "session 要结束了"

### claude-memory-skill
- **Ecosystem**: anthropic
- **Type**: standard
- **Assertiveness**: medium
- **Conflict Risk**: low
- **Niche**: meta.memory.cli-bound
- **Description**: Claude Code's native memory system
- **Dao-Shu-Qi-Yong**: 器 (neutral tool — reads/writes .claude/memory/)
- **Note**: Bound to `.claude/memory/` — user-level, not project-level. Different scope from `daily/`.

---

## Development Skills

Coding and engineering utilities.

### fullstack-dev
- **Ecosystem**: third-party
- **Type**: standard
- **Assertiveness**: high (scaffolds entire projects)
- **Conflict Risk**: medium — may conflict with project-specific conventions
- **Niche**: dev.fullstack.nextjs
- **Description**: Next.js 16 + TypeScript + Tailwind + shadcn/ui + Prisma
- **Dao-Shu-Qi-Yong**: 术 (combo/flow — orchestrates full stack: frontend + backend + db + ui)

---

## Combo Skills

Multi-skill orchestrators.

### report-generation-combo
- **Ecosystem**: lythos
- **Type**: combo
- **Assertiveness**: medium
- **Conflict Risk**: low
- **Niche**: combo.report.generation
- **Description**: Orchestrator + renderers (docx/pptx/xlsx)
- **Dao-Shu-Qi-Yong**: 用 (primer-level combo — orchestrator + renderers)

### project-arena-combo
- **Ecosystem**: lythos
- **Type**: combo
- **Assertiveness**: medium
- **Conflict Risk**: low
- **Niche**: combo.project.arena
- **Description**: Project governance + arena testing combo
- **Dao-Shu-Qi-Yong**: 用 (primer-level combo — governance + testing)

---

## Pitfalls Discovered During Phase A Scan

### Pitfall 1: Superpowers has NO SKILL.md at root
- **错误尝试**: Expected standard `SKILL.md` with YAML frontmatter at repo root
- **正确做法**: Superpowers uses `AGENTS.md` as primary instruction, `skills/` subdir for individual skills
- **根因**: Different skill packaging philosophy — superpowers is an ecosystem bundle, not a single skill
- **影响**: Curator frontmatter-first parsing fails on superpowers. Need fallback to AGENTS.md parsing.

### Pitfall 2: Skill desc vocabulary inflation
- **现象**: Almost every skill claims to be "comprehensive", "primary", "professional"
- **例子**: finance skill says "Priority use cases... This skill should be the primary choice"
- **根因**: Skill authors have incentive to make desc sound impressive (commons tragedy)
- **解决**: Stack-primer layer needed to provide ground-truth assessment
- **浪费 time**: Would mislead agent deck composition without primer

### Pitfall 3: Ecosystem boundary confusion
- **现象**: lythos skills and superpowers skills look similar in `skill-repos/` but have fundamentally different governance models
- **根因**: No metadata field indicating ecosystem philosophy (orchestration-first vs tooling-first)
- **解决**: Catalog adds `ecosystem` and `assertiveness` fields to every entry

### Pitfall 4: Ecosystem bundle size inflation
- **现象**: claude-code-skills 包含 60+ 条目，anthropic-skills 包含 16+ 技能
- **根因**: 社区生态倾向于「大而全」的打包方式
- **影响**: Agent context 被大量 description 污染
- **解决**: Catalog 将 ecosystem-bundle 作为整体条目，不拆开

### Pitfall 5: skill-manager vs lythoskill-deck 静默冲突 ⭐
- **现象**: 两者管理同一个目录 (`.claude/skills/`) 和同一份声明文件 (`skill-deck.toml`)
- **根因**: lythoskill-deck 是 monorepo 的 build 输出，skill-manager 是独立演化的改进版
- **影响**: symlink 竞争和 lock 文件互覆盖
- **解决**: Deck 中同时声明两者时标记 conflict_risk: high

### Pitfall 6: PPTX skill 是「反技能」
- **现象**: SKILL.md 没有任何实现内容，只有一条强制 redirect 规则
- **根因**: 平台级 skill，要求用户必须使用专门的 AI PPT 模式
- **影响**: Agent 可能浪费时间尝试用常规方式处理 PPT
- **解决**: Assertiveness 标记为 very_high（self-negating 模式）

### Pitfall 7: ZAI 技能群的 backend-only 限制
- **现象**: 9 个 ZAI 技能全部要求 backend-only
- **根因**: z-ai-web-dev-sdk 设计为服务端 SDK
- **影响**: Agent 可能错误地建议客户端代码中使用 SDK
- **解决**: lythos-zai-stack-primer 已标记 `backend_only: true`

### Pitfall 8: Duplicate skills across ecosystems
- **现象**: docx/xlsx/pptx/frontend-design 同时存在于 z-ai 和 anthropic-skills 生态
- **根因**: 不同平台独立开发了相似能力的 skill
- **影响**: Deck 中同时激活会导致冲突
- **解决**: Stack-primer 应提供「同能力不同生态」的映射表

### Pitfall 9: No SKILL.md at root for ecosystem bundles
- **现象**: anthropic-skills, claude-code-skills, mattpocock-skills 没有标准 SKILL.md
- **根因**: ecosystem bundle 的包装哲学不同
- **影响**: Curator 的 frontmatter-first 解析失败
- **解决**: README.md / AGENTS.md fallback

---

## Classification Coverage

| Layer | Phase A | Phase B | Total |
|-------|---------|---------|-------|
| Meta/Orchestration | 4 | 6 | 10 |
| Stack Primers | 2 | 1 | 3 |
| Tool Skills | 4 | 13 | 17 |
| Content/Media | 2 | 1 | 3 |
| Domain Specific | 2 | 6 | 8 |
| Memory/Handoff | 2 | 5 | 7 |
| Development | 1 | 1 | 2 |
| Combos | 2 | 0 | 2 |
| Ecosystem Bundles | 1 | 3 | 4 |
| **Total** | **20** | **35** | **55** |
| Combos | 2 | 0 | (all indexed) |

**Total Phase A**: 20 skills indexed
**Estimated Phase B**: ~35 skills remaining

---

## Next Steps (for Phase B Agent)

1. **Continue scan**: Index remaining ~35 skills, following the same classification system
2. **Resolve superpowers parsing**: Add AGENTS.md fallback for ecosystem bundles without SKILL.md
3. **Cross-reference combos**: Verify combo skills reference real skills in the catalog
4. **Assertiveness audit**: For each newly indexed skill, determine assertiveness level by reading body (not just desc)
5. **Conflict matrix expansion**: As more skills are indexed, expand the conflict pairs table
6. **Export to curator format**: Convert catalog to `REGISTRY.json` for programmatic consumption

---

*Phase A completed. Handoff at: `daily/HANDOFF.md`*
