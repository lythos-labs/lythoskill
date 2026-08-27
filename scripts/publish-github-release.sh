#!/usr/bin/env bash
set -euo pipefail

# Create/push Git tag and GitHub Release for the current root package.json version.
#
# Run this AFTER `./scripts/publish.sh` and AFTER `git push` so that:
#   1. npm packages are already published (per [VERSION] gotcha: npm before github push).
#   2. The release tag points to a commit that exists on origin.
#
# Keeps GitHub tags/releases in lock-step with npm.
# Reads GH_TOKEN from (in order): env var, macOS keychain, Linux secret-tool, .github-token file.
# Safe to re-run: skips existing tags/releases instead of failing.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TOKEN_FILE="$ROOT_DIR/.github-token"
KEYCHAIN_SERVICE="lythos-agent-pat"

ROOT_VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
TAG="v$ROOT_VERSION"
TARGET_COMMIT="${1:-HEAD}"

echo "🏷️  Publishing GitHub release $TAG (target: $TARGET_COMMIT)..."

# Resolve target commit
TARGET_SHA=$(git -C "$ROOT_DIR" rev-parse "$TARGET_COMMIT")

echo "   Target SHA: ${TARGET_SHA:0:12}"

# Create/push tag
if git -C "$ROOT_DIR" rev-parse "$TAG" >/dev/null 2>&1; then
  EXISTING_SHA=$(git -C "$ROOT_DIR" rev-parse "$TAG^{commit}")
  if [ "$EXISTING_SHA" != "$TARGET_SHA" ]; then
    echo "❌ Tag $TAG already exists locally and points to ${EXISTING_SHA:0:12}, not ${TARGET_SHA:0:12}."
    echo "   Delete it first if you really want to move it, or pass a different target."
    exit 1
  fi
  echo "   Tag $TAG already exists locally and points to the correct commit."
else
  git -C "$ROOT_DIR" tag -a "$TAG" "$TARGET_SHA" -m "Release $TAG"
  echo "   ✅ Created tag $TAG → ${TARGET_SHA:0:12}"
fi

if [ -n "$(git -C "$ROOT_DIR" ls-remote --tags origin "refs/tags/$TAG")" ]; then
  echo "   Tag $TAG already exists on origin."
else
  git -C "$ROOT_DIR" push origin "$TAG"
  echo "   ✅ Pushed tag $TAG"
fi

# Resolve GitHub token (env var > macOS keychain > Linux secret-tool > .github-token file)
resolve_token() {
  if [ -n "${GH_TOKEN:-}" ]; then
    echo "$GH_TOKEN"
    return 0
  fi

  if command -v security >/dev/null 2>&1; then
    local token
    token=$(security find-generic-password -s "$KEYCHAIN_SERVICE" -w 2>/dev/null || echo "")
    if [ -n "$token" ]; then
      echo "$token"
      return 0
    fi
  fi

  if command -v secret-tool >/dev/null 2>&1; then
    local token
    token=$(secret-tool lookup org lythos-labs scope agent 2>/dev/null || echo "")
    if [ -n "$token" ]; then
      echo "$token"
      return 0
    fi
  fi

  if [ -f "$TOKEN_FILE" ]; then
    cat "$TOKEN_FILE" 2>/dev/null || echo ""
    return 0
  fi

  echo ""
}

export GH_TOKEN
GH_TOKEN=$(resolve_token)
if [ -z "$GH_TOKEN" ]; then
  echo "❌ GitHub token not found."
  echo ""
  echo "   Store it in one of the following ways:"
  echo ""
  echo "   macOS Keychain (recommended):"
  echo "     security add-generic-password -s '$KEYCHAIN_SERVICE' -a '\$USER' -w"
  echo ""
  echo "   Linux secret-tool:"
  echo "     secret-tool store --label='lythos-labs agent PAT' org lythos-labs scope agent"
  echo ""
  echo "   Legacy file (gitignored, less secure):"
  echo "     echo 'github_pat_xxx' > $TOKEN_FILE"
  echo ""
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
