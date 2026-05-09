#!/usr/bin/env bash
# Configure this clone so it can never push to the parent/upstream repository.
#
# Run once per fresh clone:
#   bash scripts/setup-git-guards.sh
#
# What it does (all changes are LOCAL to this clone, no global git config):
#   1. Sets core.hooksPath to .githooks so the tracked pre-push hook is active.
#   2. Pins pushDefault and branch.<main>.pushRemote to 'origin'.
#   3. If a remote named 'upstream' exists (or any remote whose fetch URL points
#      at brandonwise/humanizer), forces its push URL to 'no_push' so even an
#      explicit `git push upstream ...` cannot reach the parent repo.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

forbidden_substring="brandonwise/humanizer"

echo "==> Enabling tracked git hooks (.githooks/)"
chmod +x .githooks/pre-push .githooks/pre-commit 2>/dev/null || true
git config core.hooksPath .githooks

echo "==> Pinning push defaults to origin"
git config remote.pushDefault origin

default_branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || echo main)"
git config "branch.${default_branch}.pushRemote" origin

echo "==> Neutralising push URLs for any remote pointing at the parent repo"
while IFS= read -r remote; do
  [ -n "$remote" ] || continue
  fetch_url="$(git remote get-url "$remote" 2>/dev/null || true)"
  lower_url="$(printf '%s' "$fetch_url" | tr '[:upper:]' '[:lower:]')"

  if [ "$remote" = "upstream" ] || [[ "$lower_url" == *"$forbidden_substring"* ]]; then
    echo "    - $remote ($fetch_url) -> push URL set to no_push"
    git remote set-url --push "$remote" no_push
  fi
done < <(git remote)

echo
echo "Done. This clone will refuse to push to ${forbidden_substring}."
echo "Verify with:  git remote -v  &&  git config --get core.hooksPath"
