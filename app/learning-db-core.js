(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PhonoLayerLearningCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function norm(value) { return String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' '); }
  function safeExtensions(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out = {};
    for (const [k,v] of Object.entries(value)) {
      if (!/^[A-Za-z0-9_.:-]{1,80}$/.test(k)) continue;
      try { out[k] = JSON.parse(JSON.stringify(v)); } catch {}
    }
    return out;
  }
  function makeEntryKey({ language, base, reading }) { return [norm(language), norm(base), norm(reading)].join('\u241F'); }
  function makeObservationId(documentId, annotationId) { return `${norm(documentId)}::${norm(annotationId)}`; }
  function eventId(prefix='evt') {
    return globalThis.crypto?.randomUUID ? `${prefix}-${globalThis.crypto.randomUUID()}` : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  function makeEntry(record, now = Date.now()) {
    return { key:makeEntryKey(record), language:norm(record.language), base:norm(record.base), reading:norm(record.reading), createdAt:Number(record.createdAt)||now, updatedAt:Number(record.updatedAt)||now, extensions:safeExtensions(record.extensions) };
  }
  function makeObservation(record, now = Date.now()) {
    return {
      id:makeObservationId(record.documentId, record.annotationId), kind:'annotation-projection', projectionRevision:Math.max(1,Number(record.projectionRevision)||1), entryKey:makeEntryKey(record),
      documentId:norm(record.documentId), documentTitle:norm(record.documentTitle), annotationId:norm(record.annotationId), language:norm(record.language), base:norm(record.base), reading:norm(record.reading),
      pitch:norm(record.pitch), pitchSystem:norm(record.pitchSystem), jaPitchModel:norm(record.jaPitchModel), jaPitchDialect:norm(record.jaPitchDialect), jaPitchRepresentation:norm(record.jaPitchRepresentation), jaMorae:norm(record.jaMorae), jaAccentNucleus:norm(record.jaAccentNucleus), jaManualHl:norm(record.jaManualHl), jaPitchSource:norm(record.jaPitchSource),
      note:norm(record.note), mastery:String(record.mastery ?? '0'), source:record.source==='reused'?'reused':'manual', observedAt:Number(record.observedAt)||now, updatedAt:Number(record.updatedAt)||now, extensions:safeExtensions(record.extensions)
    };
  }
  function makeAnnotationEvent(record, now=Date.now()) {
    const kind=['created','updated','removed'].includes(record.kind)?record.kind:'updated';
    return { id:norm(record.id)||eventId('annotation-event'), kind, documentId:norm(record.documentId), documentTitle:norm(record.documentTitle), annotationId:norm(record.annotationId), at:Number(record.at)||now, before:record.before||null, after:record.after||null, extensions:safeExtensions(record.extensions) };
  }
  function pitchVariant(record={}) {
    const pitch=norm(record.pitch); if(!pitch) return null;
    return { pitch, pitchSystem:norm(record.pitchSystem), jaPitchModel:norm(record.jaPitchModel), jaPitchDialect:norm(record.jaPitchDialect), jaPitchRepresentation:norm(record.jaPitchRepresentation), jaMorae:norm(record.jaMorae), jaAccentNucleus:norm(record.jaAccentNucleus), jaManualHl:norm(record.jaManualHl), jaPitchSource:norm(record.jaPitchSource) };
  }
  function pitchVariantKey(record={}) { const v=pitchVariant(record); return v?JSON.stringify(v):''; }
  function summarize(entries, observations) {
    const byKey=new Map();
    for(const entry of entries||[]) byKey.set(entry.key,{...entry,encounterCount:0,lastSeenAt:0,sources:new Set(),pitchVariants:new Map()});
    for(const obs of observations||[]){
      if(!byKey.has(obs.entryKey)) byKey.set(obs.entryKey,{...makeEntry(obs,obs.observedAt||Date.now()),encounterCount:0,lastSeenAt:0,sources:new Set(),pitchVariants:new Map()});
      const item=byKey.get(obs.entryKey); item.encounterCount+=1; item.lastSeenAt=Math.max(item.lastSeenAt||0,Number(obs.updatedAt||obs.observedAt||0)); item.sources.add(obs.source||'manual');
      const key=pitchVariantKey(obs); if(key){const old=item.pitchVariants.get(key); const variant=pitchVariant(obs); item.pitchVariants.set(key,{...variant,count:(old?.count||0)+1});}
    }
    return [...byKey.values()].map(item=>({...item,sources:[...item.sources],pitchVariants:[...item.pitchVariants.values()].sort((a,b)=>b.count-a.count||a.pitch.localeCompare(b.pitch))}));
  }
  function stableValue(value){
    if(Array.isArray(value)) return value.map(stableValue);
    if(value && typeof value==='object'){const out={};for(const k of Object.keys(value).sort())out[k]=stableValue(value[k]);return out;}
    return value;
  }
  function stableRecord(value){ return JSON.stringify(stableValue(value)); }
  function chooseProjection(existing,incoming){
    if(!existing) return {record:incoming, conflict:false, winner:'incoming'};
    const a=Number(existing.updatedAt)||0,b=Number(incoming?.updatedAt)||0;
    if(b>a) return {record:incoming, conflict:stableRecord(existing)!==stableRecord(incoming), winner:'incoming'};
    if(a>b) return {record:existing, conflict:stableRecord(existing)!==stableRecord(incoming), winner:'existing'};
    const same=stableRecord(existing)===stableRecord(incoming);
    return {record:existing, conflict:!same, winner:same?'same':'existing-tie'};
  }
  function appendOnlyConflict(existing,incoming){ return Boolean(existing && stableRecord(existing)!==stableRecord(incoming)); }
  return { norm,safeExtensions,makeEntryKey,makeObservationId,eventId,makeEntry,makeObservation,makeAnnotationEvent,pitchVariant,pitchVariantKey,summarize,stableRecord,chooseProjection,appendOnlyConflict };
});
