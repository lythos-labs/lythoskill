# TASK-20260909152355793: keyword research: product-first word discovery for lythoskill discovery assets

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-09 | Created — user-framed variant of Gefei methodology |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

User framing (2026-09-09, paraphrased): lythoskill's path is "build from own needs
FIRST, then find words" — this is a VARIANT of classic Gefei methodology (classic =
find keyword first, then build a site to capture it). The keyword-research goal is
NOT ad monetization; it is organic discovery (自来水): the project is not promoted,
but README + future site assets should be findable by potential users via search.

Therefore word discovery must be grounded in three inputs, in this order:
1. What THIS project actually does (the umbrella understanding — see session vision
   synthesis; layers: creator/deck/curator/arena/cortex/memory-family/sober/
   writer-coach/red-green-release)
2. The field's development state (world knowledge: agent CLI ecosystem, skill
   ecosystem evolution, MCP/skill registries, multi-agent harnesses)
3. Community consensus vocabulary — where the communities live and what discourse
   they use (the established terms like "fresh eyes review", "SOP", "agent skills"
   vs our first-principles internal naming)

Goal: a candidate word list bridging project concepts ↔ community vocabulary, scored
by the gefei-seo deck tools, feeding README + site (when the parked lythos-info GH
Pages quest lands).

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] Community map: where do agent-CLI / agent-skill practitioners gather (Reddit,
      HN, Discord, V2EX, 即刻, X), and what vocabulary do they use for the problems
      lythoskill solves (skill management, context loss, multi-agent coordination,
      agent memory)
- [ ] Candidate word list: each entry = project concept + community term(s) + intent
      guess + evidence URL. Both EN and ZH communities.
- [ ] Scoring pass: run candidates through new-word-hunter八维 + gtrends-anchor-calibrator
      (the deck scores; it does NOT generate — generation is the understanding work)
- [ ] Output: ranked shortlist with reasons, mapped to target asset (README section,
      site page, deck description) — ready for a future site build to consume
- [ ] Explicit note of the flow inversion vs classic Gefei: product-first, words
      follow — document so future sessions don't regress to keyword-first

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- Use decks-local/gefei-seo.toml as the scoring toolbox (ZK-trialed; UX fixes pending
  under TASK-20260909152255103 — scoring pass can start before those land)
- Community survey: web research with source attribution (no source → no rule);
  likely homes: r/ClaudeAI, r/LocalLLaMA, HN, agent-skills Discord, V2EX, 即刻
- Feed results into the wedge-path roadmap (TASK-20260909150851116) as the discovery
  input for its site/index layer

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] Community map covers ≥4 communities with quoted vocabulary + source URLs
- [ ] Candidate list ≥20 words across the umbrella's layers, each with concept mapping
- [ ] Scored shortlist (top ~8) with hunter/calibrator output attached as evidence
- [ ] Flow-inversion note recorded (daily + this card)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-09: card created. Context: user emphasized product-first variant; classic
  Gefei combo in decks-local/gefei-seo.toml remains the scoring layer.

## Related Files
- Modified:
- Added:

## Git Commit Message
```
docs(cortex): keyword research card — product-first word discovery (TASK-20260909152355793)

- Variant framing: build-first then words (inverse of classic Gefei)
- Community vocabulary mapping as the generation layer; deck tools score
- Feeds wedge-path roadmap discovery layer
```

## Notes
