# AWS Architect - Database Backup Script
# Backs up PostgreSQL database to external volume/folder

param(
    [string]$BackupPath = ".\backups",
    [switch]$AutoBackup
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AWS Architect - Database Backup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Force -Path $BackupPath | Out-Null
    Write-Host "[OK] Created backup directory: $BackupPath" -ForegroundColor Green
}

# Generate timestamp for backup file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupPath "aws_architect_db_$timestamp.sql"

Write-Host ""
Write-Host "Starting database backup..." -ForegroundColor Yellow
Write-Host "  - Container: auth_postgres" -ForegroundColor Gray
Write-Host "  - Database: authdb" -ForegroundColor Gray
Write-Host "  - Output: $backupFile" -ForegroundColor Gray
Write-Host ""

# Check if containers are running
$containerStatus = docker ps --format "{{.Names}}" | Select-String "auth_postgres"

if (!$containerStatus) {
    Write-Host "[ERROR] Database container is not running!" -ForegroundColor Red
    Write-Host "Please start the containers with: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

# Perform backup using docker exec
try {
    Write-Host "Executing pg_dump..." -ForegroundColor Yellow
    
    # Export database dump
    docker exec auth_postgres pg_dump -U postgres authdb > $backupFile
    
    if (Test-Path $backupFile) {
        $fileSize = (Get-Item $backupFile).Length
        $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  BACKUP SUCCESSFUL!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Backup Details:" -ForegroundColor Cyan
        Write-Host "  - File: $backupFile" -ForegroundColor White
        Write-Host "  - Size: $fileSizeKB KB" -ForegroundColor White
        Write-Host "  - Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
        Write-Host ""
        
        # List recent backups
        Write-Host "Recent Backups:" -ForegroundColor Cyan
        Get-ChildItem -Path $BackupPath -Filter "*.sql" | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -First 5 | 
            ForEach-Object {
                $size = [math]::Round($_.Length / 1KB, 2)
                Write-Host "  - $($_.Name) ($size KB)" -ForegroundColor Gray
            }
        Write-Host ""
        
        # Cleanup old backups (keep last 10)
        $oldBackups = Get-ChildItem -Path $BackupPath -Filter "*.sql" | 
                        Sort-Object LastWriteTime -Descending | 
                        Select-Object -Skip 10
        
        if ($oldBackups) {
            Write-Host "Cleaning up old backups (keeping last 10)..." -ForegroundColor Yellow
            $oldBackups | ForEach-Object {
                Remove-Item $_.FullName -Force
                Write-Host "  - Removed: $($_.Name)" -ForegroundColor Gray
            }
            Write-Host ""
        }
        
    } else {
        throw "Backup file was not created"
    }
    
} catch {
    Write-Host ""
    Write-Host "[ERROR] Backup failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Show restore instructions
Write-Host "To restore this backup:" -ForegroundColor Cyan
Write-Host "  1. Stop containers: docker-compose down -v" -ForegroundColor Gray
Write-Host "  2. Start containers: docker-compose up -d" -ForegroundColor Gray
Write-Host "  3. Wait for database to be ready (10 seconds)" -ForegroundColor Gray
Write-Host "  4. Restore: docker exec -i auth_postgres psql -U postgres authdb < $backupFile" -ForegroundColor Gray
Write-Host ""

# Optional: Schedule automatic backups
if ($AutoBackup) {
    Write-Host "Setting up automatic daily backups..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To schedule automatic backups, add this to Windows Task Scheduler:" -ForegroundColor Cyan
    Write-Host "  Program: powershell.exe" -ForegroundColor Gray
    Write-Host "  Arguments: -ExecutionPolicy Bypass -File `"$(Get-Location)\backup-database.ps1`" -BackupPath `"$BackupPath`"" -ForegroundColor Gray
    Write-Host "  Trigger: Daily at midnight" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
