param(
    [string]$LanAddress
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot 'storage/runtime'
$statePath = Join-Path $runtimeDir 'services.json'
$pythonPath = Join-Path $projectRoot '.venv/Scripts/python.exe'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { 'C:\Program Files\nodejs\node.exe' }
$databasePath = Join-Path $projectRoot 'backend/data/saigon_stories.db'

foreach ($requiredPath in @($pythonPath, $nodePath, $databasePath,
    (Join-Path $projectRoot 'apps/admin-web/node_modules/vite/bin/vite.js'),
    (Join-Path $projectRoot 'apps/guest-web/node_modules/vite/bin/vite.js'),
    (Join-Path $projectRoot 'apps/mobile/node_modules/expo/bin/cli'))) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Missing required file: $requiredPath. See RUNNING.md."
    }
}
if (Test-Path -LiteralPath $statePath) {
    throw 'Service state exists. Run scripts/stop-system.ps1 before starting again.'
}
foreach ($port in @(8000, 5173, 5174, 8081)) {
    $probe = [System.Net.Sockets.TcpClient]::new()
    try {
        $probe.Connect('127.0.0.1', $port)
        throw "Port $port is already in use. Stop the existing service first."
    } catch [System.Net.Sockets.SocketException] {
        # Connection refused means the port is available.
    } finally { $probe.Dispose() }
}

if (-not $LanAddress) {
    $LanAddress = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
        Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } |
        ForEach-Object {
            $properties = $_.GetIPProperties()
            if ($properties.GatewayAddresses.Count -gt 0) { $properties.UnicastAddresses }
        } |
        Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' -and $_.Address.ToString() -notlike '169.254.*' } |
        Select-Object -First 1 -ExpandProperty Address |
        ForEach-Object { $_.ToString() }
}
$parsedAddress = $null
if (-not [System.Net.IPAddress]::TryParse($LanAddress, [ref]$parsedAddress) -or
    $parsedAddress.AddressFamily -ne 'InterNetwork') {
    throw 'Cannot select a LAN IPv4 address. Use -LanAddress <computer-LAN-IP>.'
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$backupDir = Join-Path $projectRoot 'backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backupPath = Join-Path $backupDir ('before-start-' + [guid]::NewGuid().ToString('N') + '.db')
& $pythonPath (Join-Path $projectRoot 'backend/scripts/backup_db.py') --database $databasePath --destination $backupPath
if ($LASTEXITCODE -ne 0) { throw 'Database backup failed; no services started.' }

$env:Path = "$(Split-Path -Parent $nodePath);$env:Path"
$env:SAIGON_DATABASE = $databasePath
Remove-Item Env:SAIGON_DISABLE_CLEANUP -ErrorAction SilentlyContinue
$env:VITE_USE_MOCK = 'false'
$env:VITE_API_BASE_URL = '/api/v1'
$env:EXPO_PUBLIC_USE_MOCK = 'false'
$env:EXPO_PUBLIC_API_STYLE = 'v1'
$env:EXPO_PUBLIC_API_BASE_URL = "http://${LanAddress}:8000/api"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $LanAddress
$services = @()
$runId = [guid]::NewGuid().ToString('N')

function Start-ServiceProcess($Name, $Executable, $Arguments, $WorkingDirectory) {
    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir "$runId-$Name.out.log") `
        -RedirectStandardError (Join-Path $runtimeDir "$runId-$Name.err.log") -PassThru
    [pscustomobject]@{ Name = $Name; Id = $process.Id; Started = $process.StartTime.ToUniversalTime().Ticks }
}

try {
    $services += Start-ServiceProcess 'api' $pythonPath @('-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '0.0.0.0', '--port', '8000') $projectRoot
    $services += Start-ServiceProcess 'admin' $nodePath @('node_modules/vite/bin/vite.js', '--strictPort', '--configLoader', 'runner') (Join-Path $projectRoot 'apps/admin-web')
    $services += Start-ServiceProcess 'guest' $nodePath @('node_modules/vite/bin/vite.js', '--strictPort', '--configLoader', 'runner') (Join-Path $projectRoot 'apps/guest-web')
    $services += Start-ServiceProcess 'mobile' $nodePath @('node_modules/expo/bin/cli', 'start', '--clear', '--lan', '--port', '8081') (Join-Path $projectRoot 'apps/mobile')
} finally {
    if ($services.Count -gt 0) {
        [pscustomobject]@{ Database = $databasePath; LanAddress = $LanAddress; Services = $services } |
            ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding UTF8
    }
}
Write-Output "Database: $databasePath"
Write-Output 'Guest: http://127.0.0.1:5173 | Admin: http://127.0.0.1:5174 | API: http://127.0.0.1:8000/docs'
Write-Output "Mobile (same Wi-Fi): exp://${LanAddress}:8081"
Write-Output "Logs: $runtimeDir"
Write-Output 'Stop: powershell -ExecutionPolicy Bypass -File scripts/stop-system.ps1'
