# TASK-20261030204222091: triage dependabot critical alert 1 on main and remediate

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-30 | Created |

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
- [ ] AC1 Alert fully identified → Verify: this card quotes package, versions, manifest path, and a one-line reachability verdict
- [ ] AC2 Remediation landed or dismissal recorded with justification → Verify: commit hash or GitHub dismissal reason referenced here
- [ ] AC3 PAT reads alerts → Verify: `gh api repos/lythos-labs/lythoskill/dependabot/alerts` exits 0 (empty or populated)
- [ ] AC4 AGENTS.md §9 table carries the two new rows → Verify: `grep -n "Dependabot alerts" AGENTS.md` exits 0

## Progress Log
<!-- Update during execution, with timestamps -->

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
