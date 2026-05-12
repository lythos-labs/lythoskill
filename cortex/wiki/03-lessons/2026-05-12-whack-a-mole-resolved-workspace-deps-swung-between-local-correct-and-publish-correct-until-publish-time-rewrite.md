---
created: 2026-05-12
updated: 2026-05-12
category: lesson
---

# Whack-a-mole resolved: workspace deps swung between local-correct and publish-correct until publish-time rewrite

> Two prior agents each fixed half the problem in source-level `package.json`,
> reverting each other. Today's `bunx @lythos/skill-deck@0.11.0` failure
> exposed the full picture: the fix belongs in `scripts/publish.sh`,
> not in source.

## The Journey

### Phase 1 — Concrete versions (pre-2026-05-12)

Internal `@lythos/*` deps were declared as `^0.9.x` in `packages/*/package.json`.

- **What worked**: `npm publish` shipped resolvable specifiers; external
  consumers installed cleanly via `bunx @lythos/skill-deck@0.9.51`.
- **What broke**: local source changes to one package weren't picked up by
  dependents — `bun install` resolved to the published `^0.9.x` version,
  not the local workspace source. Iteration loop required a publish to
  test cross-package changes.
- **Why we got away with it**: user was deliberately staying on the 0.9.x
  series while iterating, with frequent micro-publishes (0.9.39 → 0.9.51)
  keeping the semver specifier close enough to source.

### Phase 2 — A previous agent flips to `workspace:*` (2026-05-12)

A previous agent observed local-source-not-propagating and rewrote all
internal `@lythos/*` deps to `workspace:*` in `package.json` source,
plus a pre-commit guard rejecting semver ranges on `@lythos/*` deps
(`8b23d70 fix(workspace): all @lythos/* internal deps → workspace:*`).

- **What this fixed**: local development — internal source is always live.
- **What broke**: subsequent `npm publish` would ship manifests containing
  literal `"workspace:*"`. The breakage didn't surface immediately because
  the very next release (0.10.1) was committed locally but never actually
  published to npm (registry stayed at 0.10.0).

### Phase 3 — Full exposure on 0.11.0 publish (today, 2026-05-13)

Today's release pipeline published 0.11.0 cleanly through `scripts/publish.sh`.
All 13 packages reached npm, CI was green, every step looked successful:

- `bun install --frozen-lockfile` ✅
- workspace tests ✅
- ADR compliance checks ✅
- semgrep QA ✅
- `npm publish` for 13 packages ✅

The E2E self-test failed:

```
$ source .private/proxy.env && \
  bunx @lythos/skill-deck@0.11.0 refresh --deck playground/.../skill-deck.toml

error: Workspace dependency "@lythos/cold-pool" not found
error: Workspace dependency "@lythos/infra" not found
error: @lythos/cold-pool@workspace:* failed to resolve
error: @lythos/infra@workspace:* failed to resolve
```

Inspection of the published manifests confirmed:

```
$ npm view @lythos/skill-deck@0.11.0 dependencies
{ '@iarna/toml': '^2.2.5',
  '@lythos/cold-pool': 'workspace:*',
  '@lythos/infra': 'workspace:*',
  yaml: '^2.8.3',
  zod: '^4.3.6' }
```

`npm publish` shipped the literal `workspace:*` strings — the protocol is
not in the npm spec, only in workspace-aware package managers' resolution.
External consumers cannot resolve it.

### Phase 4 — Synthesis (terminal fix)

Both prior agents had part of the truth:

- The **`^0.9.25` agent** intuited the publish-time problem (rewrite is
  needed for published manifests). Their fix was in the wrong artifact
  (source `package.json`) but the diagnostic instinct was correct.
- The **`workspace:*` agent** intuited the local-dev problem (source must
  declare workspace protocol so source changes propagate). Their fix
  removed the publish-time band-aid without replacing it.

Neither captured both. The terminal fix combines:

- **Source**: keep `workspace:*` (so local source is live for development).
- **Publish**: rewrite `workspace:*` → `^<root-version>` immediately before
  `npm publish`, restore via `git checkout` after.

Implementation:

- `scripts/rewrite-workspace-deps.ts` — pure rewriter, takes a `package.json`
  path, walks up to root for the version, substitutes `workspace:*` → `^v`.
- `scripts/publish.sh` — refuses dirty `packages/*/package.json`, calls
  rewriter pre-publish, restores via `git checkout` in trap cleanup
  (covers success and failure paths).

Note: `bun publish` (Bun ≥ 1.3) publishes to the same npm registry and
may handle workspace protocol rewrite natively, but this is unverified —
we stay with `npm publish + explicit rewrite` for the hotfix to keep the
change minimal. Evaluation of `bun publish` is tracked as a separate
backlog task.

## Lessons

1. **The artifact you "fix" matters.** Both prior agents edited the same
   file (`packages/*/package.json`) but at the wrong layer. The correct
   layer is publish-time, in `scripts/publish.sh`. When a fix feels like
   it must contradict another fix, suspect a layering error — there is
   often a third location where both can be true at once.

2. **Whack-a-mole between two opposite "right answers" is a layer-missing
   signal.** When fix A and fix B both seem necessary but appear to
   contradict, the resolution is usually a third location (here:
   publish-time rewrite) that lets source and publish manifests stay
   consistent at their own layers.

3. **`npm publish` ≠ `pnpm publish` ≠ `bun publish`.** The workspace
   protocol rewrite is built into `pnpm publish` (verified) and likely
   `bun publish` (unverified at time of writing). `npm publish` (which
   our pipeline uses) ships source manifests literally. Using `npm publish`
   in a workspace monorepo requires explicit rewriting.

4. **Real publish E2E is the only honest test.** Local unit tests passed
   (workspace resolution intra-monorepo works fine). CI passed (same).
   `npm publish` ran without error (it doesn't validate the manifest
   against external resolvability). The bug only surfaced when a clean
   `bunx` consumer tried to install. The project's CI did not have an
   E2E publish gate — added as backlog task.

5. **Preserve the negative sample.** Like the 2026-05-13 fetch-interceptor
   saga ([[2026-05-13-sunk-cost-fallacy-git-rollback-cheaper-than-patch]]),
   this is captured in `cortex/wiki/03-lessons/` rather than silently
   fixed, so future agents inherit the diagnosis trail. The bad 0.11.0
   release is **not unpublished** — it is the public footprint of the
   pattern, and 0.11.1 with the terminal fix becomes the proper latest.

6. **"Skipped versions" are an honest record.** 0.10.1 was committed
   locally but never reached npm. 0.11.0 reached npm but is unusable.
   Both are skipped in practice; 0.11.1 is the next clean release.
   Skipped versions in a public timeline are not failures — they are the
   visible artifact of resolved uncertainty.

## Outcome

- **`scripts/rewrite-workspace-deps.ts`** written — pure rewriter.
- **`scripts/publish.sh`** patched: refuse dirty manifests, rewrite in
  loop, restore on EXIT.
- **Bump 0.11.0 → 0.11.1** (patch fix-only release).
- **Pattern documented**:
  [[2026-05-12-workspace-protocol-in-source-concrete-version-at-publish]].
- **Backlog**: CI E2E publish-validation gate (so this class of failure
  can never silently re-emerge), and `bun publish` evaluation.

## Related

- [[2026-05-12-workspace-protocol-in-source-concrete-version-at-publish]] — the pattern this lesson produced
- [[2026-05-13-sunk-cost-fallacy-git-rollback-cheaper-than-patch]] — sibling negative sample from the same session
- `8b23d70` — phase 2 (workspace:* in source)
- `b92692a` — phase 3 (broken 0.11.0 published)
- `scripts/publish.sh`, `scripts/rewrite-workspace-deps.ts` — phase 4 (terminal fix)
- `ADR-20260502233119561` — bump and lock-step versioning policy
