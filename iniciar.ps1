param(
    [int]$WebPort = 4200
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

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
& npm start -- --host 0.0.0.0 --port $WebPort