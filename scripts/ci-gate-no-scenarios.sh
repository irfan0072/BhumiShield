#!/usr/bin/env bash
# CI Gate: Prohibit any occurrence of 'scenario' (case-insensitive)
# in production codebase directories per Prompt v3 Step 0.
# Excluded: tests/, docs/, vendor/, node_modules/, dist/, storage/, *.bak*

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=========================================================="
echo " [CI Gate] Scanning codebase for prohibited 'scenario' occurrences"
echo "=========================================================="

FAIL=0

SEARCH_PATHS=(
  "backend/app"
  "backend/database"
  "backend/routes"
  "frontend/src"
)

for target in "${SEARCH_PATHS[@]}"; do
  if [ -d "$target" ]; then
    MATCHES=$(grep -rinI --exclude="*.bak*" --exclude="*.sqlite*" --exclude-dir={tests,docs,vendor,node_modules,dist,storage} "scenario" "$target" 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
      echo "FAIL: Found prohibited 'scenario' keyword in $target:"
      echo "$MATCHES"
      FAIL=1
    else
      echo "PASS: Clean in $target"
    fi
  fi
done

echo "----------------------------------------------------------"
if [ "$FAIL" -ne 0 ]; then
  echo "❌ CI Gate Failed: Canned scenario remnants found in codebase."
  echo "   All outcomes must be computed dynamically by real domain engines."
  exit 1
else
  echo "✅ CI Gate Passed: Zero scenario references found in core codebase."
  exit 0
fi
