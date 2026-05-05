# Curator Architecture: Feed → Cold Pool → Working Set

## Three-Layer Trust Model

Skill selection isn't blind. Every skill in your cold pool carries three layers of trust:

| Layer | Name | What | Source | Stored In |
|-------|------|------|--------|-----------|
| L1 | 卖家秀 (Seller's Show) | What the skill author claims | SKILL.md frontmatter | catalog.db, REGISTRY.json |
| L2 | Big V (Influencer) | Where it was discovered, ranking, stars | Feed (LobeHub, GitHub trending, agentskill.sh) | additions.jsonl → `feed` field |
| L3 | 买家秀 (Buyer's Review) | Actual performance in your environment | Arena test play results | additions.jsonl → `arenaResult` field |

**L3 is the final activation authority.** A skill can claim anything (L1) and be trending everywhere (L2), but if it fails your actual task in Arena, you know.

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SKILL LIFECYCLE                                      │
│                                                                              │
│  LAYER -1                LAYER 0                    LAYER 1                  │
│  DISCOVERY               COLD POOL                  WORKING SET              │
│  (browse/shopping        (local cache +             (agent-visible)          │
│   cart)                   decision history)                                   │
│                                                                              │
│  ┌──────────┐            ┌──────────────────┐      ┌──────────────────┐      │
│  │ LobeHub  │            │ ~/.agents/       │      │ .claude/skills/  │      │
│  │ trending │──┐         │ skill-repos/     │      │                  │      │
│  └──────────┘  │         │                  │      │  pdf ──────┐     │      │
│                │         │  github.com/     │      │  docx ─────┤     │      │
│  ┌──────────┐  │         │  ├── anthropics/ │      │  deck ─────┤     │      │
│  │ GitHub   │  │         │  │   └── skills/ │      │            │     │      │
│  │ search   │──┤         │  │       ├── pdf │      │  symlinks  │     │      │
│  └──────────┘  │         │  │       └── docx│      │  to cold   │     │      │
│                │         │  │               │      │  pool      │     │      │
│  ┌──────────┐  │         │  ├── lythos-labs/│      │            │     │      │
│  │ agent    │  │         │  │   └── lythos- │      │  deny-by-  │     │      │
│  │ skill.sh │──┤         │  │       skill/  │      │  default   │     │      │
│  └──────────┘  │         │  │       └── ... │      │            │     │      │
│                │         │  │               │      └────────────┘      │      │
│  ┌──────────┐  │         │  ├── localhost/  │                          │      │
│  │ skills   │──┘         │  │   └── my-fork │      ┌────────────┐      │      │
│  │ .sh      │            │  │               │      │ Arena      │      │      │
│  └──────────┘            │  └── .lythoskill-│      │ (compare)  │      │      │
│                          │      curator/    │      │            │      │      │
│  curator doesn't         │      ├── REGISTRY│      │ reads cold │      │      │
│  search — agent          │      │   .json   │      │ pool, runs │      │      │
│  uses web search         │      ├── catalog │      │ test play, │      │      │
│  skill to discover       │      │   .db     │      │ writes L3  │      │      │
│                          │      └── additions│     │ metadata   │      │      │
│                          │          .jsonl   │     └──────┬─────┘      │      │
│                          │                    │            │            │      │
│                          │  additions.jsonl   │  ┌─────────┴──────┐    │      │
│                          │  ──────────────────│  │ GitHub repo    │    │      │
│                          │  {                 │  │ (battle        │    │      │
│                          │    locator,        │  │  records)      │    │      │
│                          │    feed,       ◄───┼──│ arena.toml +   │    │      │
│                          │    reason,         │  │ runs/ dir      │    │      │
│                          │    forkedFrom,     │  └────────────────┘    │      │
│                          │    arenaResult,◄───┼── Arena writes L3      │      │
│                          │    status          │                        │      │
│                          │  }                 │      ┌────────────┐    │      │
│                          │                    │      │ Deck       │    │      │
│                          │                    │      │ (govern)   │    │      │
│                          │                    ├──────► reads      │    │      │
│                          │                    │      │ catalog +  │    │      │
│                          │                    │      │ additions  │    │      │
│                          │                    │      │ → LLM      │    │      │
│                          │                    │      │ reasons    │    │      │
│                          │                    │      │ → edits    │    │      │
│                          │                    │      │ toml       │    │      │
│                          │                    │      └────────────┘    │      │
└──────────────────────────┴────────────────────┴─────────────────────────┘
```

## Decision Lifecycle

Each skill in the cold pool has a decision trail in `additions.jsonl`:

```
curator add → status: "added"
     │              { locator, feed, reason, addedAt }
     │
     ▼
arena test → status: "evaluated"
     │              { ..., arenaResult: { score, verdict, evaluatedAt } }
     │
     ├── PASS ──► deck link → status: "activated"
     │
     └── FAIL ──► fork → curator add --forked-from → status: "forked"
                         { locator: "localhost/my-fix", forkedFrom, reason }
```

## Division of Labor

| Component | Does | Doesn't Do |
|-----------|------|------------|
| **Curator** | Index cold pool, track decision history (additions.jsonl) | Search, recommend, rank, compare |
| **Arena** | Test play with controlled variables, score comparison, L3 metadata | Index, install, govern |
| **Deck** | Declare desired skills, enforce deny-by-default, symlink working set | Discover, evaluate, index |
| **Agent** | LLM reasoning over catalog + additions → tiered recommendations | — (the consumer of all three) |

**Need recommendation or ranking?** Use Arena. Curator provides the data; Arena provides the comparison. Together they feed the agent's recommendation workflow:

```
curator scan → catalog.db           "What do I have?"
    +
curator query → decision history    "Why do I have them?"
    +
arena test   → L3 scores            "Which is better for my task?"
    ↓
agent LLM reasoning → tiered recommendations → deck link
```

## Cold Pool = Local Cache + Decision History

Like `~/.m2/repository` for Maven:
- **Curator scan** = `mvn dependency:list` (what's cached locally)
- **Feed** = Maven Central / Nexus / private registry (what's available upstream)
- **additions.jsonl** = your purchase history (why you downloaded each dependency)
- **Arena** = integration tests (does the dependency actually work in your project)

The cold pool remembers not just *what* you have, but *why* you have it — feed provenance, agent reasoning, fork lineage, and arena verification results.
