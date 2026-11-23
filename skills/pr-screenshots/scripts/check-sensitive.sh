#!/usr/bin/env bash
# Flags a branch diff that touches user management / auth / admin / PDRP /
# preview-access surfaces — none of which the local-dev auth bypass
# (isLocalDevBypass in app/session.ts, on under `npm run dev`) exercises for real, so a screenshot taken there would show
# nothing true about the actual gating.
#
# Usage: check-sensitive.sh [base-ref]   (default: origin/main)
# Exit 0 + "clean"     -> safe to screenshot against localhost
# Exit 1 + file list   -> needs a deployed, SSO-logged-in capture instead
set -euo pipefail

base="${1:-origin/main}"

patterns=(
  '^app/\(dashboard\)/admin/'
  '^app/api/admin/'
  '^app/api/auth/'
  '^lib/auth/'
  '^proxy\.ts$'
  '^src/db/'
  '^migrations/'
)

changed="$(git diff --name-only "${base}...HEAD")"

hits=""
for pattern in "${patterns[@]}"; do
  match="$(echo "$changed" | grep -E "$pattern" || true)"
  if [ -n "$match" ]; then
    hits="${hits}${match}"$'\n'
  fi
done
hits="$(echo "$hits" | sed '/^$/d' | sort -u)"

if [ -n "$hits" ]; then
  echo "SENSITIVE — touches auth/admin/user-management surfaces:"
  echo "$hits"
  exit 1
fi

echo "clean"
exit 0
