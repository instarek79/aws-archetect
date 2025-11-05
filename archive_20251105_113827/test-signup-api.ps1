# Test Signup API Directly
Write-Host "Testing Signup API..." -ForegroundColor Cyan
Write-Host ""

$body = @{
    email = "test123@test.com"
    username = "testuser123"
    password = "testpass123"
} | ConvertTo-Json

Write-Host "Sending signup request..." -ForegroundColor Yellow
Write-Host "Email: test123@test.com"
Write-Host "Username: testuser123"
Write-Host "Password: testpass123"
Write-Host ""

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8000/auth/signup" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing `
        -TimeoutSec 10
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Now check backend logs:" -ForegroundColor Cyan
Write-Host "  docker-compose logs backend --tail 20"
