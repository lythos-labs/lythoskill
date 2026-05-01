# Deck Synergy and Combo Detection
## Why Same-Niche Skills Can Coexist
"Same niche" does not mean "same scenario." Report generation examples:
| Skill A | Skill B | Distinction |
|---------|---------|-------------|
| `report-docx` | `report-pptx` | Output format |
| `design-doc-mermaid` | `design-doc-d2` | Diagram syntax |
| `deep-research-en` | `deep-research-cn` | Language/culture |
These overlap in niche but are non-substitutable in specific scenarios.
Forcing a binary choice loses scenario coverage.
## Combo Routing
Deck's `[combo]` section solves this with a **router skill** that delegates
by condition:

```toml
[combo]
skills = ["github.com/anthropics/skills/skills/pdf"]
```

The combo skill's SKILL.md contains a condition-dispatch table:
| Condition | Route to |
|-----------|----------|
| User asks for PPT | `report-pptx` |
| User asks for Word | `report-docx` |
| No format specified | Default `report-docx`, mention alternatives |
## Silent Blend vs Synergy
| Phenomenon | Cause | Fix |
|------------|-------|-----|
| **Silent blend** | Same-niche skills, no routing → random selection | Keep one, or add combo router |
| **Deck synergy** | Same-niche skills with clear division + combo | Keep both, combo coordinates |
The distinguishing factor: is there a **condition-dispatch table** deciding
who handles what? Yes = combo (collaboration). No = silent blend (competition).
## Detecting Synergy with Arena
Test three configurations:
```bash
bunx @lythos/skill-arena \
  --task "Generate quarterly report" \  --decks "only-docx.toml,only-pptx.toml,docx+pptx+combo.toml" \  --criteria "coverage,accuracy,token"
```
If the combo deck scores higher on coverage without sacrificing accuracy,
you've confirmed deck synergy. The judge should explicitly flag emergent
combos — 1+1>2 effects not visible from individual skill metadata.
