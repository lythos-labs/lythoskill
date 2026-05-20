# Ecosystem

> Skills are being published faster than anyone can track. Lythoskill is infrastructure for that world.

## The Web SEO Parallel

The skill ecosystem is replaying the web's evolution, compressed into months:

| Web Era | Skill Era | Mechanism |
|---------|-----------|-----------|
| Early web (1995) | Early skills (2024) | Anyone can publish |
| Web directories (Yahoo) | Skill indexes (agentskills.io) | Manual curation |
| Search engines (Google) | Curator + find-skills | Automated discovery |
| SEO (2000s) | GEO (2025+) | Agent-facing optimization |
| PageRank | Arena verdicts | Quality via empirical signal |

**The same forces apply**: decentralized publishing → discovery competition → ranking → optimization. Lythoskill maps to proven web architecture: curator = search index, arena = user behavior signal, deck = bookmarks / RSS.

## Curator's Three-Layer Trust

Finding a skill is easy. Trusting it is hard. Curator separates discovery into three independent layers:

```
L1: Description ("卖家秀")
    What the SKILL.md claims.
    → Always available, never sufficient.

L2: Ecosystem Index ("Big V")
    What community indexes and popular repos say.
    → Useful signal, subject to popularity bias.

L3: Private Metadata ("买家秀")
    Your arena results, your usage history, your annotations.
    → Ground truth. The only layer you can fully trust.
```

L1 and L2 help you find candidates. **L3 is the activation authority** — only your own empirical results determine what enters your deck.

## Cold Pool as Filesystem-Native

The cold pool is deliberately filesystem-native, not a database:

```
~/.agents/skill-repos/
├── anthropic-superpowers/     # git clone
├── mattpocock-skills/         # git clone
├── antigravity-skills/        # git clone
├── vercel-labs-skills/        # git clone
└── .lythoskill-curator/       # curator output (catalog.db + metadata)
```

**Why filesystem**: git is the canonical sync mechanism. No API keys, no auth tokens, no rate limits. `git pull --ff-only` updates the pool; curator re-indexes. The `.lythoskill-curator/` subdirectory is the only curator-owned artifact — SQLite database + tag metadata.

## Competitive Landscape

| Approach | Strength | Weakness |
|----------|----------|----------|
| **Manual install** (cp -R) | Zero overhead | No governance, silent accumulation |
| **Marketplace directories** (agentskills.io) | Browseable | No validation, publisher bias |
| **Centralized hubs** (Superpowers) | Curated quality | Single curator bottleneck, vendor lock-in |
| **lythoskill** | Decentralized, empirical, filesystem-native | Requires governance mindset |

Lythoskill doesn't compete with marketplaces — it's a different layer. Marketplaces answer "what exists." Lythoskill answers "what works for me."

## The Combo Economy

Explicit combos (`[combo.<name>]`) are the ecosystem's highest-value artifact:

- A combo that works is **reusable across players** — same pipeline, different agent
- A combo that's arena-verified is **empirically validated** — not just "I think this works"
- A combo in a shared deck is **discoverable** — curator can index combo patterns across pools

This creates a **combo economy**: discover → test → verify → share → discover. Each cycle raises the floor on what "works" means.

## Zero-Knowledge Agents

The ZK agent pattern is how lythoskill ecosystem work gets done:

```
Spawn subagent (bare prompt, no context)
    → Explore (filesystem, git, curator)
    → Discover (patterns, candidates, gaps)
    → Produce (decks, reports, annotations)
```

ZK agents don't inherit the parent's assumptions. They see what's actually there — not what the parent remembers. This makes them ideal for: cold pool archaeology, deck generation, skill discovery, and ecosystem mapping.
