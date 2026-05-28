# Architecture

> Three pillars: Deck (govern), Arena (validate), Curator (discover).

## Storage and Selection

Before governance, validation, or discovery can work, one structural problem must be solved: skills need a place to live, but not every skill should be active in every project.

The default approach collapses storage and selection into the same directory. `~/.agents/skills/` is both — everything you have ever collected is visible to every agent session. More skills means more context consumed, more trigger conflicts, more unpredictable behavior.

Lythoskill separates them:

- **Cold pool** — where skills live. A directory of git-cloned skill repos. Store everything you might ever use. Nothing in the cold pool is automatically active.
- **Working set** — what the agent sees. Symlinks in `.claude/skills/` by default (configurable per platform). Only skills declared in `skill-deck.toml` appear here.

```
Cold Pool (~/.agents/skill-repos/)     Working Set (.<agent>/skills/)
├── superpowers/                       ├── lythoskill-deck → ...
├── mattpocock-skills/                 ├── lythoskill-arena → ...
├── antigravity-skills/                ├── lythoskill-curator → ...
├── vercel-labs-skills/                └── tdd → ...
└── ...                                    (only what deck declares)
    (all repos, indexed by curator)        (deny-by-default)
```

**Pool and set are decoupled.** Curator indexes everything in the pool. Deck selects what enters the working set. This is the same pattern npm uses: `node_modules/` stores everything you've ever installed, `package.json` declares what this project actually uses. Store everything, select deliberately.

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

`skill-deck.toml` is the single source of truth. `bunx @lythos/skill-deck link` reconciles the working set to match — undeclared skills are removed, declared skills are symlinked. Deny-by-default.

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

**Progressive disclosure — from curiosity to mastery:**

| Level | Question | Action |
|-------|----------|--------|
| **L0** | "Does this skill work?" | `bunx @lythos/skill-arena single --deck <path> --brief "task"` |
| **L1** | "Which deck is better?" | `bunx @lythos/skill-arena vs --config arena.toml` |
| **L2** | "How does the protocol work?" | Agent ↔ CLI control transfer: `prepare-workdir` → agent spawn → `archive` → `bunx @lythos/skill-deck link` restore |
| **L3** | "What's the Pareto frontier?" | Multi-objective optimization — a cheap-medium-quality deck and an expensive-high-quality deck can both be non-dominated |

```
Task → [Deck A subagent] → Output A ─┐
      [Deck B subagent] → Output B ─┤
                                     ├→ Judge → Verdict
      [Deck C subagent] → Output C ─┘
```

**Key design decisions:**

- **Runs in `/tmp`, never pollutes your working set.** Experiment sandbox is isolated. After every run, `bunx @lythos/skill-deck link` restores the parent deck. No install, no working-set pollution, no deck overwrite.
- **Agent-orchestrated by default.** For same-player deck comparisons (95% of use cases), the agent spawns subagents directly via the Agent tool — no CLI runner needed. Cross-player comparison (kimi vs codex) is the only case requiring the CLI runner.
- **Execution substrate: `reproduce.sh`** — a shell scaffold that hands off to the agent via `<spawn subagent>` tags in stdout. Shell stdout IS a hypermedia document; the agent reads the tag and takes action. This is HATEOAS at its most literal: the CLI response carries the agent's next action.
- **Judgment is semantic, not scriptable.** Token counting is scriptable; deciding "which output better fits the scenario" requires LLM inference. Arena spawns a judge subagent for this.
- **Mindset validator, not output checker.** A correct output achieved by guessing is a FAIL — the skill's mental model did not transfer. Arena catches mindset gaps before skills reach users.
- **Subagent-friendly.** Interrupted runs resume from saved state. Decision-log.jsonl from each subagent provides full observability into agent reasoning.
- **HATEOAS error output.** CLI errors tell the agent WHAT next, not just WHAT went wrong. `"Skill not found → try: curator add <locator>"`. The consumer of CLI output is the agent, not the human at the terminal.

### Curator — Discovery with Trust

Curator is NOT a search engine — it is your **personal knowledge base** for the skill ecosystem. The agent does the discovery (gh CLI + WebSearch); curator is the local cache + enrichment layer.

**Progressive disclosure — from lookup to compound knowledge:**

| Level | Question | Action |
|-------|----------|--------|
| **L0** | "What's the path for this skill?" | `bunx @lythos/curator find <bare-name>` — bare name to full locator |
| **L1** | "What do I have?" | `bunx @lythos/curator scan` + `bunx @lythos/curator query "SELECT ..."` — index and explore your cold pool |
| **L2** | "I found something on GitHub" | `bunx @lythos/curator add <locator>` + re-scan + tag — seed your collection |
| **L3** | "Should I adopt this?" | curator -> arena test -> `curator tag --qa` -> recommend with confidence |

**Three-layer trust model:**

| Layer | Source | Trust |
|-------|--------|-------|
| L1 | SKILL.md description | "卖家秀" — what the author claims |
| L2 | Big V / ecosystem index | Community validation |
| L3 | Private metadata + arena results | "买家秀" — what actually works for you |

**Key design decisions:**

- **Not a discovery engine.** Curator does NOT wrap external APIs or implement HTTP adapters. The agent uses `gh search code`, WebSearch, and WebFetch for discovery. Curator is the local cache that makes discovery faster, and the enrichment layer that remembers what was found.
- **Agent-enriched metadata.** L3 data (niche tags, QA signals) comes from `curator tag`, not from SKILL.md frontmatter. Skill authors write L1 (description). The curator writes L3 (classification + verification). These are separate data layers. Re-scan preserves agent-written tags.
- **Reconciler-style indexing.** One `bunx @lythos/curator scan` converges any filesystem state to a clean index. Auto-backup before rebuild. `bunx @lythos/curator restore` to roll back.
- **Data flywheel.** More usage -> more QA data -> better curator -> better recommendations -> more targeted testing -> even more QA data. Curator's value compounds over time while deck/arena deliver steady-state value.
- **QA provenance required.** Every QA signal carries `source_type`, `source_name`, and `signal_value`. No-provenance signals are rejected. Fact-checking uses multi-source cross-referencing with structured confidence (HIGH / LOW / CONTRADICTED).

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

**Distributed by weight.** There is no central orchestrator. Coordination lives in three layers: combo prompts (lightweight, declarative), SKILL.md instructions (medium, agent-facing), and CLI operations (heavy, deterministic). Together they form the orchestration system — external evaluators searching for a single "orchestrator" component miss this. The agent IS the orchestrator.
