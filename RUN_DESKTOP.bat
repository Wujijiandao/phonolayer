@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0runtime\PhonoLayer.exe" (
  call "%~dp0SETUP_PHONOLAYER.bat"
  exit /b 0
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\SYNC_APP.ps1"
if errorlevel 1 (
  echo Failed to synchronize app files.
  pause
  exit /b 1
)
start "" "%~dp0runtime\PhonoLayer.exe"
exit /b 0
