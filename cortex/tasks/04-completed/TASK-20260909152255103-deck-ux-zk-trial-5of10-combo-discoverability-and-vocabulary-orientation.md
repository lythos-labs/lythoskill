# TASK-20260909152255103: deck UX: ZK trial 5/10 — combo discoverability and vocabulary orientation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-09 | Created from ZK trial of decks-local/gefei-seo.toml (5/10) |
| completed | 2026-09-09 | F1-F6 fixed; ZK re-trial 8/10 (≥7 gate passed); 4 residual items also fixed same-day |
| completed | 2026-09-09 | Closed via trailer |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Trial-usage protocol (AGENTS.md): a fresh ZK agent read the gefei-seo side deck in an
isolated arena workdir and rated intuitiveness **5/10** — the "what" is discoverable
quickly; the "how" stalls a first-timer repeatedly. Rating <7/10 → this card; UX fixes
must NOT be folded into other tasks.

Raw evidence: `/tmp/arena-gefei-read/self-report.md` + `decision-log.jsonl`
(/tmp is ephemeral — key findings transcribed below).

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->

Findings split into deck-tool-general (fix in tool/docs) vs deck-authoring
(guidance for deck writers):

**Tool-general (affects every deck):**
- [x] F1: arena `prepare-workdir` generated AGENTS.md never mentions the deck's
      `[combo.*]` sections — it points the agent at `ls .claude/skills/` with no map.
      The combo prompt is the best orientation artifact in the deck; the generated
      AGENTS.md should surface it (e.g. "Read [combo.x] in skill-deck.toml first").
- [x] F2: No consumer declaration for combos anywhere. ZK agent had to INFER the
      consumer is the agent, not a script. Deck schema/docs must state: combo prompts
      are read and executed by the agent; the CLI only parses them.
- [x] F3: Undefined vocabulary at every layer for first-timers: cold pool, working
      set, innate vs tool, max_cards. Deck glossary/orientation must gloss these
      (ties into the side-deck naming unification — see roadmap).

**Deck-authoring (guidance + gefei-seo deck fixes):**
- [x] F4: Header usage comment used the author's path (`--deck ./decks-local/...`)
      but in the arena workdir the deck lands as `skill-deck.toml` — path mismatch
      confused the reader. Header comments must work from inside the workdir.
- [x] F5: G1/G2/G3 label collision: new-word-hunter's human-approval gates vs
      gate-keeper's agent-executable interrogations share the same labels with no
      cross-reference. Rename or disambiguate in the combo prompt.
- [x] F6: Skill bodies reference `scripts/`/`references/` files without noting that
      SKILL.md is an entry point into a per-skill directory tree.
- [x] F7 (noted, accepted): heavy Chinese methodology slang (哥飞/出词/移仓/TDH/八维)
      is a barrier for external users — ACCEPTABLE for local-only decks (operator =
      author), must be considered for any deck intended for publishing.
      → 2026-09-09 update: ZK re-trial flagged domain vocab as a remaining stall,
      so a compact domain glossary was added to the deck header (TDH/打新词/出词/
      词族/移仓/八维). Deck stays local-only.

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- F1+F2 in arena `prepare-workdir` AGENTS.md template + deck parse/reference docs;
  check whether deck SKILL.md or a reference file is the right home for the combo
  consumer declaration (deck is the schema owner).
- F3: short glossary in generated AGENTS.md or a deck reference — do NOT bloat
  every deck; orientation belongs to the tool, not each toml.
- F4-F6: fix in decks-local/gefei-seo.toml (local file, no git impact).
- Re-run the same ZK trial as the acceptance gate; target ≥7/10.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] Generated workdir AGENTS.md surfaces combo sections (F1) and combo consumer is
      declared in deck docs (F2)
- [x] First-timer vocabulary (cold pool/working set/innate/tool/max_cards) glossed in
      exactly one tool-level place (F3)
- [x] gefei-seo.toml F4-F6 fixed in place
- [x] Re-run ZK trial with identical protocol: rating ≥7/10, decision-log shows no
      stall on combo discovery or vocabulary → **8/10 achieved** (2026-09-09,
      /tmp/arena-gefei-retrial/; 13 decisions, ~8 min cold start, no combo/vocab
      stall; 4 residual items fixed same day: humanizer dangling ref, header
      path ordering, domain glossary, async human-gate guidance)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-09: card created from ZK trial (5/10). Evidence: /tmp/arena-gefei-read/
  (ephemeral; findings transcribed above before /tmp clears).
- 2026-09-09: F1-F3 repo-side committed (26ddc401) — shared buildAgentsMd() +
  parseDeckCombos() in arena preflight; combo consumer declared in deck
  toml-format.md; glossary innate/tool rows. F4-F6 local-side (decks-local +
  7 localhost cold-pool skills).
- 2026-09-09: ZK re-trial 8/10 (gate ≥7/10 PASS). Residuals fixed: page-craft
  humanizer marked optional/out-of-deck; header reordered workdir-first; domain
  glossary block (TDH/打新词/出词/词族/移仓/八维) added; async human-gate
  protocol added to combo prompt. gefei keyword scoring card
  (TASK-20260909152355793) unblocked.

## Related Files
- Modified: packages/lythoskill-arena/src/preflight.ts (buildAgentsMd, parseDeckCombos), packages/lythoskill-arena/src/cli.ts, packages/lythoskill-arena/src/runner.ts, packages/lythoskill-arena/src/preflight.test.ts (+7 tests), packages/lythoskill-deck/skill/references/glossary.md, packages/lythoskill-deck/skill/references/toml-format.md
- Added: showcase/side-deck-dispatch/ (P0-4, separate commit)

## Git Commit Message
```
fix(deck/arena): ZK trial UX fixes — combo discoverability + vocabulary (TASK-20260909152255103)

- prepare-workdir AGENTS.md surfaces [combo.*] sections
- combo consumer declared in deck docs (agent reads, CLI only parses)
- gefei-seo.toml: path comment, G1-G3 disambiguation, dir-tree note
```

## Notes
