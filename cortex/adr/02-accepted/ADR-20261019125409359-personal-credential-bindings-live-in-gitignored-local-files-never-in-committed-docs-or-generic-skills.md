---
supersedes: []
superseded_by: null
# 下面两项是与 task / epic 的机器可读关联(与 ## Related 段同一件事的两份)
epic: null
tasks: []
---

# ADR-20261019125409359: personal credential bindings live in gitignored local files, never in committed docs or generic skills

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-10-19 | Created |
| accepted | 2026-10-19 | Accepted |

## Background

Lythoskill is two things at once: (1) its own first user — a project that
maintains itself via AGENTS.md conventions and dogfooded skills; (2) a tool
publisher — generic skills (e.g. `lythoskill-project-onboarding`) shipped to
npm and consumed by projects that are not lythoskill. These two positions
have different contracts for where credential facts may live.

On 2026-10-13, three red main pushes went undetected for ~6 hours because the
post-push CI check was skipped. The fix (TASK-20261013225251343, commit
`ee12884d`) added "Layer 3b CI 尾检" to the **generic** onboarding skill so
every session starts by checking the last main push's CI status. To make the
code block runnable as-is, the block included this project's own credential
incantation:

```bash
export GH_TOKEN="$(security find-generic-password -s 'lythos-agent-pat' -w)"
```

`lythos-agent-pat` is the keychain service name of one developer's personal
keychain entry, documented in this repo's AGENTS.md §9. Baking it into a
generic skill is a positioning confusion: self-maintenance conventions leaked
into a product meant for other people. Consequences, verified 2026-10-19:

1. **Wrong context in any non-lythos project.** Running onboarding elsewhere
   reads a keychain entry that has nothing to do with that project.
2. **Fails anyway even when the token matches.** `gh auth status` shows the
   gh-keyring token and the keychain token are the same fine-grained PAT; in
   a repo the PAT is not authorized for (e.g. `llmvram`), `gh run list`
   returns 404 regardless of which source the token came from. The export
   adds nothing over ambient `gh` auth.

The same class of leakage existed in committed docs and one runtime script:
AGENTS.md §9 (6 mentions), `packages/lythoskill-creator/skill/references/
release-auth-workflow.md` (6 mentions), and
`scripts/publish-github-release.sh` (`KEYCHAIN_SERVICE="lythos-agent-pat"`).
All committed, all binding every future maintainer to one person's keychain
naming choice.

Mechanism (verified from `git show ee12884d` and the task card): the owner's
post-incident demand was "怎么让你能够严格执行不跳不漏" — and the fix
plastered the check into every entry point at once (Submit SOP + Gotchas +
onboarding skill). The credential export rode along as a "runnable as-is"
afterthought; nobody checked which positioning each line belonged to.
Stress-response patching after an auth-flow scare, not a designed decision.

## Decision Drivers

- A generic skill must be context-clean: it runs in projects whose auth
  setup it cannot know. Its correct dependency is **ambient `gh` auth**
  (whatever account `gh` is logged into), plus honest failure semantics —
  not a project-specific credential path.
- The trust cost is borne by outsiders, not us. An external consumer who
  hits `lythos-agent-pat` in a generic skill reads it as "this skill is not
  for me — it is the author's private ops script published as a product."
  The keychain error makes them doubt their own setup, not the skill; the
  vendor-flavored name smells like a callback path; and one such leak
  invalidates the project's core claim — `skills/` is "self-contained for
  any agent ecosystem". Positioning confusion (self-maintenance vs. product)
  is paid for in ecosystem credibility.
- A project that needs its own key is entitled to maintain that binding, but
  a binding tied to a specific developer's personal key naming belongs in
  **gitignored local space**. Otherwise every other maintainer must recreate
  an identically-named key just to satisfy committed documentation.
- The repo already has this pattern: `.private/` (gitignored, `.gitignore:35`)
  holds `decision-profile.md`, `user-sim-reviewer.md` — personal/machine-local
  bindings that committed docs reference by path and skip silently when absent.

## Options

### Option A — keep hardcoding, generic skill exports the project keychain name

**Pros**:
- Zero change; the CI 尾检 block runs copy-paste-runnable in *this* repo.

**Cons**:
- Wrong-context token in every non-lythos project (the skill is a product;
  this is a correctness bug, not a style issue).
- Repository docs bind all future maintainers to one person's keychain naming.
- Masked the real 404 semantics (PAT repo grants) behind an irrelevant export.

### Option B — credential binding lives in a gitignored local file; committed docs and generic skills reference ambient auth / the local file

- Generic skills (onboarding Layer 3b): drop the export entirely, run `gh
  run list` on ambient auth, document failure modes (401 = expired; 404 =
  authenticated account lacks grant for this repo → check `gh auth status`
  or the project's own auth doc).
- This repo: binding file `.private/keychain-service` (gitignored) holds the
  service name; AGENTS.md §9 and release-auth-workflow.md read it via an
  unguarded `$(cat .private/keychain-service)` (a missing file is loud at the
  command line); `publish-github-release.sh` reads it and skips the keychain
  step when the file is absent — loud failure lives at the end of its token
  chain, not per-source.

**Pros**:
- Generic skill becomes context-clean; works wherever `gh` is logged in.
- New maintainers invent their own binding name; nothing personal is committed.
- Loud failure when the binding is missing — docs' bare `$(cat …)` errors
  visibly at the command line; the release script's end-of-chain error teaches
  the binding file. No fallback to a baked-in default (a fallback would
  re-introduce the binding).
- Reuses the established `.private/` precedent.

**Cons**:
- One-time setup step per machine (create the one-line file).
- Chicken-and-egg for newcomers: docs must teach "create the binding file
  first" instead of "run this one command".

### Option C — drop keychain entirely, rely only on gh's own keyring

**Pros**:
- One auth source; nothing project-specific to document.

**Cons**:
- The keychain PAT also serves non-`gh` consumers (API calls, release script
  fallback chain); retiring it is a bigger auth redesign than this fix.
- Doesn't answer where *project* auth conventions should live — swaps the
  mechanism, not the layering. Out of scope for the two-cut fix.

## Decision

**Choice**: Option B.

**Rationale**:

The layering principle, stated once: **personal credential bindings live in
gitignored local files; committed docs reference them indirectly; generic
skills never carry them at all.** This is the user's own two-cut framing
(2026-10-19): cut 1 removes the hardcode from the skill, cut 2 makes the
project maintain its own key in gitignore-style space. Generic skills depend
on ambient auth because that is the only dependency every host project is
guaranteed to have.

## Impact

- Positive:
  - Onboarding Layer 3b is context-clean; CI 尾检 works in any project with a
    logged-in `gh`.
  - 404/401 semantics documented honestly in the skill.
  - No committed file binds future maintainers to `lythos-agent-pat`.
- Negative:
  - This machine needs `.private/keychain-service` created before the release
    script works (done as part of this change's task).
- Follow-up:
  - [ ] Linux `secret-tool` attributes (`org lythos-labs scope agent`) left
    literal — they are org-scoped lookup attributes, not a personal naming
    choice; revisit only if a second Linux maintainer appears. (sha: —)
  - [ ] PAT not authorized for `llmvram` is a GitHub-side grant issue, outside
    this repo — noted so the next reader doesn't chase it here. (sha: —)

## Related
- Related ADR: ADR-20260910113534807 (decisions ride in ADRs, not card Technical Approaches)
- Related Epic: —
