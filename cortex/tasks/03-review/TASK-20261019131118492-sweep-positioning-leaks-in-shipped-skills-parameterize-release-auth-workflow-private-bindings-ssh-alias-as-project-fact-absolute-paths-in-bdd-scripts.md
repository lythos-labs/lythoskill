# TASK-20261019131118492: sweep positioning leaks in shipped skills — parameterize release-auth-workflow private bindings, SSH alias as project fact, absolute paths in BDD scripts

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-19 | Created — findings registered from TASK-20261019125608729 execution |
| in-progress | 2026-10-19 | Started |
| review | 2026-10-19 | Deliverables committed |

## Background & Goals
Owner insight (2026-10-19, while fixing the `lythos-agent-pat` hardcode): "我也
的确不可能一直盯着……外部遇到排查还是必要的。因为有些是彻底的低级错误。"
The author of a hardcode cannot see it (knowledge curse); the amnesiac session
that leaks it classifies the edit as "docs/SOP" and never loads "this ships to
strangers". Detection therefore must be a **repeatable external-perspective
sweep**, not owner vigilance.

Detection lens: read the shipped product (`skills/` — built output consumed by
projects that owe this repo nothing) as an external consumer. Hunt: personal
paths, personal key/token names, private repo values presented as universal
methodology.

Findings registered here (audit of 2026-10-19, during TASK-20261019125608729):

- **P0** — `packages/lythoskill-creator/skill/references/release-auth-workflow.md`
  carries lythos-private auth values as if they were universal release
  methodology. Owner's calibration: teaching release governance in the skill
  is legitimate (bump flow, OIDC, lock-step, workspace:* rewrite are generic);
  the sin is presenting private bindings as methodology. Remaining private
  values after TASK-8729: SSH alias `calt13.github.com` (:30), PAT permission
  matrix + pre-fill URL scoped to `lythos-labs/lythoskill` (:60-78), Linux
  `secret-tool` attributes. Fix = parameterize ("your project's own auth doc;
  e.g. AGENTS.md §9 in this repo"), keep the generic methodology.
- **P1** — `calt13.github.com` SSH alias stated as project fact
  (`AGENTS.md:455`, `release-auth-workflow.md:30`). Another maintainer would
  have to recreate an identically-named `~/.ssh/config` alias to follow the
  docs. `:30` folds into P0; `AGENTS.md:455` rewords as machine-local
  description ("origin on this machine uses an SSH alias — your clone will
  have your own; never `git remote set-url` to embed tokens").
- **P2** — absolute `/Users/chariots/Downloads/lythoskill-main` in curator BDD
  `reproduce.sh` ×5 (`packages/lythoskill-curator/test/scenarios/*` ×3 +
  `skill/scripts/bdd/*` ×2 — the latter ships in built output) + showcase ×7.
  Fix: derive repo root from script location (`$(cd "$(dirname "$0")/…" && pwd)`)
  or accept an env override.

Audited and cleared (non-findings, do not re-chase): `scripts/publish.sh`
(relative paths + loud failure — the clean baseline); curator SKILL.md token
advice (generic mechanism); deck/arena FQ locators (`lythos-labs/lythoskill`
as public documentation example — by design); `.github-token` / `.npm-access`
(gitignored dedicated files — the planned pattern, correct as-is);
daily/showcase/drafts/*.bak historical records (point-in-time, never edit).

## Requirements
- [x] P0: parameterize `release-auth-workflow.md` private bindings — done as whole-file "Two audiences, two contracts" framing (instance vs methodology) + inline labels: SSH alias (machine-local), secret-tool org/scope + --label (×4 "choose your own"), PAT scope ("substitute yours"), OIDC table ("Example — this repo's values"), pre-fill `description` labeled, dead daily pointer dropped, `--workflow=release` display-name note. agent-7 acceptance read-through verdict: **PASS** (P3 polish applied; literal alias + ADR-registry pointers kept as instance documentation under the framing).
- [x] P1: `AGENTS.md` SSH alias row reworded as machine-local description ("an SSH host alias on this machine (`calt13.github.com`; machine-local — your clone carries its own remote shape)").
- [x] P2: curator BDD `reproduce.sh` — `PROJECT` now derived by walk-up-until-sentinel (`packages/lythoskill-curator/src/cli.ts`); works from all copy depths (source 6-ups / test 5-ups / built 5-ups — verified by resolution test on all copies + live smoke run of curator-find-bdd end-to-end); `.github-token` echo guidance replaced with ambient-auth note (F4, both scenarios, both copies); built output re-synced. Showcase ×7 left untouched per scope (historical snapshots).
- [x] Repeatability — **owner redirect (2026-10-19)**: the qa-sweep deck-lens is superseded by a deterministic commit-flow gate — a `check-no-private-leaks` tool + gitignore-style private-pattern list (sonar/lint family), tracked as its own card (see Progress Log). Owner: "比起agent自己记录,这个的commit流程里带上这个性质的检查".
- [x] Build sync + test gate green — 1285 pass / 0 fail after sweep edits (same as pre-sweep baseline; GATE_EXIT=0).

## Technical Approach
Same principle as ADR-20261019125409359 (personal bindings live in gitignored
local space / project docs; generic skills stay context-clean), applied at
document granularity — no new decision expected. If the qa-sweep lens
requirement grows into a new check mechanism (script vs prompt-only), assess
C1-C6 then and open an ADR only if ≥2 criteria hit.

## Acceptance Criteria
- [x] `grep -rn "lythos-agent-pat" skills/` → 0 hits; `grep -rn "calt13" skills/` → exactly 1 instance-framed mention ("Machine-local — your clone has its own remote shape") — semantic gate passed via read-through
- [x] Fresh-agent read-through (ZK trial-usage): agent-7 — release-auth-workflow.md **PASS** (framing verified line-by-line: L26-35 boundary block + 8 inline labels; rebuild-feasibility confirmed with adopter's own names); onboarding shipped copy initially **FAIL** (stale build — source fix not rendered; agent-7 caught it), fixed by rebuild, now clean
- [x] `grep -rn "/Users/" skills/` → 0 hits (verified)
- [x] curator BDD scripts run from any clone path → sentinel resolution verified on all 6 copy locations + live end-to-end smoke run of curator-find-bdd (Steps 1-2 executed, IoC handoff printed); no `/Users/chariots` reference remains
- [x] Full test gate → `bun --filter='*' run test` GATE_EXIT=0, 1285 pass / 0 fail (recorded 2026-10-19; identical to pre-sweep baseline)

## Progress Log
- 2026-10-19: Registered during TASK-20261019125608729 (keychain-binding fix). Audit method: external-consumer read of `skills/` + repo-wide greps for personal markers (`lythos-agent-pat`, `calt13`, `/Users/`).
- 2026-10-19: ZK review round 1 (agent-6, pass-by-reference: card + ADR + AGENTS.md). Verdict: executable after gap fixes.
  - **F1 (P1)**: fixed-depth derivation impossible — build is a verbatim copy, and the three homes sit at different depths (source `skill/scripts/bdd/` = 6 ups; `test/scenarios/` = **5** ups, card said 4; built `skills/` copy = 5). One constant cannot serve all. → **walk-up-until-sentinel** (ascend until `packages/lythoskill-curator/src/cli.ts` is found); Verify extended to exercise the built copies, not just `packages/`.
  - **F2 (P2)**: the vendor-tooling framing must scope the **whole file** (this-repo instance vs portable methodology), not the two sections the plan named — else the pipeline steps (`rewrite/check-*.ts`, skills-branch gotcha) still present vendor mechanics as universal.
  - **F3 (P3)**: `--workflow=release` (:205) is the same display-name assumption as onboarding's `--workflow=CI`; both covered by a framing note that workflow display names are instance values.
  - **F4 (P3)**: curator BDD echo text (`curator-find-fuzzy-bdd/reproduce.sh:46-47`) tells replayers to `export GH_TOKEN=$(cat $PROJECT/.github-token)` — same leak class the ADR removed from onboarding. Folded into this card's P2 (fix while touching the scripts; do not propagate).
  - **F5 (P3)**: card anchors drifted +1 against current files (:121→:122 etc.) — executor greps by content, never keys edits to line numbers.
  - Baselines recorded: `calt13` in `skills/` = 1 hit; `lythos-agent-pat` = 0 (8729 fix held); `/Users/` in `skills/` = 2 (both built bdd copies); `PROJECT=` literal = 5 in packages/; showcase `/Users/` = 7 (card count correct; showcase stays untouched per scope).
- 2026-10-19: Executed. All requirements + acceptance green (see ticked boxes). Test gate GATE_EXIT=0, 1285 pass / 0 fail. ZK acceptance read-through: agent-7 — release-auth-workflow.md PASS (framing + inline labels verified, rebuild-feasibility with own names confirmed); onboarding FAIL→fixed (stale shipped build; rebuilt).
  - **Operational lesson (agent-7 catch)**: after editing skill SOURCE mid-task, build immediately — "build is part of the edit". The shipped copy is what consumers receive; a source-only fix is invisible until rendered.
  - **F1 resolution note**: walk-up-until-sentinel chosen over per-copy constants; verified at all depths + live smoke run.
  - Follow-up (owner directive, registered separately): deterministic private-leak gate in the commit flow (`check-no-private-leaks` tool + pattern list) — replaces this card's superseded deck-lens requirement.
- 2026-10-19: Independent corroboration after the two-cut fix — external-consumer ZK read-through (subagent agent-5, zero-context, read-only) of the shipped files. Onboarding Layer 3b judged **context-clean** (ambient-auth wording verified line-by-line; failure semantics portable). release-auth-workflow.md leaks confirmed and sharpened:
  - **P1 granularity**: the bump section and legacy-publish section *describe* vendor tooling rather than *transmit* methodology — `bunx @lythos/skill-creator@… bump` and `./scripts/*.sh` are presented as instructions but don't exist outside this repo; an external reader "falls into a wall" on the fallback path.
  - **P2 adds**: `secret-tool org lythos-labs` namespace (×4) lacks the "any name you like" note the macOS binding file has; PAT scope line names the vendor repo without "substitute yours"; OIDC Trusted Publisher table lists vendor values as *the* values; dead pointer to vendor's private daily journal (:121); "skills branch" branching model presented as universal; onboarding body P2s — dangling `(per diagnosing-bugs)` pointer, dated vendor incident anecdote (L56-57) reads as gossip externally, and `--workflow=CI` assumes the workflow's display name (external repos named `ci.yml`/`build` return empty — the check silently no-ops where the skill was force-fitted as "always required").
  - **Confirmed portable (keep as methodology)**: `.private/keychain-service` gitignored-binding pattern (agent-5: "excellent portable methodology"), OIDC setup-node gotcha, tag-triggered pipeline shape, gh verification discipline.
  - P0 requirement refined accordingly: parameterize VALUES **and** mark vendor-tooling sections as "our instance" vs universal methodology.

## Related Files
- Modified: packages/lythoskill-creator/skill/references/release-auth-workflow.md; AGENTS.md; packages/lythoskill-curator/test/scenarios/*/reproduce.sh; packages/lythoskill-curator/skill/scripts/bdd/*/reproduce.sh; examples/decks/qa-sweep.toml (+ COMBO prompt)
- Added: (none expected; sweep lens rides existing qa-sweep deck)

## Git Commit Message
```
fix(creator,docs): parameterize private bindings in release-auth-workflow; sweep positioning leaks (TASK-20261019131118492)
```

## Notes
The owner's two meta-points to preserve: (1) "技能里教技能发布治理本身不是
问题,问题是把项目私有信息当通用方法论说"; (2) some leaks are outright
low-level errors only a fresh eye catches — the sweep must stay runnable by
zero-context agents, pass-by-reference.
