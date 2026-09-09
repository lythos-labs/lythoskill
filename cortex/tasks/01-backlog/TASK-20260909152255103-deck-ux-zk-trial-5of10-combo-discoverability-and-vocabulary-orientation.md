# TASK-20260909152255103: deck UX: ZK trial 5/10 — combo discoverability and vocabulary orientation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-09 | Created from ZK trial of decks-local/gefei-seo.toml (5/10) |

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
- [ ] F1: arena `prepare-workdir` generated AGENTS.md never mentions the deck's
      `[combo.*]` sections — it points the agent at `ls .claude/skills/` with no map.
      The combo prompt is the best orientation artifact in the deck; the generated
      AGENTS.md should surface it (e.g. "Read [combo.x] in skill-deck.toml first").
- [ ] F2: No consumer declaration for combos anywhere. ZK agent had to INFER the
      consumer is the agent, not a script. Deck schema/docs must state: combo prompts
      are read and executed by the agent; the CLI only parses them.
- [ ] F3: Undefined vocabulary at every layer for first-timers: cold pool, working
      set, innate vs tool, max_cards. Deck glossary/orientation must gloss these
      (ties into the side-deck naming unification — see roadmap).

**Deck-authoring (guidance + gefei-seo deck fixes):**
- [ ] F4: Header usage comment used the author's path (`--deck ./decks-local/...`)
      but in the arena workdir the deck lands as `skill-deck.toml` — path mismatch
      confused the reader. Header comments must work from inside the workdir.
- [ ] F5: G1/G2/G3 label collision: new-word-hunter's human-approval gates vs
      gate-keeper's agent-executable interrogations share the same labels with no
      cross-reference. Rename or disambiguate in the combo prompt.
- [ ] F6: Skill bodies reference `scripts/`/`references/` files without noting that
      SKILL.md is an entry point into a per-skill directory tree.
- [ ] F7 (noted, accepted): heavy Chinese methodology slang (哥飞/出词/移仓/TDH/八维)
      is a barrier for external users — ACCEPTABLE for local-only decks (operator =
      author), must be considered for any deck intended for publishing.

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
- [ ] Generated workdir AGENTS.md surfaces combo sections (F1) and combo consumer is
      declared in deck docs (F2)
- [ ] First-timer vocabulary (cold pool/working set/innate/tool/max_cards) glossed in
      exactly one tool-level place (F3)
- [ ] gefei-seo.toml F4-F6 fixed in place
- [ ] Re-run ZK trial with identical protocol: rating ≥7/10, decision-log shows no
      stall on combo discovery or vocabulary

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-09-09: card created from ZK trial (5/10). Evidence: /tmp/arena-gefei-read/
  (ephemeral; findings transcribed above before /tmp clears).

## Related Files
- Modified:
- Added:

## Git Commit Message
```
fix(deck/arena): ZK trial UX fixes — combo discoverability + vocabulary (TASK-20260909152255103)

- prepare-workdir AGENTS.md surfaces [combo.*] sections
- combo consumer declared in deck docs (agent reads, CLI only parses)
- gefei-seo.toml: path comment, G1-G3 disambiguation, dir-tree note
```

## Notes
