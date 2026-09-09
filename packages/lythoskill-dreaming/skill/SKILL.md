---
name: lythoskill-dreaming
version: {{PACKAGE_VERSION}}
description: |
  夜有所梦 — project memory consolidation. Daily (scribe) captures raw
  experience, weekly extracts patterns and anomalies, dreaming consolidates
  the accumulated memory into the single source of truth (SSOT).
  External review via a zero-knowledge subagent (a fresh agent with no
  conversation context — the same pattern Hermes Curator uses for
  forked-agent review), with cross-model validation via arena for
  critical docs.
when_to_use: |
  After major documentation changes, weekly cleanup, pre-onboarding prep,
  context pressure is high, wiki/ADR has grown stale, user says "做梦",
  "整理文档", "consolidate", "SSOT", "sleep on it", "memory consolidation".
---

# Dreaming — 夜有所梦 ("night dreams": consolidate the day into long-term memory)

> By day, thought (日有所思 — daily + weekly gather raw experience); by night,
> dreams (夜有所梦 — dreaming consolidates it into the SSOT).
> Scan → Consolidate → ZK Validate. Extract the "currently true" from scattered docs.

## The Project's Memory System

Project documentation works like human memory:

| Layer | Tool | What it does |
|-------|------|-------------|
| **By day — experience** (日有所思) | `scribe daily` | Raw session capture: what was done, what was decided, what went wrong |
| **By day — review** (日有所思) | `scribe weekly` | Cross-session pattern extraction: core threads, anomalies, docs now stale |
| **By night — consolidation** (夜有所梦) | `dreaming` | Memory consolidation: extract "currently true" from accumulated docs → SSOT |

Daily is a raw-experience log, not a ledger replay; weekly is cross-session pattern
recognition (core_thread, anomaly, docs_now_stale) — essentially anti-corruption work:
detect drift, mark rot, track gap closure. Dreaming is the next layer: once enough
daily + weekly has accumulated, extract everything still-true scattered across
wiki/ADR/daily into the SSOT — the way a sleeping brain consolidates short-term memory
into long-term memory.

## First Principles

The layering: daily captures raw experience; weekly extracts cross-session
patterns and flags rot (docs_now_stale, anomalies); dreaming consolidates what
still holds into the SSOT. Each layer feeds the next — weekly finds what is
rotting, dreaming solidifies what hasn't rotted yet.

The mechanism has an external precedent: the Hermes Curator dreaming mechanism
converges on the same idea independently. The transfer of that mechanism to
project documentation is what this skill implements. Field notes:
[`references/hermes-dreaming-field-notes.md`](./references/hermes-dreaming-field-notes.md).

**Core insight: maintenance should be a standalone cycle, not embedded in every task.**

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

**Update `cortex/wiki/01-patterns/INDEX.md`** (ADR-20260613190449007 maintenance loop — a stale index is more misleading than none). Judgment rules (from ADR-20260613190449007, verbatim; the ADR text is Chinese):

- 被 ≥2 个 weekly 的 `decisions_accepted` 或 `project_lesson_candidates` 引用 → P0
  (cited by ≥2 distinct weeklies' `decisions_accepted` or `project_lesson_candidates` → P0)
- 已被 `04-ssot/*.md` 引用的模式 → P1
  (already referenced by a `04-ssot/*.md` file → P1)
- 其他 → P2 (everything else → P2)

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
# Recommended for self-description (required for new files where they apply):
related: ["packages/lythoskill-x/skill/references/xxx.md"]   # adjacent authoritative docs
summary: |
  One paragraph: what this SSOT covers + who its primary reader is.
---
```

## Supporting References

| When you need to… | Read |
|--------------------|------|
| Read the Hermes Curator field notes | [`references/hermes-dreaming-field-notes.md`](./references/hermes-dreaming-field-notes.md) |
| See the ZK validation pattern in action | AGENTS.md § ZK Validation Pattern |
