# Glossary
| Term | Definition |
|------|-----------|
| **Cold Pool** | Local directory storing all downloaded skills. Agent does not scan here. Only `deck link` reads from it. |
| **Working Set** | Symlinks only. The directory the agent scans for skills. Default: `.claude/skills/` (configurable per platform). |
| **deny-by-default** | Undeclared skills are physically absent from the working set. Not disabled — gone. |
| **Silent Blend** | Same-niche skills coexist in working set → agent picks randomly per task → inconsistent output, no errors. |
| **Niche** | Skill's domain as dot-separated namespace (e.g. `meta.governance.deck`). Same-niche innate skills must not coexist. |
| **Combo Routing** | Deck-level prompt hint (`[combo.<name>] prompt`) that directs agent to pipeline through specialists, avoiding same-niche competition. |
| **Transient** | Temporary workaround skill with mandatory expiration. Designed to shrink and be removed or hardened into a package. |
| **Deck Building** | Selecting and combining skills. TCG analogy: cold pool = collection, working set = hand, deck = construction. |
| **Pareto Frontier** | No single "best" — only optimal trade-offs across dimensions (quality, tokens, maintainability). |
| **Ghost Skill** | Present in working set but undeclared in toml. Created by manual placement. `deck link` removes these. |
| **max_cards** | Hard budget in toml. `deck link` refuses to sync if declared count exceeds this. |
| **Reconciler** | `deck link`'s model: compare desired (toml) to actual (working set), apply minimal changes to converge. |
