---
supersedes: []
superseded_by: null
# 下面两项是与 task / epic 的机器可读关联(与 ## Related 段同一件事的两份)
epic: null
tasks: ["TASK-20261023182807833"]
---

# ADR-20261023183001417: Templates have one executable carrier; shipped copies are generated or pinned

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-10-23 | Created |
| accepted | 2026-10-23 | Accepted |

## Background

A template is a closed data set: its section names are what `probe`, the commit
hooks, and every downstream reviewer read. `cortex` currently ships templates in
**four carriers**, and they have drifted:

| Carrier | Consumer | Shape |
|---|---|---|
| `src/lib/template.ts` (hardcoded strings) | CLI creates Task + ADR cards | `Background & Goals` / `Technical Approach` / `Progress Log` / `Impact` |
| `templates/epic.md` (rendered at runtime) | CLI creates Epic cards | Chinese section names (`背景故事` / `需求树`) + frontmatter |
| `assets/*-TEMPLATE.md` (copied by `cortex init`) | **no code reads them**; shipped to every adopter | `Background & Goal` / `Cross-Package Impact Checklist` / `TDD Cycles` / `Options Considered` / `Consequences` |
| `skill/assets/*-TEMPLATE.md` (shipped in the skill) | agents told to "read the template file" | a third shape; last touched 2026-05-03. Its Status History note still says `仅人工记录，不用于机器解析` — while `probe` parses that table |

> Amended 2026-10-23, pre-push: the first draft listed three carriers; the
> fourth (`skill/assets/`) was found during the ZK scan of the same session. It
> is the carrier the 2026-09-11 drift-classes pattern had already called out
> ("the copy the skill told agents to read asserted the block was human-record
> only, not machine-parsed while the CLI parsed it") — still true six weeks
> later.

Measured 2026-10-23:

- `assets/TASK-TEMPLATE.md` has sections the CLI never generates
  (`Cross-Package Impact Checklist`, `TDD Cycles`, `### Functional Requirements`)
  and lacks ones it does (`Technical Approach`, `Progress Log`).
- `assets/ADR-TEMPLATE.md`: `Context` / `Options Considered` / `Consequences` vs
  generated `Background` / `Options` / `Impact` — three of seven sections differ.
- `assets/EPIC-TEMPLATE.md` is an English narrative template with no frontmatter;
  `templates/epic.md` is Chinese with `lane` / `checklist` frontmatter. Same
  concept, two shapes, both shipped.
- `cortex init` copies `assets/` into the adopter's `cortex/tasks|epics|adr/`;
  **no code parses those copies** (only `init.ts` names them). Separately,
  `skill/SKILL.md` instructs agents to read `skill/assets/TASK-TEMPLATE.md` — a
  fourth, different copy — so the agent-facing carrier is live, just unvalidated.
- Corpus audit: 1 archived epic (`EPIC-20260423102000000`) is a whole-card copy
  of the asset shape (asset-only `## Background Story`, `Requirement Tree`, …);
  2 completed task cards use asset-only headings (`## Background & Goal`,
  `## Progress Record`). Both are historical; the drift has produced isolated
  copies, not a systemic break. The live risk is the shipped template plus the
  SKILL.md instruction to read it.

`status-history.test.ts:109` already asserts "the written block is byte-identical
to what the templates ship (one shape, no drift)" — the project has met this
failure class before and patched one instance instead of the shape.

## Decision Drivers

- A template that nothing reads cannot be kept correct; it is a copy by
  construction, and copies drift (same principle as ADR-20261023182817984).
- `probe` rejects unfilled templates by placeholder shape — if two shapes ship,
  a card filled from the wrong one either fails validation or passes hollow.
- Agents are probabilistic readers, especially after compaction: "copy the
  template into your answer" is a behaviour we cannot rely on being followed.
  A reference (path) degrades safely; a copy degrades silently.
- Adopters get the assets via `cortex init`; shipping a shape the tool will
  never generate is worse than shipping none.

## Options

### Option A — One on-disk carrier per template; CLI renders all three
Move Task and ADR templates from hardcoded strings into `templates/task.md` and
`templates/adr.md` (joining `epic.md`); `createTaskTemplate()` /
`createAdrTemplate()` render from disk. `cortex init` copies the **same** files.
**Which shape wins: the CLI-generated set.** The asset-only sections
(`Cross-Package Impact Checklist`, `TDD Cycles`, `### Functional Requirements`,
`Progress Record`) are retired, not migrated — nothing reads them, and a card
that carries them either fails probe or passes with sections the tooling ignores.
Reintroducing any of them is a deliberate template change with its own reader.

**Pros**:
- Exactly one artifact per template; `init` ships what the CLI renders.
- Human-editable without touching TypeScript.
- A drift test can render each template and compare its section list to the file.
- Removes the unreachable `assets/` copies.

**Cons**:
- Two of three templates gain a runtime file read; packaging must include
  `templates/` (verify `package.json` `files`).
- Migration touches `template.ts`, `init.ts`, tests, and the published package.

### Option B — Hardcoded strings stay SSOT; assets are generated at build
**Pros**: no new runtime IO; CLI stays self-contained.

**Cons**: adopters still receive a copy with no reader; the generator must be
tested and run on every template change; TypeScript remains the editing surface
for prose.

### Option C — Status quo + "agents should not copy"
**Pros**: zero work.

**Cons**: the stale asset is already shipped and already produced one epic in
the old shape. "Should not copy" is an instruction, not a mechanism; the next
compacted agent copies whatever path the skill points at. Rejected.

## Decision

**Choice**: Option A.

1. **One executable carrier per template.** Task, Epic, and ADR each have
   exactly one artifact (under `templates/`); the CLI renders cards from it.
2. **Shipped copies are generated.** Anything `cortex init` writes into an
   adopter project is output of the same artifact — never a separately
   maintained file. If a copy cannot be generated, it is not shipped.
3. **Drift is pinned by a test.** For each template: render → compare section
   headings (and frontmatter keys for Epic) against the file. The existing
   `status-history.test.ts` "one shape, no drift" assertion is the model.
4. **Docs and skills reference templates; they do not inline them.** A skill
   that needs to show a card shape links the template path or shows a generated
   excerpt. Hand-copied template bodies are not a supported carrier.

**Rationale**: the failure is structural (three carriers, one reader), not a
typo. Option A is the only one that makes "what the CLI produces" and "what the
adopter is told to write" the same bytes. Option B keeps an unreadable copy in
circulation; Option C already failed once.

## Impact

- Positive: one shape for card generation and adopter guidance; probe's
  placeholder detection sees the same template every caller writes against.
- Negative: template edits now require the packaged `templates/` directory at
  runtime (dist/build must include it); one more file read per card creation.
- Follow-up (migration; not part of the task that raised this ADR):
  - [ ] Move `createTaskTemplate` / `createAdrTemplate` bodies to
        `templates/task.md` / `templates/adr.md`.
  - [ ] Point `cortex init` at `templates/`; delete `assets/*-TEMPLATE.md`.
  - [ ] Delete `skill/assets/*-TEMPLATE.md` and update `skill/SKILL.md:444`
        (currently tells agents to read `${CLAUDE_SKILL_DIR}/assets/TASK-TEMPLATE.md`).
        Leaving this out satisfies the letter of "one carrier" while the
        agent-facing copy remains.
  - [ ] Add the section-parity drift test for all three templates.
  - [ ] `packages/lythoskill-project-cortex/package.json` `files` already
        includes `templates` and `assets` (verified 2026-10-23) — re-check after
        the `assets` removal.
  - [ ] Audit existing cards written from the stale asset shape (1 archived epic
        + 2 completed task cards found) — annotate, do not rewrite history.

## Related
- Related ADR: ADR-20261023182817984 (same SSOT-vs-copy principle applied to
  dynamic views)
- Related Epic: none
- Related Task: TASK-20261023182807833
