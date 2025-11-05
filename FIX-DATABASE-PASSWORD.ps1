# Fix PostgreSQL Password Issue
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  PostgreSQL Password Configuration Fix" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "The backend expects:" -ForegroundColor Yellow
Write-Host "  User:     postgres" -ForegroundColor White
Write-Host "  Password: postgres" -ForegroundColor White
Write-Host "  Database: auth_db" -ForegroundColor White
Write-Host "  Host:     127.0.0.1" -ForegroundColor White
Write-Host "  Port:     5432" -ForegroundColor White
Write-Host ""

Write-Host "Choose a solution:" -ForegroundColor Green
Write-Host "  1. Set PostgreSQL password to 'postgres' (Recommended)" -ForegroundColor White
Write-Host "  2. Use your existing PostgreSQL password" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Setting PostgreSQL password to 'postgres'..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run this command in PowerShell AS ADMINISTRATOR:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host 'psql -U postgres -c "ALTER USER postgres WITH PASSWORD ''postgres'';"' -ForegroundColor White
    Write-Host ""
    Write-Host "Then create the database:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host 'psql -U postgres -c "CREATE DATABASE auth_db;"' -ForegroundColor White
    Write-Host ""
    Write-Host "After running these commands, restart the app with: .\START-ALL.ps1" -ForegroundColor Green
    
} elseif ($choice -eq "2") {
    Write-Host ""
    $existingPassword = Read-Host "Enter your PostgreSQL password" -AsSecureString
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($existingPassword))
    
    Write-Host ""
    Write-Host "Creating .env file with your password..." -ForegroundColor Yellow
    
    $envContent = @"
# Database Configuration
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$plainPassword
POSTGRES_DB=auth_db

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2
"@
    
    Set-Content -Path "backend\.env" -Value $envContent
    
    Write-Host "Created backend\.env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now make sure database exists. Run:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "psql -U postgres -c `"CREATE DATABASE auth_db;`"" -ForegroundColor White
    Write-Host ""
    Write-Host "When prompted, enter your PostgreSQL password" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Then restart the app with: .\START-ALL.ps1" -ForegroundColor Green
    
} else {
    Write-Host "Invalid choice" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
