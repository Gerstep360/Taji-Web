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

# 3. Preparar .env local y generar la configuración consumida por Angular
$envPath = Join-Path $PSScriptRoot ".env"
$envExamplePath = Join-Path $PSScriptRoot ".env.example"
if (-not (Test-Path $envPath)) {
    Write-Host "[3/3] Creando .env desde .env.example..." -ForegroundColor Yellow
    Copy-Item -LiteralPath $envExamplePath -Destination $envPath
    Write-Host "      Edita TAJI_API_BASE_URL en .env con la IP real del Backend." -ForegroundColor Yellow
}

& npm run config
if ($LASTEXITCODE -ne 0) {
    throw "La configuración de .env no es válida."
}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "   Instalación completada con éxito." -ForegroundColor Green
Write-Host "   Configura la IP del Backend en .env." -ForegroundColor Cyan
Write-Host "   Puedes iniciar la aplicación web ejecutando:" -ForegroundColor Cyan
Write-Host "   .\iniciar.ps1" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
