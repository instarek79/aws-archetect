# PowerShell script to test the API endpoints

Write-Host "`n🧪 Testing FastAPI JWT Authentication API`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:8000"

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "   ✅ Health Check: $($health.status)" -ForegroundColor Green
    Write-Host "   Message: $($health.message)`n" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Health check failed. Is the backend running?" -ForegroundColor Red
    Write-Host "   Run: docker-compose up -d`n" -ForegroundColor Yellow
    exit 1
}

# Test 2: Register a new user
Write-Host "2. Testing User Registration..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testUser = @{
    email = "test$timestamp@example.com"
    username = "testuser$timestamp"
    password = "password123"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $testUser
    Write-Host "   ✅ User registered successfully!" -ForegroundColor Green
    Write-Host "   User ID: $($registerResponse.id)" -ForegroundColor Gray
    Write-Host "   Email: $($registerResponse.email)" -ForegroundColor Gray
    Write-Host "   Username: $($registerResponse.username)`n" -ForegroundColor Gray
    
    $email = $registerResponse.email
} catch {
    Write-Host "   ❌ Registration failed: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# Test 3: Login
Write-Host "3. Testing User Login..." -ForegroundColor Yellow
$loginData = @{
    email = $email
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginData
    Write-Host "   ✅ Login successful!" -ForegroundColor Green
    Write-Host "   Access Token: $($loginResponse.access_token.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   Refresh Token: $($loginResponse.refresh_token.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   Token Type: $($loginResponse.token_type)`n" -ForegroundColor Gray
    
    $accessToken = $loginResponse.access_token
    $refreshToken = $loginResponse.refresh_token
} catch {
    Write-Host "   ❌ Login failed: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# Test 4: Get Current User
Write-Host "4. Testing Protected Endpoint (Get Current User)..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $accessToken"
    }
    $userResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
    Write-Host "   ✅ Protected endpoint accessed successfully!" -ForegroundColor Green
    Write-Host "   User ID: $($userResponse.id)" -ForegroundColor Gray
    Write-Host "   Email: $($userResponse.email)" -ForegroundColor Gray
    Write-Host "   Username: $($userResponse.username)" -ForegroundColor Gray
    Write-Host "   Created: $($userResponse.created_at)`n" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Protected endpoint failed: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# Test 5: Refresh Token
Write-Host "5. Testing Token Refresh..." -ForegroundColor Yellow
$refreshData = @{
    refresh_token = $refreshToken
} | ConvertTo-Json

try {
    $refreshResponse = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method POST -ContentType "application/json" -Body $refreshData
    Write-Host "   ✅ Token refresh successful!" -ForegroundColor Green
    Write-Host "   New Access Token: $($refreshResponse.access_token.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   New Refresh Token: $($refreshResponse.refresh_token.Substring(0, 30))...`n" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Token refresh failed: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "✅ All API tests passed successfully!" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "`nYou can now:" -ForegroundColor Yellow
Write-Host "  • Open http://localhost:3000 to use the frontend" -ForegroundColor White
Write-Host "  • Visit http://localhost:8000/docs for API documentation" -ForegroundColor White
Write-Host "  • Check http://localhost:8000/health for health status" -ForegroundColor White
Write-Host "`n"
