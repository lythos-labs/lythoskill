# ADR-20260710111933808: INDEX.md HATEOAS boundary — explicit is/is-not contract for derived-state curation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-07-10 | Created |
| accepted | 2026-07-10 | Accepted |

## Background

`cortex/INDEX.md` serves as the entry point for project governance documentation. It currently describes directory structure, naming conventions, creation commands, and a "Must-Read Files" section. However, it lacks explicit boundaries about what it is and is not.

During a ZK Review session, a zero-knowledge agent misused INDEX.md as real-time status ground truth, leading to confusion:
- INDEX.md "Last updated: 2026/6/13" (27 days stale at time of review)
- Agent expected it to reflect current epic/task state
- The actual current state was in `daily/2026-07-08.md` + `cortex/epics/01-active/` + `cortex/tasks/02-in-progress/`

The root cause: INDEX.md's role was implicit. It appeared to be auto-generated (stated at bottom) yet contained hand-curated "Must-Read" selections. New agents could not distinguish between:
- "This is a stable foundation document" vs
- "This is a live registry of all current decisions"

This is a HATEOAS (Hypermedia As The Engine Of Application State) boundary problem. Each document should explicitly declare its scope and point to where out-of-scope information lives.

## Decision Drivers

1. **Derived-state curation needs explicit contract**: INDEX.md is a derived state (from `cortex/` filesystem), not a primary source. Its curation standard must be transparent.
2. **New agents misinterpret stale derived state as ground truth**: Without explicit "is/is NOT" boundaries, agents assume completeness.
3. **Warm-up cost for dormant projects is normal, but misdirection is not**: A 27-day gap is acceptable friction; an agent following INDEX.md to check "active epics" is a design failure.
4. **Consistency with thin-skill pattern philosophy**: Intelligence in instructions, stable integration in conventions — the document itself should follow this.
-

## Options

### Option A: Add explicit `**What this file is** / **What this file is NOT**` header block to INDEX.md

Add a HATEOAS boundary declaration at the top of INDEX.md, with explicit pointers to where out-of-scope information lives.

**Example**:
```markdown
> **What this file is**: Foundation curation — stable structure, naming conventions,
>   and hand-picked must-reads that don't expire.
>
> **What this file is NOT**: Real-time status. For current work, read `daily/YYYY-MM-DD.md`.
>   For complete ADR registry, see `cortex/adr/02-accepted/`. For active epics,
>   see `cortex/epics/01-active/`.
```

**Pros**:
- Zero tooling change — pure documentation edit
- Immediately prevents misinterpretation by new agents
- Establishes pattern for other derived-state documents (wiki/INDEX.md, weekly files, etc.)
- HATEOAS: every "NOT" has a concrete "GO TO" pointer

**Cons**:
- Requires manual maintenance if pointer targets change (e.g., `daily/` format changes)
- Does not solve underlying "why was INDEX.md not regenerated" question
- Relies on agent actually reading the header (but this is true of any documentation)

### Option B: Auto-generate INDEX.md Must-Read from metadata + add freshness watermark

Change `generate-index.ts` to:
1. Auto-populate Must-Read from ADR frontmatter `category: foundation` or similar tag
2. Add " freshness watermark": "This INDEX covers decisions up to ADR-YYYYMMDD. For newer decisions, see `cortex/adr/02-accepted/`."
3. Regenerate INDEX.md automatically when `cortex epic done` or `cortex adr accept` runs

**Pros**:
- Reduces manual curation drift
- Freshness watermark makes staleness explicit
- Closer to "auto-generated" claim already in footer

**Cons**:
- Requires frontmatter schema change (add `category` or `must-read: true` to ADRs)
- More complex tooling; risk of over-engineering
- Does not address HATEOAS boundary for other derived-state docs (wiki/INDEX.md, etc.)
- "Auto-regenerate" still has latency (only triggers on CLI commands, not direct `mv`)

### Option C: Apply same HATEOAS boundary pattern to `wiki/INDEX.md` and other derived-state docs

Extend Option A's explicit is/is-NOT contract to all derived-state index files in the project, establishing a convention.

**Pros**:
- Consistent pattern across all governance docs
- Prevents same misinterpretation in wiki (wiki/INDEX.md also auto-generated but stale)
- Low cost — documentation-only change

**Cons**:
- More files to maintain
- Pattern needs to be documented as a convention (meta-HATEOAS)
- Does not auto-solve freshness; still relies on human/agent discipline

## Decision

**Choice**: Option A + Option C — Add explicit `**What this file is** / **What this file is NOT**` header to INDEX.md, and apply the same HATEOAS boundary pattern to `wiki/INDEX.md` and other derived-state index documents.

**Rationale**:

The core insight from ZK Review and subsequent analysis: **INDEX.md's existence is to be a TL;DR — "you generally don't need to look at most files in Y directory older than X time."** But this contract was implicit, causing new agents to mistake it for a complete registry.

> "My reason for existence is that I am your TL;DR. You generally don't need to look at most files in the Y directory older than X time."

This applies to many documents in the project:
- `AGENTS.md` → "read me before working, details in references/"
- `daily/` → "last session state, history in git log"
- `weekly/` → "this week's thread, dailies in daily/"
- `SKILL.md` → "when to trigger me, full flow in references/"
- `cortex/INDEX.md` → "governance structure, current state in daily/ + epics/"
- `wiki/INDEX.md` → "wiki structure, full entries in wiki/ subdirs"

Each of these is a **compression layer**. The HATEOAS boundary makes the compression explicit:
- **What I am**: The compressed view you need 90% of the time
- **What I am NOT**: The full view you need 10% of the time — and here is where to find it

Option B (auto-generate) was rejected because:
1. It conflates "curation" with "completeness" — Must-Read is intentionally selective
2. It adds tooling complexity for a documentation problem
3. The real issue is not "stale content" but "unclear contract"

**The pattern**: Every derived-state index document gets a standard header:

```markdown
> **What this file is**: [One-line role — e.g., "Foundation curation of governance structure"]
>
> **What this file is NOT**: [What it does not cover, with concrete pointers]
```

This is a convention, not a tool. It applies to:
- `cortex/INDEX.md`
- `wiki/INDEX.md`
- Any future derived-state index files

## Impact

- **Positive**: New agents immediately understand INDEX.md's scope; prevents misinterpretation of stale derived state as ground truth; establishes reusable pattern for all compressed-view documents
- **Negative**: Slight overhead in maintaining pointer targets (if `daily/` format changes, header must update)
- **Follow-up**: Apply same header to `wiki/INDEX.md`; document this as a convention in AGENTS.md or a wiki pattern

## Related
- Related ADR:
- Related Epic:
