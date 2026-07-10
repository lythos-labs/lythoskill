# Daily File Template
> Location: `daily/YYYY-MM-DD.md`
> Source: [packages/lythoskill-project-scribe/skill/references/daily-template.md](../../../../packages/lythoskill-project-scribe/skill/references/daily-template.md)

---

## Format Philosophy

**Daily = fact density for the next agent.** Skip everything recoverable via `ls`, `cat`, `git log`. Dump only what has NO other carrier (no task file, no ADR, no epic).

| Recoverable via exploration (~70%) | Must dump in scribe (~30%) |
|:---|:---|
| Project structure, tech stack | Pitfalls from this session |
| skill-deck.toml content | True working-tree state |
| cortex/ tasks and epics | Why we chose A not B (not ADR-worthy) |
| git log history | Specific next steps (not "continue testing") |
| README, docs | Temp artifacts: location + purpose |
| git diff (code changes) | Uncommitted modifications and their intent |

---

## Template

```markdown
# Daily — YYYY-MM-DD

## Session Handoff — <short descriptive title, 3-8 words>

### 0. Verify Current State
> This handoff's SSOT. Run these commands to verify freshness.

**Git**: HEAD = `COMMIT_HASH` (commit message first 50 chars)
**Version**: vX.Y.Z
**Deck**: N skills linked
**Branch**: main, clean/dirty working tree, ahead/behind origin
**Active Epic**: N (count)
**Active Task**: N in-progress, N in review, N backlog

```bash
# Verify: if output diverges from the fields above, this handoff is stale
git diff COMMIT_HASH --stat
git status --short
git log --oneline -3
```

### Completed

1. **Item name** (`COMMIT_HASH` or task ID)
   - What was done, in one line. Include quantitative signal if available ("added 17 tests", "coverage 33%→80%").
   - Link to ADR/task/epic if one exists.

2. **Second item**
   - Detail line.

### Key Decisions

- **Decision name**: One-line rationale. If ADR exists, link it.
- **Second decision**: Why A over B. Keep it actionable — "why" matters more than "what".

### Pitfalls

- **Pitfall name**: wrong approach → symptom → fix → root cause → time wasted (X min)
  - **Wrong approach**: What was tried first.
  - **Symptom**: Error message or behavior.
  - **Fix**: What actually worked.
  - **Root cause**: Why the wrong path seemed right.
  - **Time wasted**: X minutes.

### Next Steps

1. **Most important**: Specific, not "continue testing". Include package/file path if applicable.
2. **Second priority**: 
3. **Third priority**:

### Temp Artifacts

- `path/to/file` — Purpose and lifecycle ("draft for X, can delete after Y merges").

---

## Work Log (human notes below this line)
- 10:30 — started working on X
- 14:00 — user testing revealed Y
```

---

## Section Reference

### Session Handoff (REQUIRED per session)
One handoff per session. If multiple sessions occur on the same day, prepend a new `## Session Handoff` section at the top of the file. The [onboarding skill](../../../lythoskill-project-onboarding/skill/SKILL.md) reads the **first** (most recent) handoff section.

Each handoff is self-contained — all state needed for onboarding is in `### 0. Verify Current State`. No file-level state exists.

| Sub-section | Required | Description |
|:---|:---|:---|
| **0. Verify Current State** | Yes | Git HEAD, Version, Deck, Branch, Active Epic/Task counts. Plus verification commands. This is the SSOT for this session. |
| **Completed** | Yes | Numbered list. Link to commits/tasks/ADRs. Include quantitative signals. |
| **Key Decisions** | Yes | Bulleted list. One-line rationale per decision. |
| **Pitfalls** | Yes if any | Bulleted list. Wrong → symptom → fix → root cause → time. |
| **Next Steps** | Yes | Numbered list, prioritized. Specific, not vague. |
| **Temp Artifacts** | Yes if any | Path + lifecycle description. Prevents next agent from treating drafts as canonical. |

### Work Log (OPTIONAL)
Human-readable notes below the handoff separator (`---`). Agent-generated content stops at the separator. Humans append free-form notes here.

---

## Multiple Sessions Per Day

Prepend a new `## Session Handoff` section with a time qualifier:

```markdown
## Session Handoff (afternoon) — <title>
...
```

The onboarding skill always reads the **first** handoff section in the file. Earlier handoffs become historical record.

---

## Anti-patterns

| Anti-pattern | Why it hurts | Fix |
|:---|:---|:---|
| **"Continue testing" as next step** | Not actionable — which package? which test file? | Include package/path and specific target |
| **Narrative "what happened"** | Recoverable from git log; wastes tokens | Only dump what exploration cannot recover |
| **Missing Temp Artifacts** | Next agent treats draft as canonical, modifies wrong file | Always list files that look real but aren't committed |
| **No quantitative signals** | "Improved coverage" vs "coverage 33%→80%" — the latter is verifiable | Include numbers, commit hashes, test counts |
| **Stale Verify Current State** | Next agent thinks handoff is fresh when it isn't | Update hash and state fields before writing handoff |

---

## Related

- [lythoskill-project-onboarding skill](../../../lythoskill-project-onboarding/skill/SKILL.md) — reads this format
- [weekly-template.md](./weekly-template.md) — weekly counterpart
- ADR-20260710172235956 — rationale for removing file-level Ground Truth
