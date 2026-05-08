---
created: 2026-05-08
updated: 2026-05-08
category: pattern
---

# Curator Comparison: Hermes vs lythoskill — Agent-Side Lifecycle vs Ecosystem Discovery

> Both projects call it "curator", but the word means something completely different in each context. Understanding this boundary prevents架构 confusion and reveals where the two approaches complement each other.

---

## The Short Version

| Dimension | Hermes Curator | lythoskill Curator |
|-----------|---------------|-------------------|
| **Where it runs** | Inside the agent (`~/.hermes/`) | Outside the agent (cold-pool scanner) |
| **What it curates** | Agent-created skills only | All skills in the ecosystem |
| **Read or Write?** | **Write** — archives, consolidates, deletes | **Read-only** — indexes, catalogs, queries |
| **Trigger** | Time-based (7 days) + idle threshold | On-demand CLI (`curator scan`, `curator index`) |
| **Quality method** | Telemetry (views/uses/patches) + LLM review | Three-layer trust (desc / Big-V / private metadata) |
| **Target user** | End user managing their personal skill library | Agent swarm teams managing shared skill repositories |

> **One-sentence distinction**: Hermes curates *skills you created*; lythoskill curates *skills you might want to use*.

---

## Hermes Curator: The Gardener

### Problem It Solves

Agents create skills constantly during conversations — "save this pattern as a skill", "extract this workflow". Without maintenance, the skill library grows indefinitely: duplicates, outdated versions, half-baked experiments pile up. The agent becomes slower (more skills to scan) and less reliable (stale skills trigger unexpectedly).

Hermes Curator is a **background gardener** that prevents this entropy.

### Architecture

```
~/.hermes/skills/
├── bundled/              ← shipped with Hermes, IGNORED by curator
├── hub/                  ← installed from agentskills.io, IGNORED by curator
└── user-created/         ← ONLY these are curated
    ├── skill-a/          ← active
    ├── skill-b/          ← stale (unused for 30 days)
    └── skill-c/          ← archived (moved to .archive/)

~/.hermes/skills/.usage.json   ← telemetry: views, uses, patches, timestamps
~/.hermes/logs/curator/        ← run reports: run.json + REPORT.md
```

### Lifecycle States

| State | Condition | Curator Action |
|-------|-----------|----------------|
| **active** | Recently used | Keep as-is |
| **stale** | Unused for threshold period | Flag for review |
| **archived** | Confirmed unused + no pin | Move to `.archive/`, remove from working set |

### The LLM Review

Curator doesn't just use heuristics. It **forks an auxiliary agent** to:
1. Survey all agent-created skills
2. Identify duplicates or near-duplicates
3. Propose consolidations ("skill-a and skill-b do the same thing, merge them")
4. Recommend patches or archival

This is expensive (LLM tokens) but necessary — usage stats alone can't detect semantic duplication.

### User Control

```bash
hermes curator run --dry-run    # preview without changes
hermes curator pin <skill>      # protect from archival
hermes curator unpin <skill>    # remove protection
hermes curator restore <skill>  # recover from .archive/
```

The first real pass is **deferred by one full interval** (7 days) after install, giving users time to pin important skills before the gardener starts pruning.

### Key Constraint: Scope Boundary

Curator **never touches** bundled or hub-installed skills. Its contract is strictly limited to agent-created skills. This is important — if curator modified hub skills, it would break the "single source of truth" model (hub is the canonical source, local is a cache).

---

## lythoskill Curator: The Librarian

### Problem It Solves

As a team accumulates 50, 100, 200+ skills across multiple cold pools, GitHub repos, and local directories, answering simple questions becomes hard:
- "Do we already have a skill for PDF parsing?"
- "Which skills support Claude Code vs Kimi?"
- "What skills were added in the last month?"
- "Show me all research-related skills"

lythoskill Curator is a **read-only librarian** that indexes everything and makes it queryable.

### Architecture

```
Cold Pool (~/.agents/skill-repos/)
├── github.com/anthropics/skills/
├── github.com/mattpocock/skills/
└── github.com/Weizhena/Deep-Research-skills/

Curator Scan
    ├── Extract frontmatter from every SKILL.md
    ├── Parse references/, scripts/, assets/
    └── Build index

Outputs
    ├── REGISTRY.json   ← human-readable catalog
    └── catalog.db      ← SQLite, structured queries
```

### Three-Layer Trust Model

| Layer | Source | Confidence | Use Case |
|-------|--------|------------|----------|
| **L1** | SKILL.md `description` | Low (author self-report) | Initial discovery, keyword search |
| **L2** | Big-V index / community registry | Medium (social proof) | "Has this skill been vetted by someone I trust?" |
| **L3** | Private metadata (arena results, usage logs) | High (your own data) | "This skill scored 4.8/5 in our arena tests" |

> See [curator three-layer trust](../project_curator_three_layer_trust.md) for full architecture.

### Read-Only Contract

Curator **never modifies** skills. It doesn't archive, delete, or patch. This is by design:
- Deck owns the declaration (what skills a project uses)
- Arena owns the validation (which skills work well)
- Curator owns the discovery (finding skills that match your needs)
- **No single tool has write authority over skills** — governance is distributed

### Query Interface

```bash
# List all skills in cold pool
bunx @lythos/skill-curator scan

# Search by keyword
bunx @lythos/skill-curator search "pdf"

# Generate catalog database
bunx @lythos/skill-curator index
```

---

## The Complementarity

These two curators are not competitors. They solve different problems at different layers:

```
┌─────────────────────────────────────────┐
│  Ecosystem Layer (lythoskill)           │
│  ─────────────────────────              │
│  • Discover: "Find me a PDF skill"      │
│  • Compare: "Which PDF skill is best?"  │
│  • Trust: "Has this been tested?"       │
│         ↓                               │
│  Deck declares: "Use github.com/.../pdf"│
│         ↓                               │
├─────────────────────────────────────────┤
│  Agent Layer (Hermes)                   │
│  ────────────────────                   │
│  • Use: Agent loads skill, executes     │
│  • Create: Agent saves new skill        │
│  • Maintain: Curator prunes stale       │
│         ↓                               │
│  Working set: ~/.hermes/skills/         │
└─────────────────────────────────────────┘
```

**The handoff**: lythoskill curator helps you *decide which skills to install*. Hermes curator helps you *manage the skills you've created after installing them*.

### What If You Use Both?

A Hermes user who also uses lythoskill deck might have this workflow:

1. **Discover**: `curator search "pdf"` → find 3 PDF skills
2. **Validate**: `arena --decks pdf-a.toml,pdf-b.toml --task "extract tables"` → pdf-b wins
3. **Declare**: Add pdf-b to `skill-deck.toml`
4. **Install**: `deck link` → symlinks to working set
5. **Use**: Hermes loads skill from working set, executes task
6. **Create**: Hermes saves a new "pdf-table-extraction" skill based on the session
7. **Maintain**: After 7 days, Hermes curator reviews — finds the new skill overlaps with pdf-b, proposes consolidation

Step 7 is where the two systems almost touch: Hermes curator manages agent-created skills, some of which might be variations of lythoskill-discovered skills. But the boundary is clear — Hermes curator only touches agent-created skills, never hub-installed ones.

---

## Design Philosophy Divergence

### Hermes: Agent Sovereignty

> "The agent owns its skill library. It creates, modifies, and prunes skills autonomously. The user can override (pin), but the default is agent-driven maintenance."

- **Centralized**: All skills live in `~/.hermes/skills/`
- **Agent-write**: The agent is the primary author of skills
- **Telemetry-driven**: Quality is measured by usage, not external validation
- **Closed loop**: Create → Use → Measure → Prune, all within the agent

### lythoskill: Ecosystem Governance

> "Skills are published by humans, discovered by teams, validated by arena, and declared by deck. No single entity owns the lifecycle."

- **Decentralized**: Skills live in GitHub repos, cold pools, local directories
- **Human-write**: Skills are authored by humans (or human-reviewed agents)
- **Validation-driven**: Quality is measured by arena tests, not just usage
- **Open loop**: Publish → Discover → Validate → Declare → Use, across multiple tools

### Why Both Philosophies Exist

| Use Case | Hermes Fits Better | lythoskill Fits Better |
|----------|-------------------|----------------------|
| Personal productivity | ✅ Agent manages my personal snippets | ❌ Overhead for 1-person use |
| Team skill governance | ❌ No shared cold pool concept | ✅ Deck + arena + curator |
| Open-source skill sharing | ❌ Hub is install-only | ✅ GitHub-native, versioned |
| Rapid prototyping | ✅ Save skill mid-conversation | ❌ Requires deck declaration |
| Skill quality assurance | ❌ Usage ≠ correctness | ✅ Arena validates effectiveness |

---

## Open Questions

1. **Should lythoskill curator track usage telemetry?** Currently it doesn't — it's purely static metadata. Adding usage stats (from arena, from deck validate) would strengthen L3 trust but introduces privacy/complexity tradeoffs.

2. **Should Hermes curator integrate with external trust sources?** Currently it only uses internal telemetry. Reading from a lythoskill-style community index could improve consolidation decisions ("this skill already exists in hub, don't duplicate").

3. **Agent-created skill publishing**: When Hermes creates a great skill, how does it flow back to the ecosystem? Currently there's no bridge. A future integration might be: Hermes curator flags a high-quality agent-created skill → user reviews → `deck publish` to GitHub → lythoskill curator indexes it → community discovers it.

---

## References

- [Hermes Curator Documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/curator)
- [Hermes Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [agentskills.io Open Standard](https://agentskills.io)
- [lythoskill Curator Architecture](../../wiki/01-patterns/curator-three-layer-trust.md)
- [Player-Deck Separation](../../wiki/01-patterns/2026-05-02-player-deck-separation-and-tcg-player-analogy.md)
- [Arena Validates Desc](../../wiki/01-patterns/2026-05-02-desc-preference-arena.md)
