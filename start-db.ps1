# Start Database Only (for local development)
Write-Host "Starting PostgreSQL Database..." -ForegroundColor Cyan
Write-Host ""

# Stop old containers if running
Write-Host "Stopping old containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Start database only
Write-Host "Starting database container..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d

# Wait for database to be healthy
Write-Host ""
Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $status = docker inspect dev_postgres --format='{{.State.Health.Status}}' 2>$null
    
    if ($status -eq "healthy") {
        Write-Host ""
        Write-Host "Database is ready!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Database Connection:" -ForegroundColor Cyan
        Write-Host "  Host: localhost (or 127.0.0.1)" -ForegroundColor White
        Write-Host "  Port: 5433 (Docker container mapped to avoid local PostgreSQL conflict)" -ForegroundColor White
        Write-Host "  User: postgres" -ForegroundColor White
        Write-Host "  Password: postgres" -ForegroundColor White
        Write-Host "  Database: auth_db" -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Run backend: .\start-backend.ps1" -ForegroundColor White
        Write-Host "  2. Run frontend: .\start-frontend.ps1" -ForegroundColor White
        Write-Host ""
        exit 0
    }
    
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
    $attempt++
}

Write-Host ""
Write-Host "Database failed to start" -ForegroundColor Red
Write-Host "Check logs: docker logs dev_postgres" -ForegroundColor Yellow
exit 1
