(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PhonoLayerJapanesePitch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MODEL = 'ja-tokyo-accent-v1';
  const DIALECT = 'ja-Tokyo';
  const REPRESENTATIONS = new Set(['accent-nucleus', 'manual-hl']);
  const SMALL_KANA = new Set(['ぁ','ぃ','ぅ','ぇ','ぉ','ゃ','ゅ','ょ','ゎ','ァ','ィ','ゥ','ェ','ォ','ャ','ュ','ョ','ヮ']);
  const DEPENDENT_MORAE = new Set(['っ','ッ','ん','ン','ー']);

  function splitTokens(raw) {
    return String(raw || '').trim().split(/[|｜\s]+/).map(x => x.trim()).filter(Boolean);
  }

  function parseMorae(raw) { return splitTokens(raw); }

  function validateMorae(raw) {
    const morae = parseMorae(raw);
    if (!morae.length) return { valid:false, morae:[], warnings:[], error:'请人工填写音拍（mora），用空格或“|”分隔。' };
    const warnings = [];
    morae.forEach((m, i) => {
      if (SMALL_KANA.has(m)) warnings.push(`第 ${i+1} 拍“${m}”是独立小假名；通常应与前一个假名合成一拍，请确认你的人工分拍。`);
    });
    return { valid:true, morae, warnings, error:'' };
  }

  function parseManualHL(raw) {
    const tokens = String(raw || '').trim().toUpperCase().split(/[|｜\s,\-–—>→]+/).filter(Boolean);
    if (!tokens.length) return [];
    if (tokens.some(x => x !== 'H' && x !== 'L')) return [];
    return tokens;
  }

  function accentType(nucleus, moraCount) {
    const n = Number(nucleus);
    if (!Number.isInteger(n) || n < 0 || n > moraCount || moraCount < 1) return 'invalid';
    if (n === 0) return 'heiban';
    if (n === 1) return 'atamadaka';
    if (n === moraCount) return 'odaka';
    return 'nakadaka';
  }

  // Canonical pedagogical Tokyo-type lexical pattern. This is a schematic H/L
  // representation of lexical accent, not an acoustic F0 predictor. Phrase-level
  // initial lowering, late fall, devoicing and intonational effects are outside it.
  function deriveTokyoPattern(moraCount, nucleus) {
    const n = Number(moraCount), a = Number(nucleus);
    if (!Number.isInteger(n) || n < 1 || !Number.isInteger(a) || a < 0 || a > n) return null;
    const levels = [];
    if (n === 1) {
      levels.push('H');
    } else if (a === 1) {
      levels.push('H');
      for (let i=2;i<=n;i++) levels.push('L');
    } else {
      levels.push('L');
      for (let i=2;i<=n;i++) levels.push(a === 0 || i <= a ? 'H' : 'L');
    }
    return {
      levels,
      particle: a === 0 ? 'H' : 'L',
      accentType: accentType(a, n),
      nucleus: a,
      moraCount: n
    };
  }

  function toFiveLevel(levels) { return (levels || []).map(x => x === 'H' ? 4 : 2); }
  function toPitchRaw(levels) { return toFiveLevel(levels).join('-'); }

  function validateJapanesePitch(input = {}) {
    const representation = REPRESENTATIONS.has(input.representation) ? input.representation : 'accent-nucleus';
    const mv = validateMorae(input.moraeRaw);
    if (!mv.valid) return { valid:false, error:mv.error, warnings:[], model:MODEL };
    const warnings = [...mv.warnings];
    const morae = mv.morae;

    if (representation === 'accent-nucleus') {
      const nucleus = Number(input.accentNucleus);
      if (!Number.isInteger(nucleus) || nucleus < 0 || nucleus > morae.length) {
        return { valid:false, error:`アクセント核必须是 0–${morae.length} 的整数；0 表示平板型。`, warnings, model:MODEL };
      }
      const derived = deriveTokyoPattern(morae.length, nucleus);
      if (nucleus > 0 && DEPENDENT_MORAE.has(morae[nucleus - 1])) {
        warnings.push(`第 ${nucleus} 拍“${morae[nucleus-1]}”属于特殊拍；东京式词汇アクセント核通常受音节结构约束，请确认该标注。`);
      }
      return {
        valid:true, error:'', warnings, model:MODEL, dialect:DIALECT, representation,
        morae, accentNucleus:nucleus, levels:derived.levels, particleLevel:derived.particle,
        accentType:derived.accentType, pitchRaw:toPitchRaw(derived.levels)
      };
    }

    const levels = parseManualHL(input.manualHLRaw);
    if (!levels.length) return { valid:false, error:'手动 H/L 模式需要人工填写 H/L 序列。', warnings, model:MODEL };
    if (levels.length !== morae.length) {
      return { valid:false, error:`H/L 数量必须与人工音拍数一致：当前 ${levels.length} / ${morae.length}。`, warnings, model:MODEL };
    }
    return {
      valid:true, error:'', warnings, model:MODEL, dialect:DIALECT, representation,
      morae, accentNucleus:null, levels, particleLevel:null, accentType:'manual', pitchRaw:toPitchRaw(levels)
    };
  }

  function fromDataset(ds = {}) {
    if (ds.pitchSystem !== 'ja-tokyo') return null;
    const representation = ds.jaPitchRepresentation || 'accent-nucleus';
    return validateJapanesePitch({
      representation,
      moraeRaw: ds.jaMorae || '',
      accentNucleus: ds.jaAccentNucleus === '' || ds.jaAccentNucleus == null ? NaN : Number(ds.jaAccentNucleus),
      manualHLRaw: ds.jaManualHl || ''
    });
  }

  // Reserved future automation contract. Machine proposal != user-confirmed knowledge.
  // v0.8.3 ships no provider and never calls
  // this function from the editor. A future provider may produce a proposal, but a
  // proposal is not learner-confirmed knowledge until the user explicitly accepts it.
  function normalizeSuggestion(s = {}) {
    const candidate = validateJapanesePitch({
      representation: s.representation,
      moraeRaw: Array.isArray(s.morae) ? s.morae.join('|') : s.moraeRaw,
      accentNucleus: s.accentNucleus,
      manualHLRaw: Array.isArray(s.levels) ? s.levels.join(' ') : s.manualHLRaw
    });
    return {
      contractVersion:1,
      providerId:String(s.providerId || ''),
      confidence:Number.isFinite(Number(s.confidence)) ? Math.max(0, Math.min(1, Number(s.confidence))) : null,
      proposal:candidate.valid ? candidate : null,
      confirmed:false
    };
  }

  return {
    MODEL, DIALECT, parseMorae, validateMorae, parseManualHL, accentType,
    deriveTokyoPattern, toFiveLevel, toPitchRaw, validateJapanesePitch, fromDataset,
    normalizeSuggestion
  };
});
