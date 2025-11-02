# Verify project setup before running

Write-Host "`n🔍 Verifying Project Setup...`n" -ForegroundColor Cyan

$errors = 0
$warnings = 0

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "  ✅ Docker installed: $dockerVersion" -ForegroundColor Green
    
    docker info | Out-Null
    Write-Host "  ✅ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker is not running or not installed" -ForegroundColor Red
    Write-Host "     Install from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    $errors++
}

# Check Docker Compose
Write-Host "`nChecking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "  ✅ Docker Compose installed: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker Compose not found" -ForegroundColor Red
    $errors++
}

# Check required files
Write-Host "`nChecking required files..." -ForegroundColor Yellow

$requiredFiles = @(
    "docker-compose.yml",
    "backend/Dockerfile",
    "backend/requirements.txt",
    "backend/app/main.py",
    "backend/app/routers/auth.py",
    "backend/.env",
    "frontend/Dockerfile",
    "frontend/package.json",
    "frontend/src/App.jsx",
    "frontend/src/i18n.js",
    "frontend/.env"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Missing: $file" -ForegroundColor Red
        $errors++
    }
}

# Check ports
Write-Host "`nChecking if ports are available..." -ForegroundColor Yellow

$ports = @(3000, 8000, 5432)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "  ⚠️  Port $port is already in use" -ForegroundColor Yellow
        Write-Host "     Process: $(Get-Process -Id $connection.OwningProcess | Select-Object -ExpandProperty Name)" -ForegroundColor Gray
        $warnings++
    } else {
        Write-Host "  ✅ Port $port is available" -ForegroundColor Green
    }
}

# Check backend .env file content
Write-Host "`nChecking backend environment configuration..." -ForegroundColor Yellow
if (Test-Path "backend/.env") {
    $envContent = Get-Content "backend/.env" -Raw
    
    if ($envContent -match "JWT_SECRET_KEY=.{32,}") {
        Write-Host "  ✅ JWT_SECRET_KEY is configured" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  JWT_SECRET_KEY might be too short or using default" -ForegroundColor Yellow
        $warnings++
    }
    
    if ($envContent -match "POSTGRES_PASSWORD") {
        Write-Host "  ✅ Database password is set" -ForegroundColor Green
    } else {
        Write-Host "  ❌ POSTGRES_PASSWORD not found in .env" -ForegroundColor Red
        $errors++
    }
}

# Check frontend .env file content
Write-Host "`nChecking frontend environment configuration..." -ForegroundColor Yellow
if (Test-Path "frontend/.env") {
    $frontendEnv = Get-Content "frontend/.env" -Raw
    
    if ($frontendEnv -match "VITE_API_URL") {
        Write-Host "  ✅ VITE_API_URL is configured" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  VITE_API_URL not found in frontend/.env" -ForegroundColor Yellow
        $warnings++
    }
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "✅ Setup verification PASSED! All checks successful." -ForegroundColor Green
    Write-Host "`nYou're ready to start the application!" -ForegroundColor Yellow
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: " -NoNewline -ForegroundColor White
    Write-Host ".\start.bat" -ForegroundColor Yellow
    Write-Host "  2. Open: " -NoNewline -ForegroundColor White
    Write-Host "http://localhost:3000" -ForegroundColor Yellow
    Write-Host "  3. Test API: " -NoNewline -ForegroundColor White
    Write-Host ".\test-api.ps1" -ForegroundColor Yellow
    
} elseif ($errors -eq 0) {
    Write-Host "⚠️  Setup verification completed with $warnings warning(s)" -ForegroundColor Yellow
    Write-Host "`nYou can proceed, but review the warnings above." -ForegroundColor Yellow
    Write-Host "`nTo start: " -NoNewline -ForegroundColor White
    Write-Host ".\start.bat" -ForegroundColor Yellow
    
} else {
    Write-Host "❌ Setup verification FAILED with $errors error(s) and $warnings warning(s)" -ForegroundColor Red
    Write-Host "`nPlease fix the errors above before running the application." -ForegroundColor Yellow
}

Write-Host "="*60 -ForegroundColor Cyan
Write-Host ""
