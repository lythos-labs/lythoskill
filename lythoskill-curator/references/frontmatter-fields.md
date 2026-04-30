# Frontmatter Fields: Standard vs Extended

> Curator only indexes a subset of all possible frontmatter fields. This document explains why.

## Design Principle: Index is Not Archive

SKILL.md is the canonical source of truth. Curator's catalog is an **acceleration layer** for filtering and conflict detection — not a full replica.

Agent runtimes (Claude Code, Codex, etc.) read the complete SKILL.md at activation time. The index only needs fields that help the agent **decide which skills to consider**.

## Agent Skills Open Standard Fields

These fields exist in the [agentskills.io](https://agentskills.io) specification and are supported across multiple agent runtimes.

| Field | In Catalog | Why Indexed |
|-------|-----------|-------------|
| `name` | ✅ | Primary key; directory name fallback |
| `description` | ✅ | Core trigger mechanism (merged with `when_to_use`) |
| `when_to_use` | ✅ | Additional trigger context; 1,536-char cap with description |
| `version` | ✅ | Change tracking |
| `type` | ✅ | Filter: `standard`, `flow`, `combo` |
| `allowed-tools` | ✅ | Permission audit; security-relevant |
| `user-invocable` | ✅ | Distinguish user-visible vs background skills |
| `tags` | ✅ | Category filtering (community alternative to `category` proposal) |
| `author` | ✅ | Source attribution; falls back to inferred `source` org |
| `license` | ❌ | Not needed for selection logic |
| `model` | ❌ | Runtime override; irrelevant at indexing time |
| `context` | ❌ | Runtime fork config; irrelevant at indexing time |
| `agent` | ❌ | Runtime subagent type; irrelevant at indexing time |
| `hooks` | ❌ | Runtime lifecycle; irrelevant at indexing time |
| `effort` | ❌ | Runtime effort level; irrelevant at indexing time |
| `paths` | ❌ | File-path activation globs; currently not parsed by curator |
| `arguments` | ❌ | Parameter schema; not needed for discovery |

## lythoskill Extended Fields

These fields are specific to the lythoskill ecosystem and are ignored by non-lythoskill agents.

| Field | In Catalog | Why Indexed |
|-------|-----------|-------------|
| `deck_niche` | ✅ (as `niches`) | Domain classification; overlap detection |
| `deck_managed_dirs` | ✅ (as `managed_dirs`) | Directory conflict detection |
| `deck_dependencies` | ✅ | Dependency graph for deck resolution |
| `metadata.lyth_*` | ❌ | Internal telemetry; not actionable at index time |

## Inferred Fields (Not from Frontmatter)

Curator derives these from the cold-pool filesystem layout:

| Field | Source | Example |
|-------|--------|---------|
| `source` | Cold-pool path | `github.com/anthropics/skills`, `localhost` |
| `has_scripts` | `scripts/` exists | — |
| `has_examples` | `examples/` exists | — |
| `trigger_phrases` | NLP extraction from description | — |
| `body_preview` | First 500 chars of body | — |

### Source Inference (Go-Mod Style)

Cold-pool layout follows `<pool>/<host>/<org>/<repo>/.../<skill>/`:

```
~/.agents/skill-repos/
  github.com/
    anthropics/
      skills/
        skills/pdf/          → source: github.com/anthropics/skills
  localhost/
    librarian/               → source: localhost
```

This is intentionally modeled after Go module paths (`github.com/owner/repo`), which developers already understand. `source` is more reliable than frontmatter `author` because it cannot be forged — it reflects the actual filesystem provenance.

## When to Read Full SKILL.md

The index answers: *"Which skills might be relevant?"*
The full file answers: *"How do I use this skill?"*

| Question | Use Index | Read SKILL.md |
|----------|----------|---------------|
| "What skills handle testing?" | ✅ tags, niches | ❌ |
| "Any conflicts with `cortex/`?" | ✅ managed_dirs | ❌ |
| "Which org wrote this?" | ✅ source, author | ❌ |
| "What are the exact steps?" | ❌ | ✅ body |
| "What scripts are available?" | ✅ has_scripts | ✅ list scripts/ |
| "What tools does this allow?" | ✅ allowed_tools | ❌ (same data) |

## Future: Category Taxonomy

The community is discussing a `category` field (see [anthropics/skills#188](https://github.com/anthropics/skills/issues/188)). Until standardized, curator uses `tags` + `niches` as the classification mechanism. When `category` lands in the open standard, it will be added to the catalog schema as a first-class filter column.
