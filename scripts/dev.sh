#!/usr/bin/env bash
set -e

echo "=== Starting UBEK Next (dev) ==="

# Start agent
echo "[agent] Starting Pi Agent on :4000..."
cd "$(dirname "$0")/../agent"
npx tsx watch src/index.ts &
AGENT_PID=$!

# Start frontend
echo "[next] Starting Next.js on :3000..."
cd "$(dirname "$0")/../next"
npx next dev &
NEXT_PID=$!

echo "=== Services starting ==="
echo "  Frontend: http://localhost:3000"
echo "  Agent:    http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop both"

trap "kill $AGENT_PID $NEXT_PID 2>/dev/null; exit" INT TERM
wait
