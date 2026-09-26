from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parents[1]
errors=[]
def need(c,m):
    if not c: errors.append(m)
lock=json.loads((root/'runtime-lock.json').read_text(encoding='utf-8'))
r=lock.get('runtime',{})
need(lock.get('format')=='phonolayer-runtime-lock','lock format')
need(lock.get('schema')==1,'lock schema')
need(r.get('version')=='44.4.5','Electron version')
need(r.get('filename')=='electron-v44.4.5-win32-x64.zip','artifact filename')
need(r.get('sizeBytes')==158184819,'artifact size')
need(r.get('sha256')=='11c395820a5aaa8ebcc0686b476d0ac98a730274ebfbdc8cf5538a7c2815cb5d','artifact SHA-256')
need(re.fullmatch(r'[0-9a-f]{64}',r.get('shasumsSha256','')) is not None,'SHASUMS digest shape')
installer=(root/'tools/INSTALL_RUNTIME.ps1').read_text(encoding='utf-8')
for token in ['Get-FileHash','Test-LockedArtifact','Assert-LockedArtifact','runtime-lock.json','ExpectedSha256','ExpectedSize','PHONOLAYER_RUNTIME_PROVENANCE.json']:
    need(token in installer,f'installer token {token}')
need('Length -gt 1000000' not in installer,'size-only legacy acceptance removed')
backup=(root/'tools/BACKUP_ELECTRON_RELEASE.ps1').read_text(encoding='utf-8')
for token in ['officialAssetUrl','shasumsUrl','Get-FileHash','runtime-lock.json']:
    need(token in backup,f'backup token {token}')
if errors:
    print('QA RUNTIME LOCK FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print('QA RUNTIME LOCK PASSED')
print('Electron 44.4.5 win32-x64 SHA-256 locked:',r['sha256'])
