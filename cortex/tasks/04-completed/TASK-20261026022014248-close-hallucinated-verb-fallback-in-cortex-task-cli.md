# TASK-20261026022014248: Close hallucinated-verb fallback in cortex task CLI

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-25 | Created |
| in-progress | 2026-10-25 | Started |
| review | 2026-10-30 | Deliverables committed |
| completed | 2026-10-30 | Done |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

External adopters have reported this repeatedly: an agent invents a task verb
(`task close`, `task finish`, `task update`, …), the bare-title fallback in
`cortex task` treats the unknown word as a **title**, and the CLI prints `✅`.
The agent concludes the transition succeeded; the repo gets a new empty-shell
card in `01-backlog/` instead. The failure is silent in the worst way — a
success line plus a file that looks like work was recorded.

`ADR-20260607233903985` chose compatibility mode (Option C): support
`task "<title>"` and `task create "<title>"`, with the bare form marked legacy
and a planned migration to the explicit form. This card completes that
migration by removing the bare form, because the legacy form is the mechanism
that converts an unknown verb into a card.

Goal: an unrecognized `cortex task <word>` **creates nothing and exits
non-zero**, and `cortex task create "<title>"` is the only creation entry point.

**Scope expanded 2026-10-26** (user instruction: "也推到 epic，adr wiki 等等"):
the same fallback exists in `epic`, `adr` and `wiki` — every document-creating
command used "anything that is not a known verb is a title". The rule now applies
to all four: `cortex {task,epic,adr,wiki} create "<title>"` is the only creation
form, and an unknown subcommand exits non-zero with no file written.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] `cortex {task,epic,adr,wiki} create "<title>"` is the only creation form for each document kind.
- [x] A bare title — `cortex {task,epic,adr,wiki} "<title>"` — exits non-zero, creates no file, and names the supported forms.
- [x] Any unrecognized subcommand (hallucinated verb, typo, leading-dash flag) exits non-zero with a HATEOAS-style error; never falls through to creation.
- [x] `create` with no title exits non-zero (today `task create` creates a card titled "create").
- [x] `cortex task TASK-<id>` (verb omitted) exits non-zero with a missing-verb hint; it must not create a card.
- [x] Present-tense docs and the CLI help show the `create` form only; generated `skills/` copies are rebuilt, never hand-edited.
- [x] Regression coverage lives in the CLI-integration BDD harness (runs in CI).

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe.

     ⚠️ A DECISION DOES NOT BELONG IN THIS SECTION. If this card introduces or
     changes an abstraction, a module boundary, a package boundary, a named
     concept, or a closed data set — that is an architectural decision, and it
     must be recorded in an ADR. This section may only REFERENCE that ADR; it
     must never be the only record. A one-line statement of intent gives a
     reviewer nothing to object to: no options to reject, no rejected
     alternative to question. Two same-shape incidents (feed-adapters.ts 2026-05,
     adapter-registry.ts 2026-09) both rode in exactly this section.

     Prepare it first, in full:  bunx @lythos/project-cortex adr create "<decision-title>"
     Criteria (hit >= 2 of C1-C6): AGENTS.md § Decision Records -->

**Decision carrier.** `ADR-20261026022854612` — *Document creation requires an
explicit create verb*. The decision covers all four document commands
(`task` / `epic` / `adr` / `wiki`), so it is a closed set of commands + an
interface rule, not a task-local implementation choice; it fires C5 (rejected
alternatives: compat-with-warning, heuristic detection, task-only scope) and C6
(≥2 reviewers asked "what about epic/adr/wiki?"). `ADR-20260607233903985` is
the earlier Option C (compat mode) decision that this ADR completes by removing
the compatibility form; its body stays untouched and it got a Status History
note.

**Changes:**

1. `packages/lythoskill-project-cortex/src/cli.ts` — restructure each
   document-creating branch into an explicit, total decision list:
   - task: no arg → usage error; `list` → list; `create` → require a title,
     then `createTask`; known verb → `requireDocId` + transition;
     otherwise → **unknown-subcommand error and `exit(1)`**.
   - epic / adr / wiki: `create` → require a title; known lifecycle verbs keep
     their behaviour; otherwise → unknown-subcommand error.
   A `TASK-*` argument gets a dedicated missing-verb hint.
2. Shared `requireCreateTitle()` helper: `create` with no title, or with a
   flag-shaped argument, exits non-zero instead of creating a card titled
   `create`.
3. `cli.ts` help text: every example now shows `create`.
4. BDD scenarios under `packages/lythoskill-project-cortex/test/scenarios/`
   (17 new): unknown verb / bare title / `create` without title per command,
   plus the verb-omitted ID hint — each negative asserts non-zero exit **and**
   that no file appeared; each positive asserts a file was created.
5. Docs sweep (present-tense carriers only): `AGENTS.md`, cortex skill
   `SKILL.md` + references, SSOT onboarding guides + conventions, package
   README, `templates/{AGENTS.md,task.md}`, `examples/`, and the CLI's own
   printed hints (`commands/task.ts`, `hooks/pre-commit.ts`). Point-in-time
   records (accepted ADRs, completed cards, dailies) are not rewritten; the
   old ADR gets only a status note.
6. Rebuild the `skills/` copies with `@lythos/skill-creator build`.

**Rejected alternatives** (full analysis in the ADR):

- *Keep the bare form and print a deprecation warning.* Rejected: by the time
  the warning prints, the card already exists; the agent's success path is
  unchanged, and the reported failure is precisely that the agent does not
  treat stderr as failure.
- *Detect "implausible" verbs heuristically.* Rejected: hallucinated verbs are
  open-vocabulary; a heuristic is not a spec, and it would still let real typos
  through while rejecting legitimate titles.
- *Fix `task` only and leave `epic`/`adr`/`wiki` alone.* Rejected on the user's
  instruction ("也推到 epic, adr wiki 等等") and on merit: the four commands
  share one dispatch shape, so a rule that holds for one of them is not a rule.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] **AC1** An unknown verb creates nothing and exits non-zero.
  → Verify: `cortex task strat TASK-20260101000000000; echo $?` → non-zero; `git status --short` → empty; stderr names the supported verbs.
- [x] **AC2** A bare title creates nothing and exits non-zero — for all four commands.
  → Verify: `cortex {task,epic,adr,wiki} "Fix login bug"; echo $?` → non-zero each; no new file under `cortex/tasks|epics|adr|wiki/*/`.
- [x] **AC3** `cortex <cmd> create` without a title (or with a flag-shaped one) exits non-zero and creates nothing.
  → Verify: same as AC2 with `... create`.
- [x] **AC4** A task ID without a verb exits non-zero with the missing-verb hint.
  → Verify: `cortex task TASK-20260101000000000` → non-zero, stderr contains `verb`.
- [x] **AC5** Unknown subcommands are rejected for `epic`, `adr` and `wiki` too.
  → Verify: `cortex {epic,adr,wiki} strat` → non-zero, stderr contains `Unknown … subcommand`, no file written.
- [x] **AC6** The explicit form still works everywhere.
  → Verify: `cortex {task,epic,adr,wiki} create "<title>"` → exit 0, file in the correct status directory; new BDD scenarios pass; `bun test packages/lythoskill-project-cortex/src` green.
- [x] **AC7** No present-tense carrier still documents the bare form.
  → Verify: `grep -rnE "cortex (task|epic|adr|wiki) \"[a-z]" AGENTS.md templates/ examples/ \
    packages/*/skill/ packages/*/src/ packages/*/templates/ skills/ cortex/wiki/04-ssot/` → only
  the negative BDD scenarios (which quote the removed form on purpose) and point-in-time records.
- [x] **AC8** Full local gate green.
  → Verify: `bun scripts/ci-gate.ts` → all steps pass.
- AC8 ticked 2026-10-30 by the takeover session: `bun scripts/ci-gate.ts` → **all 7 steps green** (incl. "skill artifacts in sync"), run after the generated `skills/` files and cortex-source commits landed.

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-10-26 — Implemented the dispatch change in `cli.ts` (create requires a
  title; unknown subcommand / bare title / verb-omitted ID all exit non-zero
  and write nothing). Added 5 BDD scenarios. Mutation-pinned: with `cli.ts`
  reverted via `git stash`, the 4 failure scenarios go red and the positive
  scenario stays green (`16/20`, reds exactly the four new assertions).
- 2026-10-26 — Docs sweep in present-tense carriers: `AGENTS.md`,
  `packages/lythoskill-project-cortex/{README.md,skill/SKILL.md,skill/references/*}`,
  `cortex/wiki/04-ssot/{conventions,agent-onboarding-guide,agent-onboarding-guide.zh,2026-10-23-ssot-vs-copy...}`.
  `skills/` regenerated via `skill-creator build lythoskill-project-cortex`.
  Point-in-time records left alone (the dated porting-guide pattern, dailies,
  completed cards); `ADR-20260607233903985` got a Status History note only.
- 2026-10-26 — BDD suite: 20/20. `SCENARIOS.md` index corrected 13 → 20
  scenarios and the two unindexed Status-History rows added; one broken link
  (`epic-resume-moves-active.md`, which does not exist → the real
  `epic-resume-moves-suspended.md`) fixed on encounter.
- 2026-10-26 — Scope expanded on user instruction ("也推到 epic, adr wiki 等等").
  Applied the same total decision list to `epic`, `adr` and `wiki` in
  `cli.ts`; added the shared `requireCreateTitle()` helper (covers `create`
  with no title, which used to produce a card titled `create`); epic flags are
  now parsed from `restArgs.slice(1)` instead of `allFlags.slice(1)`; ADR wiki
  error/usage strings updated to the `create` form. 6 more BDD scenarios
  (unknown verb + explicit-create per command; wiki `create --category`
  included) → 26/26. Mutation-pinned by stashing `cli.ts` + `wiki.ts`:
  the failure scenarios go red, the positive ones stay green.
- 2026-10-26 — Authored and accepted `ADR-20261026022854612` (the decision
  covers four commands, so it is not task-local). Rejected alternatives
  recorded there: compat + deprecation warning, heuristic verb detection,
  task-only scope. `ADR-20260607233903985` carries a Status History note
  pointing here; its body is untouched.
- 2026-10-26 — Docs sweep extended to the epic/adr/wiki examples
  (`AGENTS.md`, package README, SKILL.md, references, SSOT guides);
  `skills/` rebuilt. Historical carriers (dated porting guide, dailies,
  completed cards, accepted ADR bodies) deliberately untouched.
- 2026-10-26 — ZK review (independent reviewer, `NEEDS-CHANGES`) found the fix
  was correct but the surrounding carriers still told agents to run the removed
  form. Fixed: `src/commands/task.ts:34` and `templates/task.md:30` (the ADR
  hint printed on every `task create` and baked into every new card),
  `src/hooks/pre-commit.ts` (two `epic "..."` tips), `templates/AGENTS.md`
  (adopter-facing command table), `examples/decks/qa-sweep-COMBO.md`, plus the
  two live cards that quoted the old form. Each was a live instruction to run a
  command that now exits 1 — the same failure class in a different carrier.
- 2026-10-26 — Closed the review's coverage gap: 6 more scenarios (bare title +
  `create` without title, per `epic`/`adr`/`wiki`) → 32/32, matching
  Requirements line for line. `SCENARIOS.md` table re-sorted (26 → 32 rows) and
  its totals line corrected.
- 2026-10-26 — Found on encounter: the CLI still advertised a `faq` wiki
  category that `createWiki` rejects and `config.wikiSubdirs` does not have —
  retired 2026-09-09 per the config comment. Removed from `cli.ts`'s help and
  usage strings **and** from `skill/SKILL.md` + the package README (the first
  pass missed both, which the second review caught: they are agent-facing
  carriers, and `--category faq` exits 1). `command-output.md`'s sample `stats`
  output also showed a `Faq` row that `stats` never prints. All four were false
  present-tense claims adjacent to the code being edited.
- 2026-10-26 — Found on encounter, filed as `TASK-20261026023249282`:
  `bun run test:bdd` loads **zero** deck scenarios (`test/runner.ts:403` reads
  `test/scenarios/`, which holds only directories; the 20 `.ts` scenarios are
  in `test/integration-scenarios/`) and exits 0. Not fixed here — fixing it may
  expose red scenarios that need their own triage, and this change should not
  carry an unverified suite. `SCENARIOS.md` now marks the deck half as
  declared-but-not-loaded.
- 2026-10-26 — Second review round (fresh zero-context reviewer, frozen tree)
  found the flag-shaped-title guard unpinned: deleting `title.startsWith('-')`
  left all 32 scenarios green. Pinned with `task-create-flag-title-rejected.md`
  (mutation: 31/33, reds = that scenario + one more, see next entry). It also
  caught that `epic-create-requires-title.md` never tested "no title": the BDD
  runner appends `--skip-checklist "<reason>"` to every `epic` command, so
  `create` always saw a flag in title position — the scenario was green for the
  wrong reason. Replaced with `epic-create-flag-title-rejected.md`, whose
  description states the harness constraint; the "empty argument list" half
  stays pinned by task/adr/wiki, which receive no injected flags. ADR count
  corrected 11 → 17 scenarios; the old ADR's status note now names
  `ADR-20261026022854612` as well as this card.
- 2026-10-26 — Stale-form sweep extended past the originally chosen paths: the
  `01-patterns` porting guide (still "实践中", not archived) instructed
  `task "…"` / `epic "…"` / `adr "…"`; corrected to the `create` forms.
  `drafts/AGENTS-v{2,3}-draft.md` still quote the old form and are left alone —
  drafts are explicitly non-canonical.

## Related Files
- Modified: `packages/lythoskill-project-cortex/src/cli.ts`;
  `packages/lythoskill-project-cortex/src/commands/wiki.ts` (usage strings);
  `AGENTS.md`; `packages/lythoskill-project-cortex/README.md`;
  `packages/lythoskill-project-cortex/skill/SKILL.md`;
  `packages/lythoskill-project-cortex/skill/references/{command-output,example-workflow,zk-review,template-guide}.md`;
  `cortex/wiki/04-ssot/conventions.md`;
  `cortex/wiki/04-ssot/agent-onboarding-guide.md`;
  `cortex/wiki/04-ssot/agent-onboarding-guide.zh.md`;
  `cortex/wiki/04-ssot/2026-10-23-ssot-vs-copy-dynamic-views-are-queries-templates-have-one-carrier.md`;
  `cortex/adr/02-accepted/ADR-20260607233903985-cli-task-command-subcommand-inconsistency-between-create-and-state-transitions.md` (status note only);
  `packages/lythoskill-project-cortex/test/scenarios/lane-{main-rejected,override-accepted}.md`;
  `packages/lythoskill-project-cortex/templates/task.md`;
  `packages/lythoskill-project-cortex/src/commands/task.ts`;
  `packages/lythoskill-project-cortex/src/hooks/pre-commit.ts`;
  `templates/AGENTS.md`; `examples/decks/qa-sweep-COMBO.md`;
  `cortex/tasks/05-suspended/TASK-20260828141622502-...md` (one stale hint);
  `packages/lythoskill-test-utils/SCENARIOS.md`; `skills/` (build)
- Added: `cortex/adr/02-accepted/ADR-20261026022854612-document-creation-requires-an-explicit-create-verb.md`;
  `cortex/tasks/01-backlog/TASK-20261026023249282-...md` (finding, not fixed here);
  17 scenarios under `packages/lythoskill-project-cortex/test/scenarios/`

## Git Commit Message
```
fix(cortex): document creation requires an explicit create verb (TASK-20261026022014248)

- `{task,epic,adr,wiki} create "<title>"` is the only creation form; the
  bare-title fallback turned a hallucinated verb into an empty-shell card
  while printing ✅
- unknown subcommands, bare titles, and `create` without a title exit
  non-zero and write nothing; verb-omitted TASK-ID gets a missing-verb hint
- completes the Option C -> B migration in ADR-20260607233903985
- decision recorded in ADR-20261026022854612 (four commands, one grammar)
- 17 BDD scenarios pin exit status and "no file created"; docs, printed hints,
  templates and skills/ swept so no carrier instructs the removed form
```

## Notes
