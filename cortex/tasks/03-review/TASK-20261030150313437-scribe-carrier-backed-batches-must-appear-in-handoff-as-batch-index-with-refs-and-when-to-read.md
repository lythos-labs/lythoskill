# TASK-20261030150313437: scribe: carrier-backed batches must appear in handoff as batch index with refs and when-to-read

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-30 | Created |
| in-progress | 2026-10-30 | Started |
| review | 2026-10-30 | Deliverables committed |

## Background & Goals
Downstream repo (humanizer project) reported via onboarding: a fully-governed
batch (five carriers: task/ADR/commits/showcase/spec-flow) left **zero trace**
in the daily handoff. Root cause is a contract loophole in scribe's Value
Boundary: "things WITH structured carriers go to their carriers, not scribe"
was read as "carrier-complete batches need no handoff presence at all". The
more complete a batch's governance, the more completely it vanishes from the
session narrative — production-side completeness made consumption-side absence
fatal. Onboarding (read-side) had no surface to catch it and had to
archaeologize. Finding registered downstream as 02bbd058 (FINDINGS 未处置区,
three candidate fixes + reversal conditions); owner ruled: **the handoff must
carry a complete ref index with a "when to read this" annotation for every
batch that has carriers** (= candidate 1, generalized).

Goal: amend scribe's write contract so every batch that landed commits since
the last handoff gets ≥1 index line in the handoff — batch name, complete
refs (TASK/ADR/commit), and a read-when trigger — while details stay in the
carriers (anti-bloat boundary unchanged).

## Requirements
- [ ] SKILL.md Value Boundary amended: the carrier branch of the decision tree requires a Batch Index line in the handoff (prose boundary ≠ presence boundary)
- [ ] New "Batch Index" rule in SKILL.md: coverage rule (every batch with commits since last handoff, checked via `git log <last-handoff-HEAD>..HEAD --oneline`), line shape, and the read-when bar (a condition/trigger, not a restatement of the batch topic)
- [ ] ZK Review Gate charter extended: reviewer verifies Batch Index coverage against the git log range (batch with commits but no index line = gap)
- [ ] daily-template.md: `### Batch Index` subsection added to the template + Section Reference row + anti-pattern row ("carrier-complete batch missing from handoff")

## Technical Approach
Self-assessed against C1–C6 (AGENTS.md § Decision Records): C2 is arguable
("Batch Index" names a new handoff-section concept, but it lives inside one
skill doc and has no consumers outside it); all others 0. Under the letter
that is < 2 → no ADR, exemption recorded here rather than a bare "0".

Implementation: edit `packages/lythoskill-project-scribe/skill/SKILL.md`
(Value Boundary tree + new Batch Index section + ZK gate charter) and
`packages/lythoskill-project-scribe/skill/references/daily-template.md`
(template subsection + reference-table row + anti-pattern row). Then
`bun packages/lythoskill-creator/src/cli.ts build lythoskill-project-scribe`
to refresh `skills/lythoskill-project-scribe/`. Onboarding (read side) needs
no change — it reads the handoff wholesale; the new section rides along.

Rejected alternative (downstream candidate 2, "handoff 每载体族强制一行"):
would index per carrier family rather than per batch — more lines, same
coverage, harder to check against git log. Candidate 3 (accept archaeology
cost) is the status quo being fixed.

## Acceptance Criteria
- [ ] `grep -c "Batch Index" packages/lythoskill-project-scribe/skill/SKILL.md` ≥ 2 and daily-template.md ≥ 3 → Verify: both greps return non-zero
- [ ] Coverage check command `git log <last-handoff-HEAD>..HEAD --oneline` appears verbatim in SKILL.md → Verify: `grep -F 'git log <last-handoff-HEAD>..HEAD --oneline' packages/lythoskill-project-scribe/skill/SKILL.md` exits 0
- [ ] Line shape includes a `read when:` trigger slot in both SKILL.md and the template → Verify: `grep -c "read when" packages/lythoskill-project-scribe/skill/SKILL.md packages/lythoskill-project-scribe/skill/references/daily-template.md` — both files ≥ 1
- [ ] Build refreshes committed output → Verify: `bun packages/lythoskill-creator/src/cli.ts build lythoskill-project-scribe` exits 0 and `git status --short skills/lythoskill-project-scribe/` shows updated files
- [ ] ZK Review Gate pass on the card + changed files before the `Review:` trailer; findings fixed or registered

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-10-30 15:05 — Card created, started. SKILL.md + daily-template.md edited (Batch Index section; Value Boundary tree; ZK charter; template + anti-pattern rows); skill rebuilt.
- 2026-10-30 15:40 — ZK Review Gate round 1 (fresh reviewer, pass-by-reference): 1×P1, 2×P2, 5×P3. Disposition: all P1/P2 fixed in-source (LAST_HEAD binding; uncommitted-batch rule; meta-commit exclusion); P3 fixed: "complete refs" defined, Completed↔Index overlap stated, humanizer self-reference generalized, ZK charter gained ref-resolution spot-check. Registered-not-fixed: onboarding read-side has no Batch Index consumption hook (finding 6) — **follow-up**: a one-line onboarding Layer 2 addition ("scan `read when` triggers before exploring"); out of this card's scribe-only scope, needs owner's go/no-go. Card hygiene findings applied. Rebuilt; acceptance greps pass.
- 2026-10-30 16:20 — Owner ruling: landing the follow-up (onboarding gets the read-side hook), plus an added emphasis — experiment (`playground/`, `runs/`) and research/wiki (`cortex/wiki/`) batches are the highest-risk omissions (quiet carriers). Applied to scribe SKILL.md, daily-template.md, onboarding SKILL.md; rebuilt.
- 2026-10-30 16:40 — ZK delta round (same reviewer resumed): 0×P1, 2×P2, 3×P3; write↔read symmetry and cross-file consistency verified clean. All landed: ZK gate charter gains the quiet-carrier working-tree check (`git status --short -- playground/ runs/ cortex/wiki/`) — commit ranges cannot see uncommitted experiments/wiki; onboarding scan gains prepend-day depth ("scan the next section below") + stale-handoff semantics (leads to verify, not prior art); heading promoted to `##`; Value Boundary carrier list extended to experiment/wiki. Rebuilt; source and skills/ in sync.

## Related Files
- Modified: packages/lythoskill-project-scribe/skill/SKILL.md, packages/lythoskill-project-scribe/skill/references/daily-template.md, skills/lythoskill-project-scribe/SKILL.md, skills/lythoskill-project-scribe/references/daily-template.md

## Git Commit Message
```
feat(scope): description (TASK-20261030150313437)

- Detail 1
- Detail 2
```

## Notes
