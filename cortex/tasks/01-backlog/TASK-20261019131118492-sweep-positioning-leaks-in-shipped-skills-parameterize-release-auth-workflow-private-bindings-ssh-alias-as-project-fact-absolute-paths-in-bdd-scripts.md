# TASK-20261019131118492: sweep positioning leaks in shipped skills — parameterize release-auth-workflow private bindings, SSH alias as project fact, absolute paths in BDD scripts

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-19 | Created — findings registered from TASK-20261019125608729 execution |

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
- [ ] P0: parameterize `release-auth-workflow.md` private bindings (SSH alias, PAT matrix scoping, pre-fill URL, secret-tool attributes) — generic release governance stays in the skill; private values become "your project's auth doc" with AGENTS.md §9 as the in-repo example. Per agent-5 corroboration, parameterization has two layers: (i) VALUES → placeholders with "substitute yours" (secret-tool namespace gets the same "any name you like" note the macOS binding file has; PAT scope line; OIDC Trusted Publisher table); (ii) VENDOR-TOOLING SECTIONS (bump CLI, `scripts/publish*.sh`, `rewrite/check-*.ts`) → explicitly framed as "this repo's instance — methodology described, not instructions to run", with a "reimplement in your own tooling" note so the external fallback path doesn't fall into a wall. Also: drop/qualify the dead vendor-daily pointer (:121) and the vendor incident anecdote in the onboarding body (L56-57) + dangling `(per diagnosing-bugs)` pointer.
- [ ] P1: `AGENTS.md:455` SSH alias reworded as machine-local description
- [ ] P2: curator BDD `reproduce.sh` derive repo root from script location (both `test/scenarios/` and `skill/scripts/bdd/` copies; built output re-synced); showcase scripts optionally swept with the same pattern or documented as machine-local snapshots
- [ ] Repeatability: add the external-consumer lens to the qa-sweep deck (examples/decks/qa-sweep.toml) — checks `skills/` for personal paths, personal key names, and vendor-specific values presented as methodology — so this sweep is a command, not a memory
- [ ] Build sync + test gate green

## Technical Approach
Same principle as ADR-20261019125409359 (personal bindings live in gitignored
local space / project docs; generic skills stay context-clean), applied at
document granularity — no new decision expected. If the qa-sweep lens
requirement grows into a new check mechanism (script vs prompt-only), assess
C1-C6 then and open an ADR only if ≥2 criteria hit.

## Acceptance Criteria
- [ ] `grep -rnE "calt13|lythos-agent-pat" skills/` → 0 hits in shipped bodies
- [ ] Fresh-agent read-through (ZK trial-usage): a zero-context reviewer reads `skills/lythoskill-creator/references/release-auth-workflow.md` and reports no lythos-private values — claim recorded with reviewer id
- [ ] `grep -rn "/Users/" skills/` → 0 hits outside explicitly machine-local-documented scripts
- [ ] curator BDD scripts run from any clone path → Verify: `bash packages/lythoskill-curator/test/scenarios/curator-find-bdd/reproduce.sh --help` (or equivalent non-destructive invocation) does not reference /Users/chariots
- [ ] Full test gate → Verify: `bun --filter='*' run test` pass count recorded in daily

## Progress Log
- 2026-10-19: Registered during TASK-20261019125608729 (keychain-binding fix). Audit method: external-consumer read of `skills/` + repo-wide greps for personal markers (`lythos-agent-pat`, `calt13`, `/Users/`).
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
