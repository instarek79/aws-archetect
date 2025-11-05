# Backend Log Viewer with Color Highlighting
# Usage: .\view-logs.ps1 [-Follow] [-Errors] [-Lines 50]

param(
    [switch]$Follow,      # Follow logs in real-time
    [switch]$Errors,      # Show only errors
    [int]$Lines = 100     # Number of lines to show
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      Backend Log Viewer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Follow) {
    Write-Host "Following logs in real-time (Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host ""
    
    # Follow logs with color highlighting
    docker-compose logs backend --follow --tail $Lines 2>&1 | ForEach-Object {
        $line = $_
        
        if ($line -match "❌|ERROR|error|Error|failed|Failed|FAILED|Exception|Traceback") {
            Write-Host $line -ForegroundColor Red
        }
        elseif ($line -match "✅|success|Success|SUCCESS|completed|Completed") {
            Write-Host $line -ForegroundColor Green
        }
        elseif ($line -match "⚠️|WARNING|Warning|warning") {
            Write-Host $line -ForegroundColor Yellow
        }
        elseif ($line -match "🔄|Sending|Loading|Starting") {
            Write-Host $line -ForegroundColor Cyan
        }
        elseif ($line -match "INFO:|GET |POST |PUT |DELETE ") {
            Write-Host $line -ForegroundColor Gray
        }
        elseif ($line -match "Ollama|llama|Model") {
            Write-Host $line -ForegroundColor Magenta
        }
        else {
            Write-Host $line
        }
    }
}
elseif ($Errors) {
    Write-Host "Showing only errors from last $Lines lines..." -ForegroundColor Yellow
    Write-Host ""
    
    docker-compose logs backend --tail $Lines --no-log-prefix 2>&1 | ForEach-Object {
        $line = $_
        
        if ($line -match "❌|ERROR|error|Error|failed|Failed|FAILED|Exception|Traceback|500 Internal") {
            Write-Host $line -ForegroundColor Red
        }
    }
}
else {
    Write-Host "Showing last $Lines lines..." -ForegroundColor Yellow
    Write-Host ""
    
    docker-compose logs backend --tail $Lines --no-log-prefix 2>&1 | ForEach-Object {
        $line = $_
        
        if ($line -match "❌|ERROR|error|Error|failed|Failed|FAILED|Exception|Traceback") {
            Write-Host $line -ForegroundColor Red
        }
        elseif ($line -match "✅|success|Success|SUCCESS|completed|Completed") {
            Write-Host $line -ForegroundColor Green
        }
        elseif ($line -match "⚠️|WARNING|Warning|warning") {
            Write-Host $line -ForegroundColor Yellow
        }
        elseif ($line -match "🔄|Sending|Loading|Starting") {
            Write-Host $line -ForegroundColor Cyan
        }
        elseif ($line -match "INFO:|GET |POST |PUT |DELETE ") {
            Write-Host $line -ForegroundColor Gray
        }
        elseif ($line -match "Ollama|llama|Model") {
            Write-Host $line -ForegroundColor Magenta
        }
        else {
            Write-Host $line
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Usage examples:" -ForegroundColor White
Write-Host "  .\view-logs.ps1              # View last 100 lines" -ForegroundColor Gray
Write-Host "  .\view-logs.ps1 -Lines 50    # View last 50 lines" -ForegroundColor Gray
Write-Host "  .\view-logs.ps1 -Follow      # Follow logs live" -ForegroundColor Gray
Write-Host "  .\view-logs.ps1 -Errors      # Show only errors" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
