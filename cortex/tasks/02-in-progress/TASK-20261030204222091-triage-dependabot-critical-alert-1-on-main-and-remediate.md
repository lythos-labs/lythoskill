# TASK-20261030204222091: triage dependabot critical alert 1 on main and remediate

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-30 | Created |
| in-progress | 2026-10-30 | Started |

## Background & Goals
2026-10-30, push output from GitHub: `GitHub found 1 vulnerability on
lythos-labs/lythoskill's default branch (1 critical)` —
https://github.com/lythos-labs/lythoskill/security/dependabot/1 .

Triage blocker discovered at registration time: the agent PAT (system
keychain, service per `.private/keychain-service`) returns **403 "Resource
not accessible by personal access token"** on
`gh api repos/lythos-labs/lythoskill/dependabot/alerts`, because
**Dependabot alerts: read** is not in the AGENTS.md §9 permission table, so
it was never granted to the token. The repo has no published
security-advisories, and the root package.json has no runtime dependencies —
the vulnerable package is in a workspace (site/ vitepress chain and
packages' deps/devDeps are the suspects; nothing verified yet).

Goal: (1) identify the flagged package + version + fix version, (2) decide
remediate-now vs accepted-risk (a critical in a **docs-site devDep** may be
lower real exposure than the severity label), (3) remediate or dismiss with
record, (4) close the PAT permission gap so the next alert is readable.

## Requirements
- [ ] Alert identified: package, installed version, vulnerable range, first patched version, manifest path, reachability assessment (runtime vs devDep, shipped surface or not)
- [ ] Remediation decision recorded on this card (fix bump / dependabot PR / dismissal justification) — critical alerts are not silently dismissed
- [ ] PAT permission gap closed: Dependabot alerts: read added to the fine-grained PAT + AGENTS.md §9 permission table updated (it is the SSOT that shaped the token's grants)
- [ ] If fixed: `bun install` (lockfile), test gate green, push; verify the alert auto-resolves or is manually dismissed with reason

## Technical Approach
No architectural decision — C1–C6 all 0 (dependency triage; the AGENTS.md
table update is doc hygiene, not a decision record). No ADR.

Identification paths, in order:
1. Re-issue the PAT with **Dependabot alerts: read** (owner action — the
   token is in the owner's GitHub account), then
   `gh api repos/lythos-labs/lythoskill/dependabot/alerts --jq '.[] | select(.state=="open")'`.
   While there: grant **Security advisories: read** too — same gap family.
2. Meanwhile / fallback: local scan without GitHub auth —
   `bun pm ls` + per-package lookup on https://osv.dev (or install
   osv-scanner: `brew install osv-scanner`, then
   `osv-scanner --lockfile=bun.lock`). bun.lock is the complete dep graph.
3. The AGENTS.md §9 PAT table gets two rows added (Dependabot alerts: read —
   "read alert details for triage"; Security advisories: read — "read
   repo advisory details"). Update
   `packages/lythoskill-creator/skill/references/release-auth-workflow.md`
   too if it enumerates the same table — keep carriers in sync.

Remediation per finding shape:
- Vitepress/docs-chain devDep → bump via `bun update <pkg>` + site build
  check; exposure argument (dev-only, not shipped) recorded before any
  dismissal.
- Runtime dep in a published package → proper fix bump, test gate, and a
  release decision for the affected package (semver per §3; lock-step).

## Acceptance Criteria
- [x] AC1 Alert identified → **simple-git@3.36.0** (locked in root `bun.lock`, declared `^3.36.0` in `packages/lythoskill-cold-pool/package.json`), flagged by dependabot as GHSA-x6jw-m9v5-85vh — *critical*, range `>= 3.15.0, < 4.0.1`, patched **4.0.1 only**. Two more highs on the same installed version: GHSA-g4wm-2vf7-vfgr and GHSA-858h-whjf-mvg5 (both `<= 3.36.0`, patched 4.0.0). Reachability: cold-pool drives `git clone/fetch` against deck locators — repo URLs are user/agent-supplied input, so the unsafe-operations guard bypass class is reachable in principle; runtime dep of a published package (`@lythos/cold-pool`). site/ package-lock is **gitignored** (`.gitignore:81`) — its 8 npm-audit findings (max high, vite/vue chain, build-time only) are invisible to dependabot; swept anyway (see Progress Log).
- [x] AC2 Remediation landed → simple-git `^3.36.0` → `^4.0.1`, locked 4.0.2; cold-pool 175 tests / 0 fail; full `bun --filter='*' run test` all packages exit 0. site/: `npm audit fix` applied (gitignored lockfile, not committed) — 8 → 3 findings; remaining esbuild/vite/vitepress are dev-server-only, moderate, no fix without vitepress/vite major upgrade → **recorded as accepted risk** (docs-site build tooling, static output unaffected), follow-up if vitepress majors.
- [ ] AC3 PAT reads alerts → **owner action pending**: re-issue the fine-grained PAT with Dependabot alerts: read (+ Security advisories: read). Then verify: `gh api repos/lythos-labs/lythoskill/dependabot/alerts` exits 0 and the simple-git alert shows resolved after this push propagates.
- [x] AC4 AGENTS.md §9 table carries the two new rows → Verify: `grep -n "Dependabot alerts" AGENTS.md` exits 0 (also synced into `packages/lythoskill-creator/skill/references/release-auth-workflow.md`, carrier consistency).

## Progress Log
<!-- Update during execution, with timestamps -->
- 2026-10-30 20:45 — Started. Identification path 1 blocked (PAT 403 on /dependabot/alerts — permission gap, became AC3/AC4). Path 2 triage: root `bun.lock` clean via OSV querybatch (135 pkgs); site `package-lock.json` (gitignored → invisible to dependabot) had 8 npm-audit findings, max high. Cross-referencing every external dep against GitHub's reviewed advisory DB surfaced the critical: **simple-git@3.36.0** (GHSA-x6jw-m9v5-85vh, patched 4.0.1; plus GHSA-g4wm / GHSA-858h highs, patched 4.0.0).
- 2026-10-30 21:00 — Remediated: simple-git ^3.36.0 → ^4.0.1 (locked 4.0.2), `bun install`, cold-pool 175/0, full filter test all green. site/ `npm audit fix`: 8 → 3 (vue 3.5.44, postcss 8.5.32, source-map-js 1.2.2, nanoid 3.3.20); remaining esbuild/vite/vitepress = dev-server-only moderate, accepted + recorded on AC2. AGENTS.md §9 + release-auth-workflow.md gained the two read permissions.
- 2026-10-30 21:05 — Open: AC3 (owner re-issues PAT with Dependabot alerts: read; then confirm the alert auto-resolves post-push).

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20261030204222091)

- Detail 1
- Detail 2
```

## Notes
