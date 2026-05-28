# skill-deck.toml Reference
## [deck] — Global Settings
| Field | Required | Description |
|-------|----------|-------------|
| `working_set` | Yes | Agent-scanned directory. Default: `.claude/skills` |
| `cold_pool` | Yes | Skill storage path. Use `"."` for local development. |
| `max_cards` | No | Hard budget. Link refuses if total skills exceed this. |
## [innate] — Always-Active Skills
Load every session. Consumes context permanently. Keep few and thin.

> **Deprecated format**: The string-array `skills = ["..."]` format is deprecated. Run
> `deck migrate-schema` to upgrade to the alias-as-key format:
> ```toml
> [innate.skills.lythoskill-deck]
> path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
> ```

**Legacy format** (still parsed, triggers deprecation warning):
```toml
[innate]
skills = ["github.com/lythos-labs/lythoskill/skills/lythoskill-deck"]
```
**Rule**: Same-niche skills must not coexist in innate (causes silent blend).
## [tool] — On-Demand Skills
Agent sees descriptions; full content loads only when relevant.

> **Modern format** (preferred):
> ```toml
> [tool.skills.pdf]
> path = "github.com/anthropics/skills/skills/pdf"
> ```

**Legacy format** (still parsed, triggers deprecation warning):
```toml
[tool]
skills = [
  "github.com/anthropics/skills/skills/pdf",
  "github.com/SpillwaveSolutions/design-doc-mermaid",
  "github.com/mattpocock/skills/skills/engineering/to-prd",
]
```
## [combo.<name>] — Pipeline Orchestration (READ THIS)

> ⚠️ **Agent: when you encounter a deck, read its combo section.** Combo prompts are the orchestration playbook — step-by-step multi-skill pipeline instructions. They are not optional metadata. Skipping them means executing skills in isolation without the coordination logic.

Lightweight playbooks for the agent. NOT skill sections — each `[combo.<name>] prompt` gives the agent conditional routing logic. One deck can declare multiple combos.
```toml
[combo.promo]
prompt = """
Pipeline: Position → Draft → Review → Publish.
1. Start with positioning-basics to define ICP + differentiation.
2. Feed output to social-card-gen for platform variants.
3. Review with tweet-draft-reviewer. Polish with de-ai-ify + voice-extractor.
4. Publish via baoyu-post-to-x.
"""

[combo.research]
prompt = "Pipeline: Discover → Verify → Analyze. Use curator → find-skills → arena → deck."
```

### Real-World Combo Example — lythoskill's Own Deck

From [`skill-deck.toml`](../../skill-deck.toml) in the lythoskill repo itself:

```toml
# skills: scribe-weekly, cortex, git
[combo.weekly-retro]
prompt = """
Weekly synthesis with prep-before-write:
1. Gather: ls daily/ | tail -7, git log --since="7 days ago", cortex probe
2. Surface anomalies: superseded ADRs, CLI renames, missing ADRs
3. Simulated-annealing ranking: dump → cluster → rank by confusion cost → freeze top 2
4. Show prep report to user, confirm, then write weekly
5. ZK verify: spawn independent subagent to check weekly against git/cortex ground truth.
   ≥2 passes until <2 high-importance gaps.
Never write a weekly from memory. See AGENTS.md § Weekly synthesis.
"""

# skills: dreaming, cortex, scribe-weekly
[combo.dream-consolidate]
prompt = """
Project memory consolidation via dreaming skill:
1. Scan: start from weekly chain as pre-built index. Extract docs_now_stale across all weeklies.
2. Consolidate: write SSOT to cortex/wiki/04-ssot/ — one file per topic, current state only.
3. ZK Validate: spawn zero-knowledge subagent to read SSOT, self-report understanding.
   Revise misunderstood sections.
4. For critical docs: arena single --player kimi cross-model validation.
See packages/lythoskill-dreaming/skill/SKILL.md for full flow.
"""
```

These are real combos used to govern the lythoskill project itself. Notice: each combo defines a multi-step pipeline with specific tools, verification gates, and references to detailed docs. The agent reads the prompt and executes — no code, no state machine.
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
> **Modern format** (alias-as-key, preferred):
> ```toml
> [deck]
> working_set = ".claude/skills"
> cold_pool   = "~/.agents/skill-repos"
> max_cards   = 10
>
> [innate.skills.lythoskill-deck]
> path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
>
> [tool.skills.web-search]
> path = "github.com/someone/web-search"
> [tool.skills.design-doc-mermaid]
> path = "github.com/someone/design-doc-mermaid"
>
> [combo.report]
> prompt = "If generating a report: run deep-research first, then feed findings to docx for output."
>
> [transient.fix-encoding]
> path = ".claude/skills/_fix-encoding"
> expires = "2026-05-01"
> ```
>
> **Legacy format** (still parsed, triggers deprecation warning):
> ```toml
> [deck]
> working_set = ".claude/skills"
> cold_pool   = "~/.agents/skill-repos"
> max_cards   = 10
> [innate]
> skills = ["github.com/lythos-labs/lythoskill/skills/lythoskill-deck"]
> [tool]
> skills = [
>   "github.com/someone/web-search",  "github.com/someone/design-doc-mermaid",
> ]
> [combo.report]
> prompt = "If generating a report: run deep-research first, then feed findings to docx for output."
> [transient.fix-encoding]
> path = ".claude/skills/_fix-encoding"
> expires = "2026-05-01"
> ```
