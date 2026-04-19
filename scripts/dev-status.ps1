$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".runtime\pids.json"

if (-not (Test-Path $pidFile)) {
  Write-Host "No running services tracked."
  exit 0
}

$pids = Get-Content $pidFile -Raw | ConvertFrom-Json

foreach ($name in @("anotherme", "gateway", "worker")) {
  $pid = $pids.$name
  if (-not $pid) {
    Write-Host "${name}: unknown"
    continue
  }
  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Host "${name}: running (PID=$pid)"
  } else {
    Write-Host "${name}: stopped (PID=$pid)"
  }
}
