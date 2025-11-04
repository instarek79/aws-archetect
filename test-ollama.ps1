# Quick test script to verify Ollama integration

Write-Host "Testing Ollama Integration..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Ollama is running
Write-Host "1. Checking Ollama service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get
    Write-Host "   ✓ Ollama is running" -ForegroundColor Green
    Write-Host "   Models available: $($response.models.name -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Ollama is not running!" -ForegroundColor Red
    Write-Host "   Please start Ollama first" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Check OpenAI-compatible endpoint
Write-Host "2. Checking OpenAI-compatible endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/v1/models" -Method Get
    Write-Host "   ✓ OpenAI-compatible API is working" -ForegroundColor Green
} catch {
    Write-Host "   ✗ OpenAI-compatible endpoint failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Check backend health
Write-Host "3. Checking backend service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    Write-Host "   ✓ Backend is healthy" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Backend is not responding" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "All tests passed! ✓" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now use:" -ForegroundColor White
Write-Host "  • AI Insights: http://localhost:3000/ai-insights" -ForegroundColor Gray
Write-Host "  • Data Import: http://localhost:3000/import" -ForegroundColor Gray
Write-Host ""
Write-Host "Using model: llama2" -ForegroundColor Yellow
