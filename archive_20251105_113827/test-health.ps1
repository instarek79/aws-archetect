Write-Host "Testing backend health endpoint..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8000/health" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 5
    
    Write-Host "✅ Backend is responding!" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend not responding" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
