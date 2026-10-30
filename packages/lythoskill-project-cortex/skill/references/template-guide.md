# Template Field Guide

**There is one carrier per template and the CLI is it.** The files live in the
`@lythos/project-cortex` package under `templates/{task,epic,adr,handoff}.md`;
`cortex task|epic|adr create "<title>"` renders the card from them, and `cortex init`
writes the same files into the adopter project (`cortex/tasks/TASK-TEMPLATE.md`,
…). If a card in a project disagrees with `cortex task create` output, the CLI is right
and the copy is the bug (ADR-20261023183001417).

This reference explains what each field means. It does not restate the section
bodies — read the generated card for those.

## Task Template Fields
| Field | Purpose |
|-------|---------|
| **Status History** | Machine-parseable table of status transitions; the directory mirrors it |
| **Background & Goals** | Link to parent EPIC or ADR. Why does this task exist? |
| **Requirements** | Checklist of what must be built |
| **Technical Approach** | Implementation plan, file paths; decisions belong in an ADR |
| **Acceptance Criteria** | Checklist of verifiable conditions for completion |
| **Progress Log** | Timestamped updates during execution |
| **Related Files** | Files to modify or create |
| **Git Commit Message** | Suggested commit message with the task ID |
| **Notes** | Anything the next agent needs that has no other carrier |

## Epic Template Fields
| Field | Purpose |
|-------|---------|
| **Status History** | Machine-parseable table of status transitions |
| **背景故事** (Background story) | Why does this feature exist? What problem does it solve? |
| **需求树** (Requirement tree) | Workflowy-style nested requirements with trigger/requirement/output |
| **技术决策** (Technical decisions) | Table linking the ADRs this epic rests on |
| **关联任务** (Related tasks) | Table linking derived tasks with status |
| **经验沉淀** (Lessons) | Retrospective notes after completion |
| **归档条件** (Archive criteria) | Checklist defining when the epic is "done" |

Use `#in-progress`, `#done`, `#blocked` tags on requirement tree nodes.
The epic card also carries `lane` / `checklist_completed` frontmatter — see the
carrier, not this table.

## ADR Template Fields
| Field | Purpose |
|-------|---------|
| **Status History** | Machine-parseable table of status transitions |
| **Background** | What problem prompted this decision? |
| **Decision Drivers** | Why the decision has to be made now |
| **Options** | Each option with Pros/Cons analysis |
| **Decision** | Which option was chosen and why |
| **Impact** | Positive, negative, and follow-up actions |
| **Related** | Related ADRs / epics (the human-readable twin of the frontmatter) |

ADR lifecycle: create in `01-proposed/`, move to `02-accepted/` (or `03-rejected/`)
after decision. If later replaced, move to `04-superseded/` and link to the new ADR.

## Viewing Real Examples
`cortex task create "<title>"` writes a real card — that file is the example. There is
no hand-maintained sample under the skill: a sample would be a second carrier
and would drift.

## ADR frontmatter — 取代关系（机器可读）

ADR 的**文件最顶端**带一小段 frontmatter，只承载「取代关系」这一件事：

```yaml
---
supersedes: [ADR-20260502010100000]   # 本 ADR 取代了谁（可多个）
superseded_by: null                    # 本 ADR 被谁取代 —— 即「**最新的该去读哪一份**」
epic: null                             # 挂靠的 epic（= `## Related` 里那条的机器可读版）
tasks: []                              # 相关 task：来源 / 实现 / follow-up
---
```

**与 task / epic 的关联也在这里**（同一个理由：`## Related` 那段是给人读的，这里是给 agent 读的）。
消费方已有：`findLinkedEpic()` **先读 frontmatter**，没有才回退到正文的 `- Related Epic:` 正则
（老 ADR 因此不用回填）。

- `adr supersede <old> --by <new>` **两侧都写**：旧的那份得到 `superseded_by: <new>`，
  新的那份把 `<old>` 追加进 `supersedes`。
- 值可以是**任何 cortex id**（后继是 EPIC 时照实写）——**别留 `null`**：`null` 会被读成"没被取代"，
  而它确实被取代了。
- 为什么放在 frontmatter：这条关系首先是给 **agent** 读的。真实事故（2026-09-10）：一个外部 reviewer
  读到一份**已被整条取代**的 ADR，照着它描述了已经不存在的实现 —— 关系只写在 `## Status History`
  的散文里，没人会去解析那句话。
- **局部取代另当别论**：`superseded-partial`（核心决策仍有效、只有一部分被取代）**不写** `superseded_by`
  —— 两份都仍是现行，写上去会把人错误地赶走。
