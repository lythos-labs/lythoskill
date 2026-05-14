#!/usr/bin/env bash
set -euo pipefail

# Publish all lythos packages to npm.
# Reads access token from .npm-access (gitignored, never committed).
#
# WORKSPACE PROTOCOL REWRITE — historical context:
#   Internal @lythos/* deps live as "workspace:*" in source so local
#   development always picks up the latest workspace code. `npm publish`
#   does NOT rewrite the protocol (unlike pnpm publish), so the
#   published manifest would ship with unresolvable `workspace:*`
#   specifiers — broken for every external `bunx` / `npm install` user.
#
#   A previous agent solved this by hand-coding `^0.9.25` in
#   package.json source, which broke local-source workflow; another
#   agent reverted to `workspace:*`, which broke publish. Neither
#   captured the full picture. This script keeps `workspace:*` in
#   source AND rewrites at publish time, then restores via
#   `git checkout` after. Surfaced as a real bug in 0.11.0 publish
#   (every package shipped with workspace:* → bunx pulls failed).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TOKEN_FILE="$ROOT_DIR/.npm-access"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "❌ Token file not found: $TOKEN_FILE"
  echo "   Place your npm access token in this file (gitignored)."
  exit 1
fi

TOKEN=$(tr -d '[:space:]' < "$TOKEN_FILE")
if [ -z "$TOKEN" ]; then
  echo "❌ Token file is empty: $TOKEN_FILE"
  exit 1
fi

# Refuse to publish with dirty working tree — `git checkout` restore
# (after the workspace:* rewrite) would clobber unrelated uncommitted
# edits in any packages/*/package.json.
if ! git -C "$ROOT_DIR" diff --quiet -- packages/*/package.json; then
  echo "❌ Uncommitted changes in packages/*/package.json detected."
  echo "   The publish-time workspace:* rewrite uses git checkout to restore."
  echo "   Commit or stash your changes before publishing."
  exit 1
fi

echo "🔐 Token loaded from $TOKEN_FILE"
echo ""

# Save current npm settings
OLD_REGISTRY=$(npm config get registry 2>/dev/null || echo "")

cleanup() {
  echo ""
  echo "🔄 Restoring packages/*/package.json (post-publish workspace:* restore)..."
  (cd "$ROOT_DIR" && git checkout -- packages/*/package.json) || true

  echo "🧹 Cleaning up npm config..."
  if [ -n "$OLD_REGISTRY" ]; then
    npm config set registry "$OLD_REGISTRY" 2>/dev/null || true
  fi
  npm config delete //registry.npmjs.org/:_authToken 2>/dev/null || true
}
trap cleanup EXIT

# Configure npm for publishing
npm config set registry https://registry.npmjs.org/
npm config set //registry.npmjs.org/:_authToken "$TOKEN"

# Verify auth
WHOAMI=$(npm whoami 2>/dev/null || echo "")
if [ -z "$WHOAMI" ]; then
  echo "❌ npm auth failed. Check your token."
  exit 1
fi
echo "✅ Logged in as: $WHOAMI"
echo ""

# Publish order: zero-deps first, then arena (depends on test-utils), deck last
PACKAGES=(
  "packages/lythoskill-hello-world"
	  "packages/lythoskill-agent-adapter"
	  "packages/lythoskill-agent-adapter-claude-sdk"
	  "packages/lythoskill-agent-adapter-deepseek-serve"
  "packages/lythoskill-agent-adapter-codex"
  "packages/lythoskill-test-utils"
  "packages/lythoskill-infra"
  "packages/lythoskill-cold-pool"
  "packages/lythoskill-project-cortex"
  "packages/lythoskill-curator"
  "packages/lythoskill-arena"
  "packages/lythoskill-creator"
  "packages/lythoskill-deck"
)

# Pre-publish: rewrite workspace:* → ^version in every package.json we will publish.
# Restore happens in cleanup() via git checkout (success or failure path).
echo "🔄 Pre-publish: translating workspace:* → ^version in published manifests..."
for pkg in "${PACKAGES[@]}"; do
  bun "$ROOT_DIR/scripts/rewrite-workspace-deps.ts" "$ROOT_DIR/$pkg/package.json"
done
echo ""

for pkg in "${PACKAGES[@]}"; do
  PKG_DIR="$ROOT_DIR/$pkg"
  PKG_NAME=$(node -p "require('$PKG_DIR/package.json').name")
  echo "📦 Publishing $PKG_NAME ..."
  (cd "$PKG_DIR" && npm publish --workspaces=false --access=public)
  echo "   ✅ Published $PKG_NAME"
  echo ""
done

echo "🎉 All packages published!"

# ── E2E publish validation ───────────────────────────────────────────
# Spawn clean bunx in tmp dir to catch workspace:* or other manifest bugs
# that slip through despite pre-publish rewrite. This is the catch-all gate.

echo ""
echo "🔍 E2E validation: verifying published packages resolve externally..."

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"; cleanup' EXIT

VALIDATION_FAILED=0
for pkg in "${PACKAGES[@]}"; do
  PKG_DIR="$ROOT_DIR/$pkg"
  PKG_NAME=$(node -p "require('$PKG_DIR/package.json').name")
  PKG_VERSION=$(node -p "require('$PKG_DIR/package.json').version")

  echo "   Verifying $PKG_NAME@$PKG_VERSION ..."

  # Try to resolve the package in a clean tmp directory
  if ! (cd "$TMP_DIR" && bunx "$PKG_NAME@$PKG_VERSION" --help >/dev/null 2>&1 || \
        cd "$TMP_DIR" && bun add "$PKG_NAME@$PKG_VERSION" >/dev/null 2>&1); then
    echo "   ❌ FAILED: $PKG_NAME@$PKG_VERSION could not be resolved externally."
    echo "      Possible causes: workspace:* leaked into manifest, broken main/bin field, tarball malformed."
    VALIDATION_FAILED=1
  else
    echo "   ✅ Resolved: $PKG_NAME@$PKG_VERSION"
  fi
done

rm -rf "$TMP_DIR"

if [ "$VALIDATION_FAILED" -eq 1 ]; then
  echo ""
  echo "❌ E2E validation FAILED. At least one package could not be resolved externally."
  echo "   The published manifest(s) may contain workspace:* or other bugs."
  echo "   Check the failed package(s) above. Do NOT tag a release until fixed."
  exit 1
fi

echo ""
echo "✅ E2E validation passed. All packages resolve correctly from npm."
