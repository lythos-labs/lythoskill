# Writing Guide: Epics, ADRs, Tasks

## Epic vs Task — Two Different Mental Models

| | Epic | Task |
|---|---|---|
| **Mental model** | **Workflowy** — hierarchical outline, zoom-in map | **SMART** — concrete deliverable, executable chunk |
| **Analogy** | XMind mind map, outline with nested themes | A Jira ticket that a single engineer can finish in 1-3 days |
| **Commit scope** | Spans multiple tasks, 1-3 weeks | **One batch of commits** — can be 1 commit or 5, but one coherent unit |
| **Subagent ready?** | No — epic needs human/architect interpretation | **Yes** — task is a self-contained bootloader for a subagent |
| **Drill-down** | Theme → Sub-theme → Behavior → Task | Requirement → Implementation → Acceptance Criteria → Done |

**Critical rule**: Do **not** turn an epic into a flat todo list. Do **not** split a task so small that it becomes a single commit — that's overhead. A task should be **"self-contained enough to hand to a subagent with only AGENTS.md + this card"**.

## Epic Writing
- Use **Workflowy-style** tree structure for requirements — nested, zoomable, not flat
- Record **trigger events**: why did this need arise?
- Include **screenshots** for UI-related feedback
- Update requirement node status as work progresses (#in-progress → #done)
- Keep epics **high-level** — the story and the map, not the implementation steps
- Each leaf requirement node should produce **one SMART task** (not a checklist item)

## ADR Writing
- Document **rejected options** too — "why not X?" is as valuable as "why Y"
- Include **consequences** section: what changes after this decision?
- Link related ADRs: `superseded by ADR-xxx`, `depends on ADR-yyy`
- One decision per ADR — don't bundle multiple choices
- Write context so a newcomer understands the problem without prior knowledge

### When a decision MUST become an ADR (not a card's Technical Approach)

> Authority: **ADR-20260910113534807**. Two same-shape incidents four months apart
> (`feed-adapters.ts` 2026-05, `adapter-registry.ts` 2026-09) — in both, an
> architectural decision rode in an implementation card's Technical Approach and
> never entered a carrier anyone could object to.

**Rule**

> Any decision that **introduces or changes an abstraction, a module boundary, a
> package boundary, a named concept, or a closed data set** must be recorded in an
> ADR. A card's Technical Approach **may reference** that ADR; it **must not be the
> only record**.

**The carrier is the problem, not the section.** Incident 2's Technical Approach
was present *and* filled in, and the decision still never landed. Implementation
cards are closed, execution-facing, and get archived with the task; ADRs are open,
review-facing, and stay searchable. A decision written anywhere inside a card is
archived with the card — the next agent will not look there for "why".

**Test — hit ≥ 2 and it is an architectural decision**

| # | Criterion |
|---|---|
| C1 | Introduces a new module/abstraction whose **expected consumers live outside it** |
| C2 | Introduces or renames a **concept name** (registry / adapter / hub / resolver / layout …) |
| C3 | Chooses a **host** (which package) or a **boundary** (what crosses packages) |
| C4 | Establishes a **closed/curated data set** whose entries are **factual claims about the outside world** |
| C5 | **Rejected alternatives** — if you considered and dropped something, that rejection needs a home |
| C6 | A competent reviewer **could reasonably have asked** "did you consider X?" |

*Calibration*: incident 2 scores **6/6**, incident 1 scores **5/6**. Both far over the
bar. Conversely a typo fix, a one-line bug fix, or adding a parameter to an existing
function scores 0–1 — **no ADR**.

**`probe` green ≠ decision recorded.** `probe` detects **empty shells** (are the
required sections blank?). A card with a full Technical Approach passes `probe`
completely while its architectural decision is nowhere on disk. **probe tests form;
this failure is semantic.** Do not read a clean `probe` as governance coverage here.

**Deliberately not automated.** Extending `probe` to detect "does this decision have
an ADR" was rejected: whether something *is* a decision is a semantic property, and a
form-only check (e.g. "Technical Approach mentions `new <Name>`") misfires both ways —
`new Map()` trips it while "the registry's host is deck" contains no keyword at all.
A check that misfires gets learned around, and the workaround becomes the new habit —
**worse than no check, because it manufactures a false "already checked"**.

**Accepted weakness, on the record**: the test is self-assessed, so a
"this one doesn't count" exemption path exists. That is the accepted cost. An honest
soft rule beats a lying hard check.

See also: `AGENTS.md` → Project Governance (same criteria, cross-referenced with the
`"I think / 我觉得" = start an ADR` rule — that rule triggers on **user phrasing**, this
one on **decision content**; it is an OR).

### An accepted ADR carries its own follow-up — do not open a card for it

**Rule**: landing the **Follow-up** items of an **already-accepted ADR** is carried by that
ADR itself. Do not open a task card for it. Tick the item in `## Impact → Follow-up` and write
the commit sha next to it.

**Why**: a card exists to carry work that needs **its own acceptance criteria, its own plan, or
an owner decision**. An accepted ADR's follow-up already has its criteria — the ADR is the
reviewed decision, and its Impact section *is* the criteria. Opening a card copies that
obligation into a second, weaker carrier: cards get archived with the task, ADRs stay
searchable. Two carriers for one obligation also means two places to check whether it landed —
and in practice that means **neither**.

**The evidence is this rule's own origin.** The 2026-09-10 batch that landed
ADR-20260910113534807's four prompt-injection sites (five source files + `AGENTS.md` +
`CLAUDE.md`) ran under **no card at all**. It was not invisible only because the ADR's own
Follow-up list named the sites. The ADR carried it; a card would have been a second place to
forget.

**Boundary — a card *is* right when**:

| Situation | Why a card |
|---|---|
| The follow-up **spawns an obligation the ADR never stated** (e.g. "re-survey the 16 CLIs quarterly") | That is new work with new criteria, not a consequence of the decision |
| The follow-up **needs its own plan** — multiple segments, independent rollback points | The card is the plan's carrier; the ADR stays the decision's |
| The follow-up is **blocked on an owner decision** | A card is the right shape for presenting options |

**The test**: *does this item need a decision, a plan, or owner input?* If no, it is a
consequence of a decision already made — put it in the ADR's Follow-up list.
**A card for an ADR's own consequence competes with the ADR instead of recording it.**

Authority: **ADR-20260910113534807 § 5** (owner decision, 2026-09-10: *"已 accept 的 ADR 的
Follow-up 落地,由该 ADR 自身承载,不另开卡"*). The ADR template's `Follow-up:` line carries the
same reminder at the point where the list gets written.

## Task Writing
- **Self-contained subagent bootloader**: A subagent reading only this card + AGENTS.md should have enough context to implement the work. No clarifying questions needed.
- **Pass by reference, not by value**: The card is a **map**, not a warehouse. Don't copy ADR body or epic detail inline — link to them (`Refs: ADR-xxx`, `See EPIC-yyy #ThemeA`). Provide precise file paths and pointers so the reader navigates to source of truth.
- Clear **acceptance criteria** as a checklist
- Specific **file paths** to modify or create
- Suggested **git commit message** with task ID
- **Checkpoint updates** with timestamps during execution
- Define **milestone declaration** at creation (see milestone protocol)
- **Batch commits**: One task = one coherent batch of commits. Don't split into per-commit tasks.
- **Commit granularity**: A batch should be 2-5 commits, not 1. Separate: (1) core change, (2) tests, (3) docs/template updates, (4) review trailer. This gives reviewer `git show <hash>` entry points for each facet.
- **Commit-task traceability**: Every commit message includes `TASK-xxx`. This enables `git log --grep TASK-xxx` to reconstruct the full change history for a task.

## General Principles
- **Link everything**: Task ↔ Epic ↔ ADR cross-references
- **Timestamp all updates**: progress, status changes, decisions
- **Directory is truth**: file location = current status
- **CLI creates, humans review**: let automation handle IDs and templates
