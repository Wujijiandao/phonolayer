from pathlib import Path
import base64, re, json
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
app=root/'app'
html=(app/'index.html').read_text(encoding='utf-8')
html=re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]*>','',html)
html=html.replace('<link rel="stylesheet" href="styles.css" />',f'<style>{(app/"styles.css").read_text(encoding="utf-8")}</style>')
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)

overview64=base64.b64encode((root/'samples/public/Official_Learning_Guides/00_Multilingual_Learning_Overview.phonodoc').read_bytes()).decode()
ja64=base64.b64encode((root/'samples/public/Japanese/Japanese_Reading_Demo.phonodoc').read_bytes()).decode()
yue64=base64.b64encode((root/'samples/public/Cantonese/Cantonese_Reading_Demo.phonodoc').read_bytes()).decode()
mock=f'''<script>
window.__mock={{writes:[],failWrite:false,localeCalls:[],recoveryWrites:[],recoveryDeletes:[]}};
window.alert=(x)=>{{window.__mock.lastAlert=String(x)}}; window.confirm=()=>true;
const overview64={json.dumps(overview64)}; const ja64={json.dumps(ja64)}; const yue64={json.dumps(yue64)};
const bytes=(s)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const mockFiles={{'C:/drop/drop.phonodoc':ja64}};
window.desktopAPI={{
 appInfo:async()=>({{version:'0.9.7',platform:'win32',userDataPath:'C:/tmp/user',documentsPath:'C:/docs',locale:'zh-CN'}}),
 setUiLocale:async(locale)=>{{window.__mock.localeCalls.push(locale);return {{ok:true,locale}}}},
 quitConfirmed:async()=>true, openPhonoDocs:async()=>[], pathForDroppedFile:(file)=>'C:/drop/'+file.name, chooseSavePhonoDoc:async()=> 'C:/docs/test.phonodoc',
 openPhonoDb:async()=>null, chooseSavePhonoDb:async()=>null,
 readFile:async(path)=>{{const b=mockFiles[path];if(!b) throw new Error('not mocked: '+path);const data=bytes(b);return {{path,name:path.split('/').pop(),bytes:Array.from(data),size:data.length}}}},
 writeFile:async(path,data)=>{{if(window.__mock.failWrite) throw new Error('simulated disk failure'); window.__mock.writes.push({{path,bytes:data}}); return {{path,name:'test.phonodoc',size:data.length}}}},
 fileExists:async()=>true, showItemInFolder:async()=>true,
 openPublicSample:async(key)=>{{const m={{'guide-overview':['00_Multilingual_Learning_Overview.phonodoc','官方学习样例 00｜多语言学习导览',overview64],'japanese-reading':['Japanese_Reading_Demo.phonodoc','Japanese Reading Demo',ja64],'cantonese-reading':['Cantonese_Reading_Demo.phonodoc','Cantonese Reading Demo',yue64]}};const x=m[key]||m['guide-overview'];return {{path:'',name:x[0],title:x[1],bytes:Array.from(bytes(x[2])),bundled:true,publicDemo:true}};}},
 print:async()=>true, chooseSavePdf:async()=>null, exportPdf:async()=>({{path:'x.pdf',size:1}}), previewPdf:async()=>({{path:'p.pdf',size:1}}),
 repairFileAssociation:async()=>({{ok:true}}),
 listRecoveryDrafts:async()=>[], readRecoveryDraft:async()=>{{throw new Error('no recovery')}},
 writeRecoveryDraft:async(id,data)=>{{window.__mock.recoveryWrites.push({{id,bytes:data}}); return {{id,size:data.length}}}},
 deleteRecoveryDraft:async(id)=>{{window.__mock.recoveryDeletes.push(id); return true}},
 onCommand:(h)=>{{window.__mock.commandHandler=h}}, onOpenPath:(h)=>{{window.__mock.openHandler=h}}
}};
window.__learningMem={{entries:[],observations:[],meta:[],retrievalSessions:[],retrievalEvents:[],annotationEvents:[]}};
window.PhonoLayerLearningDB={{
 open:async()=>({{close(){{}}}}),
 upsertObservation:async(r)=>{{const now=Date.now(),e=PhonoLayerLearningCore.makeEntry(r,now),o=PhonoLayerLearningCore.makeObservation(r,now);const m=window.__learningMem;m.entries=m.entries.filter(x=>x.key!==e.key);m.entries.push(e);m.observations=m.observations.filter(x=>x.id!==o.id);m.observations.push(o);return {{entry:e,observation:o}};}},
 removeObservation:async(d,a)=>{{const id=PhonoLayerLearningCore.makeObservationId(d,a);const m=window.__learningMem;m.observations=m.observations.filter(x=>x.id!==id);}},
 getSnapshot:async()=>structuredClone(window.__learningMem),
 listSummary:async(lang='')=>{{let rows=PhonoLayerLearningCore.summarize(window.__learningMem.entries,window.__learningMem.observations);return lang?rows.filter(x=>x.language===lang):rows;}},
 importSnapshot:async()=>({{mode:'merge',entries:0,observations:0,sessions:0,retrievalEvents:0,annotationEvents:0,duplicates:0,projectionConflicts:0}}),
 clearAll:async()=>{{window.__learningMem={{entries:[],observations:[],meta:[],retrievalSessions:[],retrievalEvents:[],annotationEvents:[]}};}},
 startRetrievalSession:async(r)=>{{const x=PhonoLayerRetrievalCore.makeSession(r,Date.now());window.__learningMem.retrievalSessions.push(x);return x;}},
 recordRetrievalEvent:async(r)=>{{const x=PhonoLayerRetrievalCore.makeEvent(r,Date.now());window.__learningMem.retrievalEvents.push(x);return x;}},
 finishRetrievalSession:async(id,patch)=>{{const m=window.__learningMem;const i=m.retrievalSessions.findIndex(x=>x.id===id);const x=PhonoLayerRetrievalCore.makeSession({{...m.retrievalSessions[i],...patch,id}},Date.now());m.retrievalSessions[i]=x;return x;}},
 listRetrievalEvents:async(id='')=>window.__learningMem.retrievalEvents.filter(x=>!id||x.sessionId===id),
 getRetrievalStats:async()=>({{sessions:0,events:0,summary:PhonoLayerRetrievalCore.summarizeEvents(window.__learningMem.retrievalEvents)}})
}};
</script>'''
html=html.replace('</body>',mock+'</body>')
scripts=['phonetics-core.js','confirmation-core.js','identity-core.js','japanese-pitch-core.js','font-core.js','learning-db-core.js','retrieval-core.js','memory-core.js','archive-core.js','i18n.js','renderer.js']
inline=''.join(f'<script>{(app/x).read_text(encoding="utf-8")}</script>' for x in scripts)
html=html.replace('</body>',inline+'</body>')

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={"width":1500,"height":1000})
    page.set_default_timeout(5000)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(html,wait_until='load')
    page.wait_for_timeout(350)

    assert page.locator('#buildVersion').inner_text().startswith('Desktop v0.9.7')
    assert '文之形声 · PhonoLayer' in page.title()
    assert 'PhonoLayer' in page.title()
    assert abs(float(page.locator('#rubyScale').input_value())-0.65) < 1e-9

    # Ribbon popovers must not be clipped.
    page.locator('#highlightColorMenuBtn').click(); page.wait_for_timeout(50)
    geom=page.evaluate("""()=>{const panels=document.querySelector('.ribbon-panels'),p=document.getElementById('highlightColorPalette');const sw=[...p.querySelectorAll('.color-swatch')].at(-1);const pr=p.getBoundingClientRect(),rr=panels.getBoundingClientRect(),sr=sw.getBoundingClientRect();const hit=document.elementFromPoint(sr.left+sr.width/2,sr.top+sr.height/2);return {overflow:getComputedStyle(panels).overflowY,paletteBottom:pr.bottom,ribbonBottom:rr.bottom,hitInside:!!hit?.closest?.('#highlightColorPalette')};}""")
    assert geom['overflow']=='visible' and geom['paletteBottom']>geom['ribbonBottom'] and geom['hitInside'], geom
    page.locator('#highlightColorMenuBtn').click()

    # Real paper geometry keeps scaling above 200%.
    paper=page.locator('#editor'); workspace=page.locator('.desktop-workspace')
    page.locator('#statusZoomSlider').fill('100'); page.locator('#statusZoomSlider').dispatch_event('input'); page.wait_for_timeout(30)
    w100=paper.bounding_box()['width']
    page.locator('#statusZoomSlider').fill('300'); page.locator('#statusZoomSlider').dispatch_event('input'); page.wait_for_timeout(50)
    w300=paper.bounding_box()['width']; assert abs(w300-w100*3)<4
    assert workspace.evaluate('e=>e.scrollWidth>e.clientWidth')
    page.locator('#statusZoomSlider').fill('100'); page.locator('#statusZoomSlider').dispatch_event('input'); page.wait_for_timeout(30)

    # Two leading spaces create a natural-paragraph indent for plain Han text.
    page.evaluate("""() => {const e=document.getElementById('editor');e.innerHTML='<p id="plainHan">漢字正文</p><h2 id="headHan">漢字標題</h2>';e.focus();const p=document.getElementById('plainHan'),r=document.createRange();r.setStart(p.firstChild,0);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);}""")
    page.keyboard.type('  '); page.wait_for_timeout(80)
    assert page.locator('#plainHan').evaluate('e=>e.style.textIndent')=='2em'
    assert page.locator('#plainHan').inner_text()=='漢字正文'

    # Official multilingual overview opens from the allow-listed public sample catalog.
    page.locator('#fileTabBtn').click(); page.wait_for_timeout(30)
    page.locator('[data-public-sample="guide-overview"]').click(); page.wait_for_timeout(220)
    assert '语言材料分开，元语言知识连起来' in page.locator('#editor').inner_text()
    assert page.locator('#editor ruby.phono').count()>=2
    assert 'CATS PARADISE' not in page.locator('#editor').inner_text()

    # Built-in public Japanese demo opens through the normal archive path.
    page.locator('#fileTabBtn').click(); page.wait_for_timeout(30)
    page.locator('[data-public-sample="japanese-reading"]').click(); page.wait_for_timeout(250)
    assert page.locator('#editor ruby.phono').count()>=6
    assert '公開用に作成' in page.locator('#editor').inner_text()
    assert 'CATS PARADISE' not in page.locator('#editor').inner_text()

    # Add manually confirmed Tokyo pitch to the first demo annotation.
    page.locator('.ribbon-tab[data-ribbon="phonetic"]').click(); page.locator('#interactionObjectBtn').click(); page.wait_for_timeout(30)
    jp=page.locator('#editor ruby.phono').first
    jp.locator('.rb').click(force=True); page.wait_for_timeout(40)
    page.locator('#openDetailedAnnotationBtn').click(); page.wait_for_timeout(60)
    assert page.locator('#annotationDialog').evaluate('(d)=>d.open')
    page.locator('#pitchSystemSelect').select_option('ja-tokyo')
    page.locator('#jaPitchRepresentation').select_option('accent-nucleus')
    page.locator('#jaMoraInput').fill('わ | た | し')
    page.locator('#jaAccentNucleusInput').fill('0')
    page.locator('#confirmAnnotationBtn').click(); page.wait_for_timeout(150)
    jp=page.locator('#editor ruby.phono').first
    assert jp.get_attribute('data-pitch-system')=='ja-tokyo'
    assert jp.get_attribute('data-ja-morae')=='わ|た|し'
    assert jp.get_attribute('data-pitch')=='2-4-4'

    # Inline editor compensates for document zoom and deliberately adds +0.05 ratio.
    page.locator('.ribbon-tab[data-ribbon="phonetic"]').click(); page.locator('#interactionQuickBtn').click(); page.wait_for_timeout(30)
    page.locator('#statusZoomSlider').fill('200'); page.locator('#statusZoomSlider').dispatch_event('input'); page.wait_for_timeout(50)
    jp=page.locator('#editor ruby.phono').first
    normal_px=float(jp.locator('.reading-text').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'))
    jp.locator('.reading-text').dblclick(force=True); page.wait_for_timeout(50)
    inline_px=float(page.locator('.inline-reading-editor').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'))
    assert inline_px > normal_px*2.05, (inline_px,normal_px)
    page.locator('.inline-reading-editor').fill('わたくし'); page.locator('.inline-reading-editor').press('Enter'); page.wait_for_timeout(140)
    jp=page.locator('#editor ruby.phono').first
    assert jp.get_attribute('data-reading')=='わたくし'
    assert jp.get_attribute('data-pitch-stale')=='true'
    page.locator('#statusZoomSlider').fill('100'); page.locator('#statusZoomSlider').dispatch_event('input'); page.wait_for_timeout(40)

    # Quick Context / Apply must preserve stale pitch when reading changes without pitch reconfirmation.
    page.locator('#interactionObjectBtn').click(); page.wait_for_timeout(30)
    jp=page.locator('#editor ruby.phono').first
    old_pitch=jp.get_attribute('data-pitch')
    jp.locator('.rb').click(force=True); page.wait_for_timeout(50)
    page.locator('#quickReadingInput').fill('わたし')
    page.locator('#applyQuickAnnotationBtn').click(); page.wait_for_timeout(140)
    jp=page.locator('#editor ruby.phono').first
    assert jp.get_attribute('data-reading')=='わたし'
    assert jp.get_attribute('data-pitch-stale')=='true'
    assert jp.get_attribute('data-pitch')==old_pitch

    # Save preserves public-demo metadata and current schema while stripping runtime SVG.
    page.locator('#saveBtn').click(); page.wait_for_timeout(180)
    saved=page.evaluate("""()=>{const w=window.__mock.writes.at(-1);const f=PhonoLayerArchive.unpackStoreZip(new Uint8Array(w.bytes));return {manifest:PhonoLayerArchive.textFile(f,'manifest.json'),doc:PhonoLayerArchive.textFile(f,'document.json')}}""")
    man=json.loads(saved['manifest']); doc=json.loads(saved['doc'])
    assert man['schema']=='0.9.0' and man['appVersion']=='0.9.7'
    assert doc.get('usagePolicy',{}).get('scope')=='public-demo'
    assert doc.get('extensions',{}).get('phonolayer.sample',{}).get('publicDemo') is True
    assert 'ja-pitch-plot' not in saved['doc']

    # Hyperlink entities never survive canonical save.
    page.evaluate("""()=>{const e=document.getElementById('editor');e.innerHTML='<p><a href="https://example.com">plain-link-text</a></p>';e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));}""")
    page.locator('#saveBtn').click(); page.wait_for_timeout(160)
    hyperlink_saved=page.evaluate("""()=>{const w=window.__mock.writes.at(-1);const f=PhonoLayerArchive.unpackStoreZip(new Uint8Array(w.bytes));return PhonoLayerArchive.textFile(f,'document.json')}""")
    assert '<a' not in hyperlink_saved.lower() and 'plain-link-text' in hyperlink_saved

    # Public Cantonese demo is also bundled; no private corpus is required.
    page.locator('#fileTabBtn').click(); page.wait_for_timeout(30)
    page.locator('[data-public-sample="cantonese-reading"]').click(); page.wait_for_timeout(220)
    assert page.locator('#editor ruby.phono').count()>=5
    assert '專為公開示範' in page.locator('#editor').inner_text()

    assert not errors, errors
    browser.close()
print('QA BROWSER PASSED')
