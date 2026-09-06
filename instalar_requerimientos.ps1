param([switch]$Actualizar)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host '+-------------------------------------------+' -ForegroundColor Cyan
Write-Host '| TAJI WEB - Node, Angular y configuracion   |' -ForegroundColor Cyan
Write-Host '+-------------------------------------------+' -ForegroundColor Cyan
if ($Actualizar) {
    & git diff --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Guarda tus cambios antes de actualizar.' }
    & git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Hay cambios preparados sin commit.' }
    & git pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar la rama actual sin conflictos.' }
}
$version = (Get-Content -LiteralPath '.node-version' -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Version Node invalida.' }
$architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$archiveName = "node-v$version-win-$architecture.zip"
$toolsDirectory = Join-Path $PSScriptRoot '.tools'
$runtimeDirectory = Join-Path $toolsDirectory "node-v$version-win-$architecture"
if (-not (Test-Path -LiteralPath (Join-Path $runtimeDirectory 'node.exe'))) {
    New-Item -ItemType Directory -Force -Path $toolsDirectory | Out-Null
    $archivePath = Join-Path $toolsDirectory $archiveName
    Write-Host "Descargando Node $version con npm desde nodejs.org..."
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v$version/$archiveName" -OutFile $archivePath
    $checksumPath = Join-Path $toolsDirectory "node-$version-SHASUMS256.txt"
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v$version/SHASUMS256.txt" -OutFile $checksumPath
    $checksumLine = Get-Content -LiteralPath $checksumPath | Where-Object { $_.EndsWith("  $archiveName") }
    if (-not $checksumLine) { throw 'El archivo no figura en los checksums oficiales.' }
    $expectedHash = ($checksumLine -split '\s+')[0]
    if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ne $expectedHash) {
        throw 'La descarga no coincide con el SHA256 oficial.'
    }
    Expand-Archive -LiteralPath $archivePath -DestinationPath $toolsDirectory -Force
}
$env:PATH = "$runtimeDirectory;$env:PATH"
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
& (Join-Path $runtimeDirectory 'npm.cmd') ci
if ($LASTEXITCODE -ne 0) { throw 'Fallo npm ci.' }
& (Join-Path $runtimeDirectory 'npm.cmd') run build
if ($LASTEXITCODE -ne 0) { throw 'Fallo la compilacion Angular; revisa .env y el error anterior.' }
Write-Host 'Instalacion lista. Ejecuta .\iniciar.ps1 para abrir la web local.' -ForegroundColor Green
