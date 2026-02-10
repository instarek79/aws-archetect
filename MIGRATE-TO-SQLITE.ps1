# ============================================================================
#  MIGRATE DATA FROM POSTGRESQL TO SQLITE
#  Run this ONCE to migrate existing data before switching to SQLite
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "           MIGRATE POSTGRESQL TO SQLITE" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend
Set-Location -Path $PSScriptRoot
cd backend

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Set PostgreSQL environment for migration source
$env:POSTGRES_HOST = '127.0.0.1'
$env:POSTGRES_PORT = '5433'
$env:POSTGRES_USER = 'postgres'
$env:POSTGRES_PASSWORD = 'postgres'
$env:POSTGRES_DB = 'auth_db'

Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Connect to PostgreSQL (Docker) at localhost:5433" -ForegroundColor White
Write-Host "  2. Export all data (users, resources, relationships)" -ForegroundColor White
Write-Host "  3. Create SQLite database at backend/data/aws_architect.db" -ForegroundColor White
Write-Host "  4. Import all data into SQLite" -ForegroundColor White
Write-Host ""
Write-Host "Prerequisites:" -ForegroundColor Yellow
Write-Host "  - Docker PostgreSQL must be running" -ForegroundColor White
Write-Host "  - Run: docker start aws_architect_postgres" -ForegroundColor White
Write-Host ""

$response = Read-Host "Continue with migration? (y/n)"
if ($response -ne 'y') {
    Write-Host "Migration cancelled." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Starting migration..." -ForegroundColor Green
Write-Host ""

# Run migration script
python migrate_to_sqlite.py

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  MIGRATION COMPLETE" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Stop Docker PostgreSQL (optional): docker stop aws_architect_postgres" -ForegroundColor White
Write-Host "  2. Start backend with SQLite: .\START-BACKEND.ps1" -ForegroundColor White
Write-Host ""
