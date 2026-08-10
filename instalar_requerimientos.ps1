# ==============================================================================
# Script de Instalación de Requerimientos - Frontend Taji (Angular)
# ==============================================================================

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   TAJI FRONTEND - Instalación de Node y Deps     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Verificar presencia de Node.js y npm
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    throw "Node.js / npm no está instalado o no se encuentra en el PATH del sistema."
}

$nodeVersion = node -v
Write-Host "[1/3] Node.js detectado: $nodeVersion" -ForegroundColor Green

# 2. Instalar dependencias con npm
Write-Host "[2/3] Instalando dependencias de Node.js (npm install)..." -ForegroundColor Yellow
& npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "      Dependencias de npm instaladas correctamente." -ForegroundColor Green
} else {
    throw "Ocurrió un error al ejecutar 'npm install'."
}

# 3. Verificar o crear configuración inicial de app-config.json
$configDir = Join-Path $PSScriptRoot "public\config"
$configPath = Join-Path $configDir "app-config.json"

if (-not (Test-Path $configPath)) {
    Write-Host "[3/3] Generando archivo de configuración inicial public/config/app-config.json..." -ForegroundColor Yellow
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    $defaultConfig = @{
        apiBaseUrl = "http://localhost:8000/api/v1"
        requestTimeoutMs = 12000
    } | ConvertTo-Json
    [System.IO.File]::WriteAllText($configPath, $defaultConfig, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "      Archivo public/config/app-config.json creado." -ForegroundColor Green
} else {
    Write-Host "[3/3] Archivo public/config/app-config.json ya existe." -ForegroundColor Green
}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "   Instalación completada con éxito." -ForegroundColor Green
Write-Host "   Puedes iniciar la aplicación web ejecutando:" -ForegroundColor Cyan
Write-Host "   .\iniciar.ps1" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
