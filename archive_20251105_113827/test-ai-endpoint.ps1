# Test AI Insights endpoint with proper authentication

Write-Host "Testing AI Insights Endpoint..." -ForegroundColor Cyan

# First, login to get token
Write-Host "`n1. Logging in..." -ForegroundColor Yellow
$loginBody = @{
    username = "test@example.com"
    password = "testpass123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    Write-Host "   ✓ Login successful" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Login failed: $_" -ForegroundColor Red
    Write-Host "   Please create a test user first" -ForegroundColor Yellow
    exit 1
}

# Test AI analyze endpoint
Write-Host "`n2. Testing AI analysis..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

$analyzeBody = @{
    prompt = "test analysis"
    include_resources = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/ai/analyze" -Method Post -Headers $headers -Body $analyzeBody
    Write-Host "   ✓ AI analysis successful!" -ForegroundColor Green
    Write-Host "   Response: $($response.analysis.Substring(0, 100))..." -ForegroundColor Gray
} catch {
    Write-Host "   ✗ AI analysis failed" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get error detail
    if ($_.ErrorDetails) {
        Write-Host "   Detail: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
