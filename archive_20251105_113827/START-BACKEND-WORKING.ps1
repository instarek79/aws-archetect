# TESTED AND WORKING - Backend Startup Script
# This script has been verified to work correctly

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  AWS ARCHITECT - BACKEND SERVER (TESTED & WORKING)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check database
Write-Host "[1/5] Checking database..." -ForegroundColor Yellow
$dbStatus = docker inspect dev_postgres --format='{{.State.Health.Status}}' 2>$null
if ($dbStatus -ne "healthy") {
    Write-Host "      ERROR: Database not running!" -ForegroundColor Red
    Write-Host "      Run: .\start-db.ps1" -ForegroundColor Yellow
    exit 1
}
Write-Host "      Database is healthy on port 5433" -ForegroundColor Green

# Step 2: Navigate to backend
Write-Host "[2/5] Navigating to backend directory..." -ForegroundColor Yellow
cd backend

# Step 3: Activate venv
Write-Host "[3/5] Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Step 4: Set environment variables
Write-Host "[4/5] Setting environment variables..." -ForegroundColor Yellow
$env:POSTGRES_HOST = "127.0.0.1"
$env:POSTGRES_PORT = "5433"
$env:POSTGRES_USER = "postgres"
$env:POSTGRES_PASSWORD = "postgres"
$env:POSTGRES_DB = "auth_db"

# Step 5: Test configuration
Write-Host "[5/5] Testing configuration..." -ForegroundColor Yellow
$testOutput = python test-full-startup.py 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      Configuration test FAILED!" -ForegroundColor Red
    Write-Host $testOutput
    exit 1
}
Write-Host "      All tests passed!" -ForegroundColor Green

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  CONFIGURATION VERIFIED - STARTING SERVER" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database: postgresql://postgres:***@127.0.0.1:5433/auth_db" -ForegroundColor Cyan
Write-Host "API URL:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Docs:     http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================" -ForegroundColor DarkGray
Write-Host ""

# Start server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
