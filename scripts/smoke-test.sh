#!/usr/bin/env bash
# smoke-test.sh — Start the Next.js server and verify /api/health responds correctly

set -euo pipefail

PORT="${PORT:-3000}"
MAX_RETRIES=30
RETRY_INTERVAL=2
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID"
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

echo "Starting Next.js server on port $PORT..."
bun run start -- -p "$PORT" &
SERVER_PID=$!

echo "Waiting for server to be ready (max ${MAX_RETRIES} retries)..."
for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    echo "Server is ready after $i attempt(s)"
    break
  fi

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "ERROR: Server did not become ready after ${MAX_RETRIES} retries"
    exit 1
  fi

  echo "Attempt $i/$MAX_RETRIES — server not ready yet, waiting ${RETRY_INTERVAL}s..."
  sleep "$RETRY_INTERVAL"
done

echo "Running smoke test against /api/health..."
RESPONSE=$(curl -sf "http://localhost:${PORT}/api/health")
echo "Response: $RESPONSE"

# Verify response contains {"status":"ok"}
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo "PASS: /api/health returned expected response"
  exit 0
else
  echo "FAIL: /api/health did not return expected {\"status\":\"ok\"}"
  echo "Actual response: $RESPONSE"
  exit 1
fi
