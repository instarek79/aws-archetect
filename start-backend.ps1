# ============================================================================
#  START DATABASE + BACKEND
#  Run this first before starting frontend
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "           STARTING DATABASE + BACKEND" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Start PostgreSQL (Docker)
# ============================================================================
Write-Host "[1/2] Starting PostgreSQL (Docker)..." -ForegroundColor Green

# Stop old containers
Write-Host "  Stopping old containers..." -ForegroundColor Yellow
Start-Process -FilePath "docker-compose" -ArgumentList "down" -NoNewWindow -Wait -RedirectStandardOutput "$env:TEMP\docker-out.txt" -RedirectStandardError "$env:TEMP\docker-err.txt"

# Start PostgreSQL
Write-Host "  Starting PostgreSQL container..." -ForegroundColor Yellow
Start-Process -FilePath "docker-compose" -ArgumentList "up","-d" -NoNewWindow -Wait -RedirectStandardOutput "$env:TEMP\docker-out.txt" -RedirectStandardError "$env:TEMP\docker-err.txt"

# Wait for database to be healthy
Write-Host "  Waiting for database to be ready" -NoNewline -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$isHealthy = $false

while ($attempt -lt $maxAttempts -and -not $isHealthy) {
    $attempt++
    $status = docker inspect aws_architect_postgres --format='{{.State.Health.Status}}' 2>$null
    
    if ($status -eq "healthy") {
        $isHealthy = $true
        Write-Host " Ready!" -ForegroundColor Green
    } else {
        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}

Write-Host ""

if (-not $isHealthy) {
    Write-Host "  ERROR: PostgreSQL failed to start!" -ForegroundColor Red
    Write-Host "  Check Docker logs: docker logs aws_architect_postgres" -ForegroundColor Yellow
    exit 1
}

# Create database if it doesn't exist
Write-Host "  Creating database..." -ForegroundColor Yellow
$dbExists = docker exec aws_architect_postgres psql -U postgres -lqt 2>$null | Select-String -Pattern "auth_db"
if (-not $dbExists) {
    docker exec aws_architect_postgres psql -U postgres -c "CREATE DATABASE auth_db;" 2>$null | Out-Null
    Write-Host "  Database created!" -ForegroundColor Green
} else {
    Write-Host "  Database already exists!" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 2: Start Backend (FastAPI)
# ============================================================================
Write-Host "[2/2] Starting Backend Server..." -ForegroundColor Green
Write-Host ""

# Navigate to backend
cd backend

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Set environment variables
$env:POSTGRES_HOST = '127.0.0.1'
$env:POSTGRES_PORT = '5433'
$env:POSTGRES_USER = 'postgres'
$env:POSTGRES_PASSWORD = 'postgres'
$env:POSTGRES_DB = 'auth_db'
$env:OLLAMA_BASE_URL = 'http://localhost:11434/v1'
$env:OLLAMA_MODEL = 'qwen2.5'

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  DATABASE + BACKEND RUNNING" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  Database:  postgresql://localhost:5433/auth_db (Docker)" -ForegroundColor White
Write-Host "  Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor White
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
Write-Host "Starting FastAPI server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
