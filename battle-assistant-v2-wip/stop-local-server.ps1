$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$pidFile = Join-Path $root '.local-server.pid'

if (-not (Test-Path $pidFile)) {
    Write-Host 'No local server PID file found.'
    exit 0
}

$pidText = (Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
if (-not $pidText) {
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host 'PID file was empty; removed it.'
    exit 0
}

$serverPid = [int]$pidText
if (Get-Process -Id $serverPid -ErrorAction SilentlyContinue) {
    Stop-Process -Id $serverPid -Force
    Write-Host "Stopped local server process $serverPid."
} else {
    Write-Host "No running process found for PID $serverPid."
}

Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
