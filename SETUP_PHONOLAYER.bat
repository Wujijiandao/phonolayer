@echo off
setlocal
cd /d "%~dp0"
start "" powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\SETUP_GUI.ps1"
exit /b 0
