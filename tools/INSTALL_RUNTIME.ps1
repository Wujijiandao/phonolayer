$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $Root 'runtime'
$AppSource = Join-Path $Root 'app'
$CacheDir = Join-Path $PSScriptRoot 'cache'
$LockPath = Join-Path $Root 'runtime-lock.json'
$TempDir = Join-Path $env:TEMP ("PhonoLayer-Electron-" + [Guid]::NewGuid().ToString('N'))

if (-not (Test-Path $LockPath)) { throw "Missing runtime lock: $LockPath" }
$Lock = Get-Content -LiteralPath $LockPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($Lock.format -ne 'phonolayer-runtime-lock' -or $Lock.schema -ne 1) { throw 'Unsupported runtime-lock.json format.' }
$R = $Lock.runtime
$Version = [string]$R.version
$ZipName = [string]$R.filename
$ExpectedSha256 = ([string]$R.sha256).ToLowerInvariant()
$ExpectedSize = [Int64]$R.sizeBytes
$ZipPath = Join-Path $CacheDir $ZipName

function Test-LockedArtifact([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return $false }
    try {
        $f = Get-Item -LiteralPath $Path
        if ($f.Length -ne $ExpectedSize) {
            Write-Warning "Runtime size mismatch: $($f.Length) bytes (expected $ExpectedSize)."
            return $false
        }
        $actual = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $ExpectedSha256) {
            Write-Warning "Runtime SHA-256 mismatch: $actual (expected $ExpectedSha256)."
            return $false
        }
        return $true
    } catch {
        Write-Warning $_.Exception.Message
        return $false
    }
}

function Assert-LockedArtifact([string]$Path) {
    if (-not (Test-LockedArtifact $Path)) {
        throw "Electron runtime failed locked size/SHA-256 verification: $Path"
    }
    Write-Host "Verified Electron runtime SHA-256: $ExpectedSha256"
}

Write-Host 'PhonoLayer desktop runtime setup'
Write-Host "Electron version: $Version"
Write-Host "Locked artifact: $ZipName"
New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null

if (Test-Path -LiteralPath $ZipPath) {
    if (Test-LockedArtifact $ZipPath) {
        Write-Host "Using verified cached runtime: $ZipPath"
    } else {
        Write-Warning 'Discarding unverified cached runtime.'
        Remove-Item -Force -LiteralPath $ZipPath
    }
}

if (-not (Test-Path -LiteralPath $ZipPath)) {
    $Parent = Split-Path -Parent $Root
    $SiblingCaches = Get-ChildItem -Path $Parent -Directory -Filter 'PhonoLayer_Desktop_v*' -ErrorAction SilentlyContinue | ForEach-Object {
        Join-Path $_.FullName ("tools\cache\" + $ZipName)
    } | Where-Object { Test-Path -LiteralPath $_ }
    foreach ($candidate in $SiblingCaches) {
        if (Test-LockedArtifact $candidate) {
            Write-Host "Reusing verified cached runtime archive: $candidate"
            Copy-Item -LiteralPath $candidate -Destination $ZipPath -Force
            break
        }
    }
}

if (-not (Test-Path -LiteralPath $ZipPath)) {
    $Urls = @([string]$R.officialAssetUrl, [string]$R.fallbackMirrorUrl) | Where-Object { $_ }
    $downloaded = $false
    foreach ($url in $Urls) {
        try {
            Write-Host "Downloading locked runtime from: $url"
            Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $ZipPath
            if (Test-LockedArtifact $ZipPath) {
                $downloaded = $true
                break
            }
            Write-Warning 'Downloaded artifact did not match runtime-lock.json; rejecting it.'
            Remove-Item -Force -ErrorAction SilentlyContinue -LiteralPath $ZipPath
        } catch {
            Write-Warning $_.Exception.Message
            Remove-Item -Force -ErrorAction SilentlyContinue -LiteralPath $ZipPath
        }
    }
    if (-not $downloaded) {
        throw "Unable to obtain the locked Electron runtime. Place the exact $ZipName in tools\cache; it must match runtime-lock.json."
    }
}

Assert-LockedArtifact $ZipPath

if (Test-Path $RuntimeDir) { Remove-Item -Recurse -Force $RuntimeDir }
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
try {
    Expand-Archive -LiteralPath $ZipPath -DestinationPath $TempDir -Force
    Copy-Item -Path (Join-Path $TempDir '*') -Destination $RuntimeDir -Recurse -Force
} finally {
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $TempDir
}

$ElectronExe = Join-Path $RuntimeDir 'electron.exe'
$PhonoLayerExe = Join-Path $RuntimeDir 'PhonoLayer.exe'
if (-not (Test-Path $ElectronExe)) { throw 'electron.exe was not found after extraction.' }
Rename-Item -LiteralPath $ElectronExe -NewName 'PhonoLayer.exe'

$Resources = Join-Path $RuntimeDir 'resources'
$DefaultApp = Join-Path $Resources 'default_app.asar'
Remove-Item -Force -ErrorAction SilentlyContinue $DefaultApp
$RuntimeApp = Join-Path $Resources 'app'
if (Test-Path $RuntimeApp) { Remove-Item -Recurse -Force $RuntimeApp }
New-Item -ItemType Directory -Force -Path $RuntimeApp | Out-Null
Copy-Item -Path (Join-Path $AppSource '*') -Destination $RuntimeApp -Recurse -Force
$PublicSamples = Join-Path $Root 'samples\public'
if (Test-Path $PublicSamples) {
    $RuntimePublicSamples = Join-Path $RuntimeApp 'public-samples'
    New-Item -ItemType Directory -Force -Path $RuntimePublicSamples | Out-Null
    Copy-Item -Path (Join-Path $PublicSamples '*') -Destination $RuntimePublicSamples -Recurse -Force
}

$InstalledProvenance = @{
    source = 'runtime-lock.json'
    name = [string]$R.name
    version = $Version
    platform = [string]$R.platform
    arch = [string]$R.arch
    filename = $ZipName
    sha256 = $ExpectedSha256
    verifiedAt = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Depth 4
Set-Content -LiteralPath (Join-Path $RuntimeDir 'PHONOLAYER_RUNTIME_PROVENANCE.json') -Value $InstalledProvenance -Encoding UTF8

Write-Host "Runtime installed: $PhonoLayerExe"
Write-Host 'Locked runtime verification passed. The app can now run offline.'
