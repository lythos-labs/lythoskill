---
created: 2026-05-12
updated: 2026-05-12
category: pattern
---

# Workspace protocol in source, concrete version at publish

> Monorepo internal deps live as `"@scope/pkg": "workspace:*"` in source so
> local development always uses the latest workspace code; at publish time
> the protocol is rewritten to `"^<root-version>"` so external consumers
> get resolvable specifiers.

## Context

Bun, pnpm, and yarn workspaces support a **workspace protocol**
(`workspace:*`, `workspace:^`, `workspace:~`) that tells the package
manager: "this internal dep is resolved by the workspace, ignore semver."
This is correct for **local development** — internal source changes are
picked up instantly, no `npm install` round-trip and no risk of dependent
packages silently resolving to a stale published version.

The problem is **publishing**. `npm publish` does NOT rewrite the protocol
when shipping the manifest to the registry. A package published with
`"@scope/internal": "workspace:*"` ships to npm with that literal string,
which is unresolvable for any consumer outside the monorepo:

```
$ bunx @lythos/skill-deck@0.11.0 refresh ...
error: @lythos/cold-pool@workspace:* failed to resolve
error: @lythos/infra@workspace:* failed to resolve
```

`pnpm publish` handles the rewrite internally (verified). `bun publish`
(Bun ≥ 1.3) publishes to the same npm registry and may handle the rewrite
natively — this is **unverified at the time of writing**; treat as "open
to evaluation, not a known alternative." Projects using **`npm publish`
directly** (e.g. via a custom `scripts/publish.sh`) must apply the rewrite
themselves.

## Details

Keep `workspace:*` in `packages/*/package.json` source. At publish time,
translate it to `^<root-version>` immediately before `npm publish`,
restore via `git checkout` after.

```bash
# scripts/publish.sh (excerpt)

# Refuse to run with dirty package.json — git checkout restore would
# clobber unrelated uncommitted edits.
if ! git -C "$ROOT_DIR" diff --quiet -- packages/*/package.json; then
  echo "❌ Uncommitted changes in packages/*/package.json"
  exit 1
fi

# trap restore + cleanup (success or failure path)
cleanup() {
  (cd "$ROOT_DIR" && git checkout -- packages/*/package.json) || true
  # ... npm config cleanup ...
}
trap cleanup EXIT

# Pre-publish: rewrite workspace:* → ^version
for pkg in "${PACKAGES[@]}"; do
  bun scripts/rewrite-workspace-deps.ts "$pkg/package.json"
done

# Publish loop — manifests now contain resolvable specifiers
for pkg in "${PACKAGES[@]}"; do
  (cd "$pkg" && npm publish --workspaces=false --access=public)
done
```

The rewrite helper (`scripts/rewrite-workspace-deps.ts`) reads the root
`package.json` `version` and substitutes every `workspace:*` dep value
with `^<version>`. Restore is via `git checkout` because the rewrites are
transient — they only need to live long enough for `npm publish` to read
the manifest.

**Guard rails**:

- Refuse to publish if `packages/*/package.json` is dirty (the `git checkout`
  restore would clobber unrelated edits).
- The rewriter walks up from the target file to find the workspace root —
  any move that breaks that walk also breaks rewrite. Keep root
  `package.json` at the workspace root.
- `--workspaces=false` on `npm publish` keeps npm from auto-recursing into
  workspace siblings; we publish them ourselves in order.

## When to Apply / When Not to Apply

**Apply** when:

- Monorepo with internal cross-package deps
- Publishing some/all packages to npm via `npm publish`
- Want local dev to always use latest workspace source (vs. last-published)

**Skip** when:

- Using `pnpm publish` (verified to auto-rewrite)
- Using `bun publish` AFTER verifying it auto-rewrites (run a dry-run and
  inspect the manifest; do not assume parity with pnpm)
- Single-package repo (no internal workspace deps)
- Publishing to a private registry that supports `workspace:*` natively

## Related

- [[2026-05-12-whack-a-mole-resolved-workspace-deps-swung-between-local-correct-and-publish-correct-until-publish-time-rewrite]] — the diagnostic journey that produced this pattern
- `scripts/publish.sh` — implementation
- `scripts/rewrite-workspace-deps.ts` — the rewriter
- `ADR-20260502233119561` — bump and lock-step versioning policy
