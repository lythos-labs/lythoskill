#!/usr/bin/env bash
set -euo pipefail

# Publish all lythos packages to npm.
# Reads access token from .npm-access (gitignored, never committed).

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

echo "🔐 Token loaded from $TOKEN_FILE"
echo ""

# Save current npm settings
OLD_REGISTRY=$(npm config get registry 2>/dev/null || echo "")

cleanup() {
  echo ""
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

# Publish order: zero-deps first, then deck (has dependencies)
PACKAGES=(
  "packages/lythoskill-hello-world"
  "packages/lythoskill-project-cortex"
  "packages/lythoskill-arena"
  "packages/lythoskill-creator"
  "packages/lythoskill-deck"
)

for pkg in "${PACKAGES[@]}"; do
  PKG_DIR="$ROOT_DIR/$pkg"
  PKG_NAME=$(node -p "require('$PKG_DIR/package.json').name")
  echo "📦 Publishing $PKG_NAME ..."
  (cd "$PKG_DIR" && npm publish --workspaces=false --access=public)
  echo "   ✅ Published $PKG_NAME"
  echo ""
done

echo "🎉 All packages published!"
