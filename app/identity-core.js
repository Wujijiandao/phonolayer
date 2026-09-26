(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PhonoLayerIdentityCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function normPath(value) { return String(value || '').replace(/\\/g,'/').replace(/\/+$/,'').toLocaleLowerCase(); }
  function pathConflict({ documentId, filePath, openDocs = [], registryPath = '' } = {}) {
    const id = String(documentId || '').trim();
    const p = normPath(filePath);
    if (!id || !p) return { conflict:false, reason:'' };
    const open = (openDocs || []).find(d => String(d?.id || '').trim() === id && normPath(d?.filePath) && normPath(d.filePath) !== p);
    if (open) return { conflict:true, reason:'simultaneous-copy', previousPath:open.filePath || '' };
    const rp = normPath(registryPath);
    if (rp && rp !== p) return { conflict:true, reason:'known-path-copy', previousPath:registryPath || '' };
    return { conflict:false, reason:'' };
  }
  function lineageAfterFork(lineage, previousDocumentId, reason, atIso) {
    const prior = lineage && typeof lineage === 'object' ? lineage : {};
    return { ...prior, forkedFromDocumentId:String(previousDocumentId||''), forkReason:String(reason||'copy'), forkedAt:String(atIso||'') };
  }
  return { normPath, pathConflict, lineageAfterFork };
});
