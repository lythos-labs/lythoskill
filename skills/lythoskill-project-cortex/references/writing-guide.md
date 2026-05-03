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

## Task Writing
- **Self-contained subagent bootloader**: A subagent reading only this card + AGENTS.md should have enough context to implement the work. No clarifying questions needed.
- **Pass by reference, not by value**: The card is a **map**, not a warehouse. Don't copy ADR body or epic detail inline — link to them (`Refs: ADR-xxx`, `See EPIC-yyy #ThemeA`). Provide precise file paths and pointers so the reader navigates to source of truth.
- Clear **acceptance criteria** as a checklist
- Specific **file paths** to modify or create
- Suggested **git commit message** with task ID
- **Checkpoint updates** with timestamps during execution
- Define **milestone declaration** at creation (see milestone protocol)
- **Batch commits**: One task = one coherent batch of commits. Don't split into per-commit tasks.

## General Principles
- **Link everything**: Task ↔ Epic ↔ ADR cross-references
- **Timestamp all updates**: progress, status changes, decisions
- **Directory is truth**: file location = current status
- **CLI creates, humans review**: let automation handle IDs and templates
