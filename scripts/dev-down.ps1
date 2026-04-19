$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".runtime\pids.json"

if (-not (Test-Path $pidFile)) {
  Write-Host "No PID file found: $pidFile"
  exit 0
}

$pids = Get-Content $pidFile -Raw | ConvertFrom-Json

foreach ($name in @("anotherme", "gateway", "worker")) {
  $pid = $pids.$name
  if (-not $pid) { continue }
  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Host "Stopping $name (PID=$pid)"
    Stop-Process -Id $pid -Force
  } else {
    Write-Host "$name already stopped (PID=$pid)"
  }
}

Remove-Item $pidFile -Force
Write-Host "All managed services stopped."
