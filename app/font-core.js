(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PhonoLayerFonts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FONT_CATALOG = [
    { key:'system-sans', label:'系统无衬线', family:'"Segoe UI","Microsoft YaHei UI","Yu Gothic UI",Arial,sans-serif', probe:null, group:'系统' },
    { key:'system-serif', label:'系统衬线', family:'"Times New Roman","SimSun","Yu Mincho",serif', probe:null, group:'系统' },
    { key:'times-new-roman', label:'Times New Roman', family:'"Times New Roman",serif', probe:'Times New Roman', group:'拉丁' },
    { key:'georgia', label:'Georgia', family:'Georgia,serif', probe:'Georgia', group:'拉丁' },
    { key:'arial', label:'Arial', family:'Arial,sans-serif', probe:'Arial', group:'拉丁' },
    { key:'segoe-ui', label:'Segoe UI', family:'"Segoe UI",sans-serif', probe:'Segoe UI', group:'拉丁' },
    { key:'simsun', label:'宋体 SimSun', family:'SimSun,"宋体",serif', probe:'SimSun', group:'中文' },
    { key:'kaiti', label:'楷体 KaiTi', family:'KaiTi,"楷体",serif', probe:'KaiTi', group:'中文' },
    { key:'fangsong', label:'仿宋 FangSong', family:'FangSong,"仿宋",serif', probe:'FangSong', group:'中文' },
    { key:'microsoft-yahei', label:'微软雅黑 Microsoft YaHei', family:'"Microsoft YaHei","微软雅黑",sans-serif', probe:'Microsoft YaHei', group:'中文' },
    { key:'dengxian', label:'等线 DengXian', family:'DengXian,"等线",sans-serif', probe:'DengXian', group:'中文' },
    { key:'noto-serif-sc', label:'Noto Serif CJK SC', family:'"Noto Serif CJK SC","Noto Serif SC",serif', probe:'Noto Serif CJK SC', group:'中文' },
    { key:'noto-sans-sc', label:'Noto Sans CJK SC', family:'"Noto Sans CJK SC","Noto Sans SC",sans-serif', probe:'Noto Sans CJK SC', group:'中文' },
    { key:'yu-mincho', label:'Yu Mincho / 游明朝', family:'"Yu Mincho","游明朝",serif', probe:'Yu Mincho', group:'日文' },
    { key:'yu-gothic', label:'Yu Gothic / 游ゴシック', family:'"Yu Gothic","Yu Gothic UI","游ゴシック",sans-serif', probe:'Yu Gothic', group:'日文' },
    { key:'meiryo', label:'Meiryo / メイリオ', family:'Meiryo,"メイリオ",sans-serif', probe:'Meiryo', group:'日文' },
    { key:'ms-mincho', label:'MS Mincho / ＭＳ 明朝', family:'"MS Mincho","ＭＳ 明朝",serif', probe:'MS Mincho', group:'日文' },
    { key:'ms-gothic', label:'MS Gothic / ＭＳ ゴシック', family:'"MS Gothic","ＭＳ ゴシック",monospace', probe:'MS Gothic', group:'日文' },
    { key:'noto-serif-jp', label:'Noto Serif CJK JP', family:'"Noto Serif CJK JP","Noto Serif JP",serif', probe:'Noto Serif CJK JP', group:'日文' },
    { key:'noto-sans-jp', label:'Noto Sans CJK JP', family:'"Noto Sans CJK JP","Noto Sans JP",sans-serif', probe:'Noto Sans CJK JP', group:'日文' }
  ];

  function getFont(key) {
    return FONT_CATALOG.find(f => f.key === key) || FONT_CATALOG[0];
  }

  function defaultAppearance(language) {
    if (language === 'ja') return { bodyFontKey:'yu-mincho', phoneticFontKey:'yu-gothic', bodyFontSizePt:14, rubyScale:0.65 };
    if (language === 'zh-Mandarin' || language === 'yue') return { bodyFontKey:'simsun', phoneticFontKey:'times-new-roman', bodyFontSizePt:14, rubyScale:0.65 };
    return { bodyFontKey:'system-serif', phoneticFontKey:'system-sans', bodyFontSizePt:14, rubyScale:0.65 };
  }

  function normalizeAppearance(value, language) {
    const base = defaultAppearance(language);
    const out = { ...base, ...(value || {}) };
    if (!FONT_CATALOG.some(f => f.key === out.bodyFontKey)) out.bodyFontKey = base.bodyFontKey;
    if (!FONT_CATALOG.some(f => f.key === out.phoneticFontKey)) out.phoneticFontKey = base.phoneticFontKey;
    const size = Number(out.bodyFontSizePt); out.bodyFontSizePt = Number.isFinite(size) ? Math.min(72, Math.max(8, size)) : base.bodyFontSizePt;
    const scale = Number(out.rubyScale); out.rubyScale = Number.isFinite(scale) ? Math.min(.8, Math.max(.32, scale)) : base.rubyScale;
    return out;
  }

  function detectInstalledFont(fontName, doc) {
    if (!fontName || !doc) return true;
    try {
      const canvas = doc.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const sample = 'mmmmmmmmmmlli漢字かなカナAaBb123';
      const size = '72px';
      const widths = {};
      for (const base of ['monospace','serif','sans-serif']) {
        ctx.font = `${size} ${base}`; widths[base] = ctx.measureText(sample).width;
      }
      return ['monospace','serif','sans-serif'].some(base => {
        ctx.font = `${size} "${fontName.replace(/"/g,'')}" , ${base}`;
        return Math.abs(ctx.measureText(sample).width - widths[base]) > 0.1;
      });
    } catch { return null; }
  }

  return { FONT_CATALOG, getFont, defaultAppearance, normalizeAppearance, detectInstalledFont };
});
