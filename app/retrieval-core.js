(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PhonoLayerRetrievalCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const REVEAL_MODES = new Set(['after-recall', 'direct', 'none']);
  const RATINGS = new Set(['again', 'hard', 'good', 'easy', 'unrated', 'skipped']);

  function norm(value) {
    return String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
  }

  function clampCount(raw, total) {
    const n = raw === 'all' ? total : Number(raw);
    if (!Number.isFinite(n) || n <= 0) return Math.min(10, total);
    return Math.min(Math.floor(n), total);
  }

  function selectQueue(items, rawCount = 10, shuffle = false, rng = Math.random) {
    const source = Array.from(items || []);
    if (shuffle) {
      for (let i = source.length - 1; i > 0; i -= 1) {
        const j = Math.max(0, Math.min(i, Math.floor((Number(rng()) || 0) * (i + 1))));
        [source[i], source[j]] = [source[j], source[i]];
      }
    }
    return source.slice(0, clampCount(rawCount, source.length));
  }

  function makeSession(record, now = Date.now()) {
    return {
      id: norm(record.id),
      documentId: norm(record.documentId),
      documentTitle: norm(record.documentTitle),
      language: norm(record.language),
      extensions: record.extensions && typeof record.extensions === 'object' ? JSON.parse(JSON.stringify(record.extensions)) : {},
      startedAt: Number(record.startedAt) || now,
      endedAt: Number(record.endedAt) || 0,
      plannedCount: Math.max(0, Number(record.plannedCount) || 0),
      completedCount: Math.max(0, Number(record.completedCount) || 0),
      skippedCount: Math.max(0, Number(record.skippedCount) || 0),
      afterRecallCount: Math.max(0, Number(record.afterRecallCount) || 0),
      directRevealCount: Math.max(0, Number(record.directRevealCount) || 0),
      order: record.order === 'shuffle' ? 'shuffle' : 'document',
      endedEarly: Boolean(record.endedEarly)
    };
  }

  function makeEvent(record, now = Date.now()) {
    const revealMode = REVEAL_MODES.has(record.revealMode) ? record.revealMode : 'none';
    const readingRating = RATINGS.has(record.readingRating) ? record.readingRating : 'unrated';
    const pitchRating = RATINGS.has(record.pitchRating) ? record.pitchRating : 'unrated';
    return {
      id: norm(record.id),
      sessionId: norm(record.sessionId),
      sequence: Math.max(0, Number(record.sequence) || 0),
      documentId: norm(record.documentId),
      documentTitle: norm(record.documentTitle),
      annotationId: norm(record.annotationId),
      entryKey: norm(record.entryKey),
      language: norm(record.language),
      base: norm(record.base),
      reading: norm(record.reading),
      pitch: norm(record.pitch),
      pitchSystem: norm(record.pitchSystem),
      jaPitchModel: norm(record.jaPitchModel),
      jaPitchDialect: norm(record.jaPitchDialect),
      jaPitchRepresentation: norm(record.jaPitchRepresentation),
      jaMorae: norm(record.jaMorae),
      jaAccentNucleus: norm(record.jaAccentNucleus),
      jaManualHl: norm(record.jaManualHl),
      jaPitchSource: norm(record.jaPitchSource),
      source: norm(record.source),
      extensions: record.extensions && typeof record.extensions === 'object' ? JSON.parse(JSON.stringify(record.extensions)) : {},
      masteryAtReview: String(record.masteryAtReview ?? '0'),
      revealMode,
      readingRating,
      pitchRating,
      shownAt: Number(record.shownAt) || now,
      revealedAt: Number(record.revealedAt) || 0,
      ratedAt: Number(record.ratedAt) || now,
      durationMs: Math.max(0, Number(record.durationMs) || 0),
      skipped: Boolean(record.skipped) || readingRating === 'skipped'
    };
  }

  function summarizeEvents(events) {
    const out = {
      completedCount: 0,
      skippedCount: 0,
      afterRecallCount: 0,
      directRevealCount: 0,
      reading: { again: 0, hard: 0, good: 0, easy: 0, unrated: 0 },
      pitch: { again: 0, hard: 0, good: 0, easy: 0, unrated: 0 }
    };
    for (const raw of events || []) {
      const event = makeEvent(raw, raw.ratedAt || Date.now());
      if (event.skipped) { out.skippedCount += 1; continue; }
      out.completedCount += 1;
      if (event.revealMode === 'after-recall') out.afterRecallCount += 1;
      if (event.revealMode === 'direct') out.directRevealCount += 1;
      if (event.readingRating !== 'skipped') out.reading[event.readingRating in out.reading ? event.readingRating : 'unrated'] += 1;
      if (event.pitchRating !== 'skipped') out.pitch[event.pitchRating in out.pitch ? event.pitchRating : 'unrated'] += 1;
    }
    return out;
  }

  return { REVEAL_MODES, RATINGS, norm, clampCount, selectQueue, makeSession, makeEvent, summarizeEvents };
});
