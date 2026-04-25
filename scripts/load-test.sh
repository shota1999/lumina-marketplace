#!/usr/bin/env bash
#
# Simple load test script for Lumina API endpoints.
# Uses curl — no extra dependencies needed.
#
# Usage:
#   ./scripts/load-test.sh [base_url] [concurrency] [iterations]
#
# Example:
#   ./scripts/load-test.sh http://localhost:3000 5 20

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
CONCURRENCY="${2:-5}"
ITERATIONS="${3:-20}"

echo "=== Lumina Load Test ==="
echo "Target:      $BASE_URL"
echo "Concurrency: $CONCURRENCY"
echo "Iterations:  $ITERATIONS per endpoint"
echo ""

# --- Helper ---
run_test() {
  local name="$1"
  local method="$2"
  local url="$3"
  local data="${4:-}"
  local success=0
  local fail=0
  local total_ms=0
  local start_time

  echo "--- $name ---"

  for i in $(seq 1 "$ITERATIONS"); do
    start_time=$(date +%s%N)
    local http_code
    if [ "$method" = "GET" ]; then
      http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null) || http_code=0
    else
      http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X "$method" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$url" 2>/dev/null) || http_code=0
    fi
    local end_time=$(date +%s%N)
    local elapsed_ms=$(( (end_time - start_time) / 1000000 ))
    total_ms=$((total_ms + elapsed_ms))

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 500 ]; then
      success=$((success + 1))
    else
      fail=$((fail + 1))
    fi
  done

  local avg_ms=$((total_ms / ITERATIONS))
  echo "  Requests:  $ITERATIONS"
  echo "  Success:   $success"
  echo "  Failures:  $fail"
  echo "  Avg time:  ${avg_ms}ms"
  echo ""
}

# --- Search ---
run_test "GET /api/search" "GET" "$BASE_URL/api/search?query=villa&limit=10"

# --- Listing detail ---
run_test "GET /api/listings/:slug" "GET" "$BASE_URL/api/listings/ocean-villa-malibu"

# --- Health check ---
run_test "GET /api/health" "GET" "$BASE_URL/api/health"

# --- Booking creation (will fail auth but tests the full path) ---
BOOKING_DATA='{"listingId":"00000000-0000-0000-0000-000000000001","startDate":"2026-08-01","endDate":"2026-08-05","guests":2}'
run_test "POST /api/bookings (unauth)" "POST" "$BASE_URL/api/bookings" "$BOOKING_DATA"

# --- Concurrent burst test ---
echo "--- Concurrent burst: $CONCURRENCY parallel search requests ---"
burst_start=$(date +%s%N)
for i in $(seq 1 "$CONCURRENCY"); do
  curl -s -o /dev/null "$BASE_URL/api/search?query=cabin&page=$i" &
done
wait
burst_end=$(date +%s%N)
burst_ms=$(( (burst_end - burst_start) / 1000000 ))
echo "  $CONCURRENCY requests completed in ${burst_ms}ms"
echo ""

echo "=== Load test complete ==="
echo "Check $BASE_URL/api/health for metrics snapshot."
