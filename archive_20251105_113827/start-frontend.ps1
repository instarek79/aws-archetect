# Start Frontend Locally (for development)
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "Node.js is not installed!" -ForegroundColor Red
    Write-Host "Install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Navigate to frontend directory
Set-Location frontend

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "Dependencies installed" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Frontend URL: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:8000" -ForegroundColor White
Write-Host ""

Write-Host "Starting Vite dev server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# Start Vite dev server
npm run dev
