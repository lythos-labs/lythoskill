# Custom Frontmatter Fields
lythoskill uses custom fields in SKILL.md frontmatter for governance metadata.
Agent platforms (Claude Code, Kimi CLI, etc.) parse and ignore unrecognized fields.
These fields are consumed only by lythoskill's own tooling.
## Prefix Convention
All custom fields use the `deck_` prefix to avoid collision with the Agent Skills
open standard or future platform extensions.
| Field | Purpose | Example |
|-------|---------|---------|
| `deck_niche` | Domain tag (dot-separated) | `meta.governance.deck` |
| `deck_dependencies` | Runtime requirements | `runtime: [bash]` |
| `deck_managed_dirs` | Directories this skill writes to | `[".claude/skills/", "skill-deck.lock"]` |
## Migrated Fields
These previously custom fields now use official Agent Skills equivalents:
| Old (custom) | New (standard) | Reason |
|-------------|----------------|--------|
| `deck_triggers` | `when_to_use` | Claude Code natively reads `when_to_use` for skill matching |
| `cooperative_skills` | _(documentation only)_ | Not consumed at runtime; document in references |
## Alternative: Namespace Strategy
For strict standard compliance, nest all custom fields under `metadata`:
```yaml
metadata:
  niche: meta.governance.deck  managed_dirs: [".claude/skills/"]
```
The flat `deck_` prefix is simpler and avoids YAML nesting depth.
