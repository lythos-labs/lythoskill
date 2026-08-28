---
name: lythoskill-dreaming
version: {{PACKAGE_VERSION}}
description: |
  夜有所梦 — project memory consolidation. Daily (scribe) captures raw
  experience, weekly extracts patterns and anomalies, dreaming consolidates
  the accumulated memory into SSOT. External review via ZK subagent (the
  same de facto standard pattern used by Hermes Curator's forked-agent
  review), with cross-model validation via arena for critical docs.
when_to_use: |
  After major documentation changes, weekly cleanup, pre-onboarding prep,
  context pressure is high, wiki/ADR has grown stale, user says "做梦",
  "整理文档", "consolidate", "SSOT", "sleep on it", "memory consolidation".
---

# Dreaming — 夜有所梦

> 日有所思（daily + weekly），夜有所梦（dreaming → SSOT）。
> Scan → Consolidate → ZK Validate. Extract the "currently true" from scattered docs.

## The Project's Memory System

Project documentation works like human memory:

| Layer | Tool | What it does |
|-------|------|-------------|
| **日有所思** — 经历 | `scribe daily` | Raw session capture: what was done, what was decided, what went wrong |
| **日有所思** — 复盘 | `scribe weekly` | Cross-session pattern extraction: core threads, anomalies, docs now stale |
| **夜有所梦** — 巩固 | `dreaming` | Memory consolidation: extract "currently true" from accumulated docs → SSOT |

Daily 不是流水账，weekly 不是 daily 的汇总。Daily 是 session 级 raw experience，weekly 是跨 session 的模式识别（core_thread、anomaly、docs_now_stale）——本质上是在反腐：发现漂移、标记腐烂、追踪 gap 收敛。Dreaming 是在积累了足够的 daily + weekly 之后，把分散在 wiki/ADR/daily 中尚未腐烂的有效信息提取为 SSOT——就像睡眠中大脑把短期记忆巩固为长期记忆。

## 第一原理

这个模式是我们从 document rot 出发，从自己的 weekly 实践中自然长出来的。Weekly 已经在做反腐——跨 session 检测 anomalies、标记 docs_now_stale、追踪 gap 收敛。Dreaming 是 weekly 的自然延伸：weekly 发现了什么在腐烂，dreaming 把还没腐烂的提取出来固化。

听说过 Hermes Curator 的 dreaming 机制，觉得我们在做的事类似，发起了田野调查——果然，独立交叉对到同一个答案。然后正确迁移到了项目文档管理场景。田野调研见 [`references/hermes-dreaming-field-notes.md`](./references/hermes-dreaming-field-notes.md)。

**核心洞察：维护应该是独立周期，不嵌入每次任务。**

## Three-Phase Flow

### Phase 1: Scan — Start from weekly, not from raw

**Primary index: the weekly chain.** Weeklies (W17-W22) are pre-built importance-ranked summaries. Each weekly already contains:

- `core_thread` — the 1-2 most important clusters per week
- `docs_now_stale` — ADRs/wiki that became outdated each week
- `decisions_accepted` — which ADRs landed when
- Anomalies surfaced — CLI renames, missing ADRs, build-then-reject cycles

Start from weekly, not from raw scan:

```bash
ls weekly/ | sort                          # Read all weeklies
cat weekly/*.md | grep "docs_now_stale"    # Extract stale-doc index across all weeks
cat weekly/*.md | grep "decisions_accepted" # Build ADR timeline from weekly
```

**Why this is better**: 81 ADRs + 54 wiki + 25 dailies ≈ impossible to scan cold. The weekly chain is 6 files that tell you *what mattered and what's outdated*. Weekly is dreaming's pre-built index — like Obsidian's map of content.

**Fallback** (only when weeklies are missing or incomplete):
```bash
bun packages/lythoskill-project-cortex/src/cli.ts probe
ls -lt cortex/adr/02-accepted/ | head -20
git log --since="30 days ago" --oneline -- cortex/wiki/ cortex/adr/
```

Agent reads weekly chain → identifies:
- **Already stale**: flagged in `docs_now_stale` across any weekly
- **Superseded**: ADR mentioned in a later weekly's `decisions_accepted` that contradicts an earlier one
- **Duplicate**: same insight appearing in multiple wiki entries
- **Orphaned**: references to tasks/epics that no longer exist

### Phase 2: Consolidate

Write to `cortex/wiki/04-ssot/`. One file per major topic area. Each SSOT file is:

- **Short** (< 500 lines) — a fresh agent can read it in one pass
- **Self-contained** — links to source ADRs/wiki for detail, but doesn't require reading them
- **Current** — reflects what's TRUE NOW, not what was true at some point in history
- **Dated** — frontmatter `last_consolidated: 2026-05-28` so reader knows freshness

Example SSOT topics:
- `architecture.md` — current system architecture (not design history)
- `conventions.md` — active code/doc conventions (not deprecated ones)
- `key-decisions.md` — ADRs that still hold (superseded ones noted but not replayed)
- `pitfalls.md` — recurring failure modes and their fixes

**Update `cortex/wiki/01-patterns/INDEX.md`** (ADR-20260613190449007 maintenance loop — a stale index is more misleading than none). Judgment rules (from the ADR, verbatim):

- 被 ≥2 个 weekly 的 `decisions_accepted` 或 `project_lesson_candidates` 引用 → P0
- 已被 `04-ssot/*.md` 引用的模式 → P1
- 其他 → P2

When this phase absorbs a pattern into an SSOT file, move its INDEX entry to P1 and name the absorbing file in its TL;DR. When a weekly newly cites a pattern for the second time (≥2 distinct weeklies), promote it to P0.

### Phase 3: ZK Validate

After writing SSOT, spawn a **zero-knowledge subagent**:

```
ZK subagent prompt:
  "You have NO prior context about this project. Read these SSOT files:
   - cortex/wiki/04-ssot/architecture.md
   - cortex/wiki/04-ssot/conventions.md
   Self-report: what do you understand? What is unclear? What seems contradictory?"

Agent evaluates the ZK subagent's self-report:
  - Misunderstood sections → SSOT needs revision (writing assumed context that doesn't exist)
  - "Where is X?" questions → SSOT is missing a topic
  - Contradictions flagged → SSOT inherited stale info from source docs
```

**For critical SSOT documents**, escalate to cross-model validation:

```
arena single --player kimi --brief "Read cortex/wiki/04-ssot/architecture.md and self-report your understanding"
```

If kimi also understands → document is broadly usable, not Claude-specific.

## Relationship with Other Tools

| Tool | Role in Dreaming |
|------|-----------------|
| `cortex probe` | Input: detects stale tasks, epic drift, empty shells |
| `deck validate` | Input: checks if referenced skill paths still exist |
| `curator scan` | Input: cold pool freshness — are our skill references valid? |
| `arena single` | ZK validation L2: cross-model readability check |
| `scribe daily` | Records dreaming session output |

## When NOT to Dream

- Mid-task, mid-refactor — dreaming is a between-sessions activity
- When the working tree is dirty — commit first
- When there's an active emergency epic — firefighting takes priority

## Dreaming Output Contract

Every SSOT file must have:

```yaml
---
last_consolidated: 2026-05-28
sources: ["cortex/adr/02-accepted/ADR-xxx.md", "cortex/wiki/01-patterns/xxx.md"]
zk_validated: true
zk_issues: 0
---
```

## Supporting References

| When you need to… | Read |
|--------------------|------|
| Read the Hermes Curator field notes | [`references/hermes-dreaming-field-notes.md`](./references/hermes-dreaming-field-notes.md) |
| See the ZK validation pattern in action | AGENTS.md § ZK Validation Pattern |
