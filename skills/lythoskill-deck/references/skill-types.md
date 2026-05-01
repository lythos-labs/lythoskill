# Skill Types and Thickness
## SKILL.md type Field
Agent platforms validate the `type` field in SKILL.md frontmatter.
If omitted, defaults to `standard`.

| Type | Meaning | Use case |
|------|---------|----------|
| `standard` | Prompt-based skill (default) | Tools, glue, routing |
| `flow` | Embeds Mermaid/D2 flowchart for multi-step orchestration | Workflows, arena |
Any other value causes the skill to be **silently skipped** during loading.

**Important**: `innate`/`tool`/`combo`/`transient` are skill-deck.toml section names,
not SKILL.md types. They govern deck behavior, not platform behavior.

## Thickness Layers
Not all logic belongs in SKILL.md:
| Layer | Form | Location | Example |
|-------|------|----------|---------|
| **Heavy** | npm/pip/CLI package | External package manager | Diagram generator, formatter |
| **Dispatcher** | Flow or Combo skill | `.claude/skills/` | Workflow orchestration, routing |
| **Glue** | SKILL.md + scripts/ | `.claude/skills/` | deck link, ADR template init |

## Flow vs Combo
Both are dispatchers — neither should contain heavy business logic:

| Aspect | Flow (SKILL.md type) | Combo (deck section) |
|--------|---------------------|---------------------|
| Defined by | Mermaid/D2 graph in SKILL.md | Condition table in deck toml |
| Execution | Agent follows graph nodes | Route to specialist skill |
| Scope | Multi-step orchestration | Same-niche delegation |

The real algorithm lives in external tools. Skills only **dispatch**: the right
component at the right time.
