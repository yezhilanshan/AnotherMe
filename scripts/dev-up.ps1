param(
  [switch]$UseNpmForOpenMAIC
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root ".runtime"
$logsDir = Join-Path $runtimeDir "logs"
$pidFile = Join-Path $runtimeDir "pids.json"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$openmaicDir = Join-Path $root "OpenMAIC"
$anothermeDir = Join-Path $root "OpenMAIC\\anotherme2_engine"

$openmaicCmd = if ($UseNpmForOpenMAIC) { "npm run dev" } else { "pnpm dev" }

if (-not $UseNpmForOpenMAIC) {
  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
  if (-not $pnpm) {
    Write-Host "pnpm not found, fallback to npm."
    $openmaicCmd = "npm run dev"
  }
}

$procs = @{}

Write-Host "Starting openmaic-core..."
$p1 = Start-Process -FilePath "powershell" -WorkingDirectory $openmaicDir -ArgumentList "-NoLogo -NoProfile -Command $openmaicCmd *> `"$logsDir\openmaic.log`"" -PassThru
$procs.openmaic = $p1.Id

Write-Host "Starting api-gateway..."
$p2 = Start-Process -FilePath "powershell" -WorkingDirectory $anothermeDir -ArgumentList "-NoLogo -NoProfile -Command python run_gateway.py *> `"$logsDir\gateway.log`"" -PassThru
$procs.gateway = $p2.Id

Write-Host "Starting api-gateway-worker..."
$p3 = Start-Process -FilePath "powershell" -WorkingDirectory $anothermeDir -ArgumentList "-NoLogo -NoProfile -Command python run_gateway_worker.py *> `"$logsDir\worker.log`"" -PassThru
$procs.worker = $p3.Id

$procs | ConvertTo-Json | Set-Content -Encoding UTF8 $pidFile

Write-Host "All services started."
Write-Host "PID file: $pidFile"
Write-Host "Logs dir: $logsDir"
