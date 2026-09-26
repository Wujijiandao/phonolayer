from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
ps=(root/'tools/SETUP_GUI.ps1').read_text(encoding='utf-8-sig')
bat=(root/'SETUP_PHONOLAYER.bat').read_text(encoding='utf-8')
run=(root/'RUN_DESKTOP.bat').read_text(encoding='utf-8')
errors=[]
def need(c,m):
    if not c: errors.append(m)
need('System.Windows.Forms' in ps,'WinForms dependency')
need('一键安装并启动' in ps,'one-click primary action')
need('INSTALL_RUNTIME.ps1' in ps and 'SYNC_APP.ps1' in ps,'delegates to audited setup components')
need("--register-file-association" in ps,'file association registration')
need('WScript.Shell' in ps and 'DesktopLink' in ps and 'StartMenuLink' in ps,'shortcut creation')
need('Test-RuntimeReady' in ps and 'PHONOLAYER_RUNTIME_PROVENANCE.json' in ps,'verified installed-state detection')
need((root/'tools/LAUNCH_PHONOLAYER.ps1').exists(),'silent shortcut launcher')
need('Start-Process -FilePath $RuntimeExe' in ps,'launch action')
need('SHA-256' in ps and 'Electron Runtime' in ps,'runtime lock status')
need('ExecutionPolicy Bypass' in bat and 'SETUP_GUI.ps1' in bat,'GUI launcher')
need('SETUP_PHONOLAYER.bat' in run,'RUN_DESKTOP first-run setup bridge')
need((root/'media/phonolayer-public-beta-poster.png').exists(),'promo artwork')
readme=(root/'README.md').read_text(encoding='utf-8')
need('media/phonolayer-public-beta-poster.png' in readme,'README promo reference')
need('SETUP_PHONOLAYER.bat' in readme and 'WINDOWS_SETUP_0.9.4.md' in readme,'README setup instructions')
if errors:
    print('QA WINDOWS SETUP FAILED')
    [print('-',e) for e in errors]
    sys.exit(1)
print('QA WINDOWS SETUP PASSED')
