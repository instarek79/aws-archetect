# Test Login with admin@example.com
Write-Host "Testing login with admin@example.com..." -ForegroundColor Cyan
Write-Host ""

$body = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8000/auth/login" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ LOGIN SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access Token: $($data.access_token.Substring(0,50))..." -ForegroundColor Green
    Write-Host "Refresh Token: $($data.refresh_token.Substring(0,50))..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Your account works! Try logging in via frontend now." -ForegroundColor Cyan
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 401) {
        Write-Host "❌ Invalid credentials" -ForegroundColor Red
        Write-Host ""
        Write-Host "The account may not exist or password is wrong." -ForegroundColor Yellow
        Write-Host "Try creating the account first:" -ForegroundColor Yellow
        Write-Host "  Go to: http://localhost:3000/signup"
    } else {
        Write-Host "❌ Request failed" -ForegroundColor Red
        Write-Host "Status: $statusCode" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
