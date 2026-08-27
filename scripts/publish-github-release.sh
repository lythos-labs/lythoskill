#!/usr/bin/env bash
set -euo pipefail

# Create/push Git tag and GitHub Release for the current root package.json version.
#
# Run this AFTER `./scripts/publish.sh` and AFTER `git push` so that:
#   1. npm packages are already published (per [VERSION] gotcha: npm before github push).
#   2. The release tag points to a commit that exists on origin.
#
# Keeps GitHub tags/releases in lock-step with npm.
# Requires `.github-token` (gitignored) for the gh CLI.
# Safe to re-run: skips existing tags/releases instead of failing.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TOKEN_FILE="$ROOT_DIR/.github-token"

ROOT_VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
TAG="v$ROOT_VERSION"

echo "🏷️  Publishing GitHub release $TAG..."

# Create/push tag
if git -C "$ROOT_DIR" rev-parse "$TAG" >/dev/null 2>&1; then
  echo "   Tag $TAG already exists locally."
else
  git -C "$ROOT_DIR" tag -a "$TAG" -m "Release $TAG"
  echo "   ✅ Created tag $TAG"
fi

if git -C "$ROOT_DIR" ls-remote --tags origin "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "   Tag $TAG already exists on origin."
else
  git -C "$ROOT_DIR" push origin "$TAG"
  echo "   ✅ Pushed tag $TAG"
fi

# Create GitHub Release
export GH_TOKEN
GH_TOKEN=$(cat "$TOKEN_FILE" 2>/dev/null || echo "")
if [ -z "$GH_TOKEN" ]; then
  echo "❌ Token file not found or empty: $TOKEN_FILE"
  echo "   Place your GitHub personal access token in this file (gitignored)."
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ gh CLI not found. Install it to create GitHub Releases."
  exit 1
fi

if gh release view "$TAG" --repo lythos-labs/lythoskill >/dev/null 2>&1; then
  echo "   GitHub Release $TAG already exists."
else
  echo ""
  echo "🚀 Creating GitHub Release $TAG..."
  gh release create "$TAG" \
    --repo lythos-labs/lythoskill \
    --title "$TAG" \
    --notes "See [CHANGELOG](https://github.com/lythos-labs/lythoskill/blob/main/CHANGELOG.md)." \
    --latest
  echo "   ✅ Created GitHub Release $TAG"
fi
