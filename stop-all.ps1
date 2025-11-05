# ============================================================================
#  STOP ALL SERVICES
# ============================================================================

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Red
Write-Host "  STOPPING ALL SERVICES" -ForegroundColor Red
Write-Host "================================================================================" -ForegroundColor Red
Write-Host ""

# Stop Docker containers
Write-Host "[1/3] Stopping Docker PostgreSQL..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
Write-Host "  Database stopped" -ForegroundColor Green

# Kill backend processes
Write-Host "[2/3] Stopping backend..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*aws-archetect*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  Backend stopped" -ForegroundColor Green

# Kill frontend processes  
Write-Host "[3/3] Stopping frontend..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*aws-archetect*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  Frontend stopped" -ForegroundColor Green

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  ALL SERVICES STOPPED" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start again:" -ForegroundColor Yellow
Write-Host "  .\START-BACKEND.ps1   (Terminal 1)" -ForegroundColor White
Write-Host "  .\START-FRONTEND.ps1  (Terminal 2)" -ForegroundColor White
Write-Host ""
