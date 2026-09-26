from pathlib import Path
import zipfile,json,sys,hashlib
root=Path(__file__).resolve().parents[1]
errors=[]
def need(c,m):
    if not c: errors.append(m)

for sch in ['0.7.0','0.8.0','0.8.1','0.8.2','0.9.0']:
    tag=sch.replace('.','')
    p=root/'qa'/'fixtures'/f'phonodoc_v{tag}_fixture.phonodoc'
    with zipfile.ZipFile(p) as z:
        m=json.loads(z.read('manifest.json')); d=json.loads(z.read('document.json'))
    need(m.get('schema')==sch,f'phonodoc fixture schema {sch}')
    if sch=='0.9.0':
        need(d.get('extensions',{}).get('x-fixture',{}).get('roundTrip') is True,'0.9 extension fixture')
        need(d.get('usagePolicy',{}).get('scope')=='test-fixture','0.9 usage fixture')

for sch,fn in [('0.7.0','phonodb_v070_legacy.phonodb'),('0.8.0','phonodb_v080_current.phonodb'),('0.9.0','phonodb_v090_current.phonodb')]:
    with zipfile.ZipFile(root/'qa'/'fixtures'/fn) as z: m=json.loads(z.read('manifest.json'))
    need(m.get('schema')==sch,f'phonodb fixture schema {sch}')

samples=list((root/'samples').rglob('*.phonodoc'))
need(len(samples)==7,'exactly seven official public learning documents')
need(all('/public/' in p.as_posix() for p in samples),'all bundled learning docs live under samples/public')
need(not (root/'samples'/'private').exists(),'private corpus directory excluded')
need(not (root/'samples'/'provenance').exists(),'private provenance directory excluded')

hashes={}
for p in samples:
    h=hashlib.sha256(p.read_bytes()).hexdigest(); need(h not in hashes,f'duplicate sample bytes: {p} == {hashes.get(h)}'); hashes[h]=p
    with zipfile.ZipFile(p) as z:
        m=json.loads(z.read('manifest.json')); d=json.loads(z.read('document.json'))
    need(m.get('schema')=='0.9.0','public demo schema '+p.name)
    need(m.get('appVersion')=='0.9.7','public demo appVersion '+p.name)
    need(m.get('usageScope')=='public-demo','manifest public-demo '+p.name)
    need(d.get('usagePolicy',{}).get('scope')=='public-demo','document public-demo '+p.name)
    need(d.get('usagePolicy',{}).get('license')=='CC0-1.0','demo content license '+p.name)
    need(d.get('extensions',{}).get('phonolayer.sample',{}).get('publicDemo') is True,'public sample extension '+p.name)
    need(d.get('extensions',{}).get('phonolayer.sample',{}).get('officialLearningSample') is True,'official learning sample extension '+p.name)

if errors:
    print('QA FORMAT FREEZE FAILED'); [print('-',x) for x in errors]; sys.exit(1)
print('QA FORMAT FREEZE PASSED')
