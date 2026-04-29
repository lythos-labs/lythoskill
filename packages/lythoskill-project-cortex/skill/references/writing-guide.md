# Writing Guide: Epics, ADRs, Tasks
## Epic Writing
- Use **Workflowy-style** tree structure for requirements
- Record **trigger events**: why did this need arise?
- Include **screenshots** for UI-related feedback
- Update requirement node status as work progresses (#in-progress → #done)
- Keep epics **high-level** — the story, not the implementation
- Each requirement node should produce one or more TASKs
## ADR Writing
- Document **rejected options** too — "why not X?" is as valuable as "why Y"
- Include **consequences** section: what changes after this decision?
- Link related ADRs: `superseded by ADR-xxx`, `depends on ADR-yyy`
- One decision per ADR — don't bundle multiple choices
- Write context so a newcomer understands the problem without prior knowledge

## Task Writing
- Clear **acceptance criteria** as a checklist
- Specific **file paths** to modify or create
- Suggested **git commit message** with task ID
- **Checkpoint updates** with timestamps during execution
- Define **milestone declaration** at creation (see milestone protocol)

## General Principles
- **Link everything**: Task ↔ Epic ↔ ADR cross-references
- **Timestamp all updates**: progress, status changes, decisions
- **Directory is truth**: file location = current status
- **CLI creates, humans review**: let automation handle IDs and templates
