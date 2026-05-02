# ADR-20260423191001406: Deck npm Package Naming

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-23 | Created |
| accepted | 2026-04-23 | Renamed to @lythos/skill-deck and @lythos/skill-creator, published |

## Context

`@lythos/deck` is the npm package name for the skill deck governance tool. The corresponding skill lives in `skills/lythoskill-deck/`, and its bin name is `lythoskill-deck`.

The question: should the npm package name **explicitly signal** that this is a skill tool, or is the `@lythos/` scope sufficient context?

Current naming across layers:

| Layer | Name |
|-------|------|
| npm package | `@lythos/deck` |
| Skill directory | `lythoskill-deck/` |
| CLI bin | `lythoskill-deck` |
| SKILL.md frontmatter | `name: lythoskill-deck` |

The tension: `lythoskill` is a portmanteau of `lythos` + `skill`. So `lythoskill-deck` = `lythos` (brand) + `skill` (category) + `deck` (tool). But the npm package `@lythos/deck` drops the `skill` category marker, making it semantically asymmetric.

## Options Considered

### Option A: Keep `@lythos/deck` (Concise)

Keep the current name. The `@lythos/` scope provides brand context.

- **Pros**: Short, easy to type, consistent with `lythoskill-deck` bin/skill name (same root word)
- **Cons**: `deck` is generic; doesn't signal "skill governance" to someone browsing npm

### Option B: `@lythos/skill-deck` (Explicit)

Add `skill-` prefix to make purpose clear.

- **Pros**: Explicitly signals this is a skill tool; aligns with `lythoskill-deck` naming pattern (`skill` in the name)
- **Cons**: Longer; `skill-deck` is slightly redundant with `@lythos/` scope

### Option C: `@lythos/deck-governance` (Descriptive)

Use a descriptive suffix instead of prefix.

- **Pros**: Very clear what it does; `governance` is precise
- **Cons**: Verbose; doesn't match the skill name; deviates from concise naming style

### Option D: `@lythos/deck` with improved description (Current + Docs)

Keep the name but ensure `package.json` `description` and README clearly explain it's a skill governance tool.

- **Pros**: No breaking change; concise name stays; documentation solves the ambiguity
- **Cons**: Relies on reading docs; npm search/browse doesn't self-describe

## Decision

**Tentative: Option B (`@lythos/skill-deck`).**

Rationale:

1. **Scope ≠ category**: `@lythos/` is the brand scope, not the product category. The lythos ecosystem will include non-skill tools (e.g. `@lythos/project-cortex` is a project management tool, not a skill). A generic `@lythos/deck` doesn't signal "this is a skill tool."

2. **Market/ecosystem alignment**: Skill name (`lythoskill-deck`) and npm package name should correspond semantically:
   - `lythoskill-deck` = `lythos` (brand) + `skill` (category) + `deck` (tool)
   - `@lythos/skill-deck` = `@lythos/` (brand) + `skill-deck` (category-tool)
   - The `skill-` prefix in the npm name achieves the same semantic alignment as `lythoskill-` in the skill name.

3. **Non-skill tools don't need the prefix**: `project-cortex` is `@lythos/project-cortex` without `skill-` because it's **not** a skill — it's a standalone project management tool. The `skill-` prefix is a category marker, not a universal rule.

4. **Precedent for `creator`**: `@lythos/creator` should also become `@lythos/skill-creator` for the same reason. It's a skill scaffolding tool, not a generic creator.

## Impact if Approved

- **npm publish**: Republish `@lythos/deck` as `@lythos/skill-deck` (or deprecate + redirect)
- **SKILL.md references**: Update all `bunx @lythos/deck` → `bunx @lythos/skill-deck`
- **Template variables**: Update `{{PACKAGE_NAME}}` substitution values
- **CLAUDE.md**: Update command examples

## Questions to Resolve

1. Should `@lythos/creator` also become `@lythos/skill-creator`? (Consistent with this rationale)
2. What about `lythoskill-hello-world`? It has no npm package (it's a demo skill), so no rename needed.
3. Is there any risk of `@lythos/skill-*` being too verbose for frequent CLI use? (`bunx @lythos/skill-deck link` vs `bunx @lythos/deck link`)

## Related
- ADR-20260423101938000: Thin Skill Pattern (layer separation)
- ADR-20260423182606313: Template Variable Substitution
- `skill-deck.toml` (current deck declaration format)
- `packages/lythoskill-deck/package.json`
