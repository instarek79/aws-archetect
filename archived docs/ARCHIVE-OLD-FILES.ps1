# Archive old/unwanted files
Write-Host "Archiving old files..." -ForegroundColor Cyan

# Create archive folder with timestamp
$archiveFolder = "archive_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $archiveFolder -Force | Out-Null

Write-Host "Moving files to: $archiveFolder" -ForegroundColor Yellow
Write-Host ""

# List of files to archive
$filesToArchive = @(
    # Old markdown docs
    "COMPLETE-WORKING-SOLUTION.md",
    "DEBUG-LOGIN-NOW.md",
    "DEBUG-LOGIN.md",
    "FINAL-FIX-JSON-ISSUE.md",
    "FIX-LOGIN-SIGNUP.md",
    "FIXED-COMPLETE.md",
    "IMPORT-FEATURES-SUMMARY.md",
    "IMPORT-FIXES.md",
    "LOCAL-DEVELOPMENT-SETUP.md",
    "LOGIN-FIXED.md",
    "QUICK-FIX-BACKEND.md",
    "QUICK-FIX-TIMEOUT.md",
    "UNNAMED-COLUMNS-FIX.md",
    "URGENT-LOGIN-FIX.md",
    
    # Old startup scripts
    "RESTART-BACKEND.ps1",
    "RUN-BACKEND.ps1",
    "START-BACKEND-WORKING.ps1",
    "start-backend.ps1",
    "start-db.ps1",
    "start-frontend.ps1",
    "start.bat",
    "start.sh",
    
    # Test scripts
    "test-admin-login.ps1",
    "test-ai-endpoint.ps1",
    "test-api.ps1",
    "test-api.sh",
    "test-backend-internal.py",
    "test-backend-quick.ps1",
    "test-backend.ps1",
    "test-db-connection.py",
    "test-health.ps1",
    "test-login-api.ps1",
    "test-login-internal.py",
    "test-login.html",
    "test-login.ps1",
    "test-ollama.ps1",
    "test-signup-api.ps1",
    "test_ollama_connection.py",
    
    # Old utility scripts
    "add-sample-resources.py",
    "add-sample-resources.sql",
    "backup-database.ps1",
    "create-admin-direct.ps1",
    "create-admin-user.ps1",
    "create-admin.py",
    "migrate.sql",
    "stop-all.ps1",
    "verify-setup.ps1",
    "view-logs.ps1",
    
    # Docker files (if not using Docker)
    "docker-compose.dev.yml",
    "docker-compose.yml",
    
    # Sample data
    "New_AWS_Assets_Sheet(DotNetTeam).csv"
)

$movedCount = 0
$notFoundCount = 0

foreach ($file in $filesToArchive) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination $archiveFolder -Force
        Write-Host "  Moved: $file" -ForegroundColor Green
        $movedCount++
    } else {
        Write-Host "  Not found: $file" -ForegroundColor Gray
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "Archive Complete!" -ForegroundColor Green
Write-Host "  Moved: $movedCount files" -ForegroundColor White
Write-Host "  Not found: $notFoundCount files" -ForegroundColor Gray
Write-Host "  Archive location: $archiveFolder" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Kept files:" -ForegroundColor Yellow
Write-Host "  START-ALL.ps1           - One script to start everything" -ForegroundColor White
Write-Host "  README-SIMPLE.md        - Clean documentation" -ForegroundColor White
Write-Host "  .env.example            - Environment config template" -ForegroundColor White
Write-Host "  backend/                - Backend code" -ForegroundColor White
Write-Host "  frontend/               - Frontend code" -ForegroundColor White
Write-Host "  docs/                   - Documentation" -ForegroundColor White
Write-Host ""
