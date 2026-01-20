# ============================================================================
#  AWS ARCHITECT - START ALL SERVICES
#  Starts: PostgreSQL (local), Backend (FastAPI), Frontend (React)
# ============================================================================

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "                    AWS ARCHITECT - STARTING ALL SERVICES" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Function to start process in new window
function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDir
    )
    
    Write-Host "Starting $Title..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkingDir'; Write-Host '=== $Title ===' -ForegroundColor Cyan; $Command"
}

# ============================================================================
# STEP 1: Start PostgreSQL (Docker)
# ============================================================================
Write-Host "[1/3] Starting PostgreSQL (Docker)..." -ForegroundColor Green

# Stop old containers
Write-Host "  Stopping old containers..." -ForegroundColor Yellow
try { docker-compose down 2>&1 | Out-Null } catch { }

# Start PostgreSQL
Write-Host "  Starting PostgreSQL container..." -ForegroundColor Yellow
try { docker-compose up -d 2>&1 | Out-Null } catch { }

# Wait for database to be healthy
Write-Host "  Waiting for database to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$isHealthy = $false

while ($attempt -lt $maxAttempts -and -not $isHealthy) {
    $attempt++
    $status = docker inspect aws_architect_postgres --format='{{.State.Health.Status}}' 2>$null
    
    if ($status -eq "healthy") {
        $isHealthy = $true
        Write-Host "  PostgreSQL is ready!" -ForegroundColor Green
    } else {
        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}

Write-Host ""

if (-not $isHealthy) {
    Write-Host "  ERROR: PostgreSQL failed to start!" -ForegroundColor Red
    Write-Host "  Check Docker logs: docker logs aws_architect_postgres" -ForegroundColor Yellow
    exit 1
}

# Create database if it doesn't exist
Write-Host "  Creating database..." -ForegroundColor Yellow
$dbExists = docker exec aws_architect_postgres psql -U postgres -lqt 2>$null | Select-String -Pattern "auth_db"
if (-not $dbExists) {
    docker exec aws_architect_postgres psql -U postgres -c "CREATE DATABASE auth_db;" 2>$null | Out-Null
    Write-Host "  Database created!" -ForegroundColor Green
} else {
    Write-Host "  Database already exists!" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 2: Start Backend (FastAPI)
# ============================================================================
Write-Host "[2/3] Starting Backend Server..." -ForegroundColor Green

$backendCommand = @"
`$env:POSTGRES_HOST = '127.0.0.1'
`$env:POSTGRES_PORT = '5433'
`$env:POSTGRES_USER = 'postgres'
`$env:POSTGRES_PASSWORD = 'postgres'
`$env:POSTGRES_DB = 'auth_db'
`$env:OLLAMA_BASE_URL = 'http://localhost:11434/v1'
`$env:OLLAMA_MODEL = 'qwen2.5'

Write-Host 'Activating virtual environment...' -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

Write-Host 'Starting FastAPI server on https://localhost:8000' -ForegroundColor Green
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --ssl-keyfile="certs/key.pem" --ssl-certfile="certs/cert.pem"
"@

Start-ServiceWindow -Title "Backend API" -Command $backendCommand -WorkingDir "D:\aws-archetect\backend"
Start-Sleep -Seconds 5

Write-Host ""

# ============================================================================
# STEP 3: Start Frontend (React + Vite)
# ============================================================================
Write-Host "[3/3] Starting Frontend..." -ForegroundColor Green

$frontendCommand = @"
Write-Host 'Starting Vite dev server on https://localhost:3000' -ForegroundColor Green
npm run dev
"@

Start-ServiceWindow -Title "Frontend React" -Command $frontendCommand -WorkingDir "D:\aws-archetect\frontend"
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "                         ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services Running:" -ForegroundColor Cyan
Write-Host "  Database:  postgresql://localhost:5433/auth_db (Docker)" -ForegroundColor White
Write-Host "  Backend:   https://localhost:8000" -ForegroundColor White
Write-Host "  Frontend:  https://localhost:3000" -ForegroundColor White
Write-Host "  API Docs:  https://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Cyan
Write-Host "  Email:     admin@example.com" -ForegroundColor White
Write-Host "  Password:  admin123" -ForegroundColor White
Write-Host ""
Write-Host "To stop all services, close the terminal windows or press Ctrl+C in each." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
