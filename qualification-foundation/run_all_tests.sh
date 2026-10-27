#!/usr/bin/env bash
# Run the complete NSO Kryptonite qualification test suite.
# Uses python3 -I (isolated) so no module picks up code from the CWD.
set -euo pipefail
cd "$(dirname "$0")"

echo "=================================================================="
echo " NSO Kryptonite — qualification foundation test suite"
echo "=================================================================="

fail=0

echo
echo "[1/3] Qualification engine tests"
python3 -I tests/test_engine.py || fail=1

echo
echo "[2/3] Evidence ledger tests"
python3 -I tests/test_ledger.py || fail=1

echo
echo "[3/3] End-to-end integration tests (module -> verifier -> ledger -> engine)"
python3 -I tests/test_integration.py || fail=1

echo
echo "=================================================================="
if [ "$fail" -eq 0 ]; then
  echo " RESULT: ALL SUITES PASSED"
else
  echo " RESULT: ONE OR MORE SUITES FAILED"
fi
echo "=================================================================="
exit "$fail"
