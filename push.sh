#!/bin/bash
# Push to GitHub using the token stored in .env (which is gitignored).
#
#   1. Put your fine-grained PAT in .env  ->  GITHUB_PAT=github_pat_...
#   2. Run ./push.sh            (pushes current branch to origin/main)
#
# The token is read from .env at runtime and handed to git via a credential
# helper, so it never lands in the command line, .git/config, or a remote URL.

set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "ERROR: no .env file. Copy .env.example to .env and add your token." >&2
  exit 1
fi

# Load .env
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${GITHUB_USER:?Set GITHUB_USER in .env}"
: "${GITHUB_REPO:?Set GITHUB_REPO in .env}"
if [ -z "${GITHUB_PAT:-}" ]; then
  echo "ERROR: GITHUB_PAT is empty. Paste your token into .env." >&2
  exit 1
fi

# Ensure the origin remote points at the clean HTTPS URL (no token embedded).
REMOTE_URL="https://github.com/${GITHUB_REPO}.git"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "==> Pushing $BRANCH to $REMOTE_URL"

# Credential helper reads the exported GITHUB_* env vars at runtime.
# The leading empty `credential.helper=` resets any inherited helpers (e.g. the
# macOS keychain), so ONLY our token is used - not a stale cached credential.
export GITHUB_USER GITHUB_PAT
git -c credential.helper= \
    -c credential.helper='!f() { echo "username=${GITHUB_USER}"; echo "password=${GITHUB_PAT}"; }; f' \
  push -u origin "$BRANCH" "$@"

echo "==> Done. Actions will build and deploy to https://adoucett.github.io/Piano/"
