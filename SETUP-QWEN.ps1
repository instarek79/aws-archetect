# Setup Qwen 2.5 Model for LLM Analysis
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  SETUP QWEN 2.5 MODEL" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Qwen 2.5 is faster and better than llama3.2 for structured data analysis." -ForegroundColor Yellow
Write-Host ""

# Check if Ollama is running
Write-Host "[1/3] Checking if Ollama is running..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ✅ Ollama is running!" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Ollama is NOT running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please start Ollama first:" -ForegroundColor Yellow
    Write-Host "    - Open Ollama app" -ForegroundColor White
    Write-Host "    OR run: ollama serve" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""

# Pull qwen2.5 model
Write-Host "[2/3] Downloading qwen2.5 model..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes (model is ~4GB)" -ForegroundColor Gray
Write-Host ""

$process = Start-Process -FilePath "ollama" -ArgumentList "pull","qwen2.5" -NoNewWindow -PassThru -Wait

if ($process.ExitCode -eq 0) {
    Write-Host "  ✅ Model downloaded successfully!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Failed to download model!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verify model is available
Write-Host "[3/3] Verifying model..." -ForegroundColor Yellow
$models = Invoke-RestMethod -Uri "http://localhost:11434/api/tags"
$hasQwen = $models.models | Where-Object { $_.name -like "*qwen2.5*" }

if ($hasQwen) {
    Write-Host "  ✅ qwen2.5 model ready!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Model verification failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  ✅ QWEN 2.5 SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart backend (Ctrl+C, then run START-BACKEND.ps1)" -ForegroundColor White
Write-Host "  2. Try importing with AI analysis" -ForegroundColor White
Write-Host ""
Write-Host "Qwen 2.5 is:" -ForegroundColor Yellow
Write-Host "  • Faster than llama3.2" -ForegroundColor White
Write-Host "  • Better at structured data" -ForegroundColor White
Write-Host "  • More reliable with JSON output" -ForegroundColor White
Write-Host ""
