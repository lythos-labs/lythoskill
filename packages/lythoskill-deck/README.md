# @lythos/skill-deck

![Coverage](https://img.shields.io/badge/coverage-82%25-brightgreen) ![CI](https://img.shields.io/badge/CI-71%20unit%20%2B%2021%20CLI%20BDD-brightgreen) ![Agent BDD](https://img.shields.io/badge/Agent%20BDD-5%20local-blue) ![Intent/Plan](https://img.shields.io/badge/arch-intent%2Fplan%2Fexecute-8A2BE2)

> Declarative skill deck governance. Reconcile declared skills against your cold pool via symlinks — deny-by-default, max-cards budgeting, transient expiry.

## For AI Agents

This package exposes a **CLI**. Invoke via:

```bash
bunx @lythos/skill-deck@0.9.19 <command> [options]
```

No installation required. `bunx` auto-downloads the package.

### skill-deck.toml (minimal)

```toml
[deck]
max_cards = 10

[tool.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
```

### skill-deck.toml (full reference)

```toml
[deck]
max_cards = 10              # Hard limit on total skills
working_set = ".claude/skills"      # Where symlinks are created
cold_pool = "~/.agents/skill-repos" # Where skills are downloaded

[innate.skills.lythoskill-deck]     # Always-loaded skills
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[tool.skills.tdd]                   # Auto-triggered skills
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.gstack]
path = "github.com/garrytan/gstack"

[transient.trial-skill]              # Trial skills with auto-expiry
path = "./skills/experimental"
expires = "2026-06-01"    # ISO date; warns at ≤14 days

# combo is a meta-declaration, not a skill type (doesn't count against max_cards):
[combo.report-generation]
skills = ["web-search", "docx", "mermaid"]
prompt = "Search for latest info, then generate professional document with diagrams"
```

### When to invoke

| Situation | Command |
|-----------|---------|
| Sync working set with `skill-deck.toml` | `bunx @lythos/skill-deck@0.9.19 link` |
| Validate `skill-deck.toml` before committing | `bunx @lythos/skill-deck@0.9.19 validate` |
| Download a skill to cold pool and add to deck | `bunx @lythos/skill-deck@0.9.19 add owner/repo` |
| Pull latest versions of declared skills | `bunx @lythos/skill-deck@0.9.19 refresh` |
| Refresh a single skill by alias | `bunx @lythos/skill-deck@0.9.19 refresh tdd` |
| Remove a skill from deck and working set | `bunx @lythos/skill-deck@0.9.19 remove tdd` |
| GC unreferenced repos from cold pool | `bunx @lythos/skill-deck@0.9.19 prune` |
| Use a custom deck file or working dir | `bunx @lythos/skill-deck@0.9.19 link --deck ./my-deck.toml --workdir /path/to/project` |

### Commands

| Command | Args | Description |
|---------|------|-------------|
| `link` | `[--deck <path>] [--workdir <dir>]` | Sync working set. Removes undeclared skills (deny-by-default). |
| `validate` | `[deck.toml] [--workdir <dir>]` | Validate deck config without modifying files. |
| `add` | `<locator> [--alias <alias>] [--type <type>] [--deck <path>]` | Git clone skill to cold pool and append to skill-deck.toml. |
| `refresh` | `[<fq|alias>] [--deck <path>]` | Pull latest versions of declared skills from upstream git repos. Pass a name to refresh one skill. |
| `remove` | `<fq|alias> [--deck <path>]` | Remove skill from deck.toml and working set. Cold pool untouched. |
| `prune` | `[--yes] [--deck <path>]` | GC cold pool repos no longer referenced. Interactive confirm (skip with `--yes`). |

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--deck <path>` | Path to skill-deck.toml | Find upward from cwd |
| `--workdir <dir>` | Working directory | cwd |

| `--alias <alias>` | Explicit alias for the skill (default: basename of path) | — |
| `--type <type>` | Target section for `add`: `innate`, `tool`, or `transient` | `tool` |

### Safety guards

`link` refuses to operate if `working_set` resolves to your home directory or root (`/`). It also only removes **symlinks** from the working set — real files or directories are skipped with a warning.

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Validation failed, deck not found, or budget exceeded |

---

## For Humans

### Why

When an AI agent has access to 50+ skills, context window pollution and silent conflicts become real problems. Two skills claiming the same niche, redundant descriptions, incompatible assumptions — all invisible until the agent hallucinates.

`skill-deck.toml` solves this by declaring *exactly* which skills the agent should see. `deck link` creates symlinks from the cold pool to `.claude/skills/` and **removes everything else**. Deny-by-default means undeclared skills physically do not exist in the agent's view.

### Quick Start

```bash
# 1. Create a skill-deck.toml
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10

[tool.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
EOF

# 2. Link — creates symlinks in .claude/skills/
bunx @lythos/skill-deck@0.9.19 link
```

### Key Concepts

| Concept | One-liner |
|---------|-----------|
| **Cold Pool** | All downloaded skills (`~/.agents/skill-repos/`). Agent cannot see here. |
| **skill-deck.toml** | Declares desired state: "this project uses these skills." |
| **`deck link`** | Reconciler. Makes the working set match the declaration. |
| **Working Set** | Symlinks only. Default: `.claude/skills/` — where agents scan for skills. |
| **deny-by-default** | Undeclared skills are physically absent from the working set. |

### Agent skill scan locations

Different agents look for skills in different directories. `skill-deck.toml` configures the working set to match your agent:

| Agent | Default skills directory |
|-------|--------------------------|
| Claude Code | `.claude/skills/` |
| Cursor | `.cursor/skills/` |
| Generic / custom | Configure `working_set` in `skill-deck.toml` |

> **If you are an agent**: verify where your platform scans for skills, then set `working_set` to that path before running `deck link`.

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `❌ Skill not found: <name>` | Skill declared in deck but not in cold pool | `bunx @lythos/skill-deck@0.9.19 add github.com/owner/repo/skill` or clone manually into cold pool |
| `link` skips entries with warnings | Real files/directories exist in working set (not symlinks) | Delete the real directories in `working_set` and re-run `link`. Never create directories manually there |
| `refresh` reports "Not a git repository" | Skill was copied (not cloned) into cold pool | Re-clone with `git clone` or use `deck add` which clones by default |
| `deck update` prints deprecation warning | `update` was renamed to `refresh` in v0.8+ | Use `deck refresh` instead |
| `link` refuses with "budget exceeded" | Declared skills > `max_cards` | Increase `max_cards` in `skill-deck.toml` or remove unused skills |
| `link` refuses with "unsafe working_set" | `working_set` resolves to `~` or `/` | Check `skill-deck.toml` has correct relative path (e.g. `.claude/skills/`) |
| Agent doesn't see skills after `link` | `working_set` path doesn't match agent's scan location | Claude Code: `.claude/skills/`; Cursor: `.cursor/skills/`; Kimi: check your platform docs. Set `working_set` correctly |
| Broken symlinks in working set | Skill moved or deleted from cold pool | Re-run `link` — it recreates symlinks automatically |
| `deck add` fails with 404 | Locator format wrong or repo doesn't exist | Format: `github.com/owner/repo/skill-name` (path to skill directory inside repo) |
| `skill-deck.toml not found` | Running `link` outside project tree | Run from project root, or use `--deck ./path/to/skill-deck.toml` |

## K8s-Style Reconciliation: Agent as Controller

Deck follows Kubernetes' reconciliation model. The agent (Claude, Cursor, etc.) is the **controller manager** — it reads state, builds a plan, shows it to the user, then executes:

```
scan (observe state)  →  plan (compute diff)  →  confirm  →  execute  →  verify
     ↑                                                              │
     └──────────────────── reconciliation loop ─────────────────────┘
```

| K8s Concept | Deck Equivalent |
|-------------|-----------------|
| Desired state (YAML manifest) | `skill-deck.toml` |
| Actual state (running pods) | Working set (`~/.claude/skills/`) |
| Controller manager (reconcile loop) | Agent reads state → builds plan → user confirms |
| `kubectl apply` | `deck link` |
| Namespace (isolation) | Per-project deck file |
| PersistentVolume | Cold pool (`~/.agents/skill-repos/`) |

The loop doesn't run automatically (no daemon). The agent is the loop — it observes, plans, confirms, and executes on demand. This is K8s-style **declarative governance**: declare what you want, reconcile to match.

## Multi-Agent POSSE Syndication

Not "switching between agents" — **syndicating everywhere simultaneously**. Like IndieWeb's POSSE (Publish on your Own Site, Syndicate Elsewhere):

```
Cold Pool (~/.agents/skill-repos/)     ← canonical "own site"
    ↓ deck link --workdir
├── .claude/skills/                    ← syndicate to Claude Code
├── .cursor/skills/                    ← syndicate to Cursor
├── .codex/skills/                     ← syndicate to Codex
└── .windsurf/skills/                  ← syndicate to Windsurf
```

One cold pool, one deck declaration, synced to every agent you use. Adding a new platform is updating a key-value registry — no code changes needed. See [multi-agent-posse-syndication](https://github.com/lythos-labs/lythoskill/blob/main/cortex/wiki/01-patterns/2026-05-05-multi-agent-posse-syndication.md).

## Migration: For Existing Skill Users

If you already have skills installed (in working set, globally, or mixed), deck respects your existing state:

```
1. SCAN    Agent surveys: what's in ~/.claude/skills/? What's global? What's mixed?
           curator scan helps — indexes cold pool or existing working set.

2. PLAN    Agent shows: "We found 12 skills. After migration:
           - 2 → innate (deck infrastructure)
           - 4 → tool section
           - 3 → cold pool (already there, just link)
           - 3 → backup only (unused, stale)
           All 12 backed up to ~/.agents/lythos/backups/<date>.tar.gz"

3. BACKUP  Always. `link` creates tar backups for non-symlink entries before removal.
           Use `--no-backup` only if you're certain.

4. EXECUTE deck link — creates symlinks, removes undeclared, leaves real files untouched.

5. VERIFY  Agent checks: all declared skills resolve? Working set clean?
           If unhappy: tar xf backup → rollback to pre-migration state.
```

**Key principle**: existing skill users aren't beginners. They have working setups. Migration is a conversation — scan, show the plan, confirm before acting. Backup is non-negotiable.

## Architecture: Intent / Plan / Execute

Deck commands separate pure logic from IO:

```
deck.toml  →  RefreshPlan / PrunePlan (pure)  →  execute with injectable IO
```

- **Plan**: `buildRefreshPlan()`, `buildPrunePlan()` — pure functions, unit-testable
- **Execute**: `executeRefreshPlan(plan, io)`, `executePrunePlan(plan, io)` — IO injected (`gitPull`, `delete`, `log`)
- **Config**: `workdir`, `coldPool`, `deckPath` all accept explicit overrides, defaults are fallback

This enables testing without real git operations — inject mock `gitPull`, capture `log` output, assert expected behavior.

## Test Coverage

| Layer | Count | CI | Notes |
|-------|-------|----|-------|
| Unit tests | 71 | ✅ | Plan generation, link, add, remove, schema |
| CLI BDD | 21 | ✅ | End-to-end via real CLI invocations in tmpdir |
| Agent BDD | 5 | ❌ | Requires `claude -p` CLI; `.agent.test.ts` convention |

Coverage is honest — no gate, no inflation. Agent BDD scenarios run locally only.

## More Documentation

- **Skill layer** (agent-facing instructions):  
  [`packages/lythoskill-deck/skill/SKILL.md`](https://github.com/lythos-labs/lythoskill/blob/main/packages/lythoskill-deck/skill/SKILL.md)
- **Full project README** (ecosystem overview, cold pool setup):  
  [`README.md`](https://github.com/lythos-labs/lythoskill#readme)
- **Architecture** (thin-skill pattern, three-layer separation):  
  [`AGENTS.md`](https://github.com/lythos-labs/lythoskill/blob/main/AGENTS.md)

## License

MIT

<!-- test-stats -->
![pass](https://img.shields.io/badge/71_pass-0_fail-brightgreen) ![coverage](https://img.shields.io/badge/coverage-82%25-yellow)

```
File | % Funcs | % Lines | Uncovered Line #s
| --- | --- | --- |
All files | 74.76 | 81.66 |
 src/add.ts | 83.33 | 71.17 | 43,45-49,54-58,61-70,86-88,103-105,123-124,132-134,166,170,181-187,195-200
 src/link.ts | 43.75 | 61.40 | 112-120,125,128-132,140-151,155-156,171-180,189,215-216,219-220,227-234,246-248,253-254,256-270,274-277,280-287,294-296,307-309,316-319,335,343-346,348-353,355-358,360-373,375-376,379-381,416-417,463-470,488-489,497-499,501-507,533-534,546
 src/parse-deck.ts | 100.00 | 92.45 | 47-50
 src/prune-plan.ts | 75.00 | 97.27 | 179-181
 src/prune.ts | 50.00 | 36.21 | 24-26,29-40,44-73,77-90,94-100,111-113,125-126,144,149-150
 src/refresh-plan.ts | 75.00 | 97.66 | 170-172
 src/refresh.ts | 85.71 | 87.30 | 43-44,56-58,73,77-78
 src/remove.ts | 60.00 | 91.53 | 22-24,44
 src/schema.ts | 100.00 | 100.00 | 
```
<!-- /test-stats -->
