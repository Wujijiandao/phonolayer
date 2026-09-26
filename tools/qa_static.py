from pathlib import Path
import json, zipfile, sys, re
root=Path(__file__).resolve().parents[1]
app=root/'app'; errors=[]
def need(c,m):
    if not c: errors.append(m)

required=['index.html','styles.css','renderer.js','main.js','preload.js','package.json','archive-core.js','font-core.js','phonetics-core.js','confirmation-core.js','identity-core.js','japanese-pitch-core.js','learning-db-core.js','retrieval-core.js','memory-core.js','learning-db.js','i18n.js','assets/phonolayer-app.ico','assets/phonolayer-app.png','assets/phonodoc.ico','assets/phonolayer-mark.svg','assets/phonodoc-icon.svg']
for f in required: need((app/f).exists(),f'missing app/{f}')

html=(app/'index.html').read_text(encoding='utf-8')
js=(app/'renderer.js').read_text(encoding='utf-8')
main=(app/'main.js').read_text(encoding='utf-8')
styles=(app/'styles.css').read_text(encoding='utf-8')
pkg=json.loads((app/'package.json').read_text(encoding='utf-8'))
need(pkg.get('name')=='phonolayer-desktop','package public name')
need(pkg.get('version')=='0.9.7','package version 0.9.7')
need(pkg.get('private') is True,'npm accidental-publish guard retained')
need(pkg.get('license')=='MPL-2.0','package MPL-2.0')
need(pkg.get('author')=='Yuzhan Zhang','human maintainer metadata')
need((root/'LICENSE').exists(),'MPL license file')
need((root/'samples/public/LICENSE-CC0-1.0.txt').exists(),'public-demo CC0 license')
need("const APP_VERSION = '0.9.7'" in js and "const APP_VERSION = '0.9.7'" in main,'app version constants')
need('Desktop v0.9.7' in html and 'GitHub Release Preparation' in html,'HTML build version')
need('文之形声 · PhonoLayer' in html and '文之形声 · PhonoLayer' in main,'public-facing brand')
need("const DOC_SCHEMA = '0.9.0'" in js,'phonodoc writer schema remains 0.9.0')
need("['0.7.0','0.8.0','0.8.1','0.8.2','0.9.0']" in js,'phonodoc migration readers')
need("const DB_SCHEMA = '0.9.0'" in js and "['0.7.0','0.8.0','0.9.0']" in js,'phonodb migration readers')
need('usagePolicy:' in js and 'extensions:' in js and "extensionsPolicy: 'preserve-namespaced-document-extensions'" in js,'0.9 metadata persistence')
need('Confirmation.nextPitchStale' in js and 'wasPitchStale' in js,'pitch-stale invariant')
need('protectOpenedDocumentIdentity' in js,'identity protection')
need('annotationEvents' in (app/'learning-db.js').read_text(encoding='utf-8'),'annotation event store')
need('contextIsolation: true' in main and 'nodeIntegration: false' in main and 'sandbox: true' in main,'Electron isolation')
need('assertTrustedSender' in main and 'trustedHandle' in main,'trusted IPC')
need('sanitizeEditorHtml' in js and 'serializeEditorHtml' in js,'sanitizer/canonical serializer')
need('rubyScale:0.65' in (app/'font-core.js').read_text(encoding='utf-8'),'default ruby scale 0.65')
need('insertLeadingParagraphSpace' in js and 'isNaturalParagraphBlock' in js,'double-space natural paragraph indent')
need('editScale / baseScale' in js,'inline reading size rule')
need('overflow:visible' in styles,'Ribbon popover overflow fix')
need('publicSamplePath' in main and 'PUBLIC_SAMPLE_CATALOG' in main and "sample:public" in main and 'public-samples' in main,'runtime public sample catalog')
need('private-samples' not in main and 'sample:cats' not in main,'private quick-open paths removed')
need(not (root/'samples/private').exists(),'private corpus tree excluded')
need(not (root/'samples/provenance').exists(),'private provenance tree excluded')

expected=[
 root/'samples/public/Official_Learning_Guides/00_Multilingual_Learning_Overview.phonodoc',
 root/'samples/public/Official_Learning_Guides/01_Text_Form_Sound.phonodoc',
 root/'samples/public/Official_Learning_Guides/02_Retrieval_Before_Reveal.phonodoc',
 root/'samples/public/Official_Learning_Guides/03_Cross_Language_Transfer.phonodoc',
 root/'samples/public/Official_Learning_Guides/04_Personal_Phonological_Memory.phonodoc',
 root/'samples/public/Japanese/Japanese_Reading_Demo.phonodoc',
 root/'samples/public/Cantonese/Cantonese_Reading_Demo.phonodoc']
all_samples=list((root/'samples').rglob('*.phonodoc'))
need(set(all_samples)==set(expected),f'public demo source-of-truth mismatch: {[str(x.relative_to(root)) for x in all_samples]}')
for p in expected:
    need(p.exists(),f'missing public demo {p.name}')
    if not p.exists(): continue
    with zipfile.ZipFile(p) as z:
        need(set(z.namelist())=={'manifest.json','document.json'},f'canonical members {p.name}')
        m=json.loads(z.read('manifest.json')); d=json.loads(z.read('document.json')); h=d.get('contentHtml','')
    need(m.get('schema')=='0.9.0' and m.get('appVersion')=='0.9.7',f'demo schema/app {p.name}')
    need(m.get('usageScope')=='public-demo','demo manifest scope '+p.name)
    need(d.get('usagePolicy',{}).get('scope')=='public-demo','demo usagePolicy '+p.name)
    need(d.get('usagePolicy',{}).get('license')=='CC0-1.0','demo CC0 declaration '+p.name)
    need(d.get('extensions',{}).get('phonolayer.sample',{}).get('publicDemo') is True,'demo extension '+p.name)
    need(d.get('extensions',{}).get('phonolayer.sample',{}).get('officialLearningSample') is True,'official sample extension '+p.name)
    need(float(d.get('typography',{}).get('rubyScale',0))==0.65,'rubyScale 0.65 '+p.name)
    need('<a' not in h.lower(),'no hyperlink entity '+p.name)

# Public package policy files.
for rel in ['README.md','AUTHORS.md','CITATION.cff','CONTRIBUTING.md','SECURITY.md','PRIVACY.md','SUPPORT.md','TRADEMARKS.md','runtime-lock.json','BACKUP_ELECTRON_RELEASE.bat','docs/PUBLIC_RELEASE_PREP_0.9.7.md','docs/PUBLIC_RELEASE_PREP_0.9.4.md','docs/WINDOWS_SETUP_0.9.4.md','SETUP_PHONOLAYER.bat','tools/SETUP_GUI.ps1','tools/LAUNCH_PHONOLAYER.ps1','media/phonolayer-public-beta-poster.png','media/phonolayer-wordmark.png','media/phonolayer-app-icon-master.png','docs/BRAND_ASSETS_0.9.7.md','docs/PUBLIC_RELEASE_PREP_0.9.3.md','docs/DEPENDENCY_AND_SUPPLY_CHAIN_0.9.3.md','docs/PUBLIC_SAMPLE_POLICY.md','docs/OPEN_SOURCE_MODEL.md','docs/ARCHITECTURE_OVERVIEW_0.9.3.md','docs/ROADMAP.md','docs/RELEASE_AND_TESTING.md','docs/BRANDING_AND_COMPATIBILITY_0.9.2.md','docs/OFFICIAL_LEARNING_GUIDES_0.9.2.md']:
    need((root/rel).exists(),f'missing public-release file {rel}')

# No bundled source DOCX or known private corpus artifacts.
need(not list(root.rglob('*.docx')),'source DOCX must not ship')
banned=['samples/private','samples\\private','private-samples','samples/provenance','samples\\provenance']
text_ext={'.md','.txt','.js','.py','.ps1','.bat','.json','.yml','.yaml','.cff','.html'}
for p in root.rglob('*'):
    if not p.is_file() or p.suffix.lower() not in text_ext: continue
    if p.name in {'MANIFEST_SHA256.json','qa_static.py','qa_release_zip.py'}: continue
    try: txt=p.read_text(encoding='utf-8')
    except Exception: continue
    for token in banned:
        need(token not in txt,f'private-material token {token!r} in {p.relative_to(root)}')

# No app telemetry/network client. Runtime installer download is explicitly allowed outside app/.
app_text='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in app.rglob('*') if p.is_file() and p.suffix.lower() in {'.js','.html'})
for token in ['fetch(','XMLHttpRequest','WebSocket(','analytics','telemetry','sentry']:
    need(token not in app_text,f'unexpected app network/telemetry token {token}')


# Dependency/supply-chain invariants.
lock=json.loads((root/'runtime-lock.json').read_text(encoding='utf-8'))
r=lock.get('runtime',{})
need(lock.get('format')=='phonolayer-runtime-lock' and lock.get('schema')==1,'runtime lock format')
need(r.get('version')=='44.4.5' and r.get('platform')=='win32' and r.get('arch')=='x64','locked Electron target')
need(r.get('filename')=='electron-v44.4.5-win32-x64.zip','locked Electron filename')
need(r.get('sizeBytes')==158184819,'locked Electron byte size')
need(r.get('sha256')=='11c395820a5aaa8ebcc0686b476d0ac98a730274ebfbdc8cf5538a7c2815cb5d','locked Electron SHA-256')
need(re.fullmatch(r'[0-9a-f]{64}',r.get('shasumsSha256','')) is not None,'SHASUMS SHA-256 shape')
need('dependencies' not in pkg and 'devDependencies' not in pkg,'no npm dependency graph')
installer=(root/'tools/INSTALL_RUNTIME.ps1').read_text(encoding='utf-8')
need('runtime-lock.json' in installer and 'Get-FileHash' in installer and 'ExpectedSha256' in installer and 'ExpectedSize' in installer,'installer locked hash/size verification')
need('Test-LockedArtifact' in installer and 'Downloaded artifact did not match runtime-lock.json' in installer,'installer rejects mismatched runtime')
need('PHONOLAYER_RUNTIME_PROVENANCE.json' in installer,'installed runtime provenance')
need('Length -gt 1000000' not in installer,'legacy size-only trust removed')
backup=(root/'tools/BACKUP_ELECTRON_RELEASE.ps1').read_text(encoding='utf-8')
need('SHASUMS256' in backup and 'Get-FileHash' in backup and 'runtime-lock.json' in backup,'offline runtime backup verification')

# Runtime staging copies public demos only.
for rel in ['tools/SYNC_APP.ps1','tools/INSTALL_RUNTIME.ps1']:
    txt=(root/rel).read_text(encoding='utf-8')
    need('samples\\public' in txt and 'public-samples' in txt,f'runtime public-sample staging {rel}')
    need('samples\\private' not in txt and 'private-samples' not in txt,f'no private staging {rel}')

# Windows setup/promo invariants.
setup_gui=(root/'tools/SETUP_GUI.ps1').read_text(encoding='utf-8-sig')
need('System.Windows.Forms' in setup_gui and '一键安装并启动' in setup_gui,'Win11 one-click setup GUI')
need('INSTALL_RUNTIME.ps1' in setup_gui and 'SYNC_APP.ps1' in setup_gui,'setup delegates to locked runtime/sync scripts')
need('--register-file-association' in setup_gui and 'WScript.Shell' in setup_gui,'setup Windows integration')
need('Test-RuntimeReady' in setup_gui and 'PHONOLAYER_RUNTIME_PROVENANCE.json' in setup_gui,'setup validates installed runtime provenance')
need('SETUP_PHONOLAYER.bat' in (root/'RUN_DESKTOP.bat').read_text(encoding='utf-8'),'first-run GUI bridge')
need('media/phonolayer-public-beta-poster.png' in (root/'README.md').read_text(encoding='utf-8'),'README promotional artwork reference')

for sch in ['070','080','081','082','090']:
    need((root/'qa/fixtures'/f'phonodoc_v{sch}_fixture.phonodoc').exists(),f'phonodoc migration fixture {sch}')
for fn in ['phonodb_v070_legacy.phonodb','phonodb_v080_current.phonodb','phonodb_v090_current.phonodb','malformed_duplicate_member.phonodb']:
    need((root/'qa/fixtures'/fn).exists(),f'phonodb/adversarial fixture {fn}')

if errors:
    print('QA STATIC FAILED'); [print('-',e) for e in errors]; sys.exit(1)
print('QA STATIC PASSED')
print('public demos:',len(expected))

need('media/phonolayer-wordmark.png' in (root/'README.md').read_text(encoding='utf-8'),'README wordmark reference')
