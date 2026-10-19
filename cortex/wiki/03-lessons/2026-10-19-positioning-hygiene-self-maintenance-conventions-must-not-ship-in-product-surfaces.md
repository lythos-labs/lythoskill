# 2026-10-19 — Positioning hygiene: self-maintenance conventions must not ship in product surfaces

## Context

Lythoskill is two things at once: its own first user (self-maintenance via
AGENTS.md conventions, dogfooded skills, in-repo aliases) and a tool publisher
(generic skills shipped to npm/consumers). On 2026-10-19 an onboarding run
surfaced one hardcoded credential name; the sweep that followed found three
distinct leak classes, all the same root confusion: **the repo's own
operational conventions were written into product surfaces as if they were
universal.** The amnesiac authoring session classified its skill edit as
"docs/SOP" and never loaded "this ships to strangers" — self-classification
itself is the blind spot.

The owner's framing, which this lesson preserves: "有些是彻底的低级错误" —
low-level errors that only a fresh/external eye catches, because the author of
a hardcode cannot see it (knowledge curse). Detection and enforcement must
therefore be mechanical and external-perspective, never owner vigilance.

## Details

Three live instances (all fixed and committed 2026-10-19):

1. **Credential binding hardcode** — onboarding Layer 3b carried
   `security find-generic-password -s 'lythos-agent-pat'` (one developer's
   keychain entry name). Born as stress-response patching after the 2026-10-13
   red-CI incident (commit `ee12884d` added a 3-layer SOP in one shot; the
   credential incantation rode along as "runnable as-is"). Fix: generic skills
   depend on ambient `gh` auth only; the project keeps its binding in
   gitignored `.private/keychain-service`. ADR-20261019125409359. Refined twice
   the same day under owner pushback ("撞这个墙也难受" → "scope 错配"): first
   the preconditions were un-forced (survey repo/remote/host/Actions before
   tailing), then the requirement itself was inverted — the generic skill now
   only surveys the shape and **suggests initializing the PROJECT's own
   AGENTS.md** with a tail-check; the check runs only when the project's own
   docs declare it. One project's rule belongs in that project's docs, never
   in a universal gate.
2. **Private values presented as methodology** — creator's
   `release-auth-workflow.md` (a shipped reference) stated lythos's keychain
   names, SSH alias, PAT permission matrix and org/repo values as if they were
   the universal release procedure. Owner's calibration: teaching release
   governance in the skill is legitimate; private values-as-methodology is
   not. Fix: whole-file "Two audiences, two contracts" framing (instance vs
   portable shape) + per-value substitution labels. TASK-20261019131118492.
3. **Phantom CLI shorthand** — docs presented `deck link`, `arena single` as
   commands; the registered bins are `lythoskill-*` (verified all four
   package.json bin fields) and the bare names exist only as an in-repo alias
   convention. Fix: Invocation legends (shorthand → `bunx @lythos/<pkg>`
   canonical; "want it? register it yourself"). TASK-20261019161017309.

Cross-cutting mechanics that came out of the fixes:

- **Private-leak gate** (ADR-20261019134800627): `scripts/check-private-leaks.sh`
  (pre-commit §0.8) now blocks secret VALUES (`.private/*.env`) and PATTERNS
  (built-in token shapes + machine-local `.private/leak-patterns`,
  gitignore-style: listed = forbidden). `bash scripts/check-private-leaks.sh --all`
  audits committed surfaces anytime. Exemptions mirror the historical-records
  list (cortex/adr|tasks|wiki|INDEX, daily/, drafts/, archived-patches/,
  showcase/, `*.bak*`, `*.test.ts` fixtures, run artifacts).
- **Calibration is design** — the first live `--all` run flagged ~60 hits,
  almost all legitimate generic fixtures (`/home/user`, `/Users/alice`). A
  blunt machine-path baseline would have trained people to ignore the gate;
  baseline was narrowed to unambiguous token shapes and machine paths moved to
  the per-machine pattern list. A check that misfires gets learned around —
  worse than no check.
- **Build is part of the edit** — a ZK acceptance read-through (agent-7)
  caught that a fixed source was never re-rendered: consumers read the shipped
  copy, and the shipped copy was stale. Edit source → build immediately.
- **Negative tests must assert the evidence, not just the exit code** — pure
  exit-code assertions let a `set -e` loop death pass as "guard caught it".
  Banner/content assertions caught two real pre-ship bugs (the loop death; a
  pipefail crash when `.private/` has no `*.env`).
- **Command-name reality check** — before documenting a CLI name, verify the
  `bin` fields. Canonical form for docs: `bunx @lythos/<pkg>` (no install);
  aliases are the reader's own shell config, documented once, never assumed.

## When to Apply or Not

Apply when: editing anything under `packages/*/skill/` or `skills/` (you are
editing a shipped product, not a project doc); adding operational SOP after an
incident (check whether the enforcement belongs in the mechanical layer —
hooks/gates — rather than in a generic artifact); writing CLI/command
documentation; authoring anything that names paths, keys, repos, or commands.

Do NOT apply to: the project's own docs where its own setup is the subject
(AGENTS.md §9, this repo's shorthand table — correctly scoped to in-repo);
historical records (daily/, showcase/, completed cards) — point-in-time,
never retro-edit; instance-framed mentions inside a labeled "our instance"
block, which are legal and deliberate.

## Related
- ADR-20261019125409359 — personal credential bindings live in gitignored local space
- ADR-20261019134800627 — the deterministic private-leak gate
- TASK-20261019125608729 (两刀) / TASK-20261019131118492 (sweep) / TASK-20261019134800662 (gate) / TASK-20261019161017309 (shorthand)
- Prior lesson: 2026-06-07-agent-autonomy-positive-decision-boundary.md (same family: the conversation vs the work)
- AGENTS.md §11 pointer row ("Keep self-maintenance out of shipped surfaces") — the 扣子 back to this page
