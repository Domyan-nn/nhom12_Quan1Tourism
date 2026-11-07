$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $projectRoot 'storage/runtime/services.json'
if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) {
    Write-Output 'No managed services found.'
    return
}
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
foreach ($service in $state.Services) {
    $process = Get-Process -Id $service.Id -ErrorAction SilentlyContinue
    if ($process -and $process.StartTime.ToUniversalTime().Ticks -eq [long]$service.Started) {
        # Include child processes of the selected service, never unrelated Node/Python processes.
        & taskkill.exe /PID $service.Id /T /F | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Could not stop $($service.Name). State retained." }
        Write-Output "Stopped $($service.Name)."
    }
}
Remove-Item -LiteralPath $statePath
