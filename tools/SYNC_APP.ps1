$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$AppSource = Join-Path $Root 'app'
$RuntimeApp = Join-Path $Root 'runtime\resources\app'
if (-not (Test-Path $RuntimeApp)) { exit 0 }
Remove-Item -Recurse -Force $RuntimeApp
New-Item -ItemType Directory -Force -Path $RuntimeApp | Out-Null
Copy-Item -Path (Join-Path $AppSource '*') -Destination $RuntimeApp -Recurse -Force
$PublicSamples = Join-Path $Root 'samples\public'
if (Test-Path $PublicSamples) {
    $RuntimePublicSamples = Join-Path $RuntimeApp 'public-samples'
    New-Item -ItemType Directory -Force -Path $RuntimePublicSamples | Out-Null
    Copy-Item -Path (Join-Path $PublicSamples '*') -Destination $RuntimePublicSamples -Recurse -Force
}
