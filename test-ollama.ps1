# Test Ollama Setup
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  TESTING OLLAMA SETUP" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if Ollama is running
Write-Host "[1/3] Checking if Ollama is running..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ✅ Ollama is running!" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Ollama is NOT running!" -ForegroundColor Red
    Write-Host "  Start Ollama first, then run this test again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Check if qwen2.5 model is available
Write-Host "[2/3] Checking for qwen2.5 model..." -ForegroundColor Yellow
$models = Invoke-RestMethod -Uri "http://localhost:11434/api/tags"
$hasQwen = $models.models | Where-Object { $_.name -like "*qwen2.5*" }

if ($hasQwen) {
    Write-Host "  ✅ qwen2.5 model found!" -ForegroundColor Green
    Write-Host "     Model: $($hasQwen.name)" -ForegroundColor Cyan
} else {
    Write-Host "  ❌ qwen2.5 model NOT found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Available models:" -ForegroundColor Yellow
    foreach ($model in $models.models) {
        Write-Host "    - $($model.name)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "  To install qwen2.5 (recommended), run:" -ForegroundColor Yellow
    Write-Host "    .\SETUP-QWEN.ps1" -ForegroundColor White
    Write-Host "    OR: ollama pull qwen2.5" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""

# Test 3: Test actual LLM call
Write-Host "[3/3] Testing LLM call..." -ForegroundColor Yellow
try {
    $body = @{
        model = "qwen2.5"
        messages = @(
            @{
                role = "user"
                content = "Say 'Hello' and nothing else."
            }
        )
        stream = $false
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod -Uri "http://localhost:11434/v1/chat/completions" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
    
    Write-Host "  ✅ LLM call successful!" -ForegroundColor Green
    Write-Host "     Response: $($response.choices[0].message.content)" -ForegroundColor Cyan
} catch {
    Write-Host "  ❌ LLM call failed!" -ForegroundColor Red
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  The model might not be loaded. Try:" -ForegroundColor Yellow
    Write-Host "    ollama run qwen2.5" -ForegroundColor White
    Write-Host "    (Press Ctrl+D to exit)" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  ✅ OLLAMA IS WORKING CORRECTLY!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ollama configuration:" -ForegroundColor Cyan
Write-Host "  URL:   http://localhost:11434/v1" -ForegroundColor White
Write-Host "  Model: qwen2.5" -ForegroundColor White
Write-Host ""
Write-Host "You can now use LLM analysis in the import feature!" -ForegroundColor Yellow
Write-Host ""
