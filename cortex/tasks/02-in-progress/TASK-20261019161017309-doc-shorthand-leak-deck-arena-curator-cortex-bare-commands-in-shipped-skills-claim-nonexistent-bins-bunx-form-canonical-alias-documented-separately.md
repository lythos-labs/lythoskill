# TASK-20261019161017309: doc shorthand leak — deck/arena/curator/cortex bare commands in shipped skills claim nonexistent bins; bunx form canonical, alias documented separately

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-19 | Created — owner report |
| in-progress | 2026-10-19 | Started |

## Background & Goals
Owner report (2026-10-19): shipped skill docs present `deck link`, `arena
single`, `curator scan` etc. as commands, but the bare names are NOT
registered bins. Verified: all four package.json `bin` fields register
`lythoskill-deck` / `lythoskill-arena` / `lythoskill-curator` /
`lythoskill-project-cortex`; the bare names exist only as an in-repo alias
convention (AGENTS.md shorthand table). External readers try `deck link` and
hit `command not found`. Owner's rule: the `bunx @lythos/…` form is canonical;
aliases/registrations, where they exist, get documented separately (另册).

Same positioning family as ADR-20261019125409359 / the sweep card
(TASK-20261019131118492), applied to command names.

## Requirements
- [x] Verified bin reality: bare `deck`/`arena`/`curator`/`cortex` exist nowhere as registered bins (only `lythoskill-*`); CLI `--help` Usage lines already use the registered name — no CLI-output fix needed
- [x] Invocation legend (shorthand → `bunx @lythos/<pkg>@<version>` + "bare name = in-repo alias, not a registered bin") added near the top of: deck, arena, curator, dreaming, sober SKILL.md sources
- [x] deck SKILL.md phase-switch code block expanded to full `bunx @lythos/skill-deck@{{PACKAGE_VERSION}} link …` form (primary copy-paste hotspot)
- [x] Build sync: 5 built skills re-rendered
- Explicit non-goals (accepted residue, recorded): body-prose shorthand mentions under a defined legend (standard CLI-doc convention: define once, use short after); cortex SKILL.md already uses full bunx form in every command example (the model, no change); scribe/onboarding-references single prose mentions; AGENTS.md in-repo shorthand table (correctly scoped to this repo)

## Technical Approach
No ADR (0–1 C-criteria: docs convention applying the existing positioning
principle). Legend text kept identical in spirit across files; `{{PACKAGE_VERSION}}`
placeholder preserved in source so renders stay pinned.

## Acceptance Criteria
- [x] Each of the 5 shipped SKILL.md files contains the Invocation legend → Verify: `grep -c "Invocation" skills/<name>/SKILL.md` = 1 each
- [x] `grep -rn "bunx @lythos/skill-deck@" skills/lythoskill-deck/SKILL.md` shows the phase block in full form
- [x] No registered-name regression: `bun packages/lythoskill-deck/src/cli.ts --help` Usage still reads `lythoskill-deck …`
- [x] Test gate green; skills sync tripwire clean (pre-commit auto-check)
- [ ] Owner spot-check of one built SKILL.md (deck) — reading experience for an outsider

## Progress Log
- 2026-10-19: Surfaced by owner ("简写了 deck link,会导致外部认为有这个 bin,其实不是"). Baseline: 121 shorthand mentions in skills/, 113 in packages skill sources — full mechanical replacement rejected (noise + most mentions are prose under a now-defined legend).

## Related Files
- Modified: packages/{lythoskill-deck,lythoskill-arena,lythoskill-curator,lythoskill-dreaming,lythoskill-sober}/skill/SKILL.md (+ built copies)
- Added: —

## Git Commit Message
```
docs(skills): Invocation legends — shorthand is in-repo alias, bunx form canonical (TASK-20261019161017309)
```
