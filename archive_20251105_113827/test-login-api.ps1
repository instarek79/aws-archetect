# Test login API endpoint
Write-Host "Testing Login API..." -ForegroundColor Cyan
Write-Host ""

# Test data
$loginData = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

Write-Host "Request URL: http://localhost:8000/auth/login" -ForegroundColor Yellow
Write-Host "Request Body:" -ForegroundColor Yellow
Write-Host $loginData -ForegroundColor White
Write-Host ""

try {
    Write-Host "Sending request..." -ForegroundColor Yellow
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8000/auth/login" `
        -Method POST `
        -Body $loginData `
        -ContentType "application/json" `
        -UseBasicParsing
    
    Write-Host ""
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response Body:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host ""
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Check backend terminal for logs" -ForegroundColor Yellow
