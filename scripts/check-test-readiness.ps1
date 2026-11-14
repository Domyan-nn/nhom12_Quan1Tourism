param(
    [string]$Database,
    [string]$ApiUrl = 'http://127.0.0.1:8000'
)

# Read-only pre-flight check before manual, device or fresh-install testing.
# It never creates, migrates or writes any database or file. Exit code 1 when a blocking check fails.

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$script:failures = 0
$script:warnings = 0

function Pass([string]$message) { Write-Host "[OK]   $message" -ForegroundColor Green }
function Warn([string]$message) { $script:warnings++; Write-Host "[WARN] $message" -ForegroundColor Yellow }
function Fail([string]$message) { $script:failures++; Write-Host "[FAIL] $message" -ForegroundColor Red }

Write-Host "== Tools"
$pythonPath = Join-Path $projectRoot '.venv/Scripts/python.exe'
if (Test-Path -LiteralPath $pythonPath -PathType Leaf) { Pass "Python venv: $pythonPath" } else { Fail 'Missing .venv. Create it and install backend/requirements-dev.txt (RUNNING.md).' }
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if ($node) { Pass ("Node " + (& $node.Source --version)) } else { Fail 'Node.js not found in PATH.' }
foreach ($app in 'guest-web', 'admin-web', 'mobile') {
    if (Test-Path -LiteralPath (Join-Path $projectRoot "apps/$app/node_modules") -PathType Container) { Pass "apps/$app dependencies installed" }
    else { Fail "apps/$app has no node_modules. Run: npm ci --prefix apps/$app" }
}

Write-Host "== Database"
if (-not $Database) { $Database = if ($env:SAIGON_DATABASE) { $env:SAIGON_DATABASE } else { Join-Path $projectRoot 'backend/data/saigon_stories.db' } }
$uploads = if ($env:SAIGON_UPLOADS) { $env:SAIGON_UPLOADS } else { Join-Path $projectRoot 'storage/uploads' }
if (-not (Test-Path -LiteralPath $Database -PathType Leaf)) {
    Fail "Database not found: $Database"
} elseif (Test-Path -LiteralPath $pythonPath -PathType Leaf) {
    $code = @'
import json, sqlite3, sys
from pathlib import Path
db, uploads = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
c = sqlite3.connect(db.as_uri() + "?mode=ro", uri=True)
tables = {r[0] for r in c.execute("select name from sqlite_master where type='table'")}
published = c.execute("select id, name, image_url from pois where status='published'").fetchall()
missing_locales, missing_files = [], []
for poi_id, name, image in published:
    locales = {r[0] for r in c.execute("select locale from poi_narrations where poi_id=? and length(trim(body))>0", (poi_id,))}
    if not {"vi", "en"} <= locales:
        missing_locales.append(name)
    if image and image.startswith("/api/media/") and not (uploads / image[len("/api/media/"):]).is_file():
        missing_files.append(name)
print(json.dumps({
    "version": c.execute("pragma user_version").fetchone()[0],
    "audit": "admin_audit_log" in tables,
    "categories": c.execute("select count(*) from categories").fetchone()[0],
    "published": len(published),
    "admins": c.execute("select count(*) from admin_accounts where is_active=1").fetchone()[0],
    "missing_locales": missing_locales,
    "missing_files": missing_files,
}, ensure_ascii=True))
'@
    # Pass the code on stdin: Windows PowerShell 5.1 strips double quotes inside native arguments.
    $info = ($code | & $pythonPath -I - $Database $uploads) | ConvertFrom-Json
    if ($info.version -ge 5 -and $info.audit) { Pass "Schema version $($info.version) with admin_audit_log ($Database)" }
    else { Fail "Schema version $($info.version): run migration 005 first (RUNNING.md). The API refuses to start on this database." }
    if ($info.categories -ge 2) { Pass "$($info.categories) categories" } else { Fail "Only $($info.categories) categories; PRD demo needs at least 2." }
    if ($info.published -ge 5) { Pass "$($info.published) published places" } else { Fail "Only $($info.published) published places; PRD demo needs at least 5." }
    if ($info.admins -ge 1) { Pass "$($info.admins) active admin account(s)" } else { Fail 'No active admin account.' }
    if ($info.missing_locales.Count -eq 0) { Pass 'Every published place has VI and EN narrations' } else { Warn ("Missing VI or EN narration: " + ($info.missing_locales -join ', ')) }
    if ($info.missing_files.Count -eq 0) { Pass 'Every uploaded image file exists' } else { Fail ("Uploaded image file missing for: " + ($info.missing_files -join ', ') + ". Restore storage/uploads from the same backup as the database.") }
}

Write-Host "== Network"
$lanAddresses = @([System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
    Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } |
    ForEach-Object { $properties = $_.GetIPProperties(); if ($properties.GatewayAddresses.Count -gt 0) { $properties.UnicastAddresses } } |
    Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' -and $_.Address.ToString() -notlike '169.254.*' } |
    ForEach-Object { $_.Address.ToString() })
if ($lanAddresses.Count -gt 0) { Pass ("LAN IPv4 for the phone: " + ($lanAddresses -join ', ')) } else { Warn 'No LAN IPv4 address with a gateway; a physical phone cannot reach this computer.' }

function Get-Json([string]$url) {
    try { return Invoke-RestMethod -Uri $url -TimeoutSec 5 } catch { return $null }
}
$health = Get-Json "$ApiUrl/api/v1/health"
if ($health -and $health.status -eq 'ok') {
    Pass "API answers at $ApiUrl"
    $pois = Get-Json "$ApiUrl/api/v1/pois"
    if ($pois) { Pass ("Public API lists $(@($pois.items).Count) places") } else { Fail 'API is up but /api/v1/pois failed.' }
    foreach ($address in $lanAddresses) {
        if (Get-Json "http://${address}:8000/api/v1/health") { Pass "API reachable from the LAN at http://${address}:8000" }
        else { Warn "API not reachable at http://${address}:8000. Start uvicorn with --host 0.0.0.0 and allow port 8000 in Windows Firewall." }
    }
} else {
    Warn "API not running at $ApiUrl. Start it with scripts/start-system.ps1, then run this check again for the network part."
}

Write-Host "== Mobile .env"
$envPath = Join-Path $projectRoot 'apps/mobile/.env'
if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
    Warn 'apps/mobile/.env missing; copy apps/mobile/.env.example (USE_MOCK=false) before device tests.'
} else {
    $settings = @{}
    foreach ($line in Get-Content -LiteralPath $envPath) {
        if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*?)\s*$') { $settings[$Matches[1]] = $Matches[2] }
    }
    if ($settings['EXPO_PUBLIC_USE_MOCK'] -eq 'false') { Pass 'EXPO_PUBLIC_USE_MOCK=false (real API)' }
    else { Fail "EXPO_PUBLIC_USE_MOCK=$($settings['EXPO_PUBLIC_USE_MOCK']): device results in mock mode do not count, and UC12 consent is locked." }
    if ($settings['EXPO_PUBLIC_API_STYLE'] -eq 'v1') { Pass 'EXPO_PUBLIC_API_STYLE=v1' } else { Fail 'EXPO_PUBLIC_API_STYLE must be v1.' }
    $baseUrl = $settings['EXPO_PUBLIC_API_BASE_URL']
    if (-not $baseUrl) { Warn 'EXPO_PUBLIC_API_BASE_URL empty: Expo guesses the host. For a physical phone set http://<LAN-IP>:8000/api.' }
    elseif ($baseUrl -match 'localhost|127\.0\.0\.1') { Fail "EXPO_PUBLIC_API_BASE_URL=$baseUrl points to the phone itself; use the computer's LAN IP." }
    elseif ($baseUrl -notmatch '/api/?$') { Fail "EXPO_PUBLIC_API_BASE_URL=$baseUrl must end with /api." }
    else { Pass "EXPO_PUBLIC_API_BASE_URL=$baseUrl" }
}

Write-Host ""
if ($script:failures -gt 0) {
    Write-Host "NOT READY: $script:failures blocking problem(s), $script:warnings warning(s)." -ForegroundColor Red
    exit 1
}
Write-Host "READY: 0 blocking problems, $script:warnings warning(s)." -ForegroundColor Green
