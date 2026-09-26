param(
    [string]$Destination = ''
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$LockPath = Join-Path $Root 'runtime-lock.json'
if (-not (Test-Path $LockPath)) { throw "Missing runtime lock: $LockPath" }
$Lock = Get-Content -LiteralPath $LockPath -Raw -Encoding UTF8 | ConvertFrom-Json
$R = $Lock.runtime
if (-not $Destination) {
    $Destination = Join-Path $Root ("offline-runtime-backup\electron-v" + $R.version + "-win32-x64")
}
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$ZipPath = Join-Path $Destination ([string]$R.filename)
$SumsPath = Join-Path $Destination ([string]$R.shasumsFilename)

function Download-And-Verify([string]$Url,[string]$Out,[string]$ExpectedSha,[Int64]$ExpectedSize) {
    if (-not (Test-Path $Out)) {
        Write-Host "Downloading: $Url"
        Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Out
    }
    $item=Get-Item -LiteralPath $Out
    if ($ExpectedSize -gt 0 -and $item.Length -ne $ExpectedSize) { throw "Size mismatch for $Out" }
    $actual=(Get-FileHash -LiteralPath $Out -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $ExpectedSha.ToLowerInvariant()) { throw "SHA-256 mismatch for $Out : $actual" }
    Write-Host "Verified: $Out"
}

Download-And-Verify ([string]$R.officialAssetUrl) $ZipPath ([string]$R.sha256) ([Int64]$R.sizeBytes)
Download-And-Verify ([string]$R.shasumsUrl) $SumsPath ([string]$R.shasumsSha256) 0
Copy-Item -LiteralPath $LockPath -Destination (Join-Path $Destination 'runtime-lock.json') -Force
@"
PhonoLayer offline runtime backup
Created: $((Get-Date).ToUniversalTime().ToString('o'))
Electron: $($R.version) / $($R.platform)-$($R.arch)
Official release: $($R.releaseUrl)
Runtime SHA-256: $($R.sha256)
SHASUMS256 SHA-256: $($R.shasumsSha256)

Keep all three files together. The runtime ZIP is upstream Electron and remains subject to Electron/Chromium/Node third-party licenses.
"@ | Set-Content -LiteralPath (Join-Path $Destination 'README_BACKUP.txt') -Encoding UTF8
Write-Host "Offline Electron release backup complete: $Destination"
