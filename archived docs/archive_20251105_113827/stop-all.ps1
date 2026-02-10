# Stop All Services
Write-Host "🛑 Stopping all services..." -ForegroundColor Cyan
Write-Host ""

# Stop database container
Write-Host "Stopping database..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml down

Write-Host ""
Write-Host "✅ All services stopped" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Backend and Frontend need to be stopped manually (Ctrl+C in their terminals)" -ForegroundColor Gray
