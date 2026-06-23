$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$port = 8000
$pidFile = Join-Path $root '.local-server.pid'
$stdoutLog = Join-Path $root '.local-server.out.log'
$stderrLog = Join-Path $root '.local-server.err.log'

if (Test-Path $pidFile) {
    $existingPid = Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
        Write-Host "Local server already running on port $port (PID $existingPid)."
        Write-Host "Open http://localhost:$port/battle-assistant.html"
        exit 0
    }
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
try {
    $listener.Start()
} catch {
    Write-Error "Port $port is already in use. Stop the other server or change the port in this script."
    exit 1
} finally {
    $listener.Stop()
}

$python = $null
foreach ($candidate in @('python', 'py')) {
    try {
        $cmd = Get-Command $candidate -ErrorAction Stop
        $python = $cmd.Source
        break
    } catch {
    }
}

if (-not $python) {
    throw "Python is required to run the local server, but it was not found on PATH."
}

$serverScript = @"
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os
import sys

root = r'$root'
port = $port
os.chdir(root)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stdout.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))
        sys.stdout.flush()

httpd = ThreadingHTTPServer(('127.0.0.1', port), Handler)
print(f'Serving {root} at http://127.0.0.1:{port}/battle-assistant.html', flush=True)
httpd.serve_forever()
"@

$tmpScript = Join-Path $env:TEMP "battle-assistant-local-server-$port.py"
[System.IO.File]::WriteAllText($tmpScript, $serverScript)

$proc = Start-Process -FilePath $python -ArgumentList $tmpScript -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog
$proc.Id | Set-Content -LiteralPath $pidFile

Start-Sleep -Milliseconds 500
Write-Host "Local server started on http://localhost:$port/battle-assistant.html"
Write-Host "PID: $($proc.Id)"
Write-Host "Stdout log: $stdoutLog"
Write-Host "Stderr log: $stderrLog"
