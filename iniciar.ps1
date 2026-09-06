# ==============================================================================
# Script de Inicio Interactivo - Frontend Taji (Angular)
# ==============================================================================

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Show-TajiBanner {
    param([string]$Subtitle = "LANZADOR DE FRONTEND")
    Clear-Host
    Write-Host "+----------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "|   TTTTT   AAA    JJJJJ  IIIII                            |" -ForegroundColor Cyan
    Write-Host "|     T    A   A     J      I                              |" -ForegroundColor Cyan
    Write-Host "|     T    AAAAA     J      I    SYSTEM CONDOMINIUMS       |" -ForegroundColor Yellow
    Write-Host "|     T    A   A  J  J      I                              |" -ForegroundColor Magenta
    Write-Host "|     T    A   A   JJ     IIIII                            |" -ForegroundColor Magenta
    Write-Host "+----------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "       === $Subtitle ===" -ForegroundColor Green
    Write-Host ""
}

function Get-TajiLanIp {
    $candidate = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object {
            $_.NetAdapter.Status -eq "Up" -and
            $null -ne $_.IPv4Address -and
            $null -ne $_.IPv4DefaultGateway -and
            $_.IPv4Address.IPAddress -notlike "169.254.*"
        } |
        Sort-Object { $_.NetAdapter.InterfaceMetric } |
        Select-Object -First 1

    if ($null -ne $candidate) {
        return $candidate.IPv4Address.IPAddress
    }
    return "127.0.0.1"
}

Show-TajiBanner -Subtitle "SERVIDOR DE DESARROLLO ANGULAR WEB"

$lanIp = Get-TajiLanIp
Write-Host " Detector de red IP local: " -NoNewline; Write-Host "$lanIp" -ForegroundColor Cyan
Write-Host ""

$inputPort = Read-Host " Puerto del servidor Web [4200]"
if ([string]::IsNullOrWhiteSpace($inputPort)) { $inputPort = "4200" }

$inputSubpath = Read-Host " Sub-ruta de la aplicación [/taji]"
if ([string]::IsNullOrWhiteSpace($inputSubpath)) { $inputSubpath = "/taji" }
if (-not $inputSubpath.StartsWith("/")) { $inputSubpath = "/$inputSubpath" }

$version = (Get-Content -LiteralPath '.node-version' -Raw).Trim()
$architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$runtimeDirectory = Join-Path $PSScriptRoot ".tools/node-v$version-win-$architecture"
if (Test-Path -LiteralPath (Join-Path $runtimeDirectory 'node.exe')) {
    $env:PATH = "$runtimeDirectory;$env:PATH"
}

$envPath = Join-Path $PSScriptRoot ".env"
$apiBaseUrl = "http://${lanIp}:8000/api/v1"
if (Test-Path $envPath) {
    $apiLine = Get-Content $envPath | Where-Object { $_ -match "^\s*TAJI_API_BASE_URL\s*=" } | Select-Object -Last 1
    if (-not [string]::IsNullOrWhiteSpace($apiLine)) {
        $apiBaseUrl = ($apiLine -split "=", 2)[1].Trim().Trim('"').Trim("'")
    }
}

$baseHref = "$inputSubpath/"

Write-Host ""
Write-Host " ----------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " Configuración activa de la aplicación Web:" -ForegroundColor Yellow
Write-Host "   * URL Local:        " -NoNewline; Write-Host "http://localhost:${inputPort}${baseHref}" -ForegroundColor Cyan
Write-Host "   * URL Red LAN:      " -NoNewline; Write-Host "http://${lanIp}:${inputPort}${baseHref}" -ForegroundColor Cyan
Write-Host "   * Backend API:      " -NoNewline; Write-Host "$apiBaseUrl" -ForegroundColor DarkCyan
Write-Host " ----------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

Write-Host " Iniciando servidor dev Angular con sub-ruta $baseHref ..." -ForegroundColor Green
& npm.cmd start -- --host 0.0.0.0 --port $inputPort --base-href "$baseHref" --serve-path "$baseHref"
