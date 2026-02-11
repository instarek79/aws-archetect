#!/bin/bash
# ============================================================================
#  AWS Architect - Start Backend Only (Linux)
#  Backend: http://localhost:8805
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

echo "Starting Backend Server on port 8805..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.deps_installed" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
    touch venv/.deps_installed
fi

# Set environment variables
export DATABASE_TYPE="sqlite"
export SQLITE_DB_PATH="data/aws_architect.db"
export OLLAMA_BASE_URL="http://localhost:11434/v1"
export OLLAMA_MODEL="qwen2.5"

# Ensure data directory exists
mkdir -p data

echo ""
echo "Backend: http://localhost:8805"
echo "API Docs: http://localhost:8805/docs"
echo ""

# Start backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8805 --reload
