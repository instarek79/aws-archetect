# Test Backend Health
Write-Host "Testing backend health..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
    Write-Host "✅ Backend is healthy!" -ForegroundColor Green
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "❌ Backend is not responding!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}
