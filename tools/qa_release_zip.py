from pathlib import Path
import sys,zipfile,json,io
if len(sys.argv)!=2: raise SystemExit('usage: python tools/qa_release_zip.py <release.zip>')
zp=Path(sys.argv[1])
expected=[
 'samples/public/Official_Learning_Guides/00_Multilingual_Learning_Overview.phonodoc',
 'samples/public/Official_Learning_Guides/01_Text_Form_Sound.phonodoc',
 'samples/public/Official_Learning_Guides/02_Retrieval_Before_Reveal.phonodoc',
 'samples/public/Official_Learning_Guides/03_Cross_Language_Transfer.phonodoc',
 'samples/public/Official_Learning_Guides/04_Personal_Phonological_Memory.phonodoc',
 'samples/public/Japanese/Japanese_Reading_Demo.phonodoc',
 'samples/public/Cantonese/Cantonese_Reading_Demo.phonodoc']
banned_names=['samples/private','samples/provenance','private-samples']
with zipfile.ZipFile(zp) as z:
    infos=z.infolist(); names=[i.filename for i in infos]
    prefix=names[0].split('/',1)[0]+'/' if names and '/' in names[0] else ''
    for rel in expected:
        full=prefix+rel
        assert full in names,f'missing public demo: {full}'
        with z.open(full) as f: data=f.read()
        with zipfile.ZipFile(io.BytesIO(data)) as dzip:
            m=json.loads(dzip.read('manifest.json')); d=json.loads(dzip.read('document.json'))
        assert m.get('usageScope')=='public-demo' and m.get('appVersion')=='0.9.7',f'public manifest/version missing: {full}'
        assert d.get('usagePolicy',{}).get('scope')=='public-demo',f'public document scope missing: {full}'
        assert d.get('usagePolicy',{}).get('license')=='CC0-1.0',f'public demo license missing: {full}'
        assert d.get('extensions',{}).get('phonolayer.sample',{}).get('officialLearningSample') is True,f'official learning sample flag missing: {full}'
    for n in names:
        assert not any(tok in n for tok in banned_names),f'private material path leaked: {n}'
    required=[prefix+'LICENSE',prefix+'README.md',prefix+'PRIVACY.md',prefix+'SECURITY.md',prefix+'CONTRIBUTING.md',prefix+'CITATION.cff',prefix+'runtime-lock.json',prefix+'BACKUP_ELECTRON_RELEASE.bat',prefix+'docs/DEPENDENCY_AND_SUPPLY_CHAIN_0.9.3.md',prefix+'SETUP_PHONOLAYER.bat',prefix+'media/phonolayer-public-beta-poster.png',prefix+'media/phonolayer-wordmark.png',prefix+'media/phonolayer-app-icon-master.png',prefix+'docs/BRAND_ASSETS_0.9.7.md',prefix+'docs/PUBLIC_RELEASE_PREP_0.9.7.md',prefix+'docs/WINDOWS_SETUP_0.9.4.md']
    for r in required: assert r in names,f'missing public release file: {r}'
    lock=json.loads(z.read(prefix+'runtime-lock.json'))
    rt=lock['runtime']
    assert rt['version']=='44.4.5' and rt['sha256']=='11c395820a5aaa8ebcc0686b476d0ac98a730274ebfbdc8cf5538a7c2815cb5d','runtime lock mismatch'
    assert not any(n.endswith('electron-v44.4.5-win32-x64.zip') for n in names),'Electron binary must not be embedded in public source ZIP' 
print('PASS: final ZIP public sample layout/licensing/private-boundary')
