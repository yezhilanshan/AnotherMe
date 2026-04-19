param(
  [switch]$UseNpmForAnotherMe
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root ".runtime"
$logsDir = Join-Path $runtimeDir "logs"
$pidFile = Join-Path $runtimeDir "pids.json"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$anothermeCoreDir = Join-Path $root "AnotherMe"
$anothermeEngineDir = Join-Path $root "AnotherMe\\anotherme2_engine"

$anothermeCoreCmd = if ($UseNpmForAnotherMe) { "npm run dev" } else { "pnpm dev" }

if (-not $UseNpmForAnotherMe) {
  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
  if (-not $pnpm) {
    Write-Host "pnpm not found, fallback to npm."
    $anothermeCoreCmd = "npm run dev"
  }
}

$procs = @{}

Write-Host "Starting anotherme-core..."
$p1 = Start-Process -FilePath "powershell" -WorkingDirectory $anothermeCoreDir -ArgumentList "-NoLogo -NoProfile -Command $anothermeCoreCmd *> `"$logsDir\anotherme-core.log`"" -PassThru
$procs.anotherme = $p1.Id

Write-Host "Starting api-gateway..."
$p2 = Start-Process -FilePath "powershell" -WorkingDirectory $anothermeEngineDir -ArgumentList "-NoLogo -NoProfile -Command python run_gateway.py *> `"$logsDir\gateway.log`"" -PassThru
$procs.gateway = $p2.Id

Write-Host "Starting api-gateway-worker..."
$p3 = Start-Process -FilePath "powershell" -WorkingDirectory $anothermeEngineDir -ArgumentList "-NoLogo -NoProfile -Command python run_gateway_worker.py *> `"$logsDir\worker.log`"" -PassThru
$procs.worker = $p3.Id

$procs | ConvertTo-Json | Set-Content -Encoding UTF8 $pidFile

Write-Host "All services started."
Write-Host "PID file: $pidFile"
Write-Host "Logs dir: $logsDir"
