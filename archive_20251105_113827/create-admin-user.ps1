# Create Admin User Script
# This will create a default admin user in the database

Write-Host "👤 Creating Admin User..." -ForegroundColor Cyan
Write-Host ""

$email = "admin@example.com"
$password = "admin123"

Write-Host "Creating user:" -ForegroundColor Yellow
Write-Host "  Email: $email"
Write-Host "  Password: $password"
Write-Host ""

# First, try to create via signup endpoint
Write-Host "📤 Attempting to create user via API..." -ForegroundColor Yellow

$body = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8000/auth/signup" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing
    
    Write-Host "✅ USER CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now login with:" -ForegroundColor White
    Write-Host "  Email: $email" -ForegroundColor Green
    Write-Host "  Password: $password" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Go to: http://localhost:3000/login" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 400) {
        Write-Host "⚠️  User already exists!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "The admin user is already in the database." -ForegroundColor White
        Write-Host "You can login with:" -ForegroundColor White
        Write-Host "  Email: $email" -ForegroundColor Green
        Write-Host "  Password: $password" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Go to: http://localhost:3000/login" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "💡 If you forgot the password, try these users:" -ForegroundColor Yellow
        Write-Host "  - test@test.com / test123"
        Write-Host "  - user@example.com / user123"
        Write-Host ""
    } else {
        Write-Host "❌ FAILED TO CREATE USER" -ForegroundColor Red
        Write-Host "Status Code: $statusCode"
        Write-Host "Error: $($_.Exception.Message)"
        Write-Host ""
        Write-Host "Try creating via frontend:" -ForegroundColor Yellow
        Write-Host "  1. Go to: http://localhost:3000/signup"
        Write-Host "  2. Fill in email and password"
        Write-Host "  3. Click Sign Up"
    }
}

Write-Host ""
Write-Host "🧪 Test if login works:" -ForegroundColor Cyan
Write-Host "  .\test-login.ps1"
Write-Host ""
