---
supersedes: []
superseded_by: null
# 下面两项是与 task / epic 的机器可读关联(与 ## Related 段同一件事的两份)
epic: null
tasks: [TASK-20261026022014248]
---

# ADR-20261026022854612: Document creation requires an explicit create verb

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-10-25 | Created |
| accepted | 2026-10-25 | Accepted |

## Background

Every document-creating command in the cortex CLI shared one dispatch shape:

```ts
if (arg === 'create' && rest[0]) title = rest[0];
else if (arg) title = arg;            // ← anything not a known verb is a title
```

For `task`, `epic`, `adr` and `wiki` alike, an argument that did not match a
known subcommand fell through to *creation*. External adopters reported the
consequence repeatedly for `cortex task`: an agent invents a verb (`task close`,
`task finish`, `task update`), the CLI treats the word as a title, prints `✅`,
and writes a card whose body is an untouched template. The agent's own success
signal (exit 0 + a `✅` line) says the transition worked. The repo now contains
an empty-shell card, and nothing anywhere reports a failure.

`ADR-20260607233903985` saw the same asymmetry (`task start/review/done` are
subcommands, `task "<title>"` was not) and chose Option C — support both
`task "<title>"` and `task create "<title>"`, mark the former legacy, migrate to
the explicit form "after v1.0". Option C fixed the *documentation* asymmetry but
kept the *fallback*: the legacy form is precisely the branch that converts an
unknown word into a card. The migration was deferred, so adopters kept hitting
the hole. The same fallback existed, unreported, in `epic`, `adr` and `wiki`.

## Decision Drivers

1. **The failure is silent in the worst shape.** Exit 0, a `✅` line, and a
   plausible-looking file. An adopter cannot distinguish "worked" from "wrote an
   empty shell" without opening the card. Error handling here is agent-facing:
   the only consumer who can recover is the agent that just ran the command, and
   it will only recover if the command *fails*.
2. **Agents read SKILL.md, not `--help`.** A deprecation warning on stderr is
   not a control surface for the caller that caused the problem.
3. **One rule, four commands.** Fixing `task` alone leaves `epic create`,
   `adr create` and `wiki create` with the identical hole one keystroke away.
   A rule that holds for one command and not its siblings is not a rule.
4. **Hallucinated verbs are open-vocabulary.** Any detection scheme short of an
   explicit grammar is a heuristic, and a heuristic is not a spec.
5. **Migration cost is lowest now.** The CLI is pre-1.0 (0.21.0); the legacy
   form was already documented as legacy.

## Options

### Option A — Keep the bare form, add a deprecation warning
**Pros**:
- No breaking change; existing scripts keep working.
- Trivial to implement.

**Cons**:
- The card is created *before* the warning prints, so the reported failure
  (empty shell + agent believes it succeeded) is unchanged.
- Requires the agent to parse stderr as failure — exactly the behaviour that was
  observed not to happen.
- Leaves four commands with four separate warnings to eventually remove.

### Option B — `create` is the only creation form; unknown subcommand fails
**Pros**:
- The dispatch list becomes total: `list` / `create` / known verb / **error**.
  No argument can reach creation by falling through.
- Failure is discoverable by the caller: non-zero exit, nothing written, and an
  error that names the supported forms (HATEOAS-style — the next command is in
  the message).
- One rule for `task`, `epic`, `adr`, `wiki`; the docs and SKILL.md show one
  creation form.
- Pinnable by CLI-integration BDD: assert exit status **and** that no file
  appeared.

**Cons**:
- Breaking change for any adopter scripting `cortex task "<title>"` (pre-1.0).
- Must sweep every present-tense carrier (AGENTS.md, SKILL.md + references,
  onboarding guides, conventions, package README) and rebuild `skills/`.

### Option C — Reject "implausible" verbs heuristically
**Pros**:
- Keeps the bare form for genuine titles while blocking the reported cases.

**Cons**:
- Hallucinated verbs are open-vocabulary: `close`, `finish` and `update` are
  plausible English, and so are real one-word titles ("Refactor").
- A heuristic is not a spec — its failure modes are undocumented and
  unarguable, and every miss is another silent empty shell.
- Still needs an explicit create form anyway, so it adds a branch instead of
  removing one.

### Option D — Remove the bare form from `task` only
**Pros**:
- Smallest possible diff; addresses the only command adopters reported.

**Cons**:
- `epic`, `adr` and `wiki` keep the identical hole, so the next adopter report
  reopens the same decision with the same options.
- Produces an interface where identical operations have different grammars.

## Decision

**Choice**: Option B, for all four document kinds.

`cortex {task,epic,adr,wiki} create "<title>"` is the only creation form.
Everything else in the first positional slot must be a *recognised* subcommand:

- Task: `list`, `create`, `start`/`review`/`done`/`complete`/`suspend`/
  `resume`/`reject`/`terminate`/`archive` (transitions require an id).
- Epic: `create` plus its lifecycle verbs; ADR: `create` plus accept/reject/
  supersede; Wiki: `create` only.

An unrecognised word exits non-zero, writes nothing, and names the supported
subcommands. `create` with a missing or flag-shaped title exits non-zero — today
`task create` produces a card titled "create". A `TASK-*` id in the verb slot
gets a dedicated missing-verb hint rather than a generic unknown-subcommand
error, because that mistake has an unambiguous fix.

**Rationale**: the migration's remaining step is the removal itself. Option C
normalises the compat form from "legacy" to "the hole"; the compat mode exists
*because* the earlier decision wanted a low-cost fix, and the observable
outcome is that the low-cost fix did not stop the failure class. The cost of
the breaking change is bounded (pre-1.0, one document already says legacy, and
the docs sweep is mechanical), while the cost of the status quo is a governance
repo accumulating cards that nobody authored on purpose.

**Rejected alternatives**: Option A (warning after the fact), Option C
(heuristic), Option D (partial fix) — see § Options.

## Impact

- **Positive**: an agent that hallucinates a verb now gets exit 1 and an error
  that lists the real verbs; the repo cannot gain empty-shell cards from a typo.
  The four document commands share one grammar, so SKILL.md teaches one rule.
- **Negative**: breaking change at 0.21.0 for anyone scripting the bare form;
  `epic`/`adr`/`wiki` callers see the same break.
- **Follow-up**:
  - [x] `cli.ts` dispatch rewritten for task/epic/adr/wiki — TASK-20261026022014248
  - [x] 17 CLI-integration BDD scenarios pin exit status + "no file created" —
    TASK-20261026022014248
  - [x] Present-tense docs swept to the `create` form; `skills/` rebuilt from
    `packages/*/skill/` — TASK-20261026022014248
  - [x] `ADR-20260607233903985` gets a Status History note (body kept as the
    point-in-time record of Option C) — TASK-20261026022014248

## Related
- Related ADR: ADR-20260607233903985 — the Option C decision this ADR completes
  by removing the compatibility form.
- Related Epic: —
