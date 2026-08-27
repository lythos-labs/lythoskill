---
created: 2026-08-28
category: research
domain: retrospection
created_by: kimi-session (fallow-period rehabilitation session)
sources:
  - "cortex/wiki/02-research/2026-05-*.md (22 docs, extracted via 4 explore subagents)"
  - "cortex/wiki/03-lessons/2026-05-*.md (23 docs, same)"
  - "Web search reality-check, 2026-08-28 (skills ecosystem, agent CLI market, kimi-code migration, DeepSeek Harness)"
  - "git provenance (config.ts/wikiSubdirs drift, LobeHub recurrence check)"
zk_validated: false
status: draft
---

# Early Predictions vs August 2026 Reality — A 3-Month Retrospective Audit

> Question (user, 2026-08-28): which of the project's April–May research/lesson self-reflections resonated with how the world actually developed? Method: 4 ZK explore subagents extracted forward-looking external-world claims from 45 early docs; each claim checked against searchable August-2026 reality, this session's direct experience, or git history. This is a self-audit — hits and misses both recorded.

## Hits — early claims the world confirmed

| Early claim (date) | August 2026 reality |
|---|---|
| Skill bloat / context drowning is a durable, unsolved ecosystem problem (05-02, 05-03, 05-08) | Marketplace chaos is mainstream news: 341 malicious skills found on ClawHub by Feb 2026; supply-chain risk is now a published threat category (arXiv 2605.28588, "Exploring the Emerging Threats of the Agent Skill Ecosystem", May 2026) |
| Untrusted tool/CLI output is a prompt-injection vector once agents treat stdout as hypermedia (05-28, HATEOAS §5) | The same threat model now appears in academic and vendor security writing; skills.sh ships install-time scanning (Snyk/Gen). The "mandatory scanning by late 2026" sub-prediction is directionally right, formalization incomplete |
| Multi-agent fragmentation persists; 2–3 tools per dev is the norm (05-08, 05-28) | JetBrains Aug 2026: Claude Code ~39% pro usage (up from 18% in Jan), Codex rising, poly-agent normal; 2026 described as "the year the CLI became the center of gravity" |
| Two path conventions (`.claude/skills/` + `.agents/skills/`) cover the ecosystem; no third path will matter (05-28) | The Agent Skills format is now read by ~16 agents across vendors; `.agents/skills/` is the community-standard path. No third convention emerged |
| Skill format standardization will come (05-08, ASFS/IETF expectation) | **Outcome hit, mechanism miss**: standardization arrived via vendor de-facto (Anthropic's agentskills.io open standard, Microsoft/OpenAI adopting within days), not IETF process |
| Skills port across model vendors, even procedural/methodology skills (05-20, cross-model head-skill test) | The 16-agent standard adoption confirms format-level portability; this session is living proof — a Kimi agent productively executed a Claude-era project's full workflow (onboarding → fixes → ADRs) from docs alone |
| Text-only governance fails; rules get quoted but not followed — guardrails must be mechanical (05-13, sunk-cost lesson) | The field converged on hooks/permissions/CI gates; internally the molting epic (EPIC-20260717161516583) proved the same with 30-blind-subject A/B evidence |
| "Three months from now another agent will re-propose wrapping LobeHub/feed adapters" (05-08, falsifiable recurrence prediction) | **Did not recur.** git log 05-08→08-28 shows zero feed-adapter re-proposals. The lesson + ADR inoculated the project — evidence that documented rejected-alternatives actually work |
| "CW restricted ≠ agent restricted" — filesystem offloading beats window size (05-17) | The 1M-context era (K3) arrived and context discipline still matters — the molting epic's existence proves harness text must shrink as windows grow, the opposite of "bigger window solves it" |
| Agent-as-consumer interface design will become a real topic (05-28, Goldilocks consumer) | The discourse arrived in 2026 (Stripe's agent DX posts, Datadog golden-paths-for-agents, dual-consumer CLI error writing) — but as content guidance, not systematic engineering. The niche remains open |

## Misses — early claims that aged poorly

| Early claim (date) | What happened |
|---|---|
| agentskills.io "may still be in early conceptual stages, no spec found" (05-08) | The standard had launched **December 2025** — five months before that sentence was written. A research-quality miss. Mitigating detail: the project's own research-quality-audit (05-07) had already flagged that ecosystem report as unreliable — the skepticism layer worked even when the research layer failed |
| DeepSeek-TUI scored 8.7 as "current best programmatic choice" (05-06) | The community project was eclipsed by the official DeepSeek Harness plugin kernel (Aug 2026). Lesson already generalized into ADR-20260828004129233: adapters over churning upstreams need version ranges and aliases |
| kimi CLI as a durable default player (implicit across arena design) | kimi-cli (Python) is winding down in favor of kimi-code (Node rewrite) — motivates ADR-20260828004129143 (host-agent handoff) |
| MCP "90% enterprise adoption / 25,000 servers by April 2027", Gartner "40% agentic projects canceled by 2027" (05-07 ecosystem report) | Unverifiable or still pending — these came from the same report the 05-07 audit flagged. Listed as unresolved, not scored |

## Meta-observations

1. **The skepticism layer aged best.** The single most valuable early doc in hindsight is the research-quality-audit (05-07) that distrusted the glossy ecosystem report. Prediction accuracy was mixed; *epistemic hygiene* about predictions was consistently right.
2. **Internal behavioral lessons are timeless, external market claims are time-stamped.** Sunk-cost fallacy, excessive self-questioning, `|| true` swallowing — these describe agent nature and don't expire. Market-share numbers and tool scores expire in weeks. The wiki holds both; readers should weight accordingly.
3. **Falsifiable in-repo predictions are the strongest kind.** The LobeHub recurrence prediction could be checked with one `git log` — and its non-recurrence is positive evidence the memory system works, not just the absence of a problem.
4. **Why site and wiki are separate (user, 2026-08-28).** The wiki is working memory with full honesty: raw numbers, dead ends, retracted experiments ("v1 shed verdicts withdrawn as UNTESTED"). The site is the curated narrative layer. A public page cannot carry "we were wrong here, twice" at wiki density without destroying its narrative function — and the wiki cannot serve as an on-ramp. Same territory, two maps at different zoom levels.
5. **Git granularity as retrospection substrate (user, 2026-08-28).** The timestamp-ID + small-commit discipline made this audit cheap: the 04-legacy/04-ssot question resolved in three git commands (04-legacy never held a file; 04-ssot was born with the dreaming epic, af585375 — user-confirmed). The archaeology tooling is the history.

## Open threads this audit surfaced

- TASK-20260828011012367 (wikiSubdirs config drift) — the SSOT layer was invisible in the generated INDEX; found via this retrospection.
- ADR-20260828004129143 / ADR-20260828004129233 — the two biggest "misses" (kimi, deepseek-tui) are the same structural class and already have policy proposals pending user acceptance.

## User commentary thread — skill 相性 (compatibility) as a testable property (2026-08-28)

Context: the community swarms between skill sources (superpowers → mattpocock's skills — the project's earliest arena test case). Seller-show (卖家秀, L1 description) vs buyer-show (买家秀, L3 your own results): users can't know fit without wearing the shoe, and manually swapping skills one by one is tiring. User's three hypotheses:

- **H1 — single-source decks dominate.** Except for skills from one family/vendor, compatibility (相性) is unknown until tested — so most users likely run single-source setups and rarely mix. Falsifiable: survey decks/shared setups in the wild for multi-source mixing rates.
- **H2 — 相性 is measurable before expensive testing.** A cheap probe: a ZK agent self-assesses "do I understand how to use this skill?" (readability/executability) before any arena run spends quota. Skill-skill conflicts (two skills both claiming test-writing) are a second axis. This is a new method candidate for the standalone ZK skill (ADR-20260828005453077).
- **H3 — deck one-click swap is the answer to try-on fatigue.** The marketplace unit is single-skill install; the deck unit is atomic whole-wardrobe swap. Arena-as-TCG-test-play: decks are decks, sideboards are side decks, and arena matches are test plays before the real tournament (adopting into the main deck).

- **H4 — skill text optimization is card design.** Wording is the skill's stats line: optimizing it lifts the whole deck's performance. Corollary (user): jargon/黑话 that past agents flagged as a smell is, at this layer, compression — it pays off for readers who understand the layer. Skill authors are card designers, not manual writers.
- **H5 — three absorption fates for skills.** A skill ends up one of three ways: (a) eaten by model capability gains (what needed a skill becomes native behavior — cf. the molting epic shedding harness text as models improved); (b) adopted as a single-vendor family; (c) surviving as a task-specific functional vertical (PPT-type skills). A global mixed bag with guaranteed effect is rare — this was deny-by-default's original motivation.
- **H6 — attention economics is the mechanism.** Trying no-name composite skills one by one costs attention; most users won't pay it, so brand/family reputation (L2) becomes the default filter. Consistent with the three-layer trust model — L1 claims, L2 brand, L3 own results — and explains why L2 dominates in practice even though L3 is the only fully trustworthy layer. The project's answer is not "trust L2 less" but "make L3 cheap" (arena + ZK probes lower the cost of generating your own evidence).
- **H7 — MCP's decline was priced in (user, 2026-08-28).** The project bet on skills over MCP from the start: MCP is not excluded, but fits only specialized cases — for most purposes it loses to REST API + CLI / generic fetch + docs. Skill-text (markdown the model reads) rides model improvement for free; protocol integration must be maintained per-vendor. This is the same bet as H5(a): whatever can be absorbed by the model, will be. User's refinement of which MCP servers survive: the ones with **real-time/duplex needs plus a private data source** — structurally the same niche as the old "enterprise API integration" business.
- **H8 — don't bind to the hot project of the moment (user, 2026-08-28).** A specific hyped tool (e.g. a TUI that was hot in May) has an unknowable lifespan; the project's temperament is to never hard-bind to one. Adapters withering naturally is *healthy* — the layer is designed to be disposable, and the replacement (kimi-code, dsh) slots in. This is the philosophical root of ADR-20260828004129233's alias/version-range policy: the adapter layer absorbs churn so the deck layer never notices.

These connect: if H1 is true, the ecosystem's real unit of adoption is the deck, not the skill — which is the project's founding bet restated as an empirical claim.
