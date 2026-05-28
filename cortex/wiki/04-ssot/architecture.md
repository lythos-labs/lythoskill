---
last_consolidated: 2026-05-28
sources:
  - site/architecture.md
  - cortex/wiki/01-patterns/2026-05-02-thin-skill-pattern.md
  - weekly/2026-W19.md
  - weekly/2026-W20.md
  - weekly/2026-W22.md
  - ADR-20260423101938000 (thin-skill pattern)
  - ADR-20260506103209293 (combo as deck-level prompt)
  - ADR-20260508230803515 (curator no-feed-adapters)
  - ADR-20260517140421425 (CLI vs agent-orchestrated parity)
  - ADR-20260528120317143 (deck creation guide, agent-as-wizard)
zk_validated: true
---

# Architecture

Lythoskill is a **skill governance framework** for coding agents. Three pillars --
Deck (govern), Arena (validate), Curator (discover) -- operate on a shared
foundation: the cold pool. Deny-by-default is the rule that Deck enforces, Arena
verifies, and Curator indexes within.

## 1. Foundation: Cold Pool vs Working Set

The default approach collapses storage and selection: `~/.agents/skills/` stores
everything AND makes everything active. More skills = more context consumed, more
trigger conflicts, more unpredictable behavior.

Lythoskill separates them:

- **Cold pool** (`~/.agents/skill-repos/`) -- where skills live. Git-cloned repos.
  Store everything. Nothing is automatically active.
- **Working set** (`.claude/skills/`, `.cursor/skills/`, etc.) -- what the agent
  sees. Symlinks to declared skills only. Deny-by-default.

Pool and set are decoupled. Curator indexes the pool. Deck selects what enters the
working set. Arena tests what was selected. Same pattern as npm: `node_modules/`
stores everything, `package.json` declares what this project uses.

## 2. Full Stack

```
+======================================================================+
|                          L Y T H O S K I L L                          |
|                                                                       |
|  USER:  "I need to build X"                                           |
|                                                                       |
|  AGENT: Understands intent, composes decks, spawns arena subagents,   |
|         interprets results. All intelligence lives here.              |
|                                                                       |
|  +-------+  +----------+  +-----------+        skill-deck.toml        |
|  | DECK  |  |  ARENA   |  |  CURATOR  |  +------------------------+  |
|  |govern |  | validate |  | discover  |  |[deck] max_cards=15     |  |
|  |-------+  |----------|  |-----------|  |[skills.foo] path=...   |  |
|  |link   |  |single    |  |scan       |  |[combo.bar] cards=[...] |  |
|  |add    |  |vs        |  |find       |  +------------------------+  |
|  |remove |  |compare   |  |tag        |                              |
|  +---+---+  +----+-----+  +-----+-----+                              |
|      |           |              |                                     |
|      +-----------+--------------+                                     |
|                  |                                                    |
|  +---------------v------------------------------------+               |
|  |              COLD POOL                             |               |
|  |  ~/.agents/skill-repos/  (all repos, git-cloned)   |               |
|  |  Curator indexes. Deck selects. Arena tests.       |               |
|  +------------------------+---------------------------+               |
|                           |                                           |
|                           | deck link / also_link_to                   |
|                           v                                           |
|  +------------------------------------------+                         |
|  |           WORKING SET                     |   Deny-by-default       |
|  |  .claude/skills/  .cursor/skills/  ...    |   Only what toml says  |
|  +------------------------------------------+                         |
|                                                                       |
|  ==================== agent / CLI boundary ========================== |
|                                                                       |
|  deck link | arena single | curator scan | cold-pool fetch | ...      |
|  Deterministic CLI operations. Zero intelligence.                     |
|  HATEOAS output: error messages tell the agent WHAT next, not just    |
|  WHAT went wrong. "Skill not found → try curator add <locator>".      |
|                                                                       |
|  The name is literal: shell stdout IS a hypermedia document.          |
|  In reproduce.sh, `<spawn subagent to ...>` acts as a hypertext tag   |
|  — the agent reads stdout, recognizes the marker, takes action.       |
|  CLI output can adopt this pattern broadly: `<action>do X</action>`   |
|  as an internal protocol that agents parse like browsers follow links. |
+======================================================================+
```

## 3. User-Agent-Skill-CLI Model

> "Smart agent, dumb tool." -- thin-skill pattern wiki

Bank-teller analogy:

```
User:    "I need to withdraw money"    -> states the goal
Agent:   check account, pick action    -> understands intent, translates to system ops
CLI:     execute the transaction       -> deterministic op, validate, return result
Agent:   "Done, here is your receipt"  -> translates back to natural language
```

| Layer | Role | Intelligence |
|-------|------|-------------|
| **User** | States goal (natural language) | -- |
| **Agent** | Understands intent, decides, reads SKILL.md, selects skills, composes toml | **All intelligence** |
| **SKILL.md** | Tells agent how to use CLI, what params for what scenario | Guide, not executor |
| **CLI** | validate, link, add, scan -- deterministic ops, HATEOAS output | **Zero intelligence** |

**CLI does NOT:** understand intent, recommend skills, run interactive wizards.
**Agent does NOT:** validate locators, parse toml, check max_cards.

Anti-pattern: `deck init --wizard` puts "understand user" intelligence into the CLI
(ADR-20260528120317143).

## 4. Thin-Skill Pattern

Three layers, with weight sinking into mature infrastructure:

```
Development (Monorepo)                  Release (Thin)
+---------------------------+           +--------------------+
| packages/                 | publish   | my-skill/          |
|   core-lib/   (npm)       | --------> |   SKILL.md         |
| skills/                   | build     |   scripts/run.sh   |
|   my-skill/               | --------> |     bunx @scope/.. |
|     SKILL.md, __tests__/  |           +--------------------+
+---------------------------+
   Starter = Spring Service        Skill = Spring Controller
```

| Layer | Responsibility | Published via | Analogy |
|-------|---------------|---------------|---------|
| **Starter** | Dependency governance + CLI entry | npm/pip | Spring Starter |
| **Package** | Implementation logic | npm/pip | Service |
| **Skill** | Intent description + thin script routing | `lythoskill build` | Controller |

Why: (1) npm/pip solve diamond deps -- no new registry; (2) skill layer immutable as
long as interface is stable; (3) content-addressable via `bunx foo@sha256:...`;
(4) release artifact = SKILL.md + scripts, optimal for context window budgets.

Progressive disclosure: **Advertise** (~100 tokens) -> **Load** (<5000 tokens) ->
**Read** (references/ on demand) -> **Run** (scripts/ -> `bunx` -> npm package).

## 5. The Three Pillars

### 5.1 Deck -- Declarative Governance

`skill-deck.toml` is SSOT. `deck link` reconciles the working set: undeclared
skills removed, declared skills symlinked. Deny-by-default.

```toml
[deck]
max_cards = 15
cold_pool = "~/.agents/skill-repos"

[tool.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[combo.doc-toolchain]
prompt = "Create a document: tdd tests first, then implement"
cards = ["tdd", "lythoskill-writer"]
```

**Seed bootstrap:** A deck with only the governance skill is sufficient for a
zero-knowledge subagent to self-expand -- read SKILL.md, learn the schema, discover
and link other skills. Recursive bootstrap eliminates the cold-start problem.

**Multi-CLI POSSE:** `also_link_to` fans out to `.cursor/skills/`, `.kimi/skills/`
in one operation. One declaration, many platforms.

### 5.2 Arena -- Empirical Validation

"Does this skill actually work?" -- descriptions cannot answer this. Arena spawns
zero-knowledge subagents with different decks on the same task; a judge scores
outputs. **Skin in the game**: only real-task performance counts.

```
Task -> [Deck A subagent] -> Output A -+
       [Deck B subagent] -> Output B --+-> Judge -> Verdict
       [Deck C subagent] -> Output C -+
```

Key decisions:

- **Runs in `/tmp`.** Never pollutes the working set. Parent deck restored after.
- **Agent-orchestrated by default.** Same-player (95%) uses Agent tool for subagents.
  CLI runner only for cross-player (kimi vs codex).
- **Mindset validator.** Correct output via guessing = FAIL. Mental model must transfer.
- **Side-effect observability.** Evaluates artifacts (HTML, PDF, docx) that
  prompt-completion evaluators cannot observe -- a structural moat.

| Level | Question | Action |
|-------|----------|--------|
| L0 | "Does this skill work?" | `arena single --deck <path> --brief "task"` |
| L1 | "Which deck is better?" | `arena vs --config arena.toml` |
| L2 | "How does the protocol work?" | prepare-workdir -> spawn -> archive -> restore |
| L3 | "Pareto frontier?" | Multi-objective optimization across cost/quality/speed |

### 5.3 Curator -- Discovery with Trust

Curator is NOT a search engine. It is your **personal knowledge base** for the
skill ecosystem. The agent does discovery (gh CLI + WebSearch); curator is the
local cache + enrichment layer.

- **No external API wrapping.** Feed adapters were built then rejected
  (ADR-20260508230803515). The agent already has web fetch, search, and gh CLI.
- **Agent-enriched metadata.** Authors write L1 (description). Curator writes L3
  (classification + verification). Re-scan preserves agent-written tags.
- **Reconciler-style indexing.** One `curator scan` converges any filesystem state
  to a clean index. Auto-backup before rebuild; `curator restore` to roll back.
- **QA provenance required.** Every signal carries `source_type`, `source_name`,
  `signal_value`. No-provenance signals rejected.

**Three-layer trust:**

| Layer | Source | Trust |
|-------|--------|-------|
| L1 | SKILL.md description | Seller's show -- what author claims |
| L2 | Big V / ecosystem index | Community validation |
| L3 | Private metadata + arena results | Buyer's show -- what works for you |

**Data flywheel:** More usage -> more QA data -> better recommendations -> more
targeted testing -> even more data. Curator's value compounds; deck/arena deliver
steady-state value.

## 6. Combo Epistemology

Three ways to discover skill synergy:

| Layer | Method | Evidence |
|-------|--------|----------|
| 3: Explicit Combo | Deductive (a priori) | Designer declares `[combo.<name>]` in deck.toml |
| 2: Curator | Inductive | Scan reveals keyword/semantic overlap |
| 1: Arena | Empirical | "10 matches, 80% win rate" |

`[combo.<name>]` in deck.toml defines multi-skill pipelines orchestrated by a
prompt. No code, no state machine -- the agent reads the prompt and orchestrates.

## 7. Architecture Decisions That Changed

Documented so future agents do not re-propose discarded alternatives.

### 7.1 Combo: Skill Type -> Deck-Level Prompt

- **Before (superseded):** Combo was a skill type -- a separate class of skill
  that composed others, requiring publication, versioning, and discovery.
- **After (ADR-20260506103209293):** Combo is a `[combo.<name>]` section in
  `skill-deck.toml` -- a deck-level prompt. Zero ceremony: edit toml, done.
- **Why:** The skill-type approach added ceremony without value. A prompt in the
  deck file achieves the same result with no new infrastructure.

### 7.2 Curator: Rigid Indexer -> Agent Companion

- **Before:** Curator had HTTP feed adapters for external APIs and a `discover`
  command that searched GitHub/npm/MCP directories directly.
- **After (ADR-20260508230803515):** Curator is a local cold-pool normalizer.
  Agent does discovery; curator is cache + enrichment. `discover` command deleted.
- **Why:** Feed adapters duplicated capabilities the agent already has (web fetch,
  search, gh CLI). Three build-then-reject cycles converged on the same insight:
  delegate to the agent, keep the tool mechanical.

### 7.3 Arena: CLI-Only -> Agent-Orchestrated

- **Before:** Arena was a CLI tool shelling out to agent CLIs. Every run needed
  explicit `--cli` flags.
- **After (ADR-20260517140421425):** Agent-orchestrated is the default. For
  same-player comparisons, agent spawns subagents via the Agent tool. CLI runner
  is the fallback for cross-player comparison (kimi vs codex).
- **Why:** 95% of use cases compare decks on the same player. The Agent tool is
  the natural subagent mechanism. Control Transfer Protocol formalized the
  boundary: prepare-workdir -> spawn -> archive -> deck link restore.

## 8. Design Principles

1. **Deny-by-default.** Empty working set = agent without immune system. Proven May 7, 2026: an agent without deck context wrote 30+ rounds of unrequested debugging and modified source code. This incident is the existential justification — deny-by-default is not architectural preference, it is learned from damage.
2. **Intelligence in agent, not tool.** CLI is glue. SKILL.md is guide. Agent decides.
3. **Delegate to mature infra.** npm/pip for versions, git for distribution. No new registry.
4. **Validate before trust.** Descriptions lie. Arena + curator QA are the truth signals.
5. **Progressive disclosure.** Skills: ~100 tokens -> <5000 -> on-demand. Arena/Curator: L0-L3.
6. **Build-then-reject is valid.** Experiment fast, kill decisively, document in ADRs.
7. **Orchestrator is distributed by weight, not centralized.** There is no single "orchestrator" component. Lightweight coordination lives in combo prompts (declarative), medium-weight in SKILL.md (agent-facing instructions), heavyweight in CLI (deterministic ops, HATEOAS output). The three layers communicate via well-defined message contracts (TOML, YAML frontmatter, HATEOAS) — actor-model style. An external evaluator searching for a centralized orchestrator won't find one; the coordination emerges from the message contracts, not from a container process.

## 9. Anti-Patterns

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| **Fat Skill** | Source + deps in skill dir. Context bloat, duplicated versioning. |
| **New Registry** | Building a skill package manager. npm/pip already exist. |
| **Code in SKILL.md** | Implementation in description file. Code belongs in npm/pip. |
| **CLI as Wizard** | Interactive CLI prompts. Intelligence belongs in the agent. |
| **Feed Adapters** | HTTP wrappers in curator. Agent has web fetch + search + gh. |
| **Centralized Orchestrator** | Looking for a single "orchestrator" component (like CrewAI/LangGraph). Coordination is distributed across combo prompts + SKILL.md + CLI via message contracts. Agent IS the orchestrator. |
| **Silent Activation** | Skills active without declaration. Violates deny-by-default (§8.1). |

## 10. Related Documents

- `AGENTS.md` -- universal project guidance (SSOT for workflows)
- `cortex/INDEX.md` -- task/epic/ADR index
- `cortex/wiki/01-patterns/2026-05-02-thin-skill-pattern.md` -- thin-skill full writeup
- `site/architecture.md` -- public-facing architecture page (no decisions log)
- `daily/YYYY-MM-DD.md` -- latest session handoff for ground truth
- ADR-20260506103209293 -- combo as deck-level prompt
- ADR-20260508230803515 -- curator no feed adapters
- ADR-20260517140421425 -- CLI vs agent-orchestrated parity
- ADR-20260528120317143 -- deck creation guide, agent-as-wizard
