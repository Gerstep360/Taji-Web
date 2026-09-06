param(
    [int]$WebPort = 4200
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$nodeVersion = (Get-Content -LiteralPath '.node-version' -Raw).Trim()
$architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$runtimeDirectory = Join-Path $PSScriptRoot ".tools/node-v$nodeVersion-win-$architecture"
if (Test-Path -LiteralPath (Join-Path $runtimeDirectory 'node.exe')) {
    $env:PATH = "$runtimeDirectory;$env:PATH"
}

$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
    throw "Falta .env. Copia .env.example como .env y configura TAJI_API_BASE_URL."
}

$apiLine = Get-Content $envPath |
    Where-Object { $_ -match "^\s*TAJI_API_BASE_URL\s*=" } |
    Select-Object -Last 1
if ([string]::IsNullOrWhiteSpace($apiLine)) {
    throw "TAJI_API_BASE_URL no está definido en .env."
}

$apiBaseUrl = ($apiLine -split "=", 2)[1].Trim().Trim('"').Trim("'")
Write-Host "Taji Web: http://localhost:$WebPort" -ForegroundColor Cyan
Write-Host "API configurada desde .env: $apiBaseUrl" -ForegroundColor DarkCyan
& npm.cmd start -- --host 0.0.0.0 --port $WebPort
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar Angular.' }
