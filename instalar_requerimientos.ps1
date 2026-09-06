# ==============================================================================
# Script de Instalación Interactivo - Frontend Taji (Angular)
# ==============================================================================

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# --- Funciones de Diseño y Animación GUI-Style ---
function Show-TajiBanner {
    param([string]$Subtitle = "INSTALADOR DE FRONTEND")
    Clear-Host
    Write-Host " +----------------------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host " |   TTTTT   AAA    JJJJJ  IIIII                                        |" -ForegroundColor Cyan
    Write-Host " |     T    A   A     J      I     S I S T E M A                        |" -ForegroundColor Cyan
    Write-Host " |     T    AAAAA     J      I     C O N D O M I N I O S                |" -ForegroundColor Yellow
    Write-Host " |     T    A   A  J  J      I                                          |" -ForegroundColor Magenta
    Write-Host " |     T    A   A   JJ     IIIII   * DEPLOYMENT ENGINE (ANGULAR)        |" -ForegroundColor Magenta
    Write-Host " +----------------------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "       === $Subtitle ===" -ForegroundColor Green
    Write-Host ""
}

function Show-ProgressBarTask {
    param(
        [scriptblock]$Task,
        [string]$Message,
        [object[]]$ArgumentList = @()
    )
    $spin = @('|', '/', '-', '\')
    $job = Start-Job -ScriptBlock $Task -ArgumentList $ArgumentList
    $step = 0
    $width = 25

    while ($job.State -eq 'Running') {
        $frame = $spin[$step % 4]
        $filledLen = ($step % $width) + 1
        $fill = "█" * $filledLen
        $empty = "░" * ($width - $filledLen)
        
        Write-Host "`r [$frame] $Message... [$fill$empty]" -ForegroundColor Yellow -NoNewline
        Start-Sleep -Milliseconds 80
        $step++
    }
    $result = Receive-Job -Job $job
    Remove-Job -Job $job -Force
    
    $fullBar = "█" * $width
    if ($job.State -eq 'Completed') {
        Write-Host "`r [OK] $Message... [$fullBar] 100% COMPLETADO  " -ForegroundColor Green
    } else {
        Write-Host "`r [ERROR] $Message... [FALLO EN EL PROCESO]     " -ForegroundColor Red
        throw "Error al ejecutar la tarea."
    }
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

# --- Inicio del Asistente Interactivo ---
Show-TajiBanner -Subtitle "INSTALADOR INTERACTIVO WEB (ANGULAR)"

$detectedIp = Get-TajiLanIp
Write-Host " +----------------------------------------------------------------------+" -ForegroundColor DarkGray
Write-Host " | Detector de red: IP Local / Servidor = $detectedIp" -ForegroundColor Cyan
Write-Host " +----------------------------------------------------------------------+" -ForegroundColor DarkGray
Write-Host ""

$inputIp = Read-Host " Configurar IP / Host para Frontend [$detectedIp]"
if ([string]::IsNullOrWhiteSpace($inputIp)) { $inputIp = $detectedIp }

$inputSubpath = Read-Host " Sub-ruta de aplicacion [/taji]"
if ([string]::IsNullOrWhiteSpace($inputSubpath)) { $inputSubpath = "/taji" }
if (-not $inputSubpath.StartsWith("/")) { $inputSubpath = "/$inputSubpath" }

$defaultApiUrl = "http://${inputIp}:8000/api/v1"
$inputApiUrl = Read-Host " URL del Backend API [$defaultApiUrl]"
if ([string]::IsNullOrWhiteSpace($inputApiUrl)) { $inputApiUrl = $defaultApiUrl }

Write-Host ""
Write-Host " +----------------------------------------------------------------------+" -ForegroundColor DarkGray
Write-Host " | Resumen de Configuracion Web Seleccionada:" -ForegroundColor Yellow
Write-Host " |   * IP Frontend:  $inputIp" -ForegroundColor Cyan
Write-Host " |   * Sub-ruta Web: $inputSubpath" -ForegroundColor Cyan
Write-Host " |   * Backend API:  $inputApiUrl" -ForegroundColor Cyan
Write-Host " +----------------------------------------------------------------------+" -ForegroundColor DarkGray
Write-Host ""

$confirm = Read-Host " Deseas proceder con la instalacion? (S/n) [S]"
if (-not [string]::IsNullOrWhiteSpace($confirm) -and $confirm -notlike "s*") {
    Write-Host "`n Instalacion cancelada por el usuario." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# 1. Verificar / Descargar Node.js runtime local si no existe
$version = (Get-Content -LiteralPath '.node-version' -Raw).Trim()
$architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$toolsDirectory = Join-Path $PSScriptRoot '.tools'
$runtimeDirectory = Join-Path $toolsDirectory "node-v$version-win-$architecture"

if (-not (Test-Path -LiteralPath (Join-Path $runtimeDirectory 'node.exe'))) {
    Show-ProgressBarTask -Message "Descargando e instalando entorno Node.js v$version" -Task {
        param($ver, $arch, $tDir, $rDir)
        $archiveName = "node-v$ver-win-$arch.zip"
        New-Item -ItemType Directory -Force -Path $tDir | Out-Null
        $archivePath = Join-Path $tDir $archiveName
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v$ver/$archiveName" -OutFile $archivePath
        Expand-Archive -LiteralPath $archivePath -DestinationPath $tDir -Force
    } -ArgumentList $version, $architecture, $toolsDirectory, $runtimeDirectory
} else {
    Write-Host " [OK] Entorno Node.js ($version) listo" -ForegroundColor Green
}

$env:PATH = "$runtimeDirectory;$env:PATH"
$npmCmd = Join-Path $runtimeDirectory 'npm.cmd'

# 2. Configurar .env
Show-ProgressBarTask -Message "Configurando archivo .env del Frontend" -Task {
    param($apiUrl, $rootDir)
    $envPath = Join-Path $rootDir ".env"
    $lines = @(
        "TAJI_API_BASE_URL=$apiUrl",
        "TAJI_API_TIMEOUT_MS=12000"
    )
    $content = $lines -join "`n"
    Set-Content -Path $envPath -Value $content -Encoding UTF8
} -ArgumentList $inputApiUrl, $PSScriptRoot

# 3. Instalación de paquetes con npm ci
Show-ProgressBarTask -Message "Instalando paquetes de Node.js (npm ci)" -Task {
    param($npm)
    & $npm ci --quiet 2>&1 | Out-Null
} -ArgumentList $npmCmd

# 4. Compilar proyecto Angular con --base-href
Show-ProgressBarTask -Message "Compilando aplicacion Angular (sub-ruta $inputSubpath/)" -Task {
    param($npm, $sub)
    $baseHref = "$sub/"
    & $npm run build -- --base-href "$baseHref" 2>&1 | Out-Null
} -ArgumentList $npmCmd, $inputSubpath

Write-Host ""
Write-Host " +----------------------------------------------------------------------+" -ForegroundColor Green
Write-Host " |   INSTALACION DEL FRONTEND COMPLETADA EXITOSAMENTE!                  |" -ForegroundColor Green
Write-Host " +----------------------------------------------------------------------+" -ForegroundColor Green
Write-Host " Puedes iniciar la aplicacion ejecutando:" -ForegroundColor Yellow
Write-Host "   .\iniciar.ps1" -ForegroundColor Cyan
Write-Host ""
