@echo off
setlocal
cd /d "%~dp0"
echo Backing up the exact locked Electron runtime release...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\BACKUP_ELECTRON_RELEASE.ps1"
if errorlevel 1 (
  echo.
  echo Backup failed. See the error above.
  pause
  exit /b 1
)
echo.
echo Backup complete. See offline-runtime-backup\
pause
