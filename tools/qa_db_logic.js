'use strict';
// Deterministic in-memory IndexedDB compatibility harness for testing the real
// learning-db.js control/merge semantics without depending on browser origin policy.
class NameList extends Array { contains(v){ return this.includes(v); } }
class Req { constructor(tx, fn){ this.onsuccess=null; this.onerror=null; this.result=undefined; this.error=null; tx?._inc(); queueMicrotask(()=>{ try{ this.result=fn(); this.onsuccess?.(); }catch(e){ this.error=e; this.onerror?.(); tx?._fail(e); } finally { tx?._dec(); } }); } }
class Store {
  constructor(tx, def){ this.tx=tx; this.def=def; }
  _key(v){ return v?.[this.def.keyPath]; }
  get(k){ return new Req(this.tx,()=>structuredClone(this.def.rows.get(k))); }
  put(v){ return new Req(this.tx,()=>{const x=structuredClone(v),k=this._key(x);this.def.rows.set(k,x);return k;}); }
  add(v){ return new Req(this.tx,()=>{const x=structuredClone(v),k=this._key(x);if(this.def.rows.has(k)) throw new Error('ConstraintError');this.def.rows.set(k,x);return k;}); }
  delete(k){ return new Req(this.tx,()=>this.def.rows.delete(k)); }
  clear(){ return new Req(this.tx,()=>this.def.rows.clear()); }
  getAll(){ return new Req(this.tx,()=>[...this.def.rows.values()].map(x=>structuredClone(x))); }
  createIndex(name,keyPath){ this.def.indexes.set(name,keyPath); return this; }
  index(name){ const keyPath=this.def.indexes.get(name); if(!keyPath) throw new Error('missing index '+name); return { getAll:(value)=>new Req(this.tx,()=>[...this.def.rows.values()].filter(x=>x?.[keyPath]===value).map(x=>structuredClone(x))) }; }
}
class Tx {
  constructor(db,names){ this.db=db; this.names=Array.isArray(names)?names:[names]; this.pending=0; this.oncomplete=null; this.onerror=null; this.onabort=null; this.error=null; this.aborted=false; this.scheduled=false; this._schedule(); }
  objectStore(name){ const def=this.db._stores.get(name); if(!def) throw new Error('missing store '+name); return new Store(this,def); }
  abort(){ this.aborted=true; this.error=this.error||new Error('AbortError'); queueMicrotask(()=>this.onabort?.()); }
  _inc(){ this.pending++; }
  _dec(){ this.pending--; this._schedule(); }
  _fail(e){ this.error=e; queueMicrotask(()=>this.onerror?.()); }
  _schedule(){ if(this.scheduled) return; this.scheduled=true; setImmediate(()=>{this.scheduled=false;if(!this.aborted&&!this.error&&this.pending===0)this.oncomplete?.();else if(!this.aborted&&!this.error)this._schedule();}); }
}
class DB {
  constructor(name,version){ this.name=name; this.version=version; this._stores=new Map(); this.objectStoreNames=new NameList(); }
  createObjectStore(name,opt){ const def={keyPath:opt.keyPath,rows:new Map(),indexes:new Map()};this._stores.set(name,def);this.objectStoreNames.push(name);return new Store(null,def); }
  transaction(names){ return new Tx(this,names); }
  close(){}
}
const dbs=new Map();
global.indexedDB={open(name,version){ const req={result:null,error:null,onupgradeneeded:null,onsuccess:null,onerror:null}; setImmediate(()=>{try{let db=dbs.get(name);const upgrade=!db||version>db.version;if(!db){db=new DB(name,version);dbs.set(name,db);} if(version>db.version)db.version=version;req.result=db;if(upgrade)req.onupgradeneeded?.();setImmediate(()=>req.onsuccess?.());}catch(e){req.error=e;req.onerror?.();}}); return req; }};
require('../app/learning-db-core.js'); require('../app/retrieval-core.js'); require('../app/learning-db.js');
const DBAPI=global.PhonoLayerLearningDB, C=global.PhonoLayerLearningCore;
function ok(c,m){ if(!c) throw new Error(m); }
(async()=>{
  await DBAPI.clearAll();
  const base={documentId:'doc-1',documentTitle:'D1',annotationId:'ann-1',language:'ja',base:'日本語',reading:'にほんご',pitch:'2-4-2-2',pitchSystem:'ja-tokyo',jaPitchModel:'ja-tokyo-accent-v1',jaPitchDialect:'ja-Tokyo',jaPitchRepresentation:'accent-nucleus',jaMorae:'に|ほ|ん|ご',jaAccentNucleus:'2',jaPitchSource:'manual-test',source:'manual',extensions:{'x-test':{v:1}}};
  const first=(await DBAPI.upsertObservation(base)).observation;
  await new Promise(r=>setTimeout(r,2));
  const second=(await DBAPI.upsertObservation({...base,note:'updated'})).observation;
  let snap=await DBAPI.getSnapshot();
  ok(DBAPI.DB_VERSION===3,'DB version'); ok(snap.observations.length===1,'one current projection'); ok(second.observedAt===first.observedAt,'observedAt preserved'); ok(second.projectionRevision===2,'projection revision increments');
  ok(snap.annotationEvents.length===2 && snap.annotationEvents[0].kind==='created' && snap.annotationEvents[1].kind==='updated','annotation event history');
  ok(snap.observations[0].jaPitchModel==='ja-tokyo-accent-v1' && snap.observations[0].extensions['x-test'].v===1,'structured semantics/extensions');
  await DBAPI.removeObservation('doc-1','ann-1'); snap=await DBAPI.getSnapshot(); ok(!snap.observations.length && snap.annotationEvents.at(-1).kind==='removed','remove event');
  await DBAPI.startRetrievalSession({id:'s1',documentId:'doc-1',documentTitle:'D1',language:'ja',plannedCount:1,startedAt:10});
  const ev={id:'ev1',sessionId:'s1',sequence:0,documentId:'doc-1',documentTitle:'D1',annotationId:'ann-x',entryKey:C.makeEntryKey(base),language:'ja',base:'日本語',reading:'にほんご',revealMode:'after-recall',readingRating:'good',pitchRating:'unrated',ratedAt:20};
  await DBAPI.recordRetrievalEvent(ev);
  snap=await DBAPI.getSnapshot(); const storedEv=snap.retrievalEvents.find(x=>x.id==='ev1');
  let rep=await DBAPI.importSnapshot({retrievalEvents:[storedEv]},'merge'); ok(rep.duplicates===1,'exact event duplicate skipped');
  let conflict=false; try{await DBAPI.importSnapshot({retrievalEvents:[{...storedEv,revealMode:'direct',ratedAt:21}]},'merge');}catch{conflict=true;} ok(conflict,'append-only event conflict rejected');
  const legacyObs={documentId:'legacy-doc',documentTitle:'legacy',annotationId:'a',language:'ja',base:'生',reading:'せい',source:'manual',observedAt:1,updatedAt:1};
  rep=await DBAPI.importSnapshot({entries:[C.makeEntry(legacyObs,1)],observations:[legacyObs],meta:[],retrievalSessions:[],retrievalEvents:[]},'merge'); ok(rep.observations===1,'legacy snapshot merges');
  snap=await DBAPI.getSnapshot(); ok(snap.observations.some(x=>x.documentId==='legacy-doc'),'legacy projection normalized');
  console.log('QA DB LOGIC PASSED',JSON.stringify({dbVersion:DBAPI.DB_VERSION,annotationEvents:snap.annotationEvents.length,retrievalEvents:snap.retrievalEvents.length,observations:snap.observations.length}));
})().catch(e=>{console.error(e);process.exit(1)});
