# Start Backend Locally (for development)
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Write-Host ""

# Check if database is running
$dbStatus = docker inspect dev_postgres --format='{{.State.Health.Status}}' 2>$null

if ($dbStatus -ne "healthy") {
    Write-Host "Database is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Start database first:" -ForegroundColor Yellow
    Write-Host "  .\start-db.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Database is running" -ForegroundColor Green
Write-Host ""

# Check if Python is installed
$pythonVersion = python --version 2>$null
if (-not $pythonVersion) {
    Write-Host "Python is not installed!" -ForegroundColor Red
    Write-Host "Install Python 3.9+ from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Python found: $pythonVersion" -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Set-Location backend

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "Virtual environment created" -ForegroundColor Green
    Write-Host ""
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1



# Set environment variables (use 127.0.0.1:5433 - Docker container on different port to avoid conflict)
$env:POSTGRES_HOST = "127.0.0.1"
$env:POSTGRES_PORT = "5433"
$env:POSTGRES_USER = "postgres"
$env:POSTGRES_PASSWORD = "postgres"
$env:POSTGRES_DB = "auth_db"
$env:PYTHONPATH = "$PWD"

# Also set full DATABASE_URL for display
$DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5433/auth_db"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Database URL: $DATABASE_URL" -ForegroundColor White
Write-Host "  API URL: http://localhost:8000" -ForegroundColor White
Write-Host "  Virtual Env: $(Get-Command python | Select-Object -ExpandProperty Source)" -ForegroundColor White
Write-Host ""

Write-Host "Starting FastAPI server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# Start server with auto-reload using python -m to ensure venv is used
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
