---
created: 2026-05-11
updated: 2026-05-11
category: research
---

# skills.sh ↔ lythoskill Interoperability — Syntax Sugar

> Research: skills.sh's `npx skills add` syntax maps cleanly to lythoskill's FQ locator.
> Both resolve to `github.com/owner/repo.git` + optional subpath. Adding syntax sugar
> in deck add makes the transition seamless.

## The Mapping

skills.sh's `parseSource` and lythoskill's FQ locator are the same underlying model:

```
skills.sh input                  parseSource output              lythoskill FQ locator
─────────────────────────────────────────────────────────────────────────────────
owner/repo@skill                 github: owner/repo.git          github.com/owner/repo/skills/skill
                                 skillFilter: skill

owner/repo/subpath               github: owner/repo.git          github.com/owner/repo/subpath
                                 subpath: subpath

owner/repo                       github: owner/repo.git          github.com/owner/repo

github:owner/repo                github: owner/repo.git          github.com/owner/repo

https://github.com/o/r.git       github: o/r.git                 github.com/o/r

localhost/name                   local (fs path)                 localhost/name
```

## Implementation in deck add

`normalizeSkillsSh()` in `packages/lythoskill-deck/src/add.ts`:

1. **FQ locator passes through**: `github.com/owner/repo[/skill]` — already canonical
2. **`github:` prefix → FQ**: `github:owner/repo` → `github.com/owner/repo`
3. **`owner/repo@skill` → FQ**: `mattpocock/skills@tdd` → `github.com/mattpocock/skills/skills/tdd`
4. **`owner/repo/subpath` → FQ**: `anthropics/skills/skills/frontend-design` → FQ
5. **Everything else**: passes through to `parseLocator`

Key safety: regex requires `[^/.]+` for the first segment (owner) — prevents
`github.com/owner/repo` (FQ) from being re-parsed as shorthand.

## What We Share

Both systems have:
- **`sanitizeSubpath` / `validateAlias`** — path traversal prevention (reject `..`)
- **`owner/repo` → `github.com/owner/repo.git`** — GitHub as universal git host
- **Subpath/skill filter** — narrow to specific skill within monorepo
- **`localhost/`** — local-only skills, no git clone

## What Stays Different

| | skills.sh | lythoskill |
|---|---|---|
| Discovery | skills.sh leaderboard + `npx skills find` | curator query + web search |
| Security verification | Snyk / Gen (install-time) | arena test-before-adopt |
| Installation target | `.agents/skills/` (universal) | Per-project working set (deny-by-default) |
| Lock file | `.skill-lock.json` v3 | `skill-deck.lock` |
| Governance | None (install = active) | deny-by-default + reconcile + restore |

## Pattern Reference: Hono's Adapter Model

Same principle as Hono's platform adapters: normalize at the boundary, simplify internally.

```
Hono:   Node req  ─┐
        Deno req  ─┼─ adapter → Context → (routing/middleware 不感知平台)
        CF Worker ─┘

Deck:   skills.sh syntax ─┐
        github: prefix   ─┼─ normalizeSkillsSh → FQ locator → (parseLocator/clone 不感知来源)
        FQ locator       ─┘
```

The router is powerful because diverse inputs converge to one internal representation.
Deck's locator parsing follows the same architecture: boundary normalization, internal single
canonical form.

## Sources

- [vercel-labs/skills source-parser.ts](https://github.com/vercel-labs/skills/blob/main/src/source-parser.ts)
- [skills.sh](https://skills.sh)
- ADR-20260511000000000: deck git-only FQ locators vs hub/marketplace
