@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0runtime\PhonoLayer.exe" (
  call "%~dp0INSTALL_RUNTIME.bat"
  if errorlevel 1 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\SYNC_APP.ps1"
start "" "%~dp0runtime\PhonoLayer.exe" "%~dp0samples\public\Official_Learning_Guides\00_Multilingual_Learning_Overview.phonodoc"
exit /b 0
