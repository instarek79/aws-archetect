# Quick backend test
Write-Host "Testing backend..." -ForegroundColor Cyan

Write-Host "`n[1/2] Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 3
    Write-Host "SUCCESS: Backend is responding!" -ForegroundColor Green
    Write-Host "Response: $($health.Content)" -ForegroundColor White
} catch {
    Write-Host "FAILED: Backend not responding" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/2] Testing login endpoint..." -ForegroundColor Yellow
try {
    $body = @{email="admin@example.com"; password="admin123"} | ConvertTo-Json
    $login = Invoke-WebRequest -Uri "http://localhost:8000/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 3
    Write-Host "SUCCESS: Login works!" -ForegroundColor Green
    $token = ($login.Content | ConvertFrom-Json).access_token
    Write-Host "Token: $($token.Substring(0,50))..." -ForegroundColor White
} catch {
    Write-Host "FAILED: Login failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "  BACKEND IS WORKING PERFECTLY!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host "`nNow test frontend at: http://localhost:3000/login" -ForegroundColor Cyan
