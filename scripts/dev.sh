#!/bin/bash
set -e
echo "🚀 Starting UBEK Next development environment..."

# Check env
if [ ! -f .env ]; then
  echo "⚠️  No .env file found. Copying .env.example..."
  cp .env.example .env
fi

# Start infra
echo "📦 Starting PostgreSQL..."
docker compose up -d postgres 2>/dev/null || echo "    (already running or docker not available)"

# Run migrations
echo "🗄️  Running database migrations..."
cd next && npm run db:push 2>/dev/null || echo "    (migrations skipped)"

# Seed data
echo "🌱 Seeding database..."
npm run db:seed 2>/dev/null || echo "    (seed skipped)"

# Start Pi Agent
echo "🤖 Starting Pi Agent..."
cd ../agent && npm run dev &
AGENT_PID=$!

# Start Next.js
echo "🌐 Starting Next.js..."
cd ../next && npm run dev &
NEXT_PID=$!

echo ""
echo "✅ UBEK Next is running!"
echo "   Frontend: http://localhost:3000"
echo "   Agent:    http://localhost:4000"
echo ""
echo "   Press Ctrl+C to stop all services."

trap "kill $AGENT_PID $NEXT_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
