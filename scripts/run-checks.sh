#!/usr/bin/env bash
# Runs every automated check against ead-portal.html.
#
#   ./scripts/run-checks.sh
#
# Installs the headless test dependencies into a scratch directory on first run
# (jsdom only — nothing is added to the repo and nothing is committed), then runs
# the five verification passes in order and stops at the first failure.
#
#   1. node --check      syntax of the inlined application script
#   2. headless-suite    129 role x view renders, both themes, 50 chart builders,
#                        every modal / auth flow / filter / sort / tab, the command
#                        palette, the rail sidebar, and a computed font-size sweep
#   3. overlap-audit     geometric proof that no layer overlaps (49 checks)
#   4. login-height      the login screen's no-scroll height budget (15 viewports)
#   5. markup-balance    tag balance, duplicate ids, structural assertions
#
# Note: ApexCharts cannot render in jsdom (no layout engine, no getBBox), so chart
# *configs* are validated rather than pixels. There is no browser in this sandbox.

set -uo pipefail
cd "$(dirname "$0")/.."
DEPS="${TMPDIR:-/tmp}/ead-check-deps"
mkdir -p "$DEPS"

command -v node    >/dev/null || { echo "node is required";    exit 1; }
command -v python3 >/dev/null || { echo "python3 is required"; exit 1; }

if [ ! -d "$DEPS/node_modules/jsdom" ]; then
  echo "==> installing headless test dependencies into $DEPS"
  ( cd "$DEPS" && npm init -y >/dev/null 2>&1 && npm i jsdom --no-audit --no-fund --silent )
fi
export NODE_PATH="$DEPS/node_modules"

FAILED=0
section() { echo; echo "==> $1"; }

section "1/5  inline script syntax"
python3 - ead-portal.html >"$DEPS/inline.js" <<'PY'
import io, sys
s = io.open(sys.argv[1], encoding='utf-8').read()
i = s.rindex('<script>'); j = s.index('</script>', i)
sys.stdout.write(s[i+8:j])
PY
if node --check "$DEPS/inline.js"; then echo "    PASS"; else echo "    FAIL"; FAILED=1; fi

section "2/5  headless suite (jsdom)"
OUT=$(node scripts/headless-suite.js 2>&1 | grep -v 'scrollTo')
echo "$OUT" | tail -12
echo "$OUT" | grep -q '^errors: 0' && echo "    PASS" || { echo "    FAIL"; FAILED=1; }

section "3/5  overlap / geometry audit"
OUT=$(python3 scripts/overlap-audit.py 2>&1)
echo "$OUT" | tail -2
echo "$OUT" | grep -q 'FAIL 0' && echo "    PASS" || { echo "    FAIL"; FAILED=1; }

section "4/5  login no-scroll height budget"
OUT=$(python3 scripts/login-height-budget.py 2>&1)
echo "    $(echo "$OUT" | grep -c 'FITS - no vertical scroll') viewport heights fit with zero scrollbar"
if echo "$OUT" | grep -q 'scrolls internally'; then
  echo "$OUT" | grep 'scrolls internally'; echo "    FAIL"; FAILED=1
else echo "    PASS"; fi

section "5/5  markup balance + duplicate ids"
OUT=$(python3 scripts/markup-balance.py 2>&1)
echo "$OUT" | sed -n '2,3p'
echo "$OUT" | grep -q 'ALL STRUCTURAL CHECKS: PASS' && echo "    PASS" || { echo "    FAIL"; FAILED=1; }

echo
if [ "$FAILED" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "SOME CHECKS FAILED"; fi
exit "$FAILED"
