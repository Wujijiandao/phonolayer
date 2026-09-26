$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$RuntimeExe = Join-Path $Root 'runtime\PhonoLayer.exe'
$SyncScript = Join-Path $PSScriptRoot 'SYNC_APP.ps1'
if (-not (Test-Path -LiteralPath $RuntimeExe)) {
    throw 'PhonoLayer Runtime is not installed. Run SETUP_PHONOLAYER.bat first.'
}
& $SyncScript
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "Application synchronization failed with exit code $LASTEXITCODE." }
Start-Process -FilePath $RuntimeExe -WorkingDirectory $Root | Out-Null
