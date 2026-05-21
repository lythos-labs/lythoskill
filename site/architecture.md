# Architecture

> Three pillars: Deck (govern), Arena (validate), Curator (discover).

## Storage and Selection

Before governance, validation, or discovery can work, one structural problem must be solved: skills need a place to live, but not every skill should be active in every project.

The default approach collapses storage and selection into the same directory. `~/.claude/skills/` is both — everything you have ever collected is visible to every agent session. More skills means more context consumed, more trigger conflicts, more unpredictable behavior.

Lythoskill separates them:

- **Cold pool** — where skills live. A directory of git-cloned skill repos. Store everything you might ever use. Nothing in the cold pool is automatically active.
- **Working set** — what the agent sees. Symlinks in `.claude/skills/`. Only skills declared in `skill-deck.toml` appear here.

```
Cold Pool (~/.agents/skill-repos/)     Working Set (.claude/skills/)
├── anthropic-superpowers/             ├── lythoskill-deck → ...
├── mattpocock-skills/                 ├── lythoskill-arena → ...
├── antigravity-skills/                ├── lythoskill-curator → ...
├── vercel-labs-skills/                └── tdd → ...
└── ...                                    (only what deck declares)
    (all repos, indexed by curator)        (deny-by-default)
```

**Pool and set are decoupled.** Curator indexes everything in the pool. Deck selects what enters the working set. This prevents the "everything installed everywhere" anti-pattern: store once, select per project.

The three pillars — Deck, Arena, Curator — all operate on this foundation.

## The Three Pillars

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│   DECK   │  │  ARENA   │  │ CURATOR  │
│ Govern   │  │ Validate │  │ Discover │
├──────────┤  ├──────────┤  ├──────────┤
│ Declare  │  │ A/B test │  │ Scan pool│
│ Reconcile│  │ Judge    │  │ Index    │
│ Link     │  │ Compare  │  │ Query    │
└──────────┘  └──────────┘  └──────────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
            ┌───────▼────────┐
            │  skill-deck.toml│
            └────────────────┘
```

### Deck — Declarative Governance

`skill-deck.toml` is the single source of truth. `deck link` reconciles the working set to match — undeclared skills are removed, declared skills are symlinked. Deny-by-default.

```toml
[deck]
max_cards = 15
cold_pool = "~/.agents/skill-repos"

[tool.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
```

### Arena — Empirical Validation

"Does this skill actually work?" — the question that descriptions cannot answer.

Arena spawns zero-knowledge subagents with different decks, runs them on the same task, and a judge scores the outputs. **Skin in the game**: only real-task performance counts, not marketing copy.

```
Task → [Deck A subagent] → Output A ─┐
      [Deck B subagent] → Output B ─┤
                                     ├→ Judge → Verdict
      [Deck C subagent] → Output C ─┘
```

### Curator — Discovery with Trust

Three-layer trust model for finding skills:

| Layer | Source | Trust |
|-------|--------|-------|
| L1 | SKILL.md description | "卖家秀" — what the author claims |
| L2 | Big V / ecosystem index | Community validation |
| L3 | Private metadata + arena results | "买家秀" — what actually works for you |

Curator scans cold pools, indexes frontmatter into SQLite, and enables structured queries. The three layers prevent "download and pray" — L1 tells you what exists, L2 tells you what is popular, L3 tells you what is real.

## Combo Epistemology

Three ways to discover that skills work together, mirroring scientific methodology:

```
Layer 3: Explicit Combo    → Deductive (a priori)
         "The designer knows these cards combo"

Layer 2: Curator           → Inductive
         "Scan reveals 87% keyword overlap"

Layer 1: Arena             → Empirical
         "10 matches, 80% win rate"
```

`[combo.<name>]` in deck.toml defines pipelines — multi-skill workflows orchestrated by a prompt. No new code, no state machine: the agent reads the combo prompt and orchestrates the skills.
