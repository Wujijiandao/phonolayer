@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0runtime\PhonoLayer.exe" (
  echo PhonoLayer desktop runtime is not installed yet.
  echo Running one-time setup...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\INSTALL_RUNTIME.ps1"
  if errorlevel 1 (
    echo.
    echo Setup failed.
    pause
    exit /b 1
  )
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\SYNC_APP.ps1"
if errorlevel 1 (
  echo Failed to synchronize app files.
  pause
  exit /b 1
)
"%~dp0runtime\PhonoLayer.exe" --register-file-association
if errorlevel 1 (
  echo File association registration failed.
  pause
  exit /b 1
)
echo .phonodoc association has been registered for the current Windows user.
echo If Explorer still shows the old icon, wait a moment or restart Explorer.
pause
