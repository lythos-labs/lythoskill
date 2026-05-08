# Curator: Discover and Index Skills

> **What it does:** Scans cold pools, indexes skill metadata, supports structured queries.
> **The analogy:** `npm search` for agent skills, but read-only and trust-aware.

## The Problem

As your cold pool grows, answering simple questions becomes hard:
- "Do we already have a skill for PDF parsing?"
- "Which skills support Claude Code vs Kimi?"
- "What skills were added in the last month?"

## What Curator Solves

```bash
bunx @lythos/skill-curator@latest scan
# → Scans all skill directories
# → Extracts SKILL.md frontmatter
# → Produces REGISTRY.json + catalog.db
```

Now you can query:

```bash
bunx @lythos/skill-curator@latest query "SELECT name, description FROM skills WHERE type = 'standard'"
```

## Three-Layer Trust

Curator doesn't recommend — it surfaces facts. Trust is layered:

| Layer | Source | Confidence |
|-------|--------|------------|
| **L1** | Author's description | Low (self-report) |
| **L2** | Community index / stars | Medium (social proof) |
| **L3** | Your arena results | High (your own data) |

Only L3 is activation authority. A skill can be trending everywhere (L2) but if it fails your arena test, you know.

## Quick Tour

```bash
# Scan cold pool
bunx @lythos/skill-curator@latest scan

# Search by keyword
bunx @lythos/skill-curator@latest query "SELECT * FROM skills WHERE description LIKE '%pdf%'"

# Audit for issues
bunx @lythos/skill-curator@latest audit

# Show database schema
bunx @lythos/skill-curator@latest schema
```

## Core Concepts

| Concept | What it is |
|---------|------------|
| **Read-only** | Curator never modifies skills. It's a librarian, not a gardener. |
| **Reconciler-style** | Any state → scan → converges to clean index. Idempotent. |
| **additions.jsonl** | Decision history: why each skill was added, arena results, fork lineage. |
