#!/bin/sh
set -e

BACKEND_PORT=${BACKEND_PORT:-8805}
FRONTEND_PORT=${FRONTEND_PORT:-3030}

export VITE_API_URL=${VITE_API_URL:-http://localhost:${BACKEND_PORT}}
export VITE_API_FALLBACK_URL=${VITE_API_FALLBACK_URL:-${VITE_API_URL}}

echo "Starting backend on port ${BACKEND_PORT}..."
(
  cd /app/backend
  uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}"
) &

BACKEND_PID=$!

# Wait briefly so frontend can start with backend target available
sleep 2

echo "Starting frontend on port ${FRONTEND_PORT}..."
cd /app/frontend
npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT}"

# If frontend exits, stop backend too
kill "${BACKEND_PID}" 2>/dev/null || true
