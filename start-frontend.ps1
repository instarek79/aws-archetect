# ============================================================================
#  START FRONTEND
#  Run this AFTER starting backend (START-BACKEND.ps1)
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "           STARTING FRONTEND" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://localhost:8800/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop -SkipCertificateCheck
    Write-Host "  Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Backend is not running!" -ForegroundColor Red
    Write-Host "  Please start backend first: .\START-BACKEND.ps1" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""

# Navigate to frontend
cd frontend

Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  STARTING VITE DEV SERVER" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:  https://localhost:3030" -ForegroundColor Cyan
Write-Host "Backend:   https://localhost:8800" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Yellow
Write-Host "  Email:     admin@example.com" -ForegroundColor White
Write-Host "  Password:  admin123" -ForegroundColor White
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Starting Vite..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start Vite dev server
npm run dev
