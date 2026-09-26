@echo off
setlocal
cd /d "%~dp0"
echo Installing PhonoLayer desktop runtime...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\INSTALL_RUNTIME.ps1"
if errorlevel 1 (
  echo.
  echo Runtime installation failed.
  echo You may manually place the exact locked Electron archive in tools\cache; it must pass runtime-lock.json SHA-256 verification.
  pause
  exit /b 1
)
echo.
echo Runtime installation completed.
pause
