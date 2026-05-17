---
created: 2026-05-17
category: pattern
---

# Alias as Role/Slot: Name Resolution & Working Set Flattening

> FQ-locator ensures cold-pool uniqueness. Alias provides role semantics. Link flattens to agent-visible working set.

## Three Layers, Three Concerns

```
Cold Pool                                skill-deck.toml                    Working Set
(git-managed, nested)                    (declarative, aliased)             (flat, agent-visible)

github.com/                              [tool.skills.qa-gate]       →     qa-gate
  nexu-io/                                path = "...critique"
    open-design/
      skills/critique/                   [tool.skills.design-review] →     design-review
                                         path = "...critique"
github.com/
  gstack/utils/skills/review/           [tool.skills.review-gstack]  →     review-gstack
```

Three concerns, cleanly separated:
- **Cold Pool**: deep nesting, git-managed, FQ-locator resolves uniquely. Agent never reads here.
- **skill-deck.toml**: alias acts as role slot — same skill, different names in different decks, different purposes.
- **Working Set**: flat symlinks. Agent scans once, sees all available skills by alias.

## Alias Is a Role Slot, Not a Rename

The same upstream skill can serve different roles in different decks:

```toml
# QA deck — critique as quality gate
[tool.skills.qa-gate]
path = "github.com/nexu-io/open-design/skills/critique"

# Design deck — critique as peer review
[tool.skills.design-review]
path = "github.com/nexu-io/open-design/skills/critique"

# Brand deck — critique as brand alignment checker
[tool.skills.brand-check]
path = "github.com/nexu-io/open-design/skills/critique"
```

The agent sees `qa-gate`, `design-review`, or `brand-check` — each alias carries role semantics. The agent doesn't need to know it's the same upstream skill. The role name guides when and how to invoke it.

## Name Conflict Resolution

When two repos ship a skill with the same basename:

```toml
[tool.skills.review-nexu]
path = "github.com/nexu-io/tools/skills/review"

[tool.skills.review-gstack]
path = "github.com/gstack/utils/skills/review"
```

Without aliases, both would collide at `review` in the working set. The alias mechanism allows:
- Disambiguation: `review-nexu` vs `review-gstack`
- Role hint: the alias can encode which source or what purpose
- No changes to upstream skill naming needed

## Working Set Flattening

Cold pool preserves upstream structure (arbitrary nesting depth). Link flattens to a single level:

```
Working Set (.claude/skills/)
  critique/           ← github.com/nexu-io/open-design/skills/critique
  lythoskill-deck/    ← github.com/lythos-labs/lythoskill/skills/lythoskill-deck
  qa-gate/            ← same critique skill, different alias, different role
  baoyu-markdown/     ← github.com/JimLiu/baoyu-skills/skills/baoyu-markdown-to-html
```

Agent scans `.claude/skills/` → one `readdir` → sees all available skills. No traversal, no depth limits, no monorepo structure leakage. The FQ-locator encodes the full path for cold-pool resolution; the alias encodes the role for agent context.

## BDD Validation (2026-05-17)

| Test | What it validated |
|------|-------------------|
| deck abc 基础 | Alias created via `deck add --alias`, symlink appears at alias name in working set |
| innate eager-load | Agent reads alias from toml → follows symlink → loads full SKILL.md |
| phase switch | `deck link --deck phase2.toml` atomically swaps aliases, role boundaries preserved |
| map-reduce cells | 3 parallel cells each with own deck + aliases, zero name collision across cells |

## Why Not Just Use the Upstream Name?

1. **Role is context-dependent**: `critique` means different things in a QA deck vs a design deck. The alias communicates intent.
2. **Upstream names aren't unique**: `review`, `dashboard`, `docs` appear in multiple repos.
3. **Upstream names can be bad**: long, cryptic, or misleading. Alias is local control.
4. **Phase decks reuse skills**: same skill appears in multiple phase decks with potentially different aliases reflecting its role in each phase.

## Thin Layer Insight

The alias mechanism adds zero complexity to the cold pool or upstream skills. It's purely a deck-level concern — a single line in `skill-deck.toml`. The FQ-locator + alias pair is the minimal representation that satisfies all three requirements:

```
FQ-locator  →  unique cold-pool path (storage concern)
Alias       →  role + disambiguation (agent concern)
Link        →  flat working set (discovery concern)
```

Each layer does one thing. No layer needs to know about the others.

## Related

- `cortex/wiki/01-patterns/2026-05-02-thin-skill-pattern.md`
- `cortex/wiki/01-patterns/2026-05-02-player-deck-separation-and-tcg-player-analogy.md`
- `cortex/wiki/01-patterns/2026-05-15-seed-bootstrap-pattern-minimal-governance-skill-enables-agent-self-expansion.md`
- `cortex/wiki/03-lessons/2026-05-17-codex-symlink-snapshot-mode-origin-and-evolution.md`
- Epic: EPIC-20260517121757041 (Agent BDD coverage)
- BDD: TASK-20260517121808215 (deck basics), TASK-20260517121830977 (map-reduce cells)
