param(
    [string]$MachineIp,
    [int]$ApiPort = 8000,
    [int]$WebPort = 4200
)

$ErrorActionPreference = "Stop"

function Get-TajiLanIPv4 {
    param([string]$PreferredAddress)

    if (-not [string]::IsNullOrWhiteSpace($PreferredAddress)) {
        $parsedAddress = $null
        if (-not [System.Net.IPAddress]::TryParse($PreferredAddress, [ref]$parsedAddress)) {
            throw "La dirección '$PreferredAddress' no es una IP válida."
        }
        return $PreferredAddress
    }

    $candidate = Get-NetIPConfiguration |
        Where-Object {
            $_.NetAdapter.Status -eq "Up" -and
            $null -ne $_.IPv4Address -and
            $null -ne $_.IPv4DefaultGateway -and
            $_.IPv4Address.IPAddress -notlike "169.254.*"
        } |
        Sort-Object { $_.NetAdapter.InterfaceMetric } |
        Select-Object -First 1

    if ($null -eq $candidate) {
        throw "No se encontró una IPv4 LAN activa. Usa -MachineIp."
    }
    return $candidate.IPv4Address.IPAddress
}

$lanIp = Get-TajiLanIPv4 -PreferredAddress $MachineIp
$configPath = Join-Path $PSScriptRoot "public\config\app-config.json"
$config = @{
    apiBaseUrl = "http://${lanIp}:$ApiPort/api/v1"
    requestTimeoutMs = 12000
} | ConvertTo-Json
[System.IO.File]::WriteAllText($configPath, $config, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Taji Web: http://${lanIp}:$WebPort" -ForegroundColor Cyan
Write-Host "API configurada: http://${lanIp}:$ApiPort/api/v1" -ForegroundColor DarkCyan
Set-Location $PSScriptRoot
& npm start -- --host 0.0.0.0 --port $WebPort