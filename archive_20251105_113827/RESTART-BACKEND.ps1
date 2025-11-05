# Kill any existing backend processes
Write-Host "Stopping any running backend processes..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*aws-archetect*" } | Stop-Process -Force
Start-Sleep -Seconds 2

# Navigate and start
cd D:\aws-archetect\backend

# Activate venv
.\venv\Scripts\Activate.ps1

# Set environment
$env:POSTGRES_HOST = "127.0.0.1"
$env:POSTGRES_PORT = "5433"
$env:POSTGRES_USER = "postgres"
$env:POSTGRES_PASSWORD = "postgres"
$env:POSTGRES_DB = "auth_db"
$env:OLLAMA_BASE_URL = "http://localhost:11434/v1"
$env:OLLAMA_MODEL = "llama3.2"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  STARTING BACKEND WITH OLLAMA (llama3.2)" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host "Database: 127.0.0.1:5433/auth_db" -ForegroundColor Cyan
Write-Host "Ollama:   http://localhost:11434/v1 (llama3.2)" -ForegroundColor Cyan
Write-Host ""

# Start server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
