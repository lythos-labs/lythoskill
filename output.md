# lythoskill-deck: Declarative Skill Deck Governance

**lythoskill-deck** is the governance layer for AI agent skills. It answers one question: *which skills should the agent see right now?*

## The Problem

Agent skills are decentralized by nature — anyone can publish a SKILL.md, and the ecosystem grows virally. But when 50+ skills coexist in an agent's scan path, three failure modes emerge:

- **Context window pollution.** Every skill's description consumes tokens in the system prompt, crowding out actual task context.
- **Silent blend.** Two skills claiming the same niche coexist invisibly. The agent picks randomly per task. No errors, no warnings — just inconsistent, nondeterministic output.
- **Undetected rot.** Transient workarounds linger past their expiration. Forked skills drift from upstream. Dependencies break silently.

These are not hypotheticals. They are inevitable outcomes of ungoverned skill accumulation, and they get worse with every `git clone` into `.claude/skills/`.

## The Model: Cold Pool → Declaration → Working Set

lythoskill-deck separates skill storage from skill activation through three layers:

| Layer | Location | Role |
|-------|----------|------|
| **Cold Pool** | `~/.agents/skill-repos/` | Download *all* skills here. The agent never scans this directory. |
| **skill-deck.toml** | Project root | Declare *exactly* which skills this project uses, organized by section. |
| **Working Set** | `.claude/skills/` | Symlinks only. The agent scans *only* this directory. |

The cold pool is your card binder. The working set is your hand. `skill-deck.toml` is the deck list that connects them.

## Deny-by-Default

The core rule is simple: **undeclared skills are physically absent from the working set.** Not disabled. Not hidden. Gone.

`deck link` is a reconciler. It reads `skill-deck.toml` (desired state), inspects `.claude/skills/` (actual state), and converges the two. Undeclared symlinks are removed. Broken symlinks are recreated. Missing declared skills are linked from the cold pool. Non-symlink entries are backed up and removed.

You never diagnose the working set manually. Just run `deck link`.

## Declarative Governance, K8s-Style

Deck follows the Kubernetes reconciliation model. The agent (Claude, Cursor, etc.) is the controller manager:

```
scan (observe state) → plan (compute diff) → confirm → execute → verify
     ↑                                                          │
     └────────────────── reconciliation loop ───────────────────┘
```

| K8s Concept | Deck Equivalent |
|-------------|-----------------|
| Desired state (YAML manifest) | `skill-deck.toml` |
| Actual state (running pods) | Working set (`.claude/skills/`) |
| Controller manager | Agent reads state → builds plan → user confirms |
| `kubectl apply` | `deck link` |
| Namespace | Per-project deck file |
| PersistentVolume | Cold pool (`~/.agents/skill-repos/`) |

There is no daemon. The agent *is* the reconciliation loop — observing, planning, confirming, and executing on demand.

## Multi-Agent POSSE Syndication

Not "switching between agents" — **syndicating everywhere simultaneously.** Like IndieWeb's POSSE (Publish on your Own Site, Syndicate Elsewhere):

```
Cold Pool (~/.agents/skill-repos/)     ← canonical "own site"
    ↓ deck link --workdir
├── .claude/skills/                    ← Claude Code
├── .cursor/skills/                    ← Cursor
├── .codex/skills/                     ← Codex
└── .windsurf/skills/                  ← Windsurf
```

One cold pool, one deck declaration, synced to every agent you use. Adding a new platform is a key-value registry update — no code changes needed.

## Skill Organization

`skill-deck.toml` sections match skill deployment roles:

| Section | Role | Examples |
|---------|------|----------|
| `[innate]` | Always active. Consumes context permanently. Keep few and thin. | Deck infrastructure, project conventions |
| `[tool]` | On-demand. Agent sees descriptions; full content loads only when relevant. | PDF generation, web search, diagramming |
| `[combo]` | Router skills. One niche slot, delegates to multiple specialists by condition. | Playwright test combo, report generation combo |
| `[transient]` | Temporary workarounds. Mandatory expiration date. Designed to shrink. | Encoding fixes, migration helpers |

**Same-niche skills must not coexist in `[innate]`.** This is the silent blend prevention rule.

## Safety Guards

- **max_cards budget.** `link` refuses if declared skills exceed the configured limit.
- **Transient expiry.** Past-due transients trigger warnings. `link` surfaces them.
- **Managed directory overlap.** Two skills claiming the same directory triggers a warning.
- **Working set backup.** Non-symlink entries are archived as `.tar.gz` before removal. Total size > 100MB causes `link` to refuse unless `--no-backup` is specified.
- **Unsafe path refusal.** `link` refuses if `working_set` resolves to home directory or root.
- **Real files preserved.** `link` only removes symlinks — real files or directories are skipped with a warning.

## The TCG Analogy

The entire workflow maps to trading card games:

```
Discover → Acquire → Index → Build Deck → Test Play
awesome    git clone  curator   deck edit    arena
lists      Vercel CLI scan      + link       benchmark
```

- **Cold Pool** = Card binder (your entire collection)
- **skill-deck.toml** = Deck list (the cards you've chosen)
- **deck link** = Shuffle & draw (activate the chosen cards)
- **Working Set** = Hand in play (what the agent actually sees)
- **Arena** = Test match (benchmark deck performance)

## Commands

| Command | Purpose |
|---------|---------|
| `link` | Reconcile working set to match declaration (the routine command) |
| `add <locator>` | Git clone a skill to cold pool and append to `skill-deck.toml` |
| `refresh [alias]` | Pull latest upstream versions of declared skills |
| `remove <alias>` | Remove a skill from deck and working set (cold pool untouched) |
| `prune` | GC cold pool repos no longer referenced by any deck |
| `validate` | Validate `skill-deck.toml` without modifying files |
| `migrate-schema` | Migrate from deprecated string-array format to current alias-as-key format |

## Integration with Arena

Deck's isolation capability is the backbone of lythoskill-arena's controlled-variable experiments. Arena creates temporary decks with only the skills under test, runs subagents, collects output, and restores the parent deck. This ensures output differences converge to the single variable — the skill being tested.

## Non-Goals

- **lythoskill-deck does not modify the Agent Skills standard.** Every skill remains a directory with SKILL.md. Deck only controls which directories appear in the working set.
- **Deck does not run post-install steps.** `add`/`link` place skills in the working set. Any additional setup (API keys, env vars, external dependencies) is the skill's own responsibility.
- **Deck is not a package manager.** It does not resolve transitive dependencies, enforce version constraints, or fetch from registries. It governs *activation* — which skills the agent sees — not acquisition or resolution.

---

**lythoskill-deck** turns agent skill management from "whatever happens to be in the directory" into a declarative, auditable, reconcile-able system. For projects that depend on agent skills, it moves governance from hope to mechanism.
