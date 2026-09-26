(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PhonoLayerConfirmationCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function norm(value) { return String(value ?? '').normalize('NFC').trim(); }
  function nextPitchStale(state = {}) {
    const oldPitch = norm(state.oldPitch);
    const newPitch = norm(state.newPitch);
    const oldReading = norm(state.oldReading);
    const newReading = norm(state.newReading);
    if (newPitch !== oldPitch) return false; // explicit pitch edit is a reconfirmation
    if (state.wasPitchStale) return true;    // quick metadata edits must not silently reconfirm stale pitch
    const hadPitchSemantics = Boolean(oldPitch || norm(state.pitchSystem) === 'ja-tokyo');
    return hadPitchSemantics && (newReading !== oldReading || Boolean(state.wasBaseStale));
  }
  return { norm, nextPitchStale };
});
