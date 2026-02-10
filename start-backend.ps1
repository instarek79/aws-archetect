# ============================================================================
#  START BACKEND (SQLite - No Docker Required!)
#  Run this first before starting frontend
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "           STARTING BACKEND (SQLite Database)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend
Set-Location -Path $PSScriptRoot
cd backend

# ============================================================================
# STEP 1: Setup Virtual Environment
# ============================================================================
Write-Host "[1/2] Setting up environment..." -ForegroundColor Green

# Create venv if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "  Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate venv
Write-Host "  Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Set environment variables for SQLite
$env:DATABASE_TYPE = 'sqlite'
$env:SQLITE_DB_PATH = 'data/aws_architect.db'
$env:OLLAMA_BASE_URL = 'http://localhost:11434/v1'
$env:OLLAMA_MODEL = 'qwen2.5'

# Ensure data directory exists
$dataDir = Join-Path $PSScriptRoot "backend\data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "  Created data directory: $dataDir" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 2: Start Backend (FastAPI)
# ============================================================================
Write-Host "[2/2] Starting Backend Server..." -ForegroundColor Green
Write-Host ""

Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  BACKEND RUNNING (SQLite)" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database:" -ForegroundColor Cyan
Write-Host "  Type:      SQLite (file-based, no Docker required)" -ForegroundColor White
Write-Host "  Location:  backend/data/aws_architect.db" -ForegroundColor White
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  Backend:   https://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:  https://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Now start the frontend in another terminal:" -ForegroundColor Yellow
Write-Host "  .\START-FRONTEND.ps1" -ForegroundColor White
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""

# Create admin user if it doesn't exist
Write-Host "Ensuring admin user exists..." -ForegroundColor Yellow
$adminCheck = .\venv\Scripts\python.exe -c "from app.database import SessionLocal; from app.models import User; db = SessionLocal(); user = db.query(User).filter(User.email == 'admin@example.com').first(); print('exists' if user else 'missing'); db.close()" 2>$null

if ($adminCheck -notmatch "exists") {
    Write-Host "  Creating admin user..." -ForegroundColor Yellow
    .\venv\Scripts\python.exe create-admin-simple.py 2>&1 | Out-Null
    Write-Host "  Admin user created!" -ForegroundColor Green
} else {
    Write-Host "  Admin user exists!" -ForegroundColor Green
}

Write-Host ""

# Start FastAPI server
Write-Host "Starting FastAPI server with HTTPS..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --ssl-keyfile="certs/key.pem" --ssl-certfile="certs/cert.pem"
