# skill-deck.toml Reference
## [deck] — Global Settings
| Field | Required | Description |
|-------|----------|-------------|
| `working_set` | Yes | Agent-scanned directory. Default: `.claude/skills` |
| `cold_pool` | Yes | Skill storage path. Use `"."` for local development. |
| `max_cards` | No | Hard budget. Link refuses if total skills exceed this. |
## [innate] — Always-Active Skills
Load every session. Consumes context permanently. Keep few and thin.
```toml
[innate]
skills = ["github.com/lythos-labs/lythoskill/skills/lythoskill-deck"]
```
**Rule**: Same-niche skills must not coexist in innate (causes silent blend).
## [tool] — On-Demand Skills
Agent sees descriptions; full content loads only when relevant.
```toml
[tool]
skills = ["web-search", "design-doc-mermaid", "project-scribe"]
```
## [combo] — Router Skills
Occupies one niche slot, delegates to multiple specialists by condition.
```toml
[combo]
skills = ["report-generation-combo"]
```
## [transient] — Temporary Workarounds
Must declare `expires`. Design goal: shrink until removable.
If repeatedly needed, extract into a package and keep only a thin call.
```toml
[transient.fix-encoding]
path = ".claude/skills/_fix-encoding"
expires = "2026-05-01"
```
## Skill Path Resolution
| cold_pool | Skill reference | Resolves to |
|-----------|----------------|-------------|
| `"~/.agents/skill-repos"` | `"github.com/lythos-labs/lythoskill/skills/lythoskill-deck"` | `~/.agents/skill-repos/github.com/.../lythoskill-deck/` |
| `"."` | `"lythoskill-deck"` | `./skills/lythoskill-deck/` |
## Full Example
```toml
[deck]
working_set = ".claude/skills"
cold_pool   = "~/.agents/skill-repos"
max_cards   = 10
[innate]
skills = ["github.com/lythos-labs/lythoskill/skills/lythoskill-deck"]
[tool]
skills = [
  "github.com/someone/web-search",  "github.com/someone/design-doc-mermaid",
]
[combo]
skills = ["report-generation-combo"]
[transient.fix-encoding]
path = ".claude/skills/_fix-encoding"
expires = "2026-05-01"
```
