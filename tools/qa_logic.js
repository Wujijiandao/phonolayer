'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const P=require(path.join(root,'app','phonetics-core.js'));
const C=require(path.join(root,'app','confirmation-core.js'));
const I=require(path.join(root,'app','identity-core.js'));
const J=require(path.join(root,'app','japanese-pitch-core.js'));
const A=require(path.join(root,'app','archive-core.js'));
const L=require(path.join(root,'app','learning-db-core.js'));
const R=require(path.join(root,'app','retrieval-core.js'));
const M=require(path.join(root,'app','memory-core.js'));
function ok(c,m){ if(!c) throw new Error(m); }

ok(JSON.stringify(P.parseExplicitPitch('5-5'))==='[[5,5]]','5-5 pitch');
ok(JSON.stringify(P.parseExplicitPitch('2-1-4'))==='[[2,1,4]]','214 pitch');
ok(P.parseExplicitPitch('ma3').length===0,'ma3 must not infer tone');
ok(P.validateExplicitPitch('5-x').valid===false,'invalid pitch should reject');
ok(JSON.stringify(P.tokenizeManualReading('てん ない','店内'))===JSON.stringify(['てん','ない']),'explicit split');
ok(JSON.stringify(P.tokenizeManualReading('てんない','店内'))===JSON.stringify(['てんない']),'implicit split forbidden');
ok(P.graphemes('a\u0301').length===1,'grapheme combining mark');

// v0.8.10 semantic integrity invariants (retained in v0.8.12).
ok(C.nextPitchStale({oldReading:'きょう',newReading:'こんにち',oldPitch:'2-4',newPitch:'2-4',pitchSystem:'ja-tokyo',wasBaseStale:false,wasPitchStale:false})===true,'reading change must stale unchanged pitch');
ok(C.nextPitchStale({oldReading:'きょう',newReading:'きょう',oldPitch:'2-4',newPitch:'2-4',pitchSystem:'ja-tokyo',wasPitchStale:true})===true,'quick metadata edit must preserve stale pitch');
ok(C.nextPitchStale({oldReading:'きょう',newReading:'こんにち',oldPitch:'2-4',newPitch:'4-2',pitchSystem:'ja-tokyo',wasPitchStale:true})===false,'explicit pitch edit reconfirms pitch');
let ic=I.pathConflict({documentId:'doc-1',filePath:'C:/b.phonodoc',openDocs:[{id:'doc-1',filePath:'C:/a.phonodoc'}],registryPath:''}); ok(ic.conflict&&ic.reason==='simultaneous-copy','same document ID at two paths must fork');
ic=I.pathConflict({documentId:'doc-1',filePath:'C:/a.phonodoc',openDocs:[],registryPath:'c:/A.phonodoc'}); ok(!ic.conflict,'path normalization must preserve identity');


// v0.8.4 Japanese Pitch Accent Model: morae are manual; the app derives only
// the deterministic schematic display from learner-confirmed structure.
ok(JSON.stringify(J.parseMorae('きょ | う'))===JSON.stringify(['きょ','う']),'manual mora segmentation');
let jp=J.validateJapanesePitch({moraeRaw:'に|ほ|ん|ご',representation:'accent-nucleus',accentNucleus:0});
ok(jp.valid && jp.accentType==='heiban' && jp.levels.join('')==='LHHH' && jp.particleLevel==='H','Tokyo heiban schematic');
jp=J.validateJapanesePitch({moraeRaw:'に|ほ|ん|ご',representation:'accent-nucleus',accentNucleus:1});
ok(jp.valid && jp.accentType==='atamadaka' && jp.levels.join('')==='HLLL' && jp.particleLevel==='L','Tokyo atamadaka schematic');
jp=J.validateJapanesePitch({moraeRaw:'に|ほ|ん|ご',representation:'accent-nucleus',accentNucleus:2});
ok(jp.valid && jp.accentType==='nakadaka' && jp.levels.join('')==='LHLL' && jp.pitchRaw==='2-4-2-2','Tokyo nakadaka schematic');
jp=J.validateJapanesePitch({moraeRaw:'に|ほ|ん|ご',representation:'accent-nucleus',accentNucleus:4});
ok(jp.valid && jp.accentType==='odaka' && jp.levels.join('')==='LHHH' && jp.particleLevel==='L','Tokyo odaka distinguished by following particle');
jp=J.validateJapanesePitch({moraeRaw:'が|っ|こ|う',representation:'manual-hl',manualHLRaw:'L H H L'});
ok(jp.valid && jp.levels.join('')==='LHHL' && jp.accentNucleus===null,'manual H/L mode');
ok(!J.validateJapanesePitch({moraeRaw:'きょ|う',representation:'manual-hl',manualHLRaw:'L H H'}).valid,'manual H/L count validation');
ok(J.validateMorae('き|ょ|う').warnings.length>=1,'standalone small kana warning');
const proposal=J.normalizeSuggestion({providerId:'future-test',morae:['に','ほ','ん','ご'],representation:'accent-nucleus',accentNucleus:0,confidence:.8});
ok(proposal.proposal?.valid && proposal.confirmed===false,'future automation stays unconfirmed');

const r1={language:'ja',base:'生',reading:'せい',documentId:'d1',annotationId:'a1',pitch:'2-4',pitchSystem:'ja-tokyo',jaPitchModel:'ja-tokyo-accent-v1',jaPitchDialect:'ja-Tokyo',jaPitchRepresentation:'accent-nucleus',jaMorae:'せ|い',jaAccentNucleus:'0',source:'manual'};
const r2={language:'ja',base:'生',reading:'せい',documentId:'d2',annotationId:'a2',pitch:'3-3',source:'manual'};
ok(L.makeEntryKey(r1)===L.makeEntryKey(r2),'entry identity should ignore context pitch');
const e=L.makeEntry(r1,1); const o1=L.makeObservation(r1,2),o2=L.makeObservation(r2,3); ok(o1.pitchSystem==='ja-tokyo' && o1.jaMorae==='せ|い','Japanese pitch observation persistence');
const sum=L.summarize([e],[o1,o2])[0]; ok(sum.encounterCount===2,'encounter count'); ok(sum.pitchVariants.length===2,'pitch variants'); ok(sum.pitchVariants.some(x=>x.jaPitchModel==='ja-tokyo-accent-v1'),'structured pitch variant retained');
ok(o1.kind==='annotation-projection' && o1.projectionRevision===1,'observation is explicit current projection');
const ae=L.makeAnnotationEvent({kind:'updated',documentId:'d1',annotationId:'a1',before:o1,after:{...o1,reading:'しょう'}},4); ok(ae.kind==='updated'&&ae.before&&ae.after,'append-only annotation event');
const ext=L.makeObservation({...r1,extensions:{'x-test':{v:1}}},5); ok(ext.extensions['x-test'].v===1,'extension namespace preserved');
const newer=L.chooseProjection({...o1,updatedAt:2},{...o1,updatedAt:3,note:'new'}); ok(newer.winner==='incoming'&&newer.record.note==='new','newer projection wins merge');
ok(L.appendOnlyConflict({id:'e',v:1},{id:'e',v:2})===true,'append-only event conflict detected');


const queue=R.selectQueue(['a','b','c'],2,false); ok(JSON.stringify(queue)==='["a","b"]','retrieval queue document order');
const shuffled=R.selectQueue(['a','b','c'],2,true,()=>0); ok(shuffled.length===2 && shuffled[0]!=='a','retrieval deterministic shuffle');
const rev1=R.makeEvent({id:'ev1',sessionId:'s',sequence:0,documentId:'d',annotationId:'a',entryKey:'k',base:'店内',reading:'てんない',pitch:'2-4',pitchSystem:'ja-tokyo',jaPitchModel:'ja-tokyo-accent-v1',jaPitchDialect:'ja-Tokyo',jaPitchRepresentation:'accent-nucleus',jaMorae:'て|ん|な|い',jaAccentNucleus:'0',revealMode:'after-recall',readingRating:'good',pitchRating:'hard'},10);
ok(rev1.pitchSystem==='ja-tokyo' && rev1.jaMorae==='て|ん|な|い','Japanese pitch retrieval snapshot');
const revSource=R.makeEvent({...rev1,id:'ev-source',jaPitchSource:'manual-reference',extensions:{'x-test':1}},11); ok(revSource.jaPitchSource==='manual-reference'&&revSource.extensions['x-test']===1,'retrieval structured pitch provenance/extensions');
const rev2=R.makeEvent({id:'ev2',sessionId:'s',sequence:1,documentId:'d',annotationId:'b',entryKey:'k2',base:'注文',reading:'ちゅうもん',revealMode:'direct',readingRating:'easy',pitchRating:'unrated'},20);
const rev3=R.makeEvent({id:'ev3',sessionId:'s',sequence:2,documentId:'d',annotationId:'c',entryKey:'k3',base:'女性',reading:'じょせい',readingRating:'skipped',pitchRating:'skipped',skipped:true},30);
const rsum=R.summarizeEvents([rev1,rev2,rev3]); ok(rsum.completedCount===2 && rsum.skippedCount===1,'retrieval summary counts'); ok(rsum.afterRecallCount===1 && rsum.directRevealCount===1,'retrieval reveal modes'); ok(rsum.reading.good===1 && rsum.reading.easy===1,'retrieval ratings');


const memSnapshot={
  entries:[e,L.makeEntry({language:'ja',base:'生',reading:'なま'},4),L.makeEntry({language:'ja',base:'学生',reading:'がくせい'},5)],
  observations:[o1,o2,L.makeObservation({language:'ja',base:'生',reading:'なま',documentId:'d3',documentTitle:'D3',annotationId:'a3',pitch:'2-3',source:'manual'},6),L.makeObservation({language:'ja',base:'学生',reading:'がくせい',documentId:'d4',documentTitle:'D4',annotationId:'a4',source:'manual'},7)],
  retrievalEvents:[R.makeEvent({id:'m1',sessionId:'s1',documentId:'d1',annotationId:'a1',entryKey:e.key,language:'ja',base:'生',reading:'せい',revealMode:'after-recall',readingRating:'good',pitchRating:'unrated'},8),R.makeEvent({id:'m2',sessionId:'s1',documentId:'d1',annotationId:'a1',entryKey:e.key,language:'ja',base:'生',reading:'せい',revealMode:'direct',readingRating:'hard',pitchRating:'unrated'},9)]
};
const memories=M.aggregate(memSnapshot); const sei=memories.find(x=>x.key===e.key);
ok(sei.observationCount===2 && sei.retrievalCount===2,'memory aggregates observations and retrievals');
ok(sei.pitchVariants.some(x=>x.jaPitchModel==='ja-tokyo-accent-v1'),'memory keeps Japanese structured pitch semantics');
ok(sei.afterRecallCount===1 && sei.directRevealCount===1,'memory preserves reveal evidence');
ok(sei.readingRatings.good===1 && sei.readingRatings.hard===1,'memory self-rating history');
ok(M.sameBaseReadings(memories,sei).some(x=>x.reading==='なま'),'same-base reading variants');
ok(M.relatedForms(memories,sei).some(x=>x.base==='学生'),'orthographic related forms');
ok(M.search(memories,'がく','ja').some(x=>x.base==='学生'),'memory search');

const packed=A.packStoreZip({'manifest.json':'{"x":1}','document.json':'{"y":2}'});
const unpacked=A.unpackStoreZip(packed); ok(A.textFile(unpacked,'manifest.json')==='{"x":1}','zip roundtrip');
const corrupt=new Uint8Array(packed); const idx=corrupt.findIndex((v,i)=>i>30&&v===123); if(idx>0){corrupt[idx]^=1; let rejected=false; try{A.unpackStoreZip(corrupt)}catch{rejected=true} ok(rejected,'CRC corruption must reject');}


// v0.9.7 official public learning corpus: all bundled samples parse through the same archive core.
const publicSpecs=[
  ['Official_Learning_Guides','00_Multilingual_Learning_Overview.phonodoc','zh-Mandarin',2],
  ['Official_Learning_Guides','01_Text_Form_Sound.phonodoc','zh-Mandarin',2],
  ['Official_Learning_Guides','02_Retrieval_Before_Reveal.phonodoc','zh-Mandarin',3],
  ['Official_Learning_Guides','03_Cross_Language_Transfer.phonodoc','zh-Mandarin',2],
  ['Official_Learning_Guides','04_Personal_Phonological_Memory.phonodoc','zh-Mandarin',2],
  ['Japanese','Japanese_Reading_Demo.phonodoc','ja',6],
  ['Cantonese','Cantonese_Reading_Demo.phonodoc','yue',5],
];
for(const [folder,name,language,minPhono] of publicSpecs){
  const bytes=fs.readFileSync(path.join(root,'samples','public',folder,name));
  const f=A.unpackStoreZip(bytes);
  const man=JSON.parse(A.textFile(f,'manifest.json'));
  const d=JSON.parse(A.textFile(f,'document.json'));
  const h=String(d.contentHtml||'');
  ok(man.format==='shengjian-phonodoc-experimental','public sample format '+name);
  ok(man.schema==='0.9.0' && man.appVersion==='0.9.7','public sample schema/app '+name);
  ok(d.language===language,'public sample language '+name);
  ok(Number(d.typography?.rubyScale)===0.65,'public sample rubyScale '+name);
  ok(d.usagePolicy?.scope==='public-demo','public sample usage policy '+name);
  ok(d.usagePolicy?.license==='CC0-1.0','public sample license '+name);
  ok(d.extensions?.['phonolayer.sample']?.publicDemo===true,'public sample extension '+name);
  ok(d.extensions?.['phonolayer.sample']?.officialLearningSample===true,'official learning sample flag '+name);
  ok((h.match(/ruby class="phono"/g)||[]).length>=minPhono,'public sample phono count '+name);
  ok(!/<a\b/i.test(h),'public sample hyperlink-free '+name);
}

// v0.8.10 compatibility/adversarial fixtures.
for(const [name,schema] of [['phonodb_v070_legacy.phonodb','0.7.0'],['phonodb_v080_current.phonodb','0.8.0'],['phonodb_v090_current.phonodb','0.9.0']]){
  const f=A.unpackStoreZip(fs.readFileSync(path.join(root,'qa','fixtures',name)));
  ok(JSON.parse(A.textFile(f,'manifest.json')).schema===schema,'phonodb fixture schema '+schema);
  const snap=JSON.parse(A.textFile(f,'snapshot.json')); ok(Array.isArray(snap.observations),'phonodb fixture snapshot '+schema);
}
{let rejected=false;try{A.unpackStoreZip(fs.readFileSync(path.join(root,'qa','fixtures','malformed_duplicate_member.phonodb')))}catch{rejected=true}ok(rejected,'duplicate archive member must reject');}
for(const sch of ['070','080','081','082','090']){const f=A.unpackStoreZip(fs.readFileSync(path.join(root,'qa','fixtures',`phonodoc_v${sch}_fixture.phonodoc`)));ok(JSON.parse(A.textFile(f,'manifest.json')).schema===sch.slice(0,1)+'.'+sch.slice(1,2)+'.'+sch.slice(2),'phonodoc migration fixture '+sch);}

console.log('QA LOGIC PASSED');
