---
created: 2026-05-09
updated: 2026-05-09
category: pattern
---

# Cold Pool Architecture — Deck Decoupling with FSM Reference Counting

> Pattern: intent/plan/execute layer separation for skill repository management.

## Background

Originally, `@lythos/skill-deck` (deck CLI) managed the cold pool directly—it scanned
filesystem, computed what to delete, and orchestrated reconciliation. This created three
problems:

1. **Naming collisions**: `deck sync` was a synonym of `deck link`, and `deck reconcile`
   sounded like auto-fix—triggering agent batch-replace reflexes.
2. **Wrong layer**: cold pool operations (prune/reconcile) needed cross-deck reference
   data owned by `@lythos/cold-pool`'s metadata DB, not by `deck`.
3. **One-deck blind spot**: `deck prune` checked a single `skill-deck.toml` against the
   cold pool, ignoring that other decks might reference the same repos.

## Layer Architecture

```mermaid
graph TB
    subgraph User["User / Agent"]
        DECKCMD["deck &lt;command&gt;"]
        CPCMD["cold-pool &lt;command&gt;"]
    end

    subgraph Deck["@lythos/skill-deck CLI — Working Set"]
        LINK["link — reconcile .claude/skills/ against skill-deck.toml"]
        ADD["add — clone to cold pool + declare"]
        REMOVE["remove — unlink + remove from toml"]
        REFRESH["refresh — git pull upstream"]
        VALIDATE["validate — check toml schema"]
        TO_SYMLINK["to-symlink / to-snapshot — per-skill mode switch"]
    end

    subgraph ColdPool["@lythos/cool-pool CLI — Cold Pool Lifecycle"]
        PRUNE["prune — delete unreferenced repos"]
        CP_VALIDATE["validate --lock — plan-only drift report"]
    end

    subgraph Meta["Metadata DB (SQLite)"]
        DECK_REFS["deck_refs<br/>skill_locator | deck_path | state<br/>(added/linked/removed)"]
        READS["read: getAllActiveLocators()<br/>write: reconcileDeckReferences()"]
    end

    subgraph FS["Cold Pool Filesystem"]
        REPOS["~/.agents/skill-repos/<br/>github.com/owner/repo/SKILL.md<br/>github.com/owner/repo/subskill/SKILL.md"]
    end

    DECKCMD --> LINK
    DECKCMD --> ADD
    DECKCMD --> REMOVE
    DECKCMD --> REFRESH
    DECKCMD --> VALIDATE
    DECKCMD --> TO_SYMLINK

    CPCMD --> PRUNE
    CPCMD --> CP_VALIDATE

    LINK -.->|"link: reconcileDeckReferences()"| READS
    REMOVE -.->|"remove: removeReference()"| READS
    ADD -.->|"auto via link"| READS

    PRUNE -->|"read active locators"| READS
    PRUNE -->|"scan SKILL.md dirs"| REPOS
    CP_VALIDATE -->|"check pool.has()"| REPOS
    CP_VALIDATE -.->|"also reads"| READS
```

### Command Flow: deck add → cold-pool prune

```mermaid
sequenceDiagram
    actor U as User/Agent
    participant D as deck CLI
    participant CP as cold-pool CLI
    participant M as Metadata DB
    participant FS as Cold Pool FS

    U->>D: add github.com/owner/repo
    D->>FS: git clone → cold pool
    D->>M: reconcileDeckReferences()
    Note over M: deck_refs: state='linked'

    U->>D: link
    D->>M: reconcileDeckReferences()
    Note over M: existing → 'linked', stale → 'removed'

    U->>D: remove owner/repo
    D->>M: removeReference()
    Note over M: state='removed' (soft-delete)

    U->>CP: prune --dry-run
    CP->>M: getAllActiveLocators()
    CP->>FS: findSkillDirectories()
    Note over CP: cross-deck: if ANY deck has active ref → skip
    Note over CP: only ALL-removed → prune candidate
    CP-->>U: Report: N candidates, M.B total

    U->>CP: prune --yes
    CP->>M: getAllActiveLocators() (re-check)
    CP->>FS: delete unreferenced dirs
    CP-->>U: N deleted, M failed
```

### FSM State Machine

```mermaid
stateDiagram-v2
    [*] --> added : deck add / link discovers new skill
    added --> linked : deck link (symlink/cp created)
    added --> removed : deck remove (never linked)
    linked --> removed : deck remove (was linked)
    removed --> added : deck add (re-add same skill)

    note right of added
        declared in deck.toml,
        not yet in working set
    end note

    note right of linked
        declared AND in working set
        (symlink or snapshot)
    end note

    note right of removed
        no longer declared;
        historical record for
        cross-deck ref counting
    end note

    state addReference {
        [*] --> added
    }

    state reconcileDeckReferences {
        [*] --> linked : current skills
        [*] --> removed : stale skills
    }
```

### Prune Decision Logic

```mermaid
flowchart TD
    A["ColdPool.findSkillDirectories()"] --> B["For each repo dir"]
    B --> C{"MetadataDB.getAllActiveLocators()<br/>contains this repo?"}
    C -->|Yes| D["SKIP — still referenced by at least one deck"]
    C -->|No| E{"Any other active ref<br/>matching this repo?"}
    E -->|Yes| D
    E -->|No| F["PRUNE CANDIDATE"]
    F --> G["Confirm? / --yes?"]
    G -->|Yes| H["Delete from cold pool"]
    G -->|No| I["Skip"]
```

### Responsibility split

| CLI | Commands | Data source |
|-----|----------|-------------|
| `deck` | `link` `add` `remove` `refresh` `validate` `to-symlink` `to-snapshot` | `skill-deck.toml` + lock file |
| `cold-pool` | `prune` `validate --lock` | metadata DB |

## FSM Reference Counting

`deck_refs` table tracks every skill-deck relationship with a state machine:

```
added ── (deck link) ──→ linked ── (deck remove) ──→ removed
  ↑                                                         │
  └───────────────── (re-add via deck add) ──────────────────┘
```

| State | Meaning | Prunable? |
|-------|---------|-----------|
| `added` | Declared in deck.toml, not yet linked | No |
| `linked` | Declared AND in working set | No |
| `removed` | Was declared, no longer in any deck | Yes (if ALL) |
| `NULL` | Legacy row (pre-FSM) — treated as active | No |

**A repo is prunable only if ALL its refs across ALL decks have state `removed`**
(or no refs exist). The `getAllActiveLocators()` method returns locators with any
non-removed ref—this is the authoritative "don't touch" list.

## SKILL.md Is the Authoritative Marker

Both `list()` (via `buildListPlan`) and `findSkillDirectories()` use SKILL.md presence
as the primary detection criterion. Terminal-depth heuristics alone miss monorepos,
multi-skill repos, and mixed-depth clones.

Detection patterns:

```
<coldPool>/<host>/<owner>/<repo>/SKILL.md              → canonical
<coldPool>/<host>/<owner>/<repo>/<subpath>/SKILL.md    → multi-skill
<coldPool>/<host>/<name>/SKILL.md                       → legacy depth-2
<coldPool>/<host>/SKILL.md                              → legacy depth-1
```

## Plan-First Execution

Both commands are plan-first (report before act):

**prune**: `findSkillDirectories()` + `getAllActiveLocators()` → candidates →
  confirm → delete. `--dry-run` to preview, `--yes` to skip prompt.

**validate**: read `skill-deck.lock` → `pool.has(locator)` for each → `list()`
  for extras → report. No `--apply`; use `deck add` / `cold-pool prune` to converge.

## Schema Timeline

| Version | Change |
|---------|--------|
| v0 (original) | `deck_refs` with hard DELETE |
| v3 (2026-05-09) | `state TEXT` + `linked_at` + `removed_at` — FSM |
| v6 (2026-05-09) | `mode TEXT DEFAULT 'symlink'` — schema-first placeholder |

## Usage

```bash
# Prune: dry-run first
bunx @lythos/cold-pool prune --dry-run

# Prune: actually delete unreferenced repos
bunx @lythos/cold-pool prune --yes

# Validate: check lock state against cold pool
bunx @lythos/cold-pool validate --lock skill-deck.lock
```

## Related

- ADR-20260509144134332 — sync/freeze → to-symlink/to-snapshot rename
- ADR-20260509155630-DRAFT — mode column tracking (schema v6 placeholder)
- ADR-20260507021957847 — cold pool as dedicated resource holder
- ADR-20260507143241493 — metadata layer SQLite design
- ADR-20260424013849984 — lythoskill anti-corruption layer

---

> **Cold pool family**: 6 related pattern files. See index at [cold-pool-cli-boundary](./2026-05-07-cold-pool-cli-boundary.md) for full cross-reference list.
