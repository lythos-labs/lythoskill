# Template Field Guide
Templates live in `${CLAUDE_SKILL_DIR}/assets/`. The CLI populates them
automatically. This reference explains what each field means.
## Task Template Fields
| Field | Purpose |
|-------|---------|
| **Status History** | Table tracking status transitions with dates and notes |
| **Background** | Link to parent EPIC or ADR. Why does this task exist? |
| **Requirements** | Checklist of what must be built |
| **Technical Approach** | Implementation details, file paths, design notes |
| **Acceptance Criteria** | Checklist of verifiable conditions for completion |
| **Progress** | Timestamped updates during execution |
| **Related Files** | Files to modify or create |
| **Git Commit** | Suggested commit message with task ID |
| **Milestone Declaration** | Exit criteria, deliverables, not-delivering, exit reason |
## Epic Template Fields
| Field | Purpose |
|-------|---------|
| **Background Story** | Why does this feature exist? What problem does it solve? |
| **Requirement Tree** | Workflowy-style nested requirements with trigger/requirement/output |
| **Related Tasks** | Table linking derived tasks with status |
| **Lessons Learned** | Retrospective notes after completion |
| **Archive Criteria** | Checklist defining when the epic is "done" |
Use `#in-progress`, `#done`, `#blocked` tags on requirement tree nodes.
## ADR Template Fields
| Field | Purpose |
|-------|---------|
| **Status** | Checkbox: Proposed / Accepted / Rejected / Superseded |
| **Context** | What problem prompted this decision? |
| **Options** | Each option with Pros/Cons analysis |
| **Decision** | Which option was chosen and why |
| **Consequences** | Positive, negative, and follow-up actions |
ADR lifecycle: create in `01-proposed/`, move to `02-accepted/` (or `03-rejected/`)
after decision. If later replaced, move to `04-superseded/` and link to the new ADR.
## Viewing Real Examples
The CLI generates playground examples during `init`:
- `cortex/tasks/01-backlog/TASK-*-playground-task.md`
- `cortex/epics/01-active/EPIC-*-playground-epic.md`
These are real CLI output, not hand-crafted samples.

## ADR frontmatter — 取代关系（机器可读）

ADR 的**文件最顶端**带一小段 frontmatter，只承载「取代关系」这一件事：

```yaml
---
supersedes: [ADR-20260502010100000]   # 本 ADR 取代了谁（可多个）
superseded_by: null                    # 本 ADR 被谁取代 —— 即「**最新的该去读哪一份**」
---
```

- `adr supersede <old> --by <new>` **两侧都写**：旧的那份得到 `superseded_by: <new>`，
  新的那份把 `<old>` 追加进 `supersedes`。
- 值可以是**任何 cortex id**（后继是 EPIC 时照实写）——**别留 `null`**：`null` 会被读成"没被取代"，
  而它确实被取代了。
- 为什么放在 frontmatter：这条关系首先是给 **agent** 读的。真实事故（2026-09-10）：一个外部 reviewer
  读到一份**已被整条取代**的 ADR，照着它描述了已经不存在的实现 —— 关系只写在 `## Status History`
  的散文里，没人会去解析那句话。
- **局部取代另当别论**：`superseded-partial`（核心决策仍有效、只有一部分被取代）**不写** `superseded_by`
  —— 两份都仍是现行，写上去会把人错误地赶走。
