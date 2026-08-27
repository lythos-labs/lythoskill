# ADR-20260827155909657: Cortex as SSOT with GitHub Issues and PRs as inbound/outbound channels

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-08-27 | Created from user vision: cortex posse + GitHub as channel |

## Background

Currently `cortex/` is the single source of truth (SSOT) for project governance: tasks, epics, ADRs, wiki, and weekly patterns live as files in the repo. GitHub Issues and Pull Requests exist as separate, human-facing channels. This creates friction:

- External contributors file issues on GitHub, but agents work from `cortex/tasks/`.
- PRs have their own templates and review flow, while `cortex` has its own task/review lifecycle.
- There is no automated bridge: an issue must be manually copied into a task card, and a PR must be manually linked to a task or ADR.

The user proposed a "cortex posse" model: keep `cortex` as the core SSOT, but let GitHub Issues and PRs act as inbound triggers and outbound publication channels. Inbound: a GitHub Issue could spawn a cortex task. Outbound: task status changes could post updates back to Issues/PRs.

## Decision Drivers

1. **SSOT integrity**: `cortex/` must remain the authoritative state; no split-brain between files and GitHub.
2. **Lower barrier for external humans**: Contributors should be able to open issues/PRs without learning `cortex` CLI.
3. **Agent autonomy**: Agents should be able to ingest incoming issues/PRs and, with human approval, turn them into tracked work.
4. **Safety first**: Automated actions on GitHub (labeling, commenting, closing, creating PRs) are outward-facing and should require explicit consent.
5. **Gradual rollout**: Start experimental, then scale what proves valuable.

## Options

### Option A: Cortex remains the only SSOT; GitHub Issues/PRs are purely manual

Keep the current model. Humans and agents copy/link GitHub items to `cortex/` by hand.

**Pros**:
- Zero new automation, zero token scope expansion.
- No risk of accidental GitHub mutations.
- Simple to reason about.

**Cons**:
- External contributors remain outside the project's native workflow.
- Agents miss structured signals from Issues/PRs.
- Manual drudgery scales poorly.

### Option B: GitHub Issues as inbound triggers for cortex tasks

A webhook or periodic job reads new/updated Issues, and an agent creates a corresponding `cortex/tasks/01-backlog/TASK-*.md` with a link back to the Issue. The Issue itself is **not** modified except for a single comment: "Tracked as TASK-xxx."

**Pros**:
- External input enters the project's SSOT automatically.
- Agents can ZK-review the task before any work begins.
- Single outbound comment keeps the contributor informed without spam.

**Cons**:
- Requires GitHub App or PAT with `issues=write` to comment.
- Needs parsing/filtering to avoid noise and duplicates.
- Must handle Issues filed by bots or in bad faith.

### Option C: PRs carry a cortex checklist and link back to a task/ADR

PRs use a `.github/pull_request_template.md` that asks for a linked `TASK-xxx` or `ADR-xxx`. A CI check (or bot) verifies the link and optionally posts a status comment. The PR itself is the review surface; the task card is the SSOT.

**Pros**:
- PRs become first-class participants in the cortex lifecycle.
- Forces contributors to connect code changes to governance artifacts.
- Lightweight: mostly a template + optional validation.

**Cons**:
- External contributors may not know the task ID; UX needs careful design.
- Requires `pull_requests=write` if a bot posts comments/status.
- Risk of PR-centric drift if the task card is not kept in sync.

### Option D: Full bidirectional sync between cortex and GitHub

Every task has a mirrored Issue; task state changes update the Issue; PRs auto-create/update tasks; discussions on Issues/PRs flow back into the task Progress Log.

**Pros**:
- Seamless experience for both GitHub users and cortex users.
- Rich cross-platform visibility.

**Cons**:
- High complexity: conflict resolution, edit loops, deletion handling.
- Large token scope and webhook surface.
- Easy to accidentally mutate external state.
- Overkill for the current project size.

## Decision

**Choice**: **Option A for now, with experimental pilots for Option B and Option C.**

**Rationale**:
- `cortex/` must remain the SSOT. No automated outbound mutation of GitHub should happen until the inbound flow is proven safe.
- The immediate need is a well-documented PAT scope (see TASK-20260827150725011) that can support future GitHub-channel automation without re-approval.
- Option B is the lowest-risk experiment: read Issues, create task cards, post one tracking comment. It does not close, label, or otherwise mutate Issues.
- Option C is the next experiment after B is stable: a PR template + link validation.
- Option D is explicitly deferred until the project has more external volume and a dedicated maintainer for the sync layer.

## Impact

- Positive:
  - Lays the groundwork for external contributors to participate without learning `cortex` CLI.
  - Keeps `cortex/` as the authoritative SSOT while making GitHub a friendly surface.
  - Aligns with the token scope discussion: `issues=write`, `pull_requests=write`, `actions=write`, and `pages=write` are now justified not just for release/Pages maintenance, but also for future channel automation.
- Negative:
  - Increases token scope and automation surface — requires careful guard design.
  - Adds a new class of failure modes: webhook delivery, rate limits, duplicate detection.
- Follow-up:
  - Create a spike task for Option B: "Ingest GitHub Issue into cortex task" with a manual approval gate.
  - Draft `.github/pull_request_template.md` for Option C.
  - Document "when to use GitHub Issue vs cortex task" in `AGENTS.md` or onboarding guide.

## Related

- Related ADR: ADR-20260827143012709 (GitHub token scopes for release/Pages maintenance)
- Related Task: TASK-20260827150725011 (provision GitHub PAT)
- Related Daily: `daily/2026-08-27.md` (Pages freshness guards and release synchronization)
