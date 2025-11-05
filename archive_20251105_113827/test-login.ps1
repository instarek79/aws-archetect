# Test Login Script
# This will test if the backend login is working

Write-Host "🔍 Testing Backend Login..." -ForegroundColor Cyan
Write-Host ""

# Test data
$email = "admin@example.com"
$password = "admin123"

# Create request body
$body = @{
    email = $email
    password = $password
} | ConvertTo-Json

Write-Host "📤 Sending login request..." -ForegroundColor Yellow
Write-Host "Email: $email"
Write-Host "Password: $password"
Write-Host ""

try {
    # Send login request
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8000/auth/login" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing
    
    # Parse response
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ LOGIN SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor White
    Write-Host "  Status: $($response.StatusCode) OK" -ForegroundColor Green
    Write-Host "  Token Type: $($data.token_type)" -ForegroundColor Green
    Write-Host "  Access Token: $($data.access_token.Substring(0,50))..." -ForegroundColor Green
    Write-Host "  Refresh Token: $($data.refresh_token.Substring(0,50))..." -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Backend login is working correctly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 If frontend login fails, try:" -ForegroundColor Yellow
    Write-Host "  1. Clear browser cache (Ctrl+Shift+Del)"
    Write-Host "  2. Clear localStorage in DevTools"
    Write-Host "  3. Check browser console for errors (F12)"
    Write-Host "  4. Make sure you're using the same credentials"
    Write-Host ""
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message
    
    if ($statusCode -eq 401) {
        Write-Host "❌ LOGIN FAILED: Invalid credentials" -ForegroundColor Red
        Write-Host ""
        Write-Host "The user may not exist. Try these solutions:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Option 1: Create user via frontend" -ForegroundColor Cyan
        Write-Host "  1. Go to: http://localhost:3000/signup"
        Write-Host "  2. Register with email: $email"
        Write-Host "  3. Password: $password"
        Write-Host "  4. Then try login again"
        Write-Host ""
        Write-Host "Option 2: Create user via backend" -ForegroundColor Cyan
        Write-Host "  Run: .\create-admin-user.ps1"
        Write-Host ""
    } elseif ($statusCode -eq 422) {
        Write-Host "❌ VALIDATION ERROR" -ForegroundColor Red
        Write-Host "Email or password format is invalid"
        Write-Host "Error: $errorBody"
    } else {
        Write-Host "❌ REQUEST FAILED" -ForegroundColor Red
        Write-Host "Status Code: $statusCode"
        Write-Host "Error: $($_.Exception.Message)"
        Write-Host ""
        Write-Host "Check if backend is running:" -ForegroundColor Yellow
        Write-Host "  docker-compose ps"
    }
}

Write-Host ""
Write-Host "For more help, see: DEBUG-LOGIN.md" -ForegroundColor Cyan
