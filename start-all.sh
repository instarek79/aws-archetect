#!/bin/bash
# ============================================================================
#  AWS Architect - Start All Services (Linux)
#  Frontend: http://localhost:3030
#  Backend:  http://localhost:8805
# ============================================================================

set -e

echo ""
echo "================================================================================"
echo "           AWS ARCHITECT - STARTING ALL SERVICES"
echo "================================================================================"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# STEP 1: Setup Backend
# ============================================================================
echo -e "${GREEN}[1/2] Starting Backend Server...${NC}"

cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}  Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.deps_installed" ]; then
    echo -e "${YELLOW}  Installing Python dependencies...${NC}"
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

# Create admin user if needed
echo -e "${YELLOW}  Checking admin user...${NC}"
python3 -c "
from app.database import SessionLocal
from app.models import User
db = SessionLocal()
user = db.query(User).filter(User.email == 'admin@example.com').first()
if not user:
    print('Creating admin user...')
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
    new_user = User(
        email='admin@example.com',
        username='admin',
        hashed_password=pwd_context.hash('admin123')
    )
    db.add(new_user)
    db.commit()
    print('Admin user created!')
else:
    print('Admin user exists!')
db.close()
" 2>/dev/null || echo -e "${YELLOW}  Will create admin on first run${NC}"

# Start backend in background
echo -e "${GREEN}  Starting FastAPI on port 8805...${NC}"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8805 &
BACKEND_PID=$!
echo -e "${GREEN}  Backend PID: $BACKEND_PID${NC}"

cd ..

# Wait for backend to start
sleep 3

# ============================================================================
# STEP 2: Setup Frontend
# ============================================================================
echo ""
echo -e "${GREEN}[2/2] Starting Frontend Server...${NC}"

cd frontend

# Install node modules if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  Installing Node dependencies...${NC}"
    npm install
fi

# Start frontend
echo -e "${GREEN}  Starting Vite on port 3030...${NC}"
npm run dev -- --port 3030 &
FRONTEND_PID=$!
echo -e "${GREEN}  Frontend PID: $FRONTEND_PID${NC}"

cd ..

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}================================================================================${NC}"
echo -e "${GREEN}  ALL SERVICES RUNNING${NC}"
echo -e "${GREEN}================================================================================${NC}"
echo ""
echo -e "${CYAN}Services:${NC}"
echo -e "  Frontend:  ${GREEN}http://localhost:3030${NC}"
echo -e "  Backend:   ${GREEN}http://localhost:8805${NC}"
echo -e "  API Docs:  ${GREEN}http://localhost:8805/docs${NC}"
echo ""
echo -e "${CYAN}Login:${NC}"
echo -e "  Email:     admin@example.com"
echo -e "  Password:  admin123"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Trap to kill both processes on exit
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for processes
wait
