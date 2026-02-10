#!/bin/bash
# ============================================================================
#  AWS Architect - Start Frontend Only (Linux)
#  Frontend: http://localhost:3030
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"

echo "Starting Frontend Server on port 3030..."

# Install node modules if needed
if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install
fi

echo ""
echo "Frontend: http://localhost:3030"
echo ""

# Start frontend
npm run dev -- --port 3030
