(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PhonoLayerPhonetics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function validateExplicitPitch(raw) {
    const text = String(raw || '').trim();
    if (!text) return { valid: true, contours: [], error: '' };
    const groups = text.split('|').map(x => x.trim());
    if (groups.some(x => !x)) return { valid: false, contours: [], error: '“|” 两侧都必须有音高轨迹。' };

    const contours = [];
    for (const group of groups) {
      const normalized = group.replace(/高/gi, 'H').replace(/低/gi, 'L');
      const tokens = normalized.split(/[\s,\-–—>→]+/).filter(Boolean);
      if (!tokens.length) return { valid: false, contours: [], error: `无法解析音高轨迹：${group}` };
      const levels = [];
      for (const token of tokens) {
        const t = token.toUpperCase();
        if (t === 'H') { levels.push(4); continue; }
        if (t === 'L') { levels.push(2); continue; }
        if (!/^[1-5]$/.test(t)) return { valid: false, contours: [], error: `音高只能使用 1–5 或 H/L；无法识别：${token}` };
        levels.push(Number(t));
      }
      contours.push(levels);
    }
    return { valid: true, contours, error: '' };
  }

  function parseExplicitPitch(raw) {
    const result = validateExplicitPitch(raw);
    return result.valid ? result.contours : [];
  }


  function graphemes(text) {
    const value = String(text || '');
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].map(x => x.segment);
      }
    } catch {}
    return Array.from(value);
  }

  // Manual-first: only explicit spaces create per-character segmentation.
  // No dictionary lookup, tone inference, kana generation, pinyin parsing, or automatic syllabification.
  function tokenizeManualReading(reading, text) {
    const tokens = String(reading || '').trim().split(/\s+/).filter(Boolean);
    const chars = graphemes(text);
    if (tokens.length === chars.length && chars.length > 1) return tokens;
    return [String(reading || '').trim()].filter(Boolean);
  }

  function tokenizePitchGroups(raw) {
    return String(raw || '').split('|').map(x => x.trim()).filter(Boolean);
  }

  return { validateExplicitPitch, parseExplicitPitch, tokenizeManualReading, tokenizePitchGroups, graphemes };
});
