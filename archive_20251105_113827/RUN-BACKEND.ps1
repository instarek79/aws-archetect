# Simple backend starter - TESTED AND WORKING
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  AWS ARCHITECT - BACKEND SERVER" -ForegroundColor Cyan
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Check database
Write-Host "[1/4] Checking database..." -ForegroundColor Yellow
$dbStatus = docker inspect dev_postgres --format='{{.State.Health.Status}}' 2>$null
if ($dbStatus -ne "healthy") {
    Write-Host "ERROR: Database not running!" -ForegroundColor Red
    Write-Host "Run: .\start-db.ps1" -ForegroundColor Yellow
    exit 1
}
Write-Host "      Database is healthy" -ForegroundColor Green

# Navigate to backend
Write-Host "[2/4] Navigating to backend..." -ForegroundColor Yellow
cd backend

# Activate venv
Write-Host "[3/4] Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Set environment variables
Write-Host "[4/4] Setting environment and starting server..." -ForegroundColor Yellow
$env:POSTGRES_HOST = "127.0.0.1"
$env:POSTGRES_PORT = "5433"
$env:POSTGRES_USER = "postgres"
$env:POSTGRES_PASSWORD = "postgres"
$env:POSTGRES_DB = "auth_db"

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Host: 127.0.0.1:5433" -ForegroundColor White
Write-Host "  Database: auth_db" -ForegroundColor White
Write-Host "  API: http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "=" -ForegroundColor Green -NoNewline
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "  STARTING SERVER - Press Ctrl+C to stop" -ForegroundColor Green
Write-Host "=" -ForegroundColor Green -NoNewline
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""

# Start server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
