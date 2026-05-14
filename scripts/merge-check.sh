#!/usr/bin/env bash
# Repo-local merge gate for markus-lassfolk/humanizer.
#
# Stewardship usage:
#   scripts/merge-check.sh --pr <number> --verbose
#
# This script is intentionally non-merging: it verifies whether a Humanizer PR is
# safe for future stewardship automation to merge, then exits 0/1. Keep any
# actual merge action outside this repository-local gate, and never bypass the
# blockers reported here.

set -euo pipefail

OWNER="markus-lassfolk"
REPO="humanizer"
FULL_REPO="$OWNER/$REPO"
BASE_BRANCH="main"

REQUIRED_STAGE="stage/approved"
ALLOWED_STAGES=("stage/implementing" "stage/review" "stage/council" "stage/pending-merge" "stage/approved")
BLOCKER_LABELS=("fixes-needed" "needs-manual-fix")
REQUIRED_CHECKS=("lint" "format" "locale" "test" "Analyze (javascript-typescript)" "CodeQL")
OPTIONAL_CHECKS=("Cursor Bugbot" "audit (non-blocking)")
COUNCIL_KEYWORDS=("council" "deep verification" "deep-verification" "current-head")

PR_NUMBER=""
VERBOSE=0

usage() {
  cat <<USAGE
Usage: $0 --pr <number> [--verbose]

Checks whether a $FULL_REPO pull request satisfies the repo-local merge gate.
The gate never merges; it only reports pass/fail.
USAGE
}

log() {
  printf '%s\n' "$*"
}

verbose() {
  if [[ "$VERBOSE" -eq 1 ]]; then
    printf '[merge-check] %s\n' "$*"
  fi
}

failures=()

fail() {
  failures+=("$*")
  printf 'BLOCKED: %s\n' "$*" >&2
}

require_bin() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'ERROR: required command not found: %s\n' "$1" >&2
    exit 2
  fi
}

json_get() {
  jq -r "$1"
}

has_label() {
  local label="$1"
  jq -e --arg label "$label" '.labels | any(.name == $label)' <<<"$PR_JSON" >/dev/null
}

check_label_stage() {
  local stages
  mapfile -t stages < <(jq -r '.labels[].name | select(startswith("stage/"))' <<<"$PR_JSON")

  verbose "stage labels: ${stages[*]:-(none)}"

  if [[ "${#stages[@]}" -ne 1 ]]; then
    fail "expected exactly one stage label, found ${#stages[@]} (${stages[*]:-(none)})"
    return
  fi

  local stage="${stages[0]}"
  local known=0
  for allowed in "${ALLOWED_STAGES[@]}"; do
    if [[ "$stage" == "$allowed" ]]; then
      known=1
      break
    fi
  done
  if [[ "$known" -ne 1 ]]; then
    fail "unknown stage label '$stage'"
  fi

  if [[ "$stage" != "$REQUIRED_STAGE" ]]; then
    fail "PR must be in $REQUIRED_STAGE before merge, found $stage"
  fi
}

check_blocker_labels() {
  local label
  for label in "${BLOCKER_LABELS[@]}"; do
    if has_label "$label"; then
      fail "manual blocker label present: $label"
    fi
  done
}

check_pr_state() {
  local state draft merge_state base_ref
  state=$(json_get '.state' <<<"$PR_JSON")
  draft=$(json_get '.isDraft' <<<"$PR_JSON")
  merge_state=$(json_get '.mergeStateStatus' <<<"$PR_JSON")
  base_ref=$(json_get '.baseRefName' <<<"$PR_JSON")

  verbose "state=$state draft=$draft mergeStateStatus=$merge_state base=$base_ref"

  [[ "$state" == "OPEN" ]] || fail "PR state must be OPEN, found $state"
  [[ "$draft" == "false" ]] || fail "draft PRs cannot be merged"
  [[ "$base_ref" == "$BASE_BRANCH" ]] || fail "base branch must be $BASE_BRANCH, found $base_ref"

  case "$merge_state" in
    CLEAN|HAS_HOOKS)
      ;;
    BLOCKED|BEHIND|DIRTY|DRAFT|UNSTABLE|UNKNOWN)
      fail "merge state is $merge_state"
      ;;
    *)
      fail "unexpected merge state: $merge_state"
      ;;
  esac
}

check_review_threads() {
  local unresolved cursor has_next all_threads page_data
  all_threads="[]"
  cursor="null"
  has_next="true"

  while [[ "$has_next" == "true" ]]; do
    page_data=$(gh api graphql \
      -f owner="$OWNER" \
      -f repo="$REPO" \
      -F pr="$PR_NUMBER" \
      -f cursor="$cursor" \
      -f query='query($owner:String!, $repo:String!, $pr:Int!, $cursor:String) { repository(owner:$owner, name:$repo) { pullRequest(number:$pr) { reviewThreads(first:100, after:$cursor) { nodes { isResolved } pageInfo { hasNextPage endCursor } } } } }')
    
    all_threads=$(jq -n --argjson all "$all_threads" --argjson page "$page_data" '$all + $page.data.repository.pullRequest.reviewThreads.nodes')
    has_next=$(jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage' <<<"$page_data")
    cursor=$(jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor' <<<"$page_data")
  done

  unresolved=$(jq '[.[] | select(.isResolved == false)] | length' <<<"$all_threads")

  verbose "unresolved review threads=$unresolved"
  [[ "$unresolved" == "0" ]] || fail "unresolved review threads remain: $unresolved"
}

check_reviews_current_head() {
  local head_oid changes_requested stale_changes current_approval_count latest_reviews
  head_oid=$(json_get '.headRefOid' <<<"$PR_JSON")

  latest_reviews=$(jq 'map(select(.state != "COMMENTED" and .state != "DISMISSED")) | group_by(.user.login) | map(sort_by(.submitted_at) | last)' <<<"$PR_REVIEWS")

  changes_requested=$(jq '[.[] | select(.state == "CHANGES_REQUESTED")] | length' <<<"$latest_reviews")
  [[ "$changes_requested" == "0" ]] || fail "changes requested reviews remain: $changes_requested"

  stale_changes=$(jq --arg head "$head_oid" '[.[] | select((.state == "APPROVED") and (.commit_id != $head))] | length' <<<"$latest_reviews")
  [[ "$stale_changes" == "0" ]] || fail "stale approvals exist from an older head: $stale_changes"

  current_approval_count=$(jq --arg head "$head_oid" '[.[] | select((.state == "APPROVED") and (.commit_id == $head))] | length' <<<"$latest_reviews")
  verbose "current-head approvals=$current_approval_count"

  if [[ "$current_approval_count" -lt 1 ]]; then
    fail "no current-head approval found for head $head_oid"
  fi
}

check_council_current_head() {
  local head_oid issue_comments matched
  head_oid=$(json_get '.headRefOid' <<<"$PR_JSON")

  issue_comments=$(gh api "repos/$FULL_REPO/issues/$PR_NUMBER/comments" --paginate)

  matched=$(jq -n \
    --arg head "$head_oid" \
    --argjson issueComments "$issue_comments" \
    --argjson reviews "$PR_REVIEWS" \
    --argjson keywords "$(printf '%s\n' "${COUNCIL_KEYWORDS[@]}" | jq -R . | jq -s .)" \
    'def norm: ascii_downcase;
     def mentions_head($text): (($text // "") | contains($head) or contains($head[0:12]) or contains($head[0:8]));
     def mentions_keyword($text): any($keywords[]; . as $kw | ($text // "") | norm | contains($kw));
     ([ $issueComments[]? | select(mentions_head(.body) and mentions_keyword(.body)) ]
      + [ $reviews[]? | select(mentions_head(.body) and mentions_keyword(.body)) ]) | length')

  verbose "current-head council/deep verification comments=$matched"
  if [[ "$matched" -lt 1 ]]; then
    fail "no current-head council/deep verification evidence found for $head_oid"
  fi
}

check_checks() {
  local rollup missing pending failing name status conclusion matches acceptable optional
  rollup=$(jq '.statusCheckRollup' <<<"$PR_JSON")

  for name in "${REQUIRED_CHECKS[@]}"; do
    matches=$(jq --arg name "$name" '[.[]? | select((.name // .context) == $name)]' <<<"$rollup")
    if [[ "$(jq 'length' <<<"$matches")" == "0" ]]; then
      fail "required check missing: $name"
      continue
    fi

    pending=$(jq '[.[] | select((.status // "COMPLETED") != "COMPLETED" and (.state // "SUCCESS") | IN("PENDING", "QUEUED") )] | length' <<<"$matches")
    failing=$(jq '[.[] | select((.status == "COMPLETED" and (.conclusion != "SUCCESS")) or (.state // "SUCCESS" | IN("FAILURE", "ERROR")))] | length' <<<"$matches")
    [[ "$pending" == "0" ]] || fail "required check pending: $name"
    [[ "$failing" == "0" ]] || fail "required check failing: $name"
  done

  failing=$(jq -r --argjson optional "$(printf '%s\n' "${OPTIONAL_CHECKS[@]}" | jq -R . | jq -s .)" --argjson required "$(printf '%s\n' "${REQUIRED_CHECKS[@]}" | jq -R . | jq -s .)" '[.[]? | select((.status == "COMPLETED" and (.conclusion | IN("FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED"))) or (.state // "SUCCESS" | IN("FAILURE", "ERROR")))] | map(.name // .context) | . - $optional - $required | unique | join(", ")' <<<"$rollup")
  if [[ -n "$failing" ]]; then
    fail "failing check(s): $failing"
  fi

  pending=$(jq -r --argjson optional "$(printf '%s\n' "${OPTIONAL_CHECKS[@]}" | jq -R . | jq -s .)" --argjson required "$(printf '%s\n' "${REQUIRED_CHECKS[@]}" | jq -R . | jq -s .)" '[.[]? | select((.status // "COMPLETED") != "COMPLETED" and (.state // "SUCCESS") | IN("PENDING", "QUEUED"))] | map(.name // .context) | . - $optional - $required | unique | join(", ")' <<<"$rollup")
  if [[ -n "$pending" ]]; then
    fail "pending check(s): $pending"
  fi

  for optional in "${OPTIONAL_CHECKS[@]}"; do
    matches=$(jq --arg name "$optional" '[.[]? | select((.name // .context) == $name)]' <<<"$rollup")
    if [[ "$(jq 'length' <<<"$matches")" != "0" ]]; then
      acceptable=$(jq '[.[] | select((.status == "COMPLETED" and (.conclusion | IN("SUCCESS", "NEUTRAL", "SKIPPED"))) or (.state // "FAILURE" | IN("SUCCESS")))] | length' <<<"$matches")
      if [[ "$acceptable" == "0" ]]; then
        fail "optional check present but not acceptable: $optional"
      fi
    fi
  done
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --pr)
      PR_NUMBER="${2:-}"
      shift 2
      ;;
    --verbose|-v)
      VERBOSE=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'ERROR: unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$PR_NUMBER" || ! "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  usage >&2
  exit 2
fi

require_bin gh
require_bin jq

verbose "checking $FULL_REPO PR #$PR_NUMBER"

PR_JSON=$(gh pr view "$PR_NUMBER" \
  --repo "$FULL_REPO" \
  --json number,title,state,isDraft,labels,headRefName,headRefOid,baseRefName,mergeStateStatus,statusCheckRollup,url)

log "Merge gate: $FULL_REPO PR #$PR_NUMBER"
log "$(jq -r '.title + " (" + .url + ")"' <<<"$PR_JSON")"
log "Head: $(jq -r '.headRefName + " @ " + .headRefOid' <<<"$PR_JSON")"

check_pr_state
check_label_stage
check_blocker_labels
check_review_threads

PR_REVIEWS=$(gh api "repos/$FULL_REPO/pulls/$PR_NUMBER/reviews" --paginate)

check_reviews_current_head
check_council_current_head
check_checks

if [[ "${#failures[@]}" -gt 0 ]]; then
  log ""
  log "Merge gate failed with ${#failures[@]} blocker(s):"
  printf ' - %s\n' "${failures[@]}"
  exit 1
fi

log "Merge gate passed: PR #$PR_NUMBER is eligible for stewardship merge."
exit 0
