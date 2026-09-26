(() => {
  'use strict';

  const APP_VERSION = '0.9.7';
  const DOC_FORMAT = 'shengjian-phonodoc-experimental';
  const DOC_SCHEMA = '0.9.0';
  const READABLE_DOC_SCHEMAS = new Set(['0.7.0','0.8.0','0.8.1','0.8.2','0.9.0']);
  const DB_FORMAT = 'shengjian-phonodb-experimental';
  const DB_SCHEMA = '0.9.0';
  const READABLE_DB_SCHEMAS = new Set(['0.7.0','0.8.0','0.9.0']);
  const SETTINGS_KEY = 'shengjian.desktop.settings.v07';
  const RECENT_KEY = 'shengjian.desktop.recent.v07';
  const DOC_IDENTITY_REGISTRY_KEY = 'shengjian.desktop.documentIdentity.v0810';

  const Archive = globalThis.PhonoLayerArchive;
  const Confirmation = globalThis.PhonoLayerConfirmationCore;
  const Identity = globalThis.PhonoLayerIdentityCore;
  const I18n = globalThis.PhonoLayerI18n;
  const Phonetics = globalThis.PhonoLayerPhonetics;
  const Fonts = globalThis.PhonoLayerFonts;
  const LearningCore = globalThis.PhonoLayerLearningCore;
  const LearningDB = globalThis.PhonoLayerLearningDB;
  const Retrieval = globalThis.PhonoLayerRetrievalCore;
  const Memory = globalThis.PhonoLayerMemoryCore;
  const JapanesePitch = globalThis.PhonoLayerJapanesePitch;
  const Desktop = globalThis.desktopAPI;
  if (!Archive || !Confirmation || !Identity || !I18n || !Phonetics || !JapanesePitch || !Fonts || !LearningCore || !LearningDB || !Retrieval || !Memory || !Desktop) throw new Error('PhonoLayer 桌面模块未完整加载');

  const LANGUAGE = {
    ja: { label: '日语', bcp47: 'ja' },
    'zh-Mandarin': { label: '汉语普通话', bcp47: 'zh-CN' },
    yue: { label: '粤语', bcp47: 'yue-Hant-HK' }
  };

  const $ = id => document.getElementById(id);
  const editor = $('editor');
  const tabsHost = $('documentTabs');
  const annotationDialog = $('annotationDialog');
  const newDocDialog = $('newDocDialog');
  const closeTabDialog = $('closeTabDialog');
  const databaseDialog = $('databaseDialog');
  const retrievalDialog = $('retrievalDialog');
  const pdfExportDialog = $('pdfExportDialog');

  let appInfo = null;
  let docs = [];
  let activeDocId = null;
  let savedRange = null;
  let annotationMode = 'segment';
  let editingRuby = null;
  let selectedRuby = null;
  let contextRange = null;
  let contextKind = 'none';
  let contextModePreference = 'segment';
  let interactionMode = 'quick';
  let uiLanguagePreference = 'system';
  let resolvedUiLocale = 'zh-CN';
  let dbReady = false;
  let dbRows = [];
  let memorySelectedKey = '';
  let memoryTargetRange = null;
  let memoryTargetBase = '';
  let memoryTargetLanguage = '';
  let memoryReuseCandidate = null;
  let zoom = 1;
  let recentFiles = [];
  let documentIdentityRegistry = {};
  let lastFocusedEditor = false;
  let lastEditorRange = null;
  let showLineBreaks = true;
  let showMarginMarks = true;
  let editingGuideFrame = 0;
  const savingDocIds = new Set();
  const annotationStateByDoc = new Map();
  let exitAttemptInProgress = false;
  let compositionActive = false;
  let compositionBeforeSnapshot = null;
  let pendingBeforeInputSnapshot = null;
  let historySuppressed = 0;
  let historyRestoring = false;
  const historyByDoc = new Map();
  const recoveryTimers = new Map();
  const HISTORY_LIMIT = 120;
  const HISTORY_MERGE_MS = 900;
  const RECOVERY_DEBOUNCE_MS = 1400;
  let retrievalSession = null;
  let retrievalItemShownAt = 0;
  let retrievalRevealMode = 'none';
  let retrievalRevealedAt = 0;
  let retrievalReadingRating = '';
  let retrievalPitchRating = 'unrated';
  let selectedImage = null;
  let imageResizeState = null;
  let imageSelectionFrame = 0;
  let inlineReadingEdit = null;
  let recentTextColors = [];
  let recentHighlightColors = [];


  function randomId(prefix = 'id') {
    return globalThis.crypto?.randomUUID
      ? `${prefix}-${crypto.randomUUID()}`
      : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  function pathBasename(p) { return String(p || '').split(/[\\/]/).pop() || ''; }
  function samePath(a, b) { return String(a || '').toLocaleLowerCase() === String(b || '').toLocaleLowerCase(); }
  function sanitizeFilename(name) { return (name || 'PhonoLayer文档').replace(/[\\/:*?"<>|]/g, '_').trim() || 'PhonoLayer文档'; }
  function activeDoc() { return docs.find(d => d.id === activeDocId) || null; }
  function nowIso() { return new Date().toISOString(); }

  function defaultTypography(language) {
    const a = Fonts.defaultAppearance(language);
    return {
      bodyFontKey: a.bodyFontKey,
      phoneticFontKey: a.phoneticFontKey,
      bodyFontSizePt: a.bodyFontSizePt,
      rubyScale: a.rubyScale,
      lineHeight: 2
    };
  }

  function makeNewDoc(title = '新学习文档', language = 'ja') {
    const t = Date.now();
    return {
      id: randomId('doc'),
      title: title.trim() || '新学习文档',
      language: LANGUAGE[language] ? language : 'ja',
      revision: 1,
      createdAt: t,
      updatedAt: t,
      filePath: '',
      fileName: '',
      dirty: true,
      lineage: {},
      usagePolicy: {},
      extensions: {},
      typography: defaultTypography(language),
      layout: { paperSize: 'A4', marginPreset: 'normal' },
      pdfExport: { preset: 'current', paperSize: 'A4', orientation: 'portrait', marginPreset: 'document', phonetics: 'current', includeHighlights: true, headerMode: 'none', headerText: '', footerMode: 'none' },
      view: { phoneticMode: 'text', studyMode: 'study', masteryThreshold: 3 },
      html: `<h1>${escapeHtml(title.trim() || '新学习文档')}</h1><p><br></p>`
    };
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }


  const SAFE_EDITOR_TAGS = new Set(['P','DIV','SPAN','H1','H2','H3','UL','OL','LI','BR','HR','STRONG','B','EM','I','U','S','MARK','BLOCKQUOTE','RUBY','RT','IMG','FIGURE']);
  const SAFE_EDITOR_CLASSES = new Set(['phono','gloss','rb','doc-figure','doc-image','align-center']);
  const SAFE_STYLE_PROPS = new Set(['font-family','font-size','font-weight','font-style','text-decoration','text-decoration-line','color','background-color','text-align','line-height','margin','margin-top','margin-right','margin-bottom','margin-left','padding-left','text-indent','letter-spacing']);
  const SAFE_PHONO_DATA = new Set(['data-annotation-id','data-reading','data-profile','data-mastery','data-note','data-pitch','data-source','data-confirmed-base','data-stale','data-pitch-system','data-ja-pitch-model','data-ja-pitch-dialect','data-ja-pitch-representation','data-ja-morae','data-ja-accent-nucleus','data-ja-manual-hl','data-ja-pitch-source','data-pitch-stale']);

  function sanitizeStyleValue(value) {
    const v = String(value || '').trim();
    if (!v || /url\s*\(|expression\s*\(|javascript\s*:|@import/i.test(v)) return '';
    return v;
  }

  function sanitizeEditorHtml(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = String(html || '');
    const dangerous = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','LINK','META','BASE','FORM','INPUT','BUTTON','TEXTAREA','SELECT','OPTION','SVG','MATH']);
    for (const el of [...tpl.content.querySelectorAll('*')]) {
      if (dangerous.has(el.tagName)) { el.remove(); continue; }
      if (!SAFE_EDITOR_TAGS.has(el.tagName)) { el.replaceWith(...el.childNodes); continue; }

      const oldClass = [...el.classList].filter(c => SAFE_EDITOR_CLASSES.has(c));
      const oldStyle = el.getAttribute('style') || '';
      const oldSrc = el.getAttribute('src') || '';
      const oldAlt = el.getAttribute('alt') || '';
      const oldWidth = el.getAttribute('width') || '';
      const oldHeight = el.getAttribute('height') || '';
      const data = {};
      for (const attr of [...el.attributes]) if (SAFE_PHONO_DATA.has(attr.name)) data[attr.name] = attr.value;
      const gloss = el.getAttribute('data-gloss') || '';
      for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
      if (oldClass.length) el.className = oldClass.join(' ');

      if (oldStyle) {
        const probe = document.createElement('span'); probe.setAttribute('style', oldStyle);
        const safe = [];
        for (const prop of SAFE_STYLE_PROPS) {
          const value = sanitizeStyleValue(probe.style.getPropertyValue(prop));
          if (value) safe.push(`${prop}:${value}`);
        }
        if (safe.length) el.setAttribute('style', safe.join(';'));
      }

      if (el.tagName === 'IMG') {
        if (!/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(oldSrc)) { el.remove(); continue; }
        el.setAttribute('src', oldSrc.replace(/\s+/g, ''));
        if (oldAlt) el.setAttribute('alt', oldAlt.slice(0, 500));
        if (/^\d{1,5}$/.test(oldWidth)) el.setAttribute('width', oldWidth);
        if (/^\d{1,5}$/.test(oldHeight)) el.setAttribute('height', oldHeight);
      }

      if (el.tagName === 'RUBY' && el.classList.contains('phono')) {
        for (const [name, value] of Object.entries(data)) el.setAttribute(name, value);
        el.setAttribute('contenteditable', 'false');
        const rb = el.querySelector(':scope > .rb');
        let rt = el.querySelector(':scope > rt');
        if (!rb) { const span = document.createElement('span'); span.className = 'rb'; span.textContent = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(''); el.prepend(span); }
        if (!rt) { rt = document.createElement('rt'); el.appendChild(rt); }
        rt.replaceChildren();
      } else if (el.tagName === 'RUBY' && el.classList.contains('gloss')) {
        if (gloss) el.setAttribute('data-gloss', gloss.slice(0, 500));
        el.setAttribute('contenteditable', 'false');
      }
    }
    return tpl.innerHTML;
  }

  function serializeEditorHtml() {
    const clone = editor.cloneNode(true);
    clone.querySelectorAll('.annotation-selected,.reveal').forEach(el => el.classList.remove('annotation-selected', 'reveal'));
    clone.querySelectorAll('ruby.phono').forEach(ruby => {
      ruby.contentEditable = 'false';
      let rt = ruby.querySelector('rt');
      if (!rt) { rt = document.createElement('rt'); ruby.appendChild(rt); }
      rt.replaceChildren();
    });
    return sanitizeEditorHtml(clone.innerHTML);
  }

  function selectionIntersectsAnnotation(range) {
    if (!range) return false;
    const endpointRuby = node => {
      const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      return el?.closest?.('ruby.phono') || null;
    };
    if (endpointRuby(range.startContainer) || endpointRuby(range.endContainer)) return true;
    // cloneContents() gives true structural overlap but, unlike intersectsNode(),
    // does not treat a range merely touching the boundary of a ruby as overlap.
    // This matters for creating an annotation directly before/after an existing one.
    try {
      const frag = range.cloneContents();
      if (frag.querySelector?.('ruby.phono')) return true;
    } catch {}
    return false;
  }

  function selectionBlockElement(node) {
    const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return el?.closest?.('p,div,h1,h2,h3,li,blockquote') || null;
  }

  function validateAnnotationSelection(range) {
    if (!range || range.collapsed || !editor.contains(range.commonAncestorContainer)) return { valid: false, reason: 'empty' };
    if (!range.toString().trim()) return { valid: false, reason: 'empty' };
    if (selectionIntersectsAnnotation(range)) return { valid: false, reason: 'annotation' };
    const startBlock = selectionBlockElement(range.startContainer);
    const endBlock = selectionBlockElement(range.endContainer);
    if (!startBlock || !endBlock || startBlock !== endBlock) return { valid: false, reason: 'cross-block' };
    const frag = range.cloneContents();
    if (frag.querySelector?.('img,figure,hr,br,ruby.gloss')) return { valid: false, reason: 'structure' };
    return { valid: true };
  }

  function applyRubyInteractivity(ruby) {
    if (!ruby) return;
    // The base text remains part of the normal editable document in both modes.
    // Only the upper phonetic layer is non-editable and acts as the direct edit handle.
    ruby.removeAttribute('contenteditable');
    const rb = ruby.querySelector('.rb'); if (rb) rb.removeAttribute('contenteditable');
    const rt = ruby.querySelector('rt'); if (rt) rt.contentEditable = 'false';
  }

  function syncRubyIntegrity(ruby) {
    if (!ruby) return;
    const base = ruby.querySelector('.rb')?.textContent || '';
    if (!ruby.dataset.confirmedBase) ruby.dataset.confirmedBase = base;
    const stale = base !== ruby.dataset.confirmedBase;
    const pitchStale = ruby.dataset.pitchStale === 'true';
    ruby.dataset.stale = stale ? 'true' : 'false';
    ruby.classList.toggle('annotation-stale', stale);
    ruby.classList.toggle('pitch-stale', pitchStale);
    ruby.title = stale
      ? '正文已修改；当前读音与音高需要重新确认。'
      : (pitchStale ? '读音已更新；原音高数据需要重新确认。双击音高层进入详细编辑。' : '');
  }

  function setInteractionMode(mode, { persist = true } = {}) {
    if (inlineReadingEdit) finishInlineReadingEdit(true);
    interactionMode = mode === 'object' ? 'object' : 'quick';
    document.body.dataset.interactionMode = interactionMode;
    $('interactionQuickBtn')?.classList.toggle('active', interactionMode === 'quick');
    $('interactionObjectBtn')?.classList.toggle('active', interactionMode === 'object');
    if (interactionMode === 'quick') { selectRuby(null); if (contextKind === 'ruby') clearQuickContext(); }
    editor.querySelectorAll('ruby.phono').forEach(r => { applyRubyInteractivity(r); syncRubyIntegrity(r); });
    if (persist) saveSettings();
  }

  async function init() {
    appInfo = await Desktop.appInfo().catch(() => null);
    if ($('buildVersion')) $('buildVersion').textContent = `Desktop v${appInfo?.version || APP_VERSION} · Dependency & Supply-Chain Hardening`;
    initFontSelects();
    restoreSettings();
    resolvedUiLocale = I18n.apply(uiLanguagePreference, appInfo?.locale || navigator.language);
    if ($('uiLanguageSelect')) $('uiLanguageSelect').value = uiLanguagePreference;
    await Desktop.setUiLocale?.(resolvedUiLocale).catch?.(() => {});
    loadRecentFiles(); loadDocumentIdentityRegistry();
    bindEvents();
    await initDatabase();
    const restored = await restoreRecoveryDrafts();
    if (!restored) docs.push(makeNewDoc());
    activeDocId = docs[0].id;
    renderTabs();
    loadActiveDoc();
    refreshBackstage();
  }

  function bindEvents() {
    $('saveBtn').addEventListener('click', () => saveActive(false).catch(showError));
    $('undoBtn').addEventListener('click', () => undoEditorHistory().catch(showError));
    $('redoBtn').addEventListener('click', () => redoEditorHistory().catch(showError));
    $('uiLanguageQuickBtn')?.addEventListener('click', () => {
      setBackstage(false);
      switchRibbon('view');
      requestAnimationFrame(() => {
        const select = $('uiLanguageSelect');
        if (!select) return;
        select.focus();
        select.classList.remove('language-focus-pulse');
        void select.offsetWidth;
        select.classList.add('language-focus-pulse');
      });
    });
    $('newTabBtn').addEventListener('click', openNewDocDialog);
    $('fileTabBtn').addEventListener('click', () => setBackstage(true));
    $('backstageBackBtn').addEventListener('click', () => setBackstage(false));
    document.querySelectorAll('[data-public-sample]').forEach(btn => btn.addEventListener('click', () => openBundledPublicSample(btn.dataset.publicSample).catch(showError)));
    document.querySelectorAll('.ribbon-tab').forEach(btn => btn.addEventListener('click', () => switchRibbon(btn.dataset.ribbon)));
    document.querySelectorAll('[data-file-action]').forEach(btn => btn.addEventListener('click', () => handleFileAction(btn.dataset.fileAction).catch(showError)));
    $('interactionQuickBtn').addEventListener('click', () => setInteractionMode('quick'));
    $('interactionObjectBtn').addEventListener('click', () => setInteractionMode('object'));
    $('uiLanguageSelect').addEventListener('change', async e => {
      uiLanguagePreference = e.target.value;
      resolvedUiLocale = I18n.apply(uiLanguagePreference, appInfo?.locale || navigator.language);
      saveSettings();
      await Desktop.setUiLocale?.(resolvedUiLocale).catch?.(() => {});
      updateStatusBar(); refreshBackstage(); refreshDbSummary().catch(() => {});
    });

    document.querySelector('.ribbon-panels')?.addEventListener('mousedown', () => rememberEditorSelection(), true);
    document.querySelectorAll('[data-cmd]').forEach(btn => btn.addEventListener('click', () => execRichCommand(btn.dataset.cmd)));
    $('selectAllBtn').addEventListener('click', () => { editor.focus(); document.execCommand('selectAll'); rememberEditorSelection(); });
    $('textColor').addEventListener('input', e => applyRibbonColor('text', e.target.value, { remember: true }));
    $('highlightColor').addEventListener('input', e => applyRibbonColor('highlight', e.target.value, { remember: true }));
    $('textColorMenuBtn').addEventListener('click', e => { e.stopPropagation(); toggleColorPalette('text'); });
    $('highlightColorMenuBtn').addEventListener('click', e => { e.stopPropagation(); toggleColorPalette('highlight'); });
    $('textColorPalette').addEventListener('click', e => handleColorPaletteClick(e, 'text'));
    $('highlightColorPalette').addEventListener('click', e => handleColorPaletteClick(e, 'highlight'));
    document.addEventListener('click', e => { if (!e.target.closest?.('.color-control')) closeColorPalettes(); });
    initColorPalettes();
    $('fontGrowBtn').addEventListener('click', () => changeFontSize(1));
    $('fontShrinkBtn').addEventListener('click', () => changeFontSize(-1));
    $('bodyFontSelect').addEventListener('change', applyBodyFontChoice);
    $('bodyFontSize').addEventListener('change', applyBodySizeChoice);
    $('lineHeightSelect').addEventListener('change', e => applyLineHeight(Number(e.target.value)));
    $('firstLineIndentSelect').addEventListener('change', e => applyFirstLineIndentChoice(e.target.value));
    $('normalStyleBtn').addEventListener('click', () => execRichCommand('formatBlock', 'p'));
    $('heading1Btn').addEventListener('click', () => execRichCommand('formatBlock', 'h1'));
    $('heading2Btn').addEventListener('click', () => execRichCommand('formatBlock', 'h2'));

    $('annotateBtn').addEventListener('click', () => activateQuickAnnotation('segment'));
    $('groupAnnotateBtn').addEventListener('click', () => activateQuickAnnotation('group'));
    $('editAnnotationBtn').addEventListener('click', () => activateQuickAnnotation(selectedRuby ? 'edit' : 'segment'));
    $('clearAnnotationBtn').addEventListener('click', () => clearSelectedAnnotation().catch(showError));
    $('revealAllBtn').addEventListener('click', revealAllTemporarily);
    $('startRetrievalBtn').addEventListener('click', () => startRetrievalSession().catch(showError));
    $('retrievalRecallRevealBtn').addEventListener('click', () => revealRetrievalAnswer('after-recall'));
    $('retrievalDirectRevealBtn').addEventListener('click', () => revealRetrievalAnswer('direct'));
    $('retrievalSkipBtn').addEventListener('click', () => skipRetrievalItem().catch(showError));
    $('retrievalNextBtn').addEventListener('click', () => commitRetrievalItem().catch(showError));
    $('retrievalEndBtn').addEventListener('click', () => finishRetrievalSession(true).catch(showError));
    $('retrievalSummaryCloseBtn').addEventListener('click', () => retrievalDialog.close());
    document.querySelectorAll('[data-retrieval-reading-rating]').forEach(btn => btn.addEventListener('click', () => setRetrievalRating('reading', btn.dataset.retrievalReadingRating)));
    document.querySelectorAll('[data-retrieval-pitch-rating]').forEach(btn => btn.addEventListener('click', () => setRetrievalRating('pitch', btn.dataset.retrievalPitchRating)));
    retrievalDialog.addEventListener('cancel', e => {
      if (!retrievalSession || retrievalSession.finished) return;
      e.preventDefault();
      finishRetrievalSession(true).catch(showError);
    });
    $('confirmAnnotationBtn').addEventListener('click', e => { e.preventDefault(); applyAnnotation().catch(showError); });
    $('pitchSystemSelect').addEventListener('change', e => setPitchSystemUI(e.target.value));
    $('jaPitchRepresentation').addEventListener('change', () => { setPitchSystemUI('ja-tokyo'); refreshJapanesePitchPreview(); });
    for (const id of ['jaMoraInput','jaAccentNucleusInput','jaManualHLInput']) $(id).addEventListener('input', refreshJapanesePitchPreview);
    $('jaParticlePreviewCheck').addEventListener('change', refreshJapanesePitchPreview);
    $('deleteAnnotationBtn').addEventListener('click', () => deleteEditingRuby().catch(showError));
    $('applyQuickAnnotationBtn').addEventListener('click', () => applyQuickAnnotation().catch(showError));
    $('openDetailedAnnotationBtn').addEventListener('click', () => openDetailedFromContext());
    $('removeQuickAnnotationBtn').addEventListener('click', () => clearSelectedAnnotation().catch(showError));
    $('quickAnnotationMode').addEventListener('change', e => { contextModePreference = e.target.value; validateQuickContext(false); });
    for (const id of ['quickBaseInput','quickReadingInput','quickPitchInput','quickNoteInput','quickMasterySelect']) {
      $(id).addEventListener('input', () => validateQuickContext(false));
      $(id).addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); applyQuickAnnotation().catch(showError); }
        if (e.key === 'Escape') { e.preventDefault(); editor.focus(); }
      });
    }

    $('phoneticFontSelect').addEventListener('change', updateTypographyFromRibbon);
    $('rubyScale').addEventListener('change', updateTypographyFromRibbon);
    $('studyPresetSelect').addEventListener('change', applyStudyPresetFromRibbon);
    $('phoneticModeSelect').addEventListener('change', updateViewFromRibbon);
    $('studyModeSelect').addEventListener('change', updateViewFromRibbon);
    $('masteryThresholdSelect').addEventListener('change', updateViewFromRibbon);
    $('docLanguage').addEventListener('change', updateLayoutFromRibbon);
    $('defaultLineHeight').addEventListener('change', updateLayoutFromRibbon);
    $('paperSizeSelect').addEventListener('change', updateLayoutFromRibbon);
    $('marginPresetSelect').addEventListener('change', updateLayoutFromRibbon);
    $('pdfSettingsBtn').addEventListener('click', () => openPdfExportDialog(false));
    $('previewPdfBtn').addEventListener('click', () => openPdfExportDialog('preview'));
    $('exportPdfBtn').addEventListener('click', () => openPdfExportDialog('export'));
    $('backstagePdfSettingsBtn').addEventListener('click', () => { setBackstage(false); openPdfExportDialog(false); });
    $('backstagePreviewPdfBtn').addEventListener('click', () => { setBackstage(false); openPdfExportDialog('preview'); });
    $('backstageExportPdfBtn').addEventListener('click', () => { setBackstage(false); openPdfExportDialog('export'); });
    $('pdfPreset').addEventListener('change', () => applyPdfPresetToDialog($('pdfPreset').value));
    $('pdfHeaderMode').addEventListener('change', updatePdfHeaderTextVisibility);
    $('pdfApplyOnlyBtn').addEventListener('click', () => { savePdfSettingsFromDialog(); pdfExportDialog.close(); });
    $('pdfPreviewNowBtn').addEventListener('click', () => previewPdfFromDialog().catch(showError));
    $('pdfExportNowBtn').addEventListener('click', () => exportPdfFromDialog().catch(showError));

    $('zoomOutBtn').addEventListener('click', () => setZoom(zoom - .1));
    $('zoomInBtn').addEventListener('click', () => setZoom(zoom + .1));
    $('zoomResetBtn').addEventListener('click', () => setZoom(1));
    $('zoomSlider').addEventListener('input', e => setZoom(Number(e.target.value) / 100));
    $('statusZoomOutBtn').addEventListener('click', () => setZoom(zoom - .05));
    $('statusZoomInBtn').addEventListener('click', () => setZoom(zoom + .05));
    $('statusZoomSlider').addEventListener('input', e => setZoom(Number(e.target.value) / 100));
    $('zoomState').addEventListener('click', () => setZoom(1));
    $('toggleLineBreaksBtn').addEventListener('click', () => toggleLineBreakMarks());
    $('toggleMarginMarksBtn').addEventListener('click', () => toggleMarginMarks());

    const workspace = document.querySelector('.desktop-workspace');
    window.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const step = e.shiftKey ? .10 : .05;
      const options = workspace.contains(e.target) ? { anchorEvent: e } : {};
      setZoom(zoom + (e.deltaY < 0 ? step : -step), options);
    }, { passive: false, capture: true });

    $('showFileBtn').addEventListener('click', () => { const d = activeDoc(); if (d?.filePath) Desktop.showItemInFolder(d.filePath); });
    $('repairFileAssocBtn').addEventListener('click', async () => {
      const out = await Desktop.repairFileAssociation();
      const box = $('fileAssocStatus');
      box.textContent = out?.ok ? '已重新注册 .phonodoc 图标与双击打开方式。若资源管理器仍显示旧图标，可稍等片刻或重启资源管理器。' : (out?.message || '当前系统不支持此操作。');
    });
    $('openDbBtn').addEventListener('click', () => openDatabaseDialog().catch(showError));
    $('lookupMemoryBtn').addEventListener('click', () => openMemoryForCurrentText().catch(showError));
    $('exportDbBtn').addEventListener('click', () => exportPhonoDb().catch(showError));
    $('importDbBtn').addEventListener('click', () => importPhonoDb().catch(showError));
    $('dbSearch').addEventListener('input', renderDatabaseRows);
    $('memoryLanguageFilter').addEventListener('change', renderDatabaseRows);

    newDocDialog.addEventListener('close', () => {
      if (newDocDialog.returnValue === 'default') createNewDocument($('newDocTitle').value, $('newDocLanguage').value);
    });

    editor.addEventListener('beforeinput', handleEditorBeforeInput);
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('input', e => {
      scheduleEditingGuides();
      if (compositionActive || e.isComposing || e.inputType === 'insertCompositionText') {
        markDirty();
        return;
      }
      commitNativeInputHistory(e.inputType || 'input');
      handleEditorInput().catch(err => console.warn('annotation reconciliation failed', err));
    });
    editor.addEventListener('copy', e => writeCanonicalSelectionToClipboard(e, false));
    editor.addEventListener('cut', e => writeCanonicalSelectionToClipboard(e, true));
    editor.addEventListener('paste', e => {
      const html = e.clipboardData?.getData('text/html') || '';
      const text = e.clipboardData?.getData('text/plain') || '';
      if (!html && !text) return;
      e.preventDefault();
      const before = captureEditorSnapshot();
      historySuppressed++;
      try {
        editor.focus();
        if (html) {
          const tpl = document.createElement('template');
          tpl.innerHTML = sanitizeEditorHtml(html);
          tpl.content.querySelectorAll('ruby.phono').forEach(r => {
            r.dataset.annotationId = randomId('ann');
            r.dataset.source = 'pasted';
            const base = r.querySelector('.rb')?.textContent || '';
            r.dataset.confirmedBase = base; r.dataset.stale = 'false';
            r.removeAttribute('contenteditable');
            const rt = r.querySelector('rt'); if (rt) { rt.replaceChildren(); rt.removeAttribute('contenteditable'); }
          });
          document.execCommand('insertHTML', false, tpl.innerHTML);
          rerenderAllRubies(); requestAnimationFrame(rerenderAllRubies);
        } else document.execCommand('insertText', false, text);
      } finally { historySuppressed = Math.max(0, historySuppressed - 1); }
      recordHistory(before, captureEditorSnapshot(), 'paste');
      handleEditorInput().catch(err => console.warn('paste reconciliation failed', err));
    });
    // File drops are handled at window level so a .phonodoc can be opened from anywhere in the app.
    editor.addEventListener('drop', e => { if (e.dataTransfer?.files?.length) e.preventDefault(); });
    editor.addEventListener('pointerdown', e => {
      const img = e.target.closest?.('img');
      if (img && editor.contains(img)) e.preventDefault();
    });
    editor.addEventListener('focus', () => { lastFocusedEditor = true; rememberEditorSelection(); });
    editor.addEventListener('blur', () => { lastFocusedEditor = false; });
    editor.addEventListener('keyup', () => { rememberEditorSelection(); refreshPhoneticContextFromEditor(); scheduleEditingGuides(); });
    editor.addEventListener('mouseup', e => {
      const img = e.target.closest?.('img');
      if (img && editor.contains(img)) {
        selectImage(img);
        return;
      }
      clearImageSelection();
      rememberEditorSelection();
      const ruby = e.target.closest?.('ruby.phono');
      if (interactionMode === 'object' && ruby) { selectRuby(ruby); loadQuickContextFromRuby(ruby); switchRibbon('phoneticContext'); }
      else { if (interactionMode === 'quick') selectRuby(null); refreshPhoneticContextFromEditor(); }
    });
    editor.addEventListener('click', e => {
      const image = e.target.closest?.('img');
      if (image && editor.contains(image)) {
        e.preventDefault(); e.stopPropagation();
        selectImage(image);
        return;
      }
      const link = e.target.closest?.('a');
      if (link) { e.preventDefault(); e.stopPropagation(); link.replaceWith(...link.childNodes); markDirty(); return; }
      const ruby = e.target.closest?.('ruby.phono');
      if (ruby && activeDoc()?.view?.studyMode === 'reading') {
        const already = ruby.classList.contains('reveal');
        editor.querySelectorAll('ruby.phono.reveal').forEach(r => r.classList.remove('reveal'));
        if (!already) ruby.classList.add('reveal');
      }
      if (interactionMode === 'object') {
        selectRuby(ruby || null);
        if (ruby) { loadQuickContextFromRuby(ruby); switchRibbon('phoneticContext'); } else refreshPhoneticContextFromEditor();
      } else {
        selectRuby(null);
        refreshPhoneticContextFromEditor();
      }
    });
    editor.addEventListener('dblclick', e => {
      const ruby = e.target.closest?.('ruby.phono');
      const readingLayer = e.target.closest?.('.reading-text');
      const pitchLayer = e.target.closest?.('.pitch-plot, .pitch-unavailable');
      const phoneticLayer = e.target.closest?.('rt, .ruby-rt-box, .reading-text, .pitch-plot, .pitch-unavailable');
      if (ruby && phoneticLayer) {
        e.preventDefault(); e.stopPropagation();
        if (interactionMode === 'quick' && !pitchLayer) beginInlineReadingEdit(ruby, e);
        else openRubyEditor(ruby);
      }
      // Double-clicking .rb is intentionally left to Chromium's normal text
      // selection/editing behavior. The annotation entity still exists around it.
    });
    document.addEventListener('selectionchange', () => { if (compositionActive || historyRestoring) return; const inEditor = rememberEditorSelection(); if (inEditor && (document.activeElement === editor || editor.contains(document.activeElement))) refreshPhoneticContextFromEditor(); updateCommandState(); });
    window.addEventListener('resize', () => { schedulePitchLayout(); scheduleEditingGuides(); scheduleImageSelectionOverlay(); positionInlineReadingEditor(); });
    document.querySelector('.desktop-workspace')?.addEventListener('scroll', () => { scheduleImageSelectionOverlay(); positionInlineReadingEditor(); }, { passive: true });

    let fileDragDepth = 0;
    const setFileDropOverlay = visible => {
      const overlay = $('fileDropOverlay'); if (!overlay) return;
      overlay.classList.toggle('hidden', !visible); overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
    };
    window.addEventListener('dragenter', e => {
      if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
      e.preventDefault(); fileDragDepth++; setFileDropOverlay(true);
    }, true);
    window.addEventListener('dragover', e => {
      if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
      e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; setFileDropOverlay(true);
    }, true);
    window.addEventListener('dragleave', e => {
      if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
      fileDragDepth = Math.max(0, fileDragDepth - 1); if (!fileDragDepth) setFileDropOverlay(false);
    }, true);
    window.addEventListener('drop', e => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault(); e.stopPropagation(); fileDragDepth = 0; setFileDropOverlay(false);
      openDroppedPhonoDocs([...e.dataTransfer.files]).catch(showError);
    }, true);

    Desktop.onCommand(command => handleDesktopCommand(command).catch(showError));
    Desktop.onOpenPath(filePath => openDocumentPath(filePath).catch(showError));

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && $('fileBackstage').classList.contains('open')) setBackstage(false);
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(1); }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(zoom + .1); }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom(zoom - .1); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '8' || e.key === '*')) { e.preventDefault(); toggleLineBreakMarks(); }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z' && (document.activeElement === editor || editor.contains(document.activeElement))) { e.preventDefault(); (e.shiftKey ? redoEditorHistory() : undoEditorHistory()).catch(showError); return; }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'y' && (document.activeElement === editor || editor.contains(document.activeElement))) { e.preventDefault(); redoEditorHistory().catch(showError); return; }
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'r') { e.preventDefault(); activateQuickAnnotation(selectedRuby ? 'edit' : contextModePreference); }
      if (e.ctrlKey && e.altKey && e.key === 'Enter') { e.preventDefault(); applyQuickAnnotation().catch(showError); }
    });
  }

  async function handleDesktopCommand(command) {
    if (command === 'new') openNewDocDialog();
    else if (command === 'open') await openDocumentsFromDialog();
    else if (command === 'save') await saveActive(false);
    else if (command === 'saveAs') await saveActive(true);
    else if (command === 'previewPdf') openPdfExportDialog('preview');
    else if (command === 'exportPdf') openPdfExportDialog('export');
    else if (command === 'closeTab') await closeDocument(activeDocId);
    else if (command === 'undo') await undoEditorHistory();
    else if (command === 'redo') await redoEditorHistory();
    else if (command === 'annotate') openAnnotationDialog('segment');
    else if (command === 'groupAnnotate') openAnnotationDialog('group');
    else if (command === 'database') await openDatabaseDialog();
    else if (command === 'retrieval') await startRetrievalSession();
    else if (command === 'docZoomIn') setZoom(zoom + .1);
    else if (command === 'docZoomOut') setZoom(zoom - .1);
    else if (command === 'docZoomReset') setZoom(1);
    else if (command === 'repairFileAssociation') {
      const out = await Desktop.repairFileAssociation();
      if (!out?.ok) throw new Error(out?.message || '文件关联注册失败');
    }
    else if (command === 'exit') await attemptExit();
  }

  async function handleFileAction(action) {
    if (action === 'new') { setBackstage(false); openNewDocDialog(); }
    else if (action === 'open') { setBackstage(false); await openDocumentsFromDialog(); }
    else if (action === 'save') { await saveActive(false); refreshBackstage(); }
    else if (action === 'saveAs') { await saveActive(true); refreshBackstage(); }
    else if (action === 'exportPdf') { setBackstage(false); openPdfExportDialog(true); }
    else if (action === 'pdfSettings') { setBackstage(false); openPdfExportDialog(false); }
    else if (action === 'print') { setBackstage(false); await Desktop.print(); }
    else if (action === 'close') { setBackstage(false); await closeDocument(activeDocId); }
    else if (action === 'exit') await attemptExit();
  }


  function marginPresetToInches(preset) {
    const key = preset === 'document' ? (activeDoc()?.layout?.marginPreset || 'normal') : preset;
    if (key === 'narrow') return { top: .50, bottom: .50, left: .48, right: .48 };
    if (key === 'wide') return { top: .90, bottom: .90, left: 1.09, right: 1.09 };
    return { top: .75, bottom: .75, left: .79, right: .79 };
  }

  const PDF_PRESETS = {
    current: { phonetics: 'current', includeHighlights: true, headerMode: 'none', footerMode: 'none' },
    study: { phonetics: 'both', includeHighlights: true, headerMode: 'title', footerMode: 'page-total' },
    review: { phonetics: 'none', includeHighlights: false, headerMode: 'title', footerMode: 'page-total' },
    text: { phonetics: 'text', includeHighlights: true, headerMode: 'title', footerMode: 'page-total' },
    pitch: { phonetics: 'pitch', includeHighlights: false, headerMode: 'title', footerMode: 'page-total' }
  };

  function normalizePdfExport(v, docLayout = {}) {
    const out = v || {};
    return {
      preset: ['custom', 'current', 'study', 'review', 'text', 'pitch'].includes(out.preset) ? out.preset : 'current',
      paperSize: out.paperSize === 'Letter' ? 'Letter' : (docLayout.paperSize === 'Letter' ? 'Letter' : 'A4'),
      orientation: out.orientation === 'landscape' ? 'landscape' : 'portrait',
      marginPreset: ['document', 'normal', 'narrow', 'wide'].includes(out.marginPreset) ? out.marginPreset : 'document',
      phonetics: ['current', 'both', 'text', 'pitch', 'none'].includes(out.phonetics) ? out.phonetics : 'current',
      includeHighlights: out.includeHighlights !== false,
      headerMode: ['none', 'title', 'custom'].includes(out.headerMode) ? out.headerMode : 'none',
      headerText: String(out.headerText || ''),
      footerMode: ['none', 'page', 'page-total'].includes(out.footerMode) ? out.footerMode : 'none'
    };
  }

  function applyPdfPresetToDialog(name) {
    if (!PDF_PRESETS[name]) return;
    const p = PDF_PRESETS[name];
    $('pdfPhonetics').value = p.phonetics;
    $('pdfIncludeHighlights').checked = p.includeHighlights;
    $('pdfHeaderMode').value = p.headerMode;
    $('pdfFooterMode').value = p.footerMode;
    updatePdfHeaderTextVisibility();
  }

  function updatePdfHeaderTextVisibility() {
    $('pdfHeaderTextField').classList.toggle('hidden', $('pdfHeaderMode').value !== 'custom');
  }

  function openPdfExportDialog(intent = false) {
    const doc = activeDoc(); if (!doc) return;
    doc.pdfExport = normalizePdfExport(doc.pdfExport, doc.layout);
    $('pdfPreset').value = doc.pdfExport.preset;
    $('pdfPaperSize').value = doc.pdfExport.paperSize || doc.layout.paperSize;
    $('pdfOrientation').value = doc.pdfExport.orientation;
    $('pdfMarginPreset').value = doc.pdfExport.marginPreset;
    $('pdfPhonetics').value = doc.pdfExport.phonetics;
    $('pdfIncludeHighlights').checked = !!doc.pdfExport.includeHighlights;
    $('pdfHeaderMode').value = doc.pdfExport.headerMode;
    $('pdfHeaderText').value = doc.pdfExport.headerText;
    $('pdfFooterMode').value = doc.pdfExport.footerMode;
    updatePdfHeaderTextVisibility();
    pdfExportDialog.dataset.exportIntent = intent === 'export' || intent === true ? 'export' : (intent === 'preview' ? 'preview' : 'settings');
    pdfExportDialog.showModal();
  }

  function savePdfSettingsFromDialog() {
    const doc = activeDoc(); if (!doc) return null;
    const next = normalizePdfExport({
      preset: $('pdfPreset').value,
      paperSize: $('pdfPaperSize').value,
      orientation: $('pdfOrientation').value,
      marginPreset: $('pdfMarginPreset').value,
      phonetics: $('pdfPhonetics').value,
      includeHighlights: $('pdfIncludeHighlights').checked,
      headerMode: $('pdfHeaderMode').value,
      headerText: $('pdfHeaderText').value,
      footerMode: $('pdfFooterMode').value
    }, doc.layout);
    if (JSON.stringify(next) !== JSON.stringify(doc.pdfExport)) { doc.pdfExport = next; markDirty(); }
    else doc.pdfExport = next;
    return doc.pdfExport;
  }

  function pdfNativeOptions(cfg, doc) {
    return {
      pageSize: cfg.paperSize,
      orientation: cfg.orientation,
      margins: marginPresetToInches(cfg.marginPreset),
      title: doc.title,
      headerMode: cfg.headerMode,
      headerText: cfg.headerText,
      footerMode: cfg.footerMode
    };
  }

  async function exportPdfFromDialog() {
    const settings = savePdfSettingsFromDialog();
    const doc = activeDoc(); if (!doc || !settings) return;
    pdfExportDialog.close();
    await exportActivePdf(settings);
  }

  async function previewPdfFromDialog() {
    const settings = savePdfSettingsFromDialog();
    const doc = activeDoc(); if (!doc || !settings) return;
    pdfExportDialog.close();
    await previewActivePdf(settings);
  }

  function enterPdfRenderState(cfg, doc) {
    const oldMode = document.body.dataset.phoneticMode;
    const oldStudy = document.body.dataset.studyMode;
    const oldTitle = document.title;
    selectRuby(null);
    document.body.classList.add('pdf-exporting');
    document.body.classList.toggle('pdf-hide-highlights', !cfg.includeHighlights);
    document.body.classList.toggle('pdf-hide-phonetics', cfg.phonetics === 'none');
    document.body.dataset.pdfPhonetics = cfg.phonetics;
    if (['both', 'text', 'pitch'].includes(cfg.phonetics)) {
      document.body.dataset.phoneticMode = cfg.phonetics;
      document.body.dataset.studyMode = 'study';
      rerenderAllRubies();
    }
    document.title = doc.title;
    return () => {
      document.body.classList.remove('pdf-exporting', 'pdf-hide-highlights', 'pdf-hide-phonetics');
      delete document.body.dataset.pdfPhonetics;
      document.body.dataset.phoneticMode = oldMode;
      document.body.dataset.studyMode = oldStudy;
      document.title = oldTitle;
      rerenderAllRubies();
    };
  }

  async function waitForPdfLayout() {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    layoutPitchPlots();
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  async function exportActivePdf(settings = null) {
    syncActiveFromEditor();
    const doc = activeDoc(); if (!doc) return;
    const cfg = normalizePdfExport(settings || doc.pdfExport, doc.layout);
    doc.pdfExport = cfg;
    const filePath = await Desktop.chooseSavePdf(`${sanitizeFilename(doc.title)}.pdf`, doc.filePath || '');
    if (!filePath) return;
    const restore = enterPdfRenderState(cfg, doc);
    try {
      await waitForPdfLayout();
      const result = await Desktop.exportPdf(filePath, pdfNativeOptions(cfg, doc));
      $('pdfLastExport').textContent = `最近导出：${result.path} · ${(result.size / 1024).toFixed(1)} KB`;
      refreshBackstage();
      alert(`PDF 已导出：\n${result.path}`);
    } finally { restore(); }
  }

  async function previewActivePdf(settings = null) {
    syncActiveFromEditor();
    const doc = activeDoc(); if (!doc) return;
    const cfg = normalizePdfExport(settings || doc.pdfExport, doc.layout);
    doc.pdfExport = cfg;
    const restore = enterPdfRenderState(cfg, doc);
    try {
      await waitForPdfLayout();
      const result = await Desktop.previewPdf(pdfNativeOptions(cfg, doc));
      $('pdfLastExport').textContent = result?.path ? `最近预览：${result.path}` : '已打开临时 PDF 预览。';
      refreshBackstage();
    } finally { restore(); }
  }

  function switchRibbon(name) {
    const next = document.querySelector(`.ribbon-panel[data-panel="${name}"]`);
    if (!next || next.classList.contains('active')) return;
    document.querySelectorAll('.ribbon-tab').forEach(b => b.classList.toggle('active', b.dataset.ribbon === name));
    document.querySelectorAll('.ribbon-panel').forEach(p => p.classList.toggle('active', p === next));
  }

  function setBackstage(show) {
    const box = $('fileBackstage');
    box.classList.toggle('open', !!show);
    box.setAttribute('aria-hidden', String(!show));
    $('fileTabBtn')?.classList.toggle('backstage-open', !!show);
    if (show) refreshBackstage();
  }

  function refreshBackstage() {
    const doc = activeDoc();
    $('backstageCurrentDoc').innerHTML = doc
      ? `<strong>${escapeHtml(doc.title)}</strong><br>语言：${escapeHtml(LANGUAGE[doc.language]?.label || doc.language)}<br>状态：${doc.dirty ? '已修改，尚未保存' : '已保存'}<br>路径：${escapeHtml(doc.filePath || '尚未保存到磁盘')}`
      : '当前没有文档。';
    const host = $('recentFiles'); host.innerHTML = '';
    if (!recentFiles.length) { const d = document.createElement('div'); d.className = 'recent-empty'; d.textContent = '还没有最近打开的文档。'; host.appendChild(d); return; }
    recentFiles.forEach(item => {
      const row = document.createElement('div'); row.className = 'recent-item';
      row.innerHTML = `<div><strong></strong><div class="path"></div></div><span>打开</span>`;
      row.querySelector('strong').textContent = item.name || pathBasename(item.path);
      row.querySelector('.path').textContent = item.path;
      row.addEventListener('click', () => openRecentFile(item).catch(showError));
      host.appendChild(row);
    });
  }

  function loadRecentFiles() {
    try { recentFiles = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); if (!Array.isArray(recentFiles)) recentFiles = []; }
    catch { recentFiles = []; }
  }
  function rememberRecent(filePath, title) {
    if (!filePath) return;
    recentFiles = [{ path: filePath, name: title || pathBasename(filePath), at: Date.now() }, ...recentFiles.filter(x => !samePath(x.path, filePath))].slice(0, 10);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentFiles)); } catch {}
  }
  function loadDocumentIdentityRegistry() {
    try { const value=JSON.parse(localStorage.getItem(DOC_IDENTITY_REGISTRY_KEY)||'{}'); documentIdentityRegistry=value&&typeof value==='object'&&!Array.isArray(value)?value:{}; }
    catch { documentIdentityRegistry={}; }
  }
  function registerDocumentPath(doc) {
    if (!doc?.id || !doc?.filePath) return;
    documentIdentityRegistry[doc.id]=doc.filePath;
    try { localStorage.setItem(DOC_IDENTITY_REGISTRY_KEY, JSON.stringify(documentIdentityRegistry)); } catch {}
  }
  async function protectOpenedDocumentIdentity(doc, filePath) {
    if (!doc?.id || !filePath) return doc;
    const prior=documentIdentityRegistry[doc.id]||'';
    let registryPath=prior;
    if (prior && !samePath(prior,filePath)) {
      try { if (!(await Desktop.fileExists(prior))) registryPath=''; } catch {}
    }
    const decision=Identity.pathConflict({documentId:doc.id,filePath,openDocs:docs,registryPath});
    if (decision.conflict) {
      const previousId=doc.id;
      doc.id=randomId('doc');
      doc.lineage=Identity.lineageAfterFork(doc.lineage,previousId,decision.reason,nowIso());
      doc.dirty=true;
      doc.identityForked=true;
    }
    documentIdentityRegistry[doc.id]=filePath;
    try { localStorage.setItem(DOC_IDENTITY_REGISTRY_KEY, JSON.stringify(documentIdentityRegistry)); } catch {}
    return doc;
  }

  async function openRecentFile(item) {
    if (!item?.path) return;
    const exists = await Desktop.fileExists(item.path);
    if (!exists) {
      recentFiles = recentFiles.filter(x => !samePath(x.path, item.path));
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentFiles)); } catch {}
      refreshBackstage();
      throw new Error('这个最近文档已经不存在，已从最近列表移除。');
    }
    setBackstage(false);
    await openDocumentPath(item.path);
  }

  function renderTabs() {
    tabsHost.innerHTML = '';
    docs.forEach(doc => {
      const tab = document.createElement('div');
      tab.className = `doc-tab${doc.id === activeDocId ? ' active' : ''}${doc.dirty ? ' dirty' : ''}`;
      tab.dataset.docId = doc.id;
      tab.innerHTML = `<span class="doc-tab-title"></span><span class="doc-tab-dirty">●</span><button class="doc-tab-close" title="关闭">×</button>`;
      tab.querySelector('.doc-tab-title').textContent = doc.title;
      tab.addEventListener('click', () => switchDocument(doc.id));
      tab.querySelector('.doc-tab-close').addEventListener('click', e => { e.stopPropagation(); closeDocument(doc.id).catch(showError); });
      tabsHost.appendChild(tab);
    });
  }

  function syncActiveFromEditor() {
    const doc = activeDoc();
    if (!doc) return;
    doc.html = serializeEditorHtml();
  }

  function switchDocument(id) {
    if (id === activeDocId) return;
    syncActiveFromEditor();
    activeDocId = id;
    renderTabs();
    loadActiveDoc();
  }

  function loadActiveDoc() {
    finishInlineReadingEdit(false);
    clearImageSelection();
    const doc = activeDoc();
    if (!doc) { editor.innerHTML = ''; updateStatusBar(); return; }
    editor.innerHTML = sanitizeEditorHtml(doc.html || '<p><br></p>');
    lastEditorRange = null;
    selectRuby(null);
    clearQuickContext();
    applyDocPresentation(doc);
    $('docLanguage').value = doc.language;
    $('bodyFontSelect').value = doc.typography.bodyFontKey;
    $('phoneticFontSelect').value = doc.typography.phoneticFontKey;
    $('bodyFontSize').value = doc.typography.bodyFontSizePt;
    $('rubyScale').value = doc.typography.rubyScale;
    $('defaultLineHeight').value = String(doc.typography.lineHeight || 2);
    $('lineHeightSelect').value = String(doc.typography.lineHeight || 2);
    $('paperSizeSelect').value = doc.layout.paperSize;
    $('marginPresetSelect').value = doc.layout.marginPreset;
    $('phoneticModeSelect').value = doc.view.phoneticMode;
    $('studyModeSelect').value = doc.view.studyMode;
    $('masteryThresholdSelect').value = String(doc.view.masteryThreshold || 3);
    syncStudyDisplayControls(doc);
    rerenderAllRubies();
    scheduleEditingGuides();
    captureAnnotationState(doc);
    historyState(doc);
    updateStatusBar();
    refreshBackstage();
  }

  function openNewDocDialog() {
    $('newDocTitle').value = '新学习文档';
    $('newDocLanguage').value = activeDoc()?.language || 'ja';
    newDocDialog.showModal();
    setTimeout(() => $('newDocTitle').select(), 0);
  }

  function createNewDocument(title, language) {
    syncActiveFromEditor();
    const doc = makeNewDoc(title, language);
    docs.push(doc); activeDocId = doc.id;
    renderTabs(); loadActiveDoc();
  }


  async function openBundledPublicSample(key) {
    const file = await Desktop.openPublicSample(key);
    const doc = parsePhonoDocBytes(new Uint8Array(file.bytes), { filePath: '', fileName: file.name });
    doc.id = randomId('doc');
    doc.filePath = '';
    doc.fileName = '';
    doc.dirty = true;
    doc.title = `${file.title || doc.title || 'Official Learning Sample'} · 副本`;
    docs.push(doc); activeDocId = doc.id;
    setBackstage(false); renderTabs(); loadActiveDoc();
  }

  async function openDroppedPhonoDocs(files) {
    const paths = [];
    const rejected = [];
    for (const file of files || []) {
      let p = '';
      try { p = Desktop.pathForDroppedFile?.(file) || file?.path || ''; } catch {}
      if (!p || !/\.phonodoc$/i.test(p)) { rejected.push(file?.name || pathBasename(p) || 'file'); continue; }
      paths.push(p);
    }
    if (rejected.length) alert(I18n.t('drop.onlyPhonodoc'));
    for (const p of paths) await openDocumentPath(p);
  }

  async function openDocumentsFromDialog() {
    const paths = await Desktop.openPhonoDocs();
    for (const p of paths || []) await openDocumentPath(p);
  }

  async function openDocumentPath(filePath) {
    if (!filePath) return;
    const existing = docs.find(d => d.filePath && samePath(d.filePath, filePath));
    if (existing) { switchDocument(existing.id); return; }
    const file = await Desktop.readFile(filePath);
    const doc = parsePhonoDocBytes(new Uint8Array(file.bytes), { filePath: file.path, fileName: file.name });
    await protectOpenedDocumentIdentity(doc, file.path);
    docs.push(doc); activeDocId = doc.id;
    rememberRecent(doc.filePath, doc.title);
    renderTabs(); loadActiveDoc();
  }

  async function saveActive(forceSaveAs) {
    await finishInlineReadingEdit(true);
    syncActiveFromEditor();
    const doc = activeDoc(); if (!doc) return false;
    if (savingDocIds.has(doc.id)) return false;
    let targetPath = forceSaveAs ? '' : doc.filePath;
    if (!targetPath) targetPath = await Desktop.chooseSavePhonoDoc(`${sanitizeFilename(doc.title)}.phonodoc`, doc.filePath || '');
    if (!targetPath) return false;

    const nextRevision = Math.max(1, Number(doc.revision) || 1) + 1;
    const nextUpdatedAt = Date.now();
    const snapshot = { ...doc, revision: nextRevision, updatedAt: nextUpdatedAt };
    const bytes = buildPhonoDocBytes(snapshot);
    savingDocIds.add(doc.id);
    updateStatusBar();
    try {
      const result = await Desktop.writeFile(targetPath, Array.from(bytes));
      doc.revision = nextRevision;
      doc.updatedAt = nextUpdatedAt;
      doc.filePath = result.path; doc.fileName = result.name; doc.dirty = false;
      rememberRecent(doc.filePath, doc.title);
      registerDocumentPath(doc);
      await deleteRecoveryDraftForDoc(doc);
      doc.recoveredFromDraft = false; doc.recoveryId = doc.id;
      renderTabs(); updateStatusBar(); refreshBackstage();
      return true;
    } finally {
      savingDocIds.delete(doc.id);
      updateStatusBar();
    }
  }

  async function closeDocument(id) {
    const doc = docs.find(d => d.id === id); if (!doc) return true;
    const previouslyActiveId = activeDocId;
    const wasActive = id === activeDocId;
    if (wasActive) syncActiveFromEditor();
    if (doc.dirty) {
      const choice = await askCloseChoice(doc);
      if (choice === 'cancel') return false;
      if (choice === 'save') {
        if (!wasActive) { syncActiveFromEditor(); activeDocId = doc.id; loadActiveDoc(); }
        const ok = await saveActive(false);
        if (!ok) {
          if (!wasActive && docs.some(d => d.id === previouslyActiveId)) { activeDocId = previouslyActiveId; loadActiveDoc(); }
          return false;
        }
        if (!wasActive && docs.some(d => d.id === previouslyActiveId)) activeDocId = previouslyActiveId;
      }
    }
    const index = docs.findIndex(d => d.id === id);
    await deleteRecoveryDraftForDoc(doc);
    docs.splice(index, 1);
    annotationStateByDoc.delete(id); historyByDoc.delete(id);
    if (!docs.length) { const fresh = makeNewDoc(); docs.push(fresh); activeDocId = fresh.id; }
    else if (activeDocId === id || !docs.some(d => d.id === activeDocId)) activeDocId = docs[Math.min(index, docs.length - 1)].id;
    renderTabs(); loadActiveDoc();
    return true;
  }

  function askCloseChoice(doc) {
    $('closeTabMessage').textContent = `“${doc.title}” 有尚未保存的更改。`;
    closeTabDialog.returnValue = '';
    closeTabDialog.showModal();
    return new Promise(resolve => {
      const handler = () => { closeTabDialog.removeEventListener('close', handler); resolve(closeTabDialog.returnValue || 'cancel'); };
      closeTabDialog.addEventListener('close', handler);
    });
  }

  async function attemptExit() {
    if (exitAttemptInProgress) return;
    exitAttemptInProgress = true;
    const originalActiveId = activeDocId;
    let quitCommitted = false;
    try {
      syncActiveFromEditor();
      for (const doc of [...docs]) {
        if (!doc.dirty) continue;
        activeDocId = doc.id; renderTabs(); loadActiveDoc();
        const choice = await askCloseChoice(doc);
        if (choice === 'cancel') return;
        if (choice === 'save') { const ok = await saveActive(false); if (!ok) return; }
        else if (choice === 'discard') await deleteRecoveryDraftForDoc(doc);
      }
      await Desktop.quitConfirmed();
      quitCommitted = true;
    } finally {
      if (!quitCommitted && originalActiveId && docs.some(d => d.id === originalActiveId) && activeDocId !== originalActiveId) { activeDocId = originalActiveId; renderTabs(); loadActiveDoc(); }
      exitAttemptInProgress = false;
    }
  }

  function domPathFromEditor(node) {
    const path = [];
    let cur = node;
    while (cur && cur !== editor) {
      const parent = cur.parentNode;
      if (!parent) return null;
      path.unshift(Array.prototype.indexOf.call(parent.childNodes, cur));
      cur = parent;
    }
    return cur === editor ? path : null;
  }

  function nodeFromEditorPath(path) {
    let cur = editor;
    for (const index of path || []) {
      if (!cur?.childNodes || index < 0 || index >= cur.childNodes.length) return null;
      cur = cur.childNodes[index];
    }
    return cur;
  }

  function captureSelectionBookmark() {
    const sel = getSelection();
    if (!sel?.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    const startPath = domPathFromEditor(range.startContainer);
    const endPath = domPathFromEditor(range.endContainer);
    if (!startPath || !endPath) return null;
    return { startPath, startOffset: range.startOffset, endPath, endOffset: range.endOffset, collapsed: range.collapsed };
  }

  function safeNodeOffset(node, offset) {
    const max = node?.nodeType === Node.TEXT_NODE ? node.data.length : (node?.childNodes?.length || 0);
    return Math.max(0, Math.min(max, Number(offset) || 0));
  }

  function restoreSelectionBookmark(bookmark) {
    if (!bookmark) return false;
    const start = nodeFromEditorPath(bookmark.startPath);
    const end = nodeFromEditorPath(bookmark.endPath);
    if (!start || !end) return false;
    try {
      const range = document.createRange();
      range.setStart(start, safeNodeOffset(start, bookmark.startOffset));
      range.setEnd(end, safeNodeOffset(end, bookmark.endOffset));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      lastEditorRange = range.cloneRange();
      return true;
    } catch { return false; }
  }

  function captureEditorSnapshot() {
    return { html: serializeEditorHtml(), selection: captureSelectionBookmark(), at: Date.now() };
  }

  function historyState(doc = activeDoc()) {
    if (!doc) return null;
    if (!historyByDoc.has(doc.id)) historyByDoc.set(doc.id, { undo: [], redo: [] });
    return historyByDoc.get(doc.id);
  }

  function recordHistory(before, after, label = 'Edit', mergeKey = '') {
    const doc = activeDoc();
    if (!doc || historyRestoring || historySuppressed || !before || !after || before.html === after.html) return false;
    const state = historyState(doc); const now = Date.now();
    const last = state.undo[state.undo.length - 1];
    if (mergeKey && last && last.mergeKey === mergeKey && now - last.at <= HISTORY_MERGE_MS && last.after.html === before.html) {
      last.after = after; last.at = now; last.label = label;
    } else {
      state.undo.push({ before, after, label, mergeKey, at: now });
      if (state.undo.length > HISTORY_LIMIT) state.undo.splice(0, state.undo.length - HISTORY_LIMIT);
    }
    state.redo.length = 0;
    doc.html = after.html;
    return true;
  }

  async function runSemanticEdit(label, fn) {
    const before = captureEditorSnapshot();
    historySuppressed++;
    try { return await fn(); }
    finally {
      historySuppressed = Math.max(0, historySuppressed - 1);
      const after = captureEditorSnapshot();
      recordHistory(before, after, label, '');
    }
  }

  async function restoreHistorySnapshot(snapshot) {
    const doc = activeDoc(); if (!doc || !snapshot) return;
    historyRestoring = true;
    historySuppressed++;
    try {
      editor.innerHTML = sanitizeEditorHtml(snapshot.html || '<p><br></p>');
      rerenderAllRubies();
      doc.html = serializeEditorHtml();
      selectRuby(null); clearQuickContext();
      editor.focus(); restoreSelectionBookmark(snapshot.selection);
      await handleEditorInput({ fromHistory: true });
    } finally {
      historySuppressed = Math.max(0, historySuppressed - 1);
      historyRestoring = false;
    }
  }

  async function undoEditorHistory() {
    const state = historyState();
    if (!state?.undo.length) return false;
    const entry = state.undo.pop(); state.redo.push(entry);
    await restoreHistorySnapshot(entry.before);
    return true;
  }

  async function redoEditorHistory() {
    const state = historyState();
    if (!state?.redo.length) return false;
    const entry = state.redo.pop(); state.undo.push(entry);
    await restoreHistorySnapshot(entry.after);
    return true;
  }

  function rangeTextBeforeCaretInBlock(range, block) {
    if (!range || !block || !range.collapsed) return null;
    try {
      const probe = document.createRange(); probe.selectNodeContents(block); probe.setEnd(range.startContainer, range.startOffset);
      return probe.toString().replace(/\u200b/g, '');
    } catch { return null; }
  }

  function caretAtElementEdge(range, element, edge = 'start') {
    if (!range?.collapsed || !element || !element.contains(range.startContainer)) return false;
    try {
      const probe = document.createRange(); probe.selectNodeContents(element);
      if (edge === 'start') probe.setEnd(range.startContainer, range.startOffset);
      else probe.setStart(range.startContainer, range.startOffset);
      return probe.toString().length === 0;
    } catch { return false; }
  }

  function placeCaretAfterNode(node) {
    const range = document.createRange(); range.setStartAfter(node); range.collapse(true);
    const sel = getSelection(); if (!sel) return;
    sel.removeAllRanges(); sel.addRange(range); lastEditorRange = range.cloneRange();
  }

  function placeCaretBeforeNode(node) {
    const range = document.createRange(); range.setStartBefore(node); range.collapse(true);
    const sel = getSelection(); if (!sel) return;
    sel.removeAllRanges(); sel.addRange(range); lastEditorRange = range.cloneRange();
  }

  function insertWhitespaceOutsideRuby(ruby, side, text, before) {
    const t = document.createTextNode(text);
    historySuppressed++;
    try {
      if (side === 'before') { ruby.before(t); placeCaretAfterNode(t); }
      else { ruby.after(t); placeCaretAfterNode(t); }
    } finally { historySuppressed = Math.max(0, historySuppressed - 1); }
    recordHistory(before, captureEditorSnapshot(), 'insert whitespace at annotation boundary', 'insertText');
    handleEditorInput().catch(err => console.warn('annotation-boundary whitespace reconciliation failed', err));
  }

  function isNaturalParagraphBlock(block) {
    return !!block && editor.contains(block) && (block.tagName === 'P' || block.tagName === 'DIV');
  }

  function insertLeadingParagraphSpace(range, before) {
    const t = document.createTextNode(' ');
    historySuppressed++;
    try {
      range.insertNode(t); placeCaretAfterNode(t);
    } finally { historySuppressed = Math.max(0, historySuppressed - 1); }
    recordHistory(before, captureEditorSnapshot(), 'insert leading paragraph space', 'insertText');
    handleEditorInput().catch(err => console.warn('leading-space reconciliation failed', err));
  }

  function convertLeadingSpaceToParagraphIndent(range, block, before) {
    const lead = document.createRange(); lead.selectNodeContents(block); lead.setEnd(range.startContainer, range.startOffset);
    historySuppressed++;
    try {
      lead.deleteContents(); block.style.textIndent = '2em'; setCollapsedCaret(block, true);
    } finally { historySuppressed = Math.max(0, historySuppressed - 1); }
    $('firstLineIndentSelect').value = '2';
    recordHistory(before, captureEditorSnapshot(), 'smart first-line indent', '');
    handleEditorInput().catch(err => console.warn('paragraph-indent reconciliation failed', err));
  }

  function handleBoundarySpaceInput(e) {
    const sel = getSelection(); if (!sel?.rangeCount || !sel.isCollapsed) return false;
    const range = sel.getRangeAt(0); if (!editor.contains(range.startContainer)) return false;
    const block = selectionBlockElement(range.startContainer);
    const beforeText = rangeTextBeforeCaretInBlock(range, block);
    const before = captureEditorSnapshot();

    // In natural paragraphs only, two leading ASCII spaces are a typing shorthand
    // for a semantic 2em first-line indent. Chromium may represent the first native
    // leading space as NBSP, so normalize both forms. Intercept the first space too,
    // making the shortcut independent of whether the first Han character is wrapped
    // in ruby.phono or is plain text.
    if (isNaturalParagraphBlock(block) && !block.style.textIndent) {
      if (/^[ \u00a0]$/.test(beforeText || '')) {
        e.preventDefault(); convertLeadingSpaceToParagraphIndent(range, block, before); return true;
      }
      if (beforeText === '') {
        const rbStart = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement)?.closest?.('.rb');
        const rubyStart = rbStart?.closest?.('ruby.phono');
        e.preventDefault();
        if (rubyStart && editor.contains(rubyStart) && caretAtElementEdge(range, rbStart, 'start')) insertWhitespaceOutsideRuby(rubyStart, 'before', ' ', before);
        else insertLeadingParagraphSpace(range, before);
        return true;
      }
    }

    const rbEl = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement)?.closest?.('.rb');
    const ruby = rbEl?.closest?.('ruby.phono');
    if (!ruby || !editor.contains(ruby)) return false;
    if (caretAtElementEdge(range, rbEl, 'start')) {
      e.preventDefault(); insertWhitespaceOutsideRuby(ruby, 'before', e.data || ' ', before); return true;
    }
    if (caretAtElementEdge(range, rbEl, 'end')) {
      e.preventDefault(); insertWhitespaceOutsideRuby(ruby, 'after', e.data || ' ', before); return true;
    }
    return false;
  }

  function nativeMergeKey(inputType) {
    return ['insertText','deleteContentBackward','deleteContentForward'].includes(inputType) ? inputType : '';
  }

  function handleEditorBeforeInput(e) {
    if (historyRestoring || historySuppressed) return;
    if (e.inputType === 'historyUndo') { e.preventDefault(); undoEditorHistory().catch(showError); return; }
    if (e.inputType === 'historyRedo') { e.preventDefault(); redoEditorHistory().catch(showError); return; }
    if (compositionActive || e.isComposing || e.inputType === 'insertCompositionText') return;
    if (e.inputType === 'insertText' && e.data === ' ' && handleBoundarySpaceInput(e)) return;
    pendingBeforeInputSnapshot = captureEditorSnapshot();
  }

  function commitNativeInputHistory(inputType = 'input') {
    if (historyRestoring || historySuppressed || compositionActive) { pendingBeforeInputSnapshot = null; return; }
    const before = pendingBeforeInputSnapshot; pendingBeforeInputSnapshot = null;
    if (!before) return;
    const after = captureEditorSnapshot();
    recordHistory(before, after, inputType || 'input', nativeMergeKey(inputType));
  }

  function handleCompositionStart() {
    if (historyRestoring || historySuppressed) return;
    compositionActive = true;
    pendingBeforeInputSnapshot = null;
    compositionBeforeSnapshot = captureEditorSnapshot();
  }

  function handleCompositionEnd() {
    if (!compositionActive) return;
    compositionActive = false;
    const before = compositionBeforeSnapshot; compositionBeforeSnapshot = null;
    requestAnimationFrame(() => {
      if (before && !historyRestoring && !historySuppressed) recordHistory(before, captureEditorSnapshot(), 'IME composition', 'composition');
      handleEditorInput().catch(err => console.warn('IME reconciliation failed', err));
      rememberEditorSelection(); refreshPhoneticContextFromEditor();
    });
  }

  function buildRecoveryDraftBytes(doc) {
    const files = Archive.unpackStoreZip(buildPhonoDocBytes(doc));
    files['recovery.json'] = new TextEncoder().encode(JSON.stringify({
      schema: 1, sourcePath: doc.filePath || '', sourceName: doc.fileName || '', recoveredAt: nowIso()
    }, null, 2));
    return Archive.packStoreZip(files);
  }

  function parseRecoveryDraftBytes(bytes, recoveryId = '') {
    const files = Archive.unpackStoreZip(bytes);
    let recovery = {};
    try { recovery = Archive.jsonFile(files, 'recovery.json'); } catch {}
    const doc = parsePhonoDocBytes(bytes, { filePath: recovery.sourcePath || '', fileName: recovery.sourceName || '' });
    doc.dirty = true;
    doc.recoveredFromDraft = true;
    doc.recoveryId = recoveryId || doc.id;
    return doc;
  }

  async function persistRecoveryDraft(doc) {
    if (!doc || !Desktop.writeRecoveryDraft) return;
    if (compositionActive && doc.id === activeDocId) return scheduleRecoveryDraft(doc);
    if (!doc.dirty) { await Desktop.deleteRecoveryDraft?.(doc.recoveryId || doc.id).catch?.(() => {}); return; }
    if (doc.id === activeDocId) syncActiveFromEditor();
    try {
      const bytes = buildRecoveryDraftBytes(doc);
      await Desktop.writeRecoveryDraft(doc.recoveryId || doc.id, Array.from(bytes));
    } catch (err) { console.warn('recovery draft write failed', err); }
  }

  function scheduleRecoveryDraft(doc = activeDoc()) {
    if (!doc || !Desktop.writeRecoveryDraft) return;
    const old = recoveryTimers.get(doc.id); if (old) clearTimeout(old);
    recoveryTimers.set(doc.id, setTimeout(() => {
      recoveryTimers.delete(doc.id); persistRecoveryDraft(doc).catch(() => {});
    }, RECOVERY_DEBOUNCE_MS));
  }

  async function deleteRecoveryDraftForDoc(doc) {
    if (!doc) return;
    const old = recoveryTimers.get(doc.id); if (old) { clearTimeout(old); recoveryTimers.delete(doc.id); }
    await Desktop.deleteRecoveryDraft?.(doc.recoveryId || doc.id).catch?.(() => {});
  }

  async function restoreRecoveryDrafts() {
    if (!Desktop.listRecoveryDrafts || !Desktop.readRecoveryDraft) return 0;
    let entries = [];
    try { entries = await Desktop.listRecoveryDrafts(); } catch { return 0; }
    let restored = 0;
    for (const meta of entries || []) {
      try {
        const file = await Desktop.readRecoveryDraft(meta.id);
        const doc = parseRecoveryDraftBytes(new Uint8Array(file.bytes), meta.id);
        if (docs.some(d => d.id === doc.id)) doc.id = randomId('doc');
        docs.push(doc); restored++;
      } catch (err) { console.warn('recovery draft skipped', meta?.id, err); }
    }
    return restored;
  }

  function markDirty({ scheduleRecovery = true } = {}) {
    const doc = activeDoc(); if (!doc) return;
    doc.dirty = true; doc.updatedAt = Date.now();
    renderTabs(); updateStatusBar();
    if (scheduleRecovery) scheduleRecoveryDraft(doc);
  }

  function initFontSelects() {
    populateFontSelect($('bodyFontSelect'));
    populateFontSelect($('phoneticFontSelect'));
  }
  function populateFontSelect(select) {
    select.innerHTML = '';
    const groups = new Map();
    for (const f of Fonts.FONT_CATALOG) {
      if (!groups.has(f.group)) { const g = document.createElement('optgroup'); g.label = f.group; groups.set(f.group, g); select.appendChild(g); }
      const opt = document.createElement('option'); opt.value = f.key;
      const detected = f.probe ? Fonts.detectInstalledFont(f.probe, document) : true;
      opt.textContent = `${f.label}${detected === false ? ' · 未检测到' : detected === true && f.probe ? ' ✓' : ''}`;
      groups.get(f.group).appendChild(opt);
    }
  }

  function applyDocPresentation(doc) {
    const t = doc.typography;
    const bodyFont = Fonts.getFont(t.bodyFontKey);
    const phFont = Fonts.getFont(t.phoneticFontKey);
    document.documentElement.style.setProperty('--doc-body-font', bodyFont.family);
    document.documentElement.style.setProperty('--doc-phonetic-font', phFont.family);
    document.documentElement.style.setProperty('--doc-body-size', `${t.bodyFontSizePt}pt`);
    document.documentElement.style.setProperty('--doc-ruby-size', `${Math.max(5, t.bodyFontSizePt * t.rubyScale)}pt`);
    // Inline reading editing lives outside the zoomed paper. Keep it visually
    // aligned with the rendered ruby, but deliberately 0.05 larger in ratio
    // so direct editing is easier to read.
    document.documentElement.style.setProperty('--doc-inline-ruby-size', `${Math.max(5, t.bodyFontSizePt * Math.min(.95, t.rubyScale + .05))}pt`);
    document.documentElement.style.setProperty('--doc-line-height', String(t.lineHeight || 2));
    document.body.dataset.phoneticMode = doc.view.phoneticMode;
    document.body.dataset.studyMode = doc.view.studyMode;
    document.body.dataset.masteryThreshold = String(doc.view.masteryThreshold || 3);
    applyLayoutCss(doc.layout);
    schedulePitchLayout();
    scheduleEditingGuides();
  }

  function applyLayoutCss(layout) {
    const paper = layout.paperSize === 'Letter'
      ? { w: 816, h: 1056 }
      : { w: 794, h: 1123 };
    const margins = layout.marginPreset === 'narrow'
      ? { x: 46, y: 48 }
      : layout.marginPreset === 'wide'
        ? { x: 105, y: 86 }
        : { x: 76, y: 72 };
    document.documentElement.style.setProperty('--paper-width', `${paper.w}px`);
    document.documentElement.style.setProperty('--paper-min-height', `${paper.h}px`);
    document.documentElement.style.setProperty('--paper-pad-x', `${margins.x}px`);
    document.documentElement.style.setProperty('--paper-pad-y', `${margins.y}px`);
    scheduleEditingGuides();
  }

  function selectionInsideEditor() {
    const sel = getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    return editor.contains(range.commonAncestorContainer) ? range : null;
  }

  function rememberEditorSelection() {
    const range = selectionInsideEditor();
    if (!range) return false;
    try { lastEditorRange = range.cloneRange(); return true; } catch { return false; }
  }

  function usableEditorRange(requireText = false) {
    let range = selectionInsideEditor();
    if (!range && lastEditorRange) {
      try {
        if (editor.contains(lastEditorRange.commonAncestorContainer)) range = lastEditorRange.cloneRange();
      } catch { lastEditorRange = null; }
    }
    if (!range) return null;
    if (requireText && (range.collapsed || !range.toString())) return null;
    return range;
  }

  function restoreEditorSelection(requireText = false) {
    const range = usableEditorRange(requireText);
    if (!range) return false;
    try {
      editor.focus();
      const sel = getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      lastEditorRange = range.cloneRange();
      return true;
    } catch { return false; }
  }

  function hasEditorSelection(requireText = false) { return !!usableEditorRange(requireText); }

  function scheduleEditingGuides() {
    if (editingGuideFrame) cancelAnimationFrame(editingGuideFrame);
    editingGuideFrame = requestAnimationFrame(() => {
      editingGuideFrame = 0;
      renderFormattingMarks();
      renderMarginMarks();
    });
  }

  function renderFormattingMarks() {
    const overlay = $('formattingOverlay');
    if (!overlay) return;
    overlay.replaceChildren();
    overlay.classList.toggle('visible', showLineBreaks);
    $('toggleLineBreaksBtn')?.classList.toggle('active-command', showLineBreaks);
    if (!showLineBreaks) return;
    const stage = $('paperStage');
    const stageRect = stage.getBoundingClientRect();
    const currentZoom = Math.max(.01, Number(zoom) || 1);
    editor.querySelectorAll('br').forEach(br => {
      const rect = br.getBoundingClientRect();
      if (!rect || (!Number.isFinite(rect.left)) || rect.bottom < stageRect.top || rect.top > stageRect.bottom) return;
      const mark = document.createElement('span');
      mark.className = 'format-mark line-break'; mark.textContent = '↵';
      const owner = br.parentElement || editor;
      const ownerStyle = getComputedStyle(owner);
      const sourceFontPx = parseFloat(ownerStyle.fontSize) || parseFloat(getComputedStyle(editor).fontSize) || 20;
      // The guide overlay is outside the zoomed editor, so scale the mark using
      // both the local text size and the current paper zoom. This keeps ↵ visually
      // proportional to ordinary text, headings and user-selected font sizes.
      const markerFontPx = Math.min(72, Math.max(10, sourceFontPx * currentZoom * .82));
      mark.style.left = `${rect.left - stageRect.left + Math.max(2, markerFontPx * .08)}px`;
      mark.style.top = `${rect.top - stageRect.top + Math.max(0, rect.height * .10)}px`;
      mark.style.fontSize = `${markerFontPx}px`;
      overlay.appendChild(mark);
    });
  }

  function ensureImageSelectionOverlay() {
    let overlay = $('imageSelectionOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'imageSelectionOverlay';
      overlay.className = 'image-selection-overlay hidden';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML = '<span class="image-resize-center"></span>' +
        ['nw','ne','sw','se'].map(c => `<button type="button" class="image-resize-handle ${c}" data-corner="${c}" tabindex="-1" aria-label="Resize image ${c}"></button>`).join('');
      document.body.appendChild(overlay);
    }
    if (overlay.dataset.bound !== 'true') {
      overlay.querySelectorAll('.image-resize-handle').forEach(handle => {
        handle.addEventListener('pointerdown', e => beginImageResize(e, handle.dataset.corner));
      });
      overlay.dataset.bound = 'true';
    }
    return overlay;
  }

  function scheduleImageSelectionOverlay() {
    if (imageSelectionFrame) cancelAnimationFrame(imageSelectionFrame);
    imageSelectionFrame = requestAnimationFrame(() => {
      imageSelectionFrame = 0;
      syncImageSelectionOverlay();
    });
  }

  function syncImageSelectionOverlay() {
    const overlay = ensureImageSelectionOverlay();
    if (!selectedImage || !selectedImage.isConnected || !editor.contains(selectedImage)) {
      overlay.classList.add('hidden'); overlay.setAttribute('aria-hidden', 'true');
      return;
    }
    const rect = selectedImage.getBoundingClientRect();
    if (!Number.isFinite(rect.left) || rect.width < 1 || rect.height < 1) {
      overlay.classList.add('hidden'); overlay.setAttribute('aria-hidden', 'true');
      return;
    }
    overlay.classList.remove('hidden'); overlay.setAttribute('aria-hidden', 'false');
    overlay.style.left = `${rect.left}px`; overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`; overlay.style.height = `${rect.height}px`;
  }

  function selectImage(img) {
    if (!img || !editor.contains(img)) return clearImageSelection();
    selectedImage = img;
    selectRuby(null);
    const sel = getSelection(); if (sel) sel.removeAllRanges();
    scheduleImageSelectionOverlay();
  }

  function clearImageSelection() {
    selectedImage = null; imageResizeState = null;
    const overlay = $('imageSelectionOverlay');
    if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('resizing'); overlay.setAttribute('aria-hidden', 'true'); }
    document.body.classList.remove('image-resizing'); document.body.style.cursor = '';
  }

  function imageContentMaxWidth() {
    const css = getComputedStyle(editor);
    return Math.max(64, editor.clientWidth - (parseFloat(css.paddingLeft)||0) - (parseFloat(css.paddingRight)||0));
  }

  function imageUsesCenteredFrame(img) {
    const figure = img.closest?.('figure.doc-figure');
    if (figure) return true;
    const parent = img.parentElement;
    return !!parent && getComputedStyle(parent).textAlign === 'center';
  }

  function beginImageResize(e, corner) {
    if (!selectedImage || !selectedImage.isConnected) return;
    const handle = e.currentTarget;
    e.preventDefault(); e.stopPropagation();
    const rect = selectedImage.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const signX = corner.includes('w') ? -1 : 1;
    const signY = corner.includes('n') ? -1 : 1;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const v0 = { x: signX * rect.width / 2, y: signY * rect.height / 2 };
    const inlineMarginLeft = parseFloat(selectedImage.style.marginLeft) || 0;
    const inlineMarginRight = parseFloat(selectedImage.style.marginRight) || 0;
    imageResizeState = {
      img: selectedImage, corner, centerX, centerY, v0,
      before: captureEditorSnapshot(),
      initialCssWidth: rect.width / Math.max(.01, Number(zoom) || 1),
      initialMarginLeft: inlineMarginLeft,
      initialMarginRight: inlineMarginRight,
      centeredFrame: imageUsesCenteredFrame(selectedImage),
      maxWidth: imageContentMaxWidth()
    };
    document.body.classList.add('image-resizing');
    document.body.style.cursor = (corner === 'ne' || corner === 'sw') ? 'nesw-resize' : 'nwse-resize';
    ensureImageSelectionOverlay().classList.add('resizing');
    try { handle.setPointerCapture(e.pointerId); } catch {}

    const onMove = ev => {
      const st = imageResizeState; if (!st || st.img !== selectedImage) return;
      const v = { x: ev.clientX - st.centerX, y: ev.clientY - st.centerY };
      const denom = st.v0.x * st.v0.x + st.v0.y * st.v0.y || 1;
      const projectedScale = (v.x * st.v0.x + v.y * st.v0.y) / denom;
      const width = Math.min(st.maxWidth, Math.max(32, st.initialCssWidth * projectedScale));
      const rounded = Math.round(width);
      st.img.setAttribute('width', String(rounded));
      st.img.removeAttribute('height');
      if (!st.centeredFrame) {
        const delta = width - st.initialCssWidth;
        st.img.style.marginLeft = `${st.initialMarginLeft - delta / 2}px`;
        st.img.style.marginRight = `${st.initialMarginRight - delta / 2}px`;
      }
      scheduleImageSelectionOverlay();
    };
    const finish = ev => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      try { handle.releasePointerCapture(ev.pointerId); } catch {}
      const st = imageResizeState; imageResizeState = null;
      document.body.classList.remove('image-resizing'); document.body.style.cursor = ''; ensureImageSelectionOverlay().classList.remove('resizing');
      if (!st) return;
      const after = captureEditorSnapshot();
      if (recordHistory(st.before, after, 'image-resize')) markDirty();
      scheduleImageSelectionOverlay(); scheduleEditingGuides();
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  function renderMarginMarks() {
    const overlay = $('marginMarks');
    if (!overlay) return;
    overlay.classList.toggle('visible', showMarginMarks);
    $('toggleMarginMarksBtn')?.classList.toggle('active-command', showMarginMarks);
    if (!showMarginMarks) return;
    const stage = $('paperStage');
    const stageRect = stage.getBoundingClientRect();
    const paperRect = editor.getBoundingClientRect();
    const css = getComputedStyle(editor);
    const zx = Math.max(.01, Number(zoom) || 1);
    const padX = (parseFloat(css.paddingLeft) || 0) * zx;
    const padY = (parseFloat(css.paddingTop) || 0) * zx;
    const markSize = Math.max(9, 15 * zx);
    const half = markSize * .5;
    const coords = {
      'top-left': [paperRect.left - stageRect.left + padX - half, paperRect.top - stageRect.top + padY - half],
      'top-right': [paperRect.right - stageRect.left - padX - half, paperRect.top - stageRect.top + padY - half],
      'bottom-left': [paperRect.left - stageRect.left + padX - half, paperRect.bottom - stageRect.top - padY - half],
      'bottom-right': [paperRect.right - stageRect.left - padX - half, paperRect.bottom - stageRect.top - padY - half]
    };
    overlay.querySelectorAll('.margin-mark').forEach(mark => {
      const key = [...mark.classList].find(c => ['top-left','top-right','bottom-left','bottom-right'].includes(c));
      const c = coords[key]; if (!c) return;
      mark.style.left = `${c[0]}px`; mark.style.top = `${c[1]}px`;
      mark.style.width = `${markSize}px`; mark.style.height = `${markSize}px`;
    });
  }

  function toggleLineBreakMarks(force = null) {
    showLineBreaks = force == null ? !showLineBreaks : !!force;
    scheduleEditingGuides(); saveSettings();
  }

  function toggleMarginMarks(force = null) {
    showMarginMarks = force == null ? !showMarginMarks : !!force;
    scheduleEditingGuides(); saveSettings();
  }

  function applyBodyFontChoice() {
    const doc = activeDoc(); if (!doc) return;
    const key = $('bodyFontSelect').value;
    const font = Fonts.getFont(key);
    let before = null;
    if (hasEditorSelection(true)) {
      before = captureEditorSnapshot(); historySuppressed++;
      try { restoreEditorSelection(true); document.execCommand('styleWithCSS', false, true); document.execCommand('fontName', false, font.probe || font.label.split(' / ')[0] || 'serif'); }
      finally { historySuppressed = Math.max(0, historySuppressed - 1); }
    } else {
      doc.typography.bodyFontKey = key; applyDocPresentation(doc);
    }
    markDirty(); if (before) recordHistory(before, captureEditorSnapshot(), 'format:font'); updateStatusBar();
  }

  const TEXT_COLOR_PRESETS = [
    ['#111827','黑'],['#374151','深灰'],['#6b7280','灰'],['#d92d20','红'],['#f97316','橙'],['#16a34a','绿'],['#0284c7','蓝'],['#7c3aed','紫'],['#0f766e','青']
  ];
  const HIGHLIGHT_COLOR_PRESETS = [
    ['#fff200','荧光黄'],['#b7f7a5','荧光绿'],['#a5f3fc','荧光青'],['#ffc6e7','荧光粉'],['#fed7aa','荧光橙'],['#fecaca','淡红'],['#bfdbfe','淡蓝'],['#ddd6fe','淡紫'],['#d1d5db','灰']
  ];

  function normalizeHexColor(value) {
    const v = String(value || '').trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(v)) return v;
    if (/^#[0-9a-f]{3}$/.test(v)) return '#' + [...v.slice(1)].map(c => c + c).join('');
    return '';
  }

  function rememberColor(kind, color) {
    const c = normalizeHexColor(color); if (!c) return;
    const arr = kind === 'highlight' ? recentHighlightColors : recentTextColors;
    const next = [c, ...arr.filter(x => x !== c)].slice(0, 5);
    if (kind === 'highlight') recentHighlightColors = next; else recentTextColors = next;
    renderRecentColorSwatches(kind); saveSettings();
  }

  function colorSwatchButton(kind, color, label = '') {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'color-swatch'; btn.dataset.color = color;
    btn.style.setProperty('--swatch', color); btn.title = label || color;
    btn.setAttribute('aria-label', label || color);
    return btn;
  }

  function renderRecentColorSwatches(kind) {
    const host = $(kind === 'highlight' ? 'highlightColorRecent' : 'textColorRecent'); if (!host) return;
    host.replaceChildren();
    const arr = kind === 'highlight' ? recentHighlightColors : recentTextColors;
    if (!arr.length) { const empty=document.createElement('span'); empty.className='color-palette-empty'; empty.textContent='—'; host.appendChild(empty); return; }
    for (const color of arr) host.appendChild(colorSwatchButton(kind, color, color));
  }

  function initColorPalettes() {
    for (const [kind, values] of [['text',TEXT_COLOR_PRESETS],['highlight',HIGHLIGHT_COLOR_PRESETS]]) {
      const palette = $(kind === 'highlight' ? 'highlightColorPalette' : 'textColorPalette'); if (!palette) continue;
      const host = palette.querySelector('.preset-swatches'); host.replaceChildren();
      for (const [color,label] of values) host.appendChild(colorSwatchButton(kind,color,label));
      renderRecentColorSwatches(kind);
    }
  }

  function closeColorPalettes() {
    for (const [paletteId,buttonId] of [['textColorPalette','textColorMenuBtn'],['highlightColorPalette','highlightColorMenuBtn']]) {
      $(paletteId)?.classList.add('hidden'); $(buttonId)?.classList.remove('active');
    }
  }

  function toggleColorPalette(kind) {
    const target = $(kind === 'highlight' ? 'highlightColorPalette' : 'textColorPalette');
    const button = $(kind === 'highlight' ? 'highlightColorMenuBtn' : 'textColorMenuBtn');
    const opening = target?.classList.contains('hidden'); closeColorPalettes();
    if (opening && target) { target.classList.remove('hidden'); button?.classList.add('active'); }
  }

  function applyRibbonColor(kind, value, { remember = false } = {}) {
    const color = normalizeHexColor(value); if (!color) return;
    const input = $(kind === 'highlight' ? 'highlightColor' : 'textColor');
    if (input) input.value = color;
    input?.closest('.color-button')?.style.setProperty('--swatch', color);
    execRichCommand(kind === 'highlight' ? 'hiliteColor' : 'foreColor', color);
    if (remember) rememberColor(kind, color);
  }

  function handleColorPaletteClick(event, kind) {
    const btn = event.target.closest?.('.color-swatch'); if (!btn) return;
    event.preventDefault(); event.stopPropagation();
    applyRibbonColor(kind, btn.dataset.color, { remember: true }); closeColorPalettes();
  }

  function applyBodySizeChoice() {
    const doc = activeDoc(); if (!doc) return;
    const pt = Math.max(8, Math.min(96, Number($('bodyFontSize').value) || 14));
    $('bodyFontSize').value = pt;
    let historyBefore = null;
    if (hasEditorSelection(true)) {
      historyBefore = captureEditorSnapshot(); historySuppressed++;
      try {
        restoreEditorSelection(true);
        const generatedBefore = new Set(editor.querySelectorAll('font[size="7"]'));
        document.execCommand('styleWithCSS', false, true); document.execCommand('fontSize', false, '7');
        editor.querySelectorAll('font[size="7"]').forEach(n => { if (generatedBefore.has(n)) return; n.removeAttribute('size'); n.style.fontSize = `${pt}pt`; });
      } finally { historySuppressed = Math.max(0, historySuppressed - 1); }
    } else {
      doc.typography.bodyFontSizePt = pt; applyDocPresentation(doc);
    }
    markDirty(); if (historyBefore) recordHistory(historyBefore, captureEditorSnapshot(), 'format:size'); updateStatusBar();
  }

  function changeFontSize(delta) {
    $('bodyFontSize').value = Math.max(8, Math.min(96, Number($('bodyFontSize').value || 14) + delta));
    applyBodySizeChoice();
  }

  function execRichCommand(cmd, value = null) {
    if (!restoreEditorSelection(false)) editor.focus();
    try {
      if (cmd === 'copy' || cmd === 'cut') { document.execCommand(cmd); return; }
      const before = captureEditorSnapshot();
      historySuppressed++;
      try {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(cmd, false, value);
      } finally { historySuppressed = Math.max(0, historySuppressed - 1); }
      rememberEditorSelection();
      markDirty();
      recordHistory(before, captureEditorSnapshot(), `format:${cmd}`);
      schedulePitchLayout(); scheduleEditingGuides(); updateCommandState(); updateStatusBar();
    } catch (err) { console.warn(cmd, err); }
  }

  function applyLineHeight(value) {
    const doc = activeDoc(); if (!doc) return;
    let before = null;
    if (hasEditorSelection()) {
      before = captureEditorSnapshot();
      for (const block of selectedBlocks()) block.style.lineHeight = String(value);
    } else {
      doc.typography.lineHeight = value; $('defaultLineHeight').value = String(value); applyDocPresentation(doc);
    }
    markDirty(); if (before) recordHistory(before, captureEditorSnapshot(), 'format:line-height');
  }

  function selectedBlocks() {
    const range = usableEditorRange(false); if (!range) return [];
    const blocks = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (!/^(P|DIV|H1|H2|H3|LI|BLOCKQUOTE)$/.test(node.tagName)) return NodeFilter.FILTER_SKIP;
        try { return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; }
        catch { return NodeFilter.FILTER_SKIP; }
      }
    });
    let n; while ((n = walker.nextNode())) blocks.push(n);
    if (!blocks.length) {
      let node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
      node = node?.closest?.('p,div,h1,h2,h3,li,blockquote'); if (node && editor.contains(node)) blocks.push(node);
    }
    return [...new Set(blocks)];
  }

  function setCollapsedCaret(block, atStart = true) {
    if (!block) return false;
    const range = document.createRange(); range.selectNodeContents(block); range.collapse(!!atStart);
    const sel = getSelection(); if (!sel) return false;
    sel.removeAllRanges(); sel.addRange(range); lastEditorRange = range.cloneRange(); return true;
  }

  function applyFirstLineIndentValue(em, blocks = selectedBlocks(), label = 'format:first-line-indent') {
    const value = Math.max(0, Math.min(8, Number(em) || 0));
    if (!blocks.length) return false;
    const before = captureEditorSnapshot();
    for (const block of blocks) block.style.textIndent = value ? `${value}em` : '';
    markDirty(); recordHistory(before, captureEditorSnapshot(), label); scheduleEditingGuides(); updateStatusBar();
    return true;
  }

  function applyFirstLineIndentChoice(raw) {
    let value = raw;
    if (raw === 'custom') {
      const entered = prompt('首行缩进（em / 字符数，0–8）：', '2');
      if (entered == null) { $('firstLineIndentSelect').value = '0'; return; }
      value = Number(entered);
      if (!Number.isFinite(value) || value < 0 || value > 8) { alert('请输入 0–8 之间的数值。'); $('firstLineIndentSelect').value='0'; return; }
    }
    applyFirstLineIndentValue(Number(value));
    $('firstLineIndentSelect').value = ['0','1','2'].includes(String(value)) ? String(value) : 'custom';
  }

  function updateTypographyFromRibbon() {
    const doc = activeDoc(); if (!doc) return;
    doc.typography.phoneticFontKey = $('phoneticFontSelect').value;
    doc.typography.rubyScale = Math.max(.3, Math.min(.9, Number($('rubyScale').value) || .65));
    applyDocPresentation(doc); rerenderAllRubies(); markDirty();
  }

  const STUDY_PRESETS = Object.freeze({
    full: { phoneticMode: 'both', studyMode: 'study' },
    'reading-only': { phoneticMode: 'text', studyMode: 'study' },
    'pitch-only': { phoneticMode: 'pitch', studyMode: 'study' },
    hidden: { phoneticMode: 'both', studyMode: 'hidden' },
    reveal: { phoneticMode: 'both', studyMode: 'reading' },
    mastery: { phoneticMode: 'both', studyMode: 'compact' }
  });

  function deriveStudyPreset(view) {
    for (const [name, preset] of Object.entries(STUDY_PRESETS)) {
      if (view?.phoneticMode === preset.phoneticMode && view?.studyMode === preset.studyMode) return name;
    }
    return 'custom';
  }

  function clearTransientReveals() {
    editor.querySelectorAll('ruby.phono.reveal').forEach(r => r.classList.remove('reveal'));
  }

  function syncStudyDisplayControls(doc = activeDoc()) {
    if (!doc) return;
    const preset = deriveStudyPreset(doc.view);
    if ($('studyPresetSelect')) $('studyPresetSelect').value = preset;
    if ($('masteryThresholdSelect')) {
      $('masteryThresholdSelect').value = String(doc.view.masteryThreshold || 3);
      $('masteryThresholdSelect').disabled = doc.view.studyMode !== 'compact';
    }
  }

  function applyStudyPresetFromRibbon() {
    const doc = activeDoc(); if (!doc) return;
    const name = $('studyPresetSelect').value;
    const preset = STUDY_PRESETS[name];
    if (!preset) { syncStudyDisplayControls(doc); return; }
    $('phoneticModeSelect').value = preset.phoneticMode;
    $('studyModeSelect').value = preset.studyMode;
    updateViewFromRibbon();
  }

  function updateViewFromRibbon() {
    const doc = activeDoc(); if (!doc) return;
    const before = JSON.stringify(doc.view);
    doc.view.phoneticMode = ['text', 'pitch', 'both'].includes($('phoneticModeSelect').value) ? $('phoneticModeSelect').value : 'both';
    doc.view.studyMode = ['study', 'compact', 'reading', 'hidden'].includes($('studyModeSelect').value) ? $('studyModeSelect').value : 'study';
    doc.view.masteryThreshold = Math.max(1, Math.min(3, Number($('masteryThresholdSelect').value) || 3));
    clearTransientReveals();
    applyDocPresentation(doc); rerenderAllRubies(); syncStudyDisplayControls(doc);
    if (JSON.stringify(doc.view) !== before) markDirty();
  }

  function updateLayoutFromRibbon() {
    const doc = activeDoc(); if (!doc) return;
    doc.language = $('docLanguage').value;
    doc.typography.lineHeight = Number($('defaultLineHeight').value) || 2;
    doc.layout.paperSize = $('paperSizeSelect').value;
    doc.layout.marginPreset = $('marginPresetSelect').value;
    applyDocPresentation(doc); markDirty(); updateStatusBar();
  }

  function setQuickContextStatus(message, kind = 'info') {
    const box = $('quickWorkflowStatus');
    if (!box) return;
    box.textContent = message || '';
    box.classList.remove('ok', 'error', 'info');
    if (kind) box.classList.add(kind);
  }

  function setPhoneticContextVisible(show) {
    const tab = $('phoneticContextTab');
    if (!tab) return;
    tab.classList.toggle('hidden', !show);
    if (!show && document.querySelector('.ribbon-tab.active')?.dataset.ribbon === 'phoneticContext') switchRibbon('home');
  }

  function clearQuickContext({ keepTab = false } = {}) {
    contextRange = null;
    contextKind = 'none';
    $('contextObjectKind').textContent = '未选择';
    $('quickBaseInput').value = '';
    $('quickReadingInput').value = '';
    $('quickPitchInput').value = ''; $('quickPitchInput').readOnly = false; $('quickPitchInput').title = '';
    $('quickNoteInput').value = '';
    $('quickMasterySelect').value = '0';
    $('quickAnnotationMode').value = contextModePreference;
    $('quickAnnotationMode').disabled = false;
    $('removeQuickAnnotationBtn').classList.add('hidden');
    setQuickContextStatus('在正文中选中文字，或单击已有注音对象。', 'info');
    if (!keepTab) setPhoneticContextVisible(false);
  }

  function loadQuickContextFromRuby(ruby) {
    memoryReuseCandidate = null;
    if (!ruby?.isConnected) return clearQuickContext();
    contextKind = 'ruby';
    contextRange = null;
    setPhoneticContextVisible(true);
    $('contextObjectKind').textContent = '已有注音';
    $('quickBaseInput').value = ruby.querySelector('.rb')?.textContent || '';
    $('quickReadingInput').value = ruby.dataset.reading || '';
    $('quickPitchInput').value = ruby.dataset.pitch || '';
    const japanesePitchObject = ruby.dataset.pitchSystem === 'ja-tokyo';
    $('quickPitchInput').readOnly = japanesePitchObject;
    $('quickPitchInput').title = japanesePitchObject ? '该轨迹由日语 Pitch Accent 语义模型生成；请用“详细编辑”修改 mora / アクセント核。' : '';
    $('quickNoteInput').value = ruby.dataset.note || '';
    $('quickMasterySelect').value = ruby.dataset.mastery || '0';
    $('quickAnnotationMode').value = 'group';
    $('quickAnnotationMode').disabled = true;
    $('removeQuickAnnotationBtn').classList.remove('hidden');
    setQuickContextStatus('正在编辑已有学习对象。修改后点“应用”；双击上方注音层可进入详细编辑。', 'ok');
  }

  function loadQuickContextFromRange(range, mode = contextModePreference) {
    memoryReuseCandidate = null;
    if (!range || range.collapsed || !editor.contains(range.commonAncestorContainer)) return clearQuickContext();
    const rangeCheck = validateAnnotationSelection(range);
    if (!rangeCheck.valid) {
      setPhoneticContextVisible(true);
      contextKind = 'blocked';
      contextRange = null;
      const labels = { annotation: '选区含注音', 'cross-block': '跨段选区', structure: '复杂选区', empty: '无有效选区' };
      $('contextObjectKind').textContent = labels[rangeCheck.reason] || '不可标注';
      $('quickBaseInput').value = range.toString();
      $('quickReadingInput').value = '';
      $('quickPitchInput').value = ''; $('quickPitchInput').readOnly = false; $('quickPitchInput').title = '';
      $('quickNoteInput').value = '';
      $('quickMasterySelect').value = '0';
      $('quickAnnotationMode').disabled = true;
      $('removeQuickAnnotationBtn').classList.add('hidden');
      const msg = rangeCheck.reason === 'annotation'
        ? '新建注音必须严格选择未标注正文；选区不能碰到已有注音实体。修改已有注音请双击上方注音层。'
        : '新建注音必须位于同一正文块内，不能跨段落、图片、换行对象或其他结构。';
      setQuickContextStatus(msg, 'error');
      return;
    }
    contextKind = 'selection';
    contextRange = range.cloneRange();
    contextModePreference = mode === 'group' ? 'group' : 'segment';
    setPhoneticContextVisible(true);
    $('contextObjectKind').textContent = '新选区';
    $('quickBaseInput').value = range.toString();
    $('quickReadingInput').value = '';
    $('quickPitchInput').value = ''; $('quickPitchInput').readOnly = false; $('quickPitchInput').title = '';
    $('quickNoteInput').value = '';
    $('quickMasterySelect').value = '0';
    $('quickAnnotationMode').disabled = false;
    $('quickAnnotationMode').value = contextModePreference;
    $('removeQuickAnnotationBtn').classList.add('hidden');
    setQuickContextStatus('已严格选择未标注正文。请亲手输入读音 / 表音。', 'info');
    validateQuickContext(false);
  }

  function refreshPhoneticContextFromEditor() {
    const range = selectionInsideEditor();
    if (range && !range.collapsed && range.toString().trim()) {
      if (interactionMode === 'quick') selectRuby(null);
      return loadQuickContextFromRange(range, contextModePreference);
    }
    if (interactionMode === 'object' && selectedRuby?.isConnected) return loadQuickContextFromRuby(selectedRuby);
    clearQuickContext();
  }

  function activateQuickAnnotation(mode = 'segment') {
    if (mode === 'edit' && selectedRuby?.isConnected) {
      loadQuickContextFromRuby(selectedRuby);
    } else {
      const range = usableEditorRange(true);
      if (!range || !range.toString().trim()) {
        if (selectedRuby?.isConnected) loadQuickContextFromRuby(selectedRuby);
        else { alert('请先在正文中严格选中要新建注音的文字；修改已有注音请双击上方注音层。'); return; }
      } else {
        loadQuickContextFromRange(range, mode === 'group' ? 'group' : 'segment');
      }
    }
    switchRibbon('phoneticContext');
    requestAnimationFrame(() => { $('quickReadingInput')?.focus(); $('quickReadingInput')?.select(); });
  }

  function quickContextPayload() {
    return {
      base: $('quickBaseInput').value,
      reading: $('quickReadingInput').value.trim(),
      pitch: $('quickPitchInput').value.trim(),
      note: $('quickNoteInput').value.trim(),
      mastery: $('quickMasterySelect').value,
      mode: $('quickAnnotationMode').value
    };
  }

  function validateQuickContext(showMessage = true) {
    const data = quickContextPayload();
    if (!['selection','ruby'].includes(contextKind)) {
      if (showMessage) setQuickContextStatus(contextKind === 'blocked' ? '当前选区包含已有注音对象。' : '没有可应用的学习对象。', 'error');
      return { valid: false, data };
    }
    if (!data.base) { if (showMessage) setQuickContextStatus('正文不能为空。', 'error'); return { valid: false, data }; }
    if (!data.reading) { if (showMessage) setQuickContextStatus('请亲手输入读音 / 表音；PhonoLayer不会自动补答案。', 'error'); return { valid: false, data }; }
    const pitchCheck = Phonetics.validateExplicitPitch(data.pitch);
    if (!pitchCheck.valid) { if (showMessage) setQuickContextStatus(pitchCheck.error, 'error'); return { valid: false, data }; }
    if (contextKind === 'selection' && data.mode === 'segment') {
      const chars = Phonetics.graphemes(data.base);
      const readings = data.reading.split(/\s+/).filter(Boolean);
      if (chars.length > 1 && readings.length !== chars.length) {
        const msg = `逐字对齐要求 ${chars.length} 个字符对应 ${chars.length} 段人工读音；当前输入 ${readings.length} 段。若不想拆分，请切换“整词注音”。`;
        if (showMessage) setQuickContextStatus(msg, 'error'); else setQuickContextStatus(msg, 'info');
        return { valid: false, data, chars, readings };
      }
      const pitchGroups = Phonetics.tokenizePitchGroups(data.pitch);
      if (data.pitch && chars.length > 1 && pitchGroups.length !== chars.length) {
        const msg = `逐字对齐时，音高也需要用“|”分成 ${chars.length} 组；当前是 ${pitchGroups.length} 组。`;
        if (showMessage) setQuickContextStatus(msg, 'error'); else setQuickContextStatus(msg, 'info');
        return { valid: false, data, chars, readings, pitchGroups };
      }
      setQuickContextStatus(chars.length > 1 ? `逐字模式：将建立 ${chars.length} 个独立学习对象。` : '单字符学习对象，可以直接应用。', 'ok');
      return { valid: true, data, chars, readings, pitchGroups };
    }
    setQuickContextStatus(contextKind === 'ruby' ? '已有注音对象：可直接修改读音；若原对象有音高而读音发生变化，音高会标记为待重新确认。' : '整词模式：选区将作为一个学习对象保存。', 'ok');
    return { valid: true, data };
  }

  async function applyQuickAnnotation() {
    const check = validateQuickContext(true);
    if (!check.valid) return;
    const { data } = check;
    const doc = activeDoc(); if (!doc) return;

    if (contextKind === 'ruby' && selectedRuby?.isConnected) {
      const historyBefore = captureEditorSnapshot();
      const ruby = selectedRuby;
      const currentBase = ruby.querySelector('.rb')?.textContent || '';
      // Annotation data and document text are deliberately separate. Editing an
      // existing phonetic entity mutates only its annotation layer in place; the
      // base text is never replaced by the annotation editor.
      const oldReading = ruby.dataset.reading || '';
      const oldPitch = ruby.dataset.pitch || '';
      const wasBaseStale = ruby.dataset.stale === 'true';
      const wasPitchStale = ruby.dataset.pitchStale === 'true';
      ruby.dataset.reading = data.reading;
      ruby.dataset.pitch = data.pitch;
      ruby.dataset.pitchStale = Confirmation.nextPitchStale({ oldReading, newReading:data.reading, oldPitch, newPitch:data.pitch, pitchSystem:ruby.dataset.pitchSystem, wasBaseStale, wasPitchStale }) ? 'true' : 'false';
      ruby.dataset.note = data.note;
      ruby.dataset.mastery = data.mastery;
      ruby.dataset.profile = ruby.dataset.profile || doc.language;
      ruby.dataset.source = 'manual';
      ruby.dataset.confirmedBase = currentBase;
      ruby.dataset.stale = 'false';
      renderRuby(ruby); syncRubyIntegrity(ruby);
      await recordRuby(ruby, 'manual');
      captureAnnotationState(doc); markDirty();
      recordHistory(historyBefore, captureEditorSnapshot(), 'annotation metadata');
      updateStatusBar();
      if (interactionMode === 'object') { selectRuby(ruby); loadQuickContextFromRuby(ruby); }
      else selectRuby(null);
      setQuickContextStatus('已更新注音数据；正文文字没有被替换。', 'ok');
      return;
    }

    if (contextKind !== 'selection' || !contextRange) return;
    const range = contextRange.cloneRange();
    if (!editor.contains(range.commonAncestorContainer)) { setQuickContextStatus('原选区已经失效，请重新选择正文。', 'error'); return; }
    const chars = Phonetics.graphemes(data.base);
    const readings = data.reading.split(/\s+/).filter(Boolean);
    const pitchGroups = Phonetics.tokenizePitchGroups(data.pitch);
    const creationSource = memoryReuseCandidate && memoryReuseCandidate.base === data.base && memoryReuseCandidate.reading === data.reading && memoryReuseCandidate.language === doc.language ? 'reused' : 'manual';
    const created = [];
    if (data.mode === 'segment' && chars.length > 1) {
      chars.forEach((ch, i) => created.push(makeRuby(ch, readings[i], doc.language, data.mastery, data.note, data.pitch ? pitchGroups[i] : '', creationSource)));
    } else {
      created.push(makeRuby(data.base, data.reading, doc.language, data.mastery, data.note, data.pitch, creationSource));
    }
    const historyBefore = captureEditorSnapshot();
    const inserted = insertAnnotationNodesAtRange(range, created);
    if (!inserted.length) return;
    stabilizeRubyRuntime(inserted);
    for (const ruby of inserted) { await recordRuby(ruby, creationSource); }
    memoryReuseCandidate = null;
    if (interactionMode === 'object') { selectRuby(inserted[inserted.length - 1] || null); if (selectedRuby) loadQuickContextFromRuby(selectedRuby); }
    else selectRuby(null);
    captureAnnotationState(doc); markDirty();
    recordHistory(historyBefore, captureEditorSnapshot(), 'create annotation');
    updateStatusBar();
    setQuickContextStatus(`已建立 ${inserted.length} 个学习对象。`, 'ok');
  }

  function setPitchSystemUI(system = 'none') {
    const normalized = ['none','generic','ja-tokyo'].includes(system) ? system : 'none';
    $('pitchSystemSelect').value = normalized;
    $('genericPitchFields').classList.toggle('hidden', normalized !== 'generic');
    $('japanesePitchFields').classList.toggle('hidden', normalized !== 'ja-tokyo');
    const rep = $('jaPitchRepresentation')?.value || 'accent-nucleus';
    $('jaAccentNucleusFields')?.classList.toggle('hidden', rep !== 'accent-nucleus');
    $('jaManualHLField')?.classList.toggle('hidden', rep !== 'manual-hl');
    if (normalized === 'ja-tokyo') refreshJapanesePitchPreview();
  }

  function resetPitchEditorForNew(doc = activeDoc()) {
    $('pitchInput').value = '';
    $('jaPitchDialect').value = 'ja-Tokyo';
    $('jaPitchRepresentation').value = 'accent-nucleus';
    $('jaMoraInput').value = '';
    $('jaAccentNucleusInput').value = '0';
    $('jaManualHLInput').value = '';
    $('jaParticlePreviewCheck').checked = true;
    // Pitch is optional even in Japanese documents. The learner explicitly opts in.
    setPitchSystemUI('none');
    if (doc?.language !== 'ja') $('pitchSystemSelect').querySelector('option[value="ja-tokyo"]').disabled = true;
    else $('pitchSystemSelect').querySelector('option[value="ja-tokyo"]').disabled = false;
  }

  function loadPitchEditorFromRuby(ruby, doc = activeDoc()) {
    resetPitchEditorForNew(doc);
    if (!ruby) return;
    if (ruby.dataset.pitchSystem === 'ja-tokyo') {
      $('jaPitchDialect').value = ruby.dataset.jaPitchDialect || 'ja-Tokyo';
      $('jaPitchRepresentation').value = ruby.dataset.jaPitchRepresentation || 'accent-nucleus';
      $('jaMoraInput').value = (ruby.dataset.jaMorae || '').replaceAll('|', ' | ');
      $('jaAccentNucleusInput').value = ruby.dataset.jaAccentNucleus || '0';
      $('jaManualHLInput').value = (ruby.dataset.jaManualHl || '').replaceAll('|', ' ');
      setPitchSystemUI('ja-tokyo');
      return;
    }
    if (ruby.dataset.pitch) {
      $('pitchInput').value = ruby.dataset.pitch;
      setPitchSystemUI('generic');
    }
  }

  function japanesePitchDialogInput() {
    return {
      representation: $('jaPitchRepresentation').value,
      moraeRaw: $('jaMoraInput').value,
      accentNucleus: $('jaAccentNucleusInput').value,
      manualHLRaw: $('jaManualHLInput').value
    };
  }

  function japaneseAccentTypeLabel(type) {
    const key = ({heiban:'jpa.type.heiban',atamadaka:'jpa.type.atamadaka',nakadaka:'jpa.type.nakadaka',odaka:'jpa.type.odaka',manual:'jpa.type.manual'})[type];
    return key ? I18n.t(key) : (type || '—');
  }

  function refreshJapanesePitchPreview() {
    const host = $('jaPitchPreview'), status = $('jaPitchValidation'), label = $('jaPitchTypeLabel');
    if (!host || !status || !label) return;
    host.replaceChildren(); label.textContent = '—'; status.className = 'jpa-validation';
    if ($('pitchSystemSelect')?.value !== 'ja-tokyo') return;
    const result = JapanesePitch.validateJapanesePitch(japanesePitchDialogInput());
    if (!result.valid) { status.textContent = result.error; status.classList.add('error'); return; }
    label.textContent = japaneseAccentTypeLabel(result.accentType) + (result.accentNucleus == null ? '' : ` · 核 ${result.accentNucleus}`);
    const ns='http://www.w3.org/2000/svg'; const svg=document.createElementNS(ns,'svg');
    svg.classList.add('jpa-preview-svg'); svg.setAttribute('width','100%'); svg.setAttribute('height','40'); svg.setAttribute('viewBox','0 0 320 40');
    const showParticle = $('jaParticlePreviewCheck').checked && result.representation === 'accent-nucleus';
    drawJapanesePitchPlot(svg, result, {trackStart:4,trackEnd:316,baseStart:8,baseEnd:312}, {showLabels:true,showParticle});
    host.appendChild(svg);
    const schematic = result.levels.join(' ');
    const warningText = result.warnings?.length ? ` · ${result.warnings.join(' ')}` : '';
    status.textContent = `人工音拍 ${result.morae.length}：${result.morae.join(' | ')} · H/L：${schematic}${warningText}`;
    if (result.warnings?.length) status.classList.add('warning');
  }

  function clearJapanesePitchDataset(ruby) {
    for (const name of ['data-ja-pitch-model','data-ja-pitch-dialect','data-ja-pitch-representation','data-ja-morae','data-ja-accent-nucleus','data-ja-manual-hl','data-ja-pitch-source']) ruby.removeAttribute(name);
  }

  function applyPitchDataToRuby(ruby, payload) {
    clearJapanesePitchDataset(ruby);
    if (!payload || payload.system === 'none') {
      ruby.removeAttribute('data-pitch-system'); ruby.dataset.pitch = ''; return;
    }
    if (payload.system === 'generic') {
      ruby.dataset.pitchSystem = 'generic'; ruby.dataset.pitch = payload.pitch || ''; return;
    }
    const j = payload.japanese;
    ruby.dataset.pitchSystem = 'ja-tokyo';
    ruby.dataset.pitch = j.pitchRaw || ''; // backward visual fallback, not semantic source of truth
    ruby.dataset.jaPitchModel = j.model || JapanesePitch.MODEL;
    ruby.dataset.jaPitchDialect = j.dialect || JapanesePitch.DIALECT;
    ruby.dataset.jaPitchRepresentation = j.representation;
    ruby.dataset.jaMorae = j.morae.join('|');
    if (j.accentNucleus == null) ruby.removeAttribute('data-ja-accent-nucleus'); else ruby.dataset.jaAccentNucleus = String(j.accentNucleus);
    if (j.representation === 'manual-hl') ruby.dataset.jaManualHl = j.levels.join('|'); else ruby.removeAttribute('data-ja-manual-hl');
    ruby.dataset.jaPitchSource = 'manual';
  }

  function collectPitchDialogData(doc = activeDoc()) {
    const system = $('pitchSystemSelect').value;
    if (system === 'none') return { valid:true, system:'none', pitch:'' };
    if (system === 'generic') {
      const pitch = $('pitchInput').value.trim();
      const check = Phonetics.validateExplicitPitch(pitch);
      return check.valid ? { valid:true, system:'generic', pitch } : { valid:false, error:check.error };
    }
    if (doc?.language !== 'ja') return { valid:false, error:'日语 Pitch Accent 模型只用于日语文档。' };
    const japanese = JapanesePitch.validateJapanesePitch(japanesePitchDialogInput());
    if (!japanese.valid) return { valid:false, error:japanese.error };
    return { valid:true, system:'ja-tokyo', pitch:japanese.pitchRaw, japanese };
  }

  function openDetailedFromContext() {
    if (contextKind === 'ruby' && selectedRuby?.isConnected) return openRubyEditor(selectedRuby);
    if (contextKind === 'selection' && contextRange) {
      const snapshot = quickContextPayload();
      if (!activateEditorRange(contextRange.cloneRange())) return;
      openAnnotationDialog(snapshot.mode === 'group' ? 'group' : 'segment');
      $('baseInput').value = snapshot.base;
      $('readingInput').value = snapshot.reading;
      if (snapshot.pitch) { $('pitchInput').value = snapshot.pitch; setPitchSystemUI('generic'); }
      $('noteInput').value = snapshot.note;
      $('masterySelect').value = snapshot.mastery;
      $('segmentCheck').checked = snapshot.mode !== 'group';
      return;
    }
    alert('请先选择正文或已有注音对象。');
  }

  function openAnnotationDialog(mode) {
    const sel = getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed || !editor.contains(sel.anchorNode) || !sel.toString().trim()) { alert('请先在正文中选中要标注的文字。'); return; }
    const range = sel.getRangeAt(0);
    const rangeCheck = validateAnnotationSelection(range);
    if (!rangeCheck.valid) {
      alert(rangeCheck.reason === 'annotation'
        ? '新建注音的选区不能碰到已有注音实体。修改已有注音请双击上方注音层。'
        : '新建注音必须严格选择同一正文块内的文字，不能跨段落或复杂对象。');
      return;
    }
    savedRange = range.cloneRange(); editingRuby = null; annotationMode = mode;
    $('annotationDialogTitle').textContent = mode === 'group' ? '整词注音' : '添加注音';
    $('baseInput').value = sel.toString();
    $('readingInput').value = ''; $('noteInput').value = ''; $('masterySelect').value = '0';
    resetPitchEditorForNew(activeDoc());
    $('segmentCheck').checked = mode !== 'group'; $('segmentCheck').disabled = mode === 'group';
    $('deleteAnnotationBtn').classList.add('hidden');
    annotationDialog.showModal(); setTimeout(() => $('readingInput').focus(), 0);
  }

  function positionInlineReadingEditor() {
    const state = inlineReadingEdit; if (!state?.ruby?.isConnected || !state.input?.isConnected) return;
    const reading = state.ruby.querySelector('.reading-text'); if (!reading) return;
    const rect = reading.getBoundingClientRect();
    const style = getComputedStyle(reading);
    const doc = activeDoc();
    const baseScale = Math.max(.3, Number(doc?.typography?.rubyScale) || .65);
    const editScale = Math.min(.95, baseScale + .05);
    const zoomFactor = Math.max(.25, Number(zoom) || 1);
    const renderedFontPx = Math.max(10, (parseFloat(style.fontSize) || 12) * zoomFactor * (editScale / baseScale));
    const linePx = Math.ceil(renderedFontPx * 1.25);
    const width = Math.max(52, rect.width + Math.max(16, renderedFontPx * .9));
    state.input.style.left = `${rect.left + rect.width / 2 - width / 2}px`;
    state.input.style.top = `${rect.top - Math.max(2, renderedFontPx * .08)}px`;
    state.input.style.width = `${width}px`;
    state.input.style.height = `${Math.max(28, linePx + 8)}px`;
    state.input.style.lineHeight = `${linePx}px`;
    state.input.style.fontFamily = style.fontFamily;
    state.input.style.fontSize = `${renderedFontPx}px`;
  }

  function beginInlineReadingEdit(ruby, event = null) {
    if (!ruby?.isConnected) return;
    if (inlineReadingEdit?.ruby === ruby) { inlineReadingEdit.input.focus(); return; }
    if (inlineReadingEdit) finishInlineReadingEdit(true);
    const reading = ruby.querySelector('.reading-text'); if (!reading) return;
    const oldReading = ruby.dataset.reading || '';
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'inline-reading-editor'; input.value = oldReading;
    input.autocomplete = 'off'; input.spellcheck = false;
    const before = captureEditorSnapshot();
    inlineReadingEdit = { ruby, input, oldReading, before, closing:false };
    ruby.classList.add('inline-reading-active'); document.body.appendChild(input); positionInlineReadingEditor();
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); finishInlineReadingEdit(false); editor.focus(); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); finishInlineReadingEdit(true).finally(() => editor.focus()); }
    });
    input.addEventListener('blur', () => { if (inlineReadingEdit?.input === input) finishInlineReadingEdit(true); });
    input.focus();
    const rect = reading.getBoundingClientRect();
    if (event && oldReading.length && rect.width > 1) {
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const pos = Math.max(0, Math.min(oldReading.length, Math.round(ratio * oldReading.length)));
      input.setSelectionRange(pos, pos);
    } else input.select();
  }

  async function finishInlineReadingEdit(commit = true) {
    const state = inlineReadingEdit; if (!state || state.closing) return false;
    state.closing = true; inlineReadingEdit = null;
    const { ruby, input, oldReading, before } = state;
    const nextReading = String(input.value || '').trim();
    ruby?.classList.remove('inline-reading-active'); input.remove();
    if (!commit || !ruby?.isConnected || !nextReading) { schedulePitchLayout(); return false; }
    const wasBaseStale = ruby.dataset.stale === 'true';
    if (nextReading === oldReading && !wasBaseStale) { schedulePitchLayout(); return false; }

    const oldPitch = ruby.dataset.pitch || '';
    const wasPitchStale = ruby.dataset.pitchStale === 'true';
    ruby.dataset.reading = nextReading;
    ruby.dataset.source = 'manual';
    ruby.dataset.confirmedBase = ruby.querySelector('.rb')?.textContent || '';
    ruby.dataset.stale = 'false';
    ruby.dataset.pitchStale = Confirmation.nextPitchStale({ oldReading, newReading:nextReading, oldPitch, newPitch:oldPitch, pitchSystem:ruby.dataset.pitchSystem, wasBaseStale, wasPitchStale }) ? 'true' : 'false';
    renderRuby(ruby); syncRubyIntegrity(ruby);
    recordHistory(before, captureEditorSnapshot(), 'inline annotation reading', '');
    await handleEditorInput();
    return true;
  }

  function openRubyEditor(ruby) {
    finishInlineReadingEdit(false);
    editingRuby = ruby; savedRange = null; annotationMode = 'group'; if (interactionMode === 'object') selectRuby(ruby); else selectRuby(null);
    $('annotationDialogTitle').textContent = '编辑注音对象';
    $('baseInput').value = ruby.querySelector('.rb')?.textContent || '';
    $('readingInput').value = ruby.dataset.reading || '';
    loadPitchEditorFromRuby(ruby, activeDoc());
    $('noteInput').value = ruby.dataset.note || '';
    $('masterySelect').value = ruby.dataset.mastery || '0';
    $('segmentCheck').checked = false; $('segmentCheck').disabled = true;
    $('deleteAnnotationBtn').classList.remove('hidden');
    annotationDialog.showModal();
  }

  function activateEditorRange(range) {
    if (!range) return false;
    editor.focus();
    const sel = getSelection(); if (!sel) return false;
    sel.removeAllRanges(); sel.addRange(range);
    return true;
  }

  function insertAnnotationNodesAtRange(range, nodes) {
    if (!range || !nodes?.length || !editor.contains(range.commonAncestorContainer)) return [];
    const work = range.cloneRange();
    const sel = getSelection(); if (!sel) return [];
    editor.focus();
    historySuppressed++;
    try {
      work.deleteContents();
      const frag = document.createDocumentFragment();
      for (const node of nodes) frag.appendChild(node);
      const last = nodes[nodes.length - 1];
      work.insertNode(frag);
      const caret = document.createRange(); caret.setStartAfter(last); caret.collapse(true);
      sel.removeAllRanges(); sel.addRange(caret);
    } finally { historySuppressed = Math.max(0, historySuppressed - 1); }
    return nodes.filter(n => n?.isConnected && editor.contains(n));
  }

  function nodesToHtml(nodes) {
    const host = document.createElement('div');
    for (const node of nodes) {
      const clone = node.cloneNode(true);
      clone.querySelectorAll?.('ruby.phono rt').forEach(rt => { rt.replaceChildren(); rt.removeAttribute('contenteditable'); });
      host.appendChild(clone);
    }
    return host.innerHTML;
  }

  function findRubyByAnnotationId(id) {
    return [...editor.querySelectorAll('ruby.phono')].find(r => r.dataset.annotationId === id) || null;
  }

  function endpointRuby(node) {
    const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return el?.closest?.('ruby.phono') || null;
  }

  function cutCrossesAnnotationBoundary(range) {
    const startRuby = endpointRuby(range?.startContainer);
    const endRuby = endpointRuby(range?.endContainer);
    if (startRuby === endRuby) {
      if (!startRuby) return false;
      const asElement = node => node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      const startRb = asElement(range.startContainer)?.closest?.('.rb');
      const endRb = asElement(range.endContainer)?.closest?.('.rb');
      // Cutting within the editable base layer is fine. The upper rt layer is an
      // edit handle, not document text, and must never be structurally cut apart.
      return !(startRb && endRb && startRb === endRb);
    }
    return !!(startRuby || endRuby);
  }

  function writeCanonicalSelectionToClipboard(event, cut = false) {
    const sel = getSelection();
    if (!sel?.rangeCount || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    if (cut && cutCrossesAnnotationBoundary(range)) {
      event.preventDefault();
      alert('为了保护注音实体，剪切不能从普通正文跨进或跨出半个注音对象。可以只剪正文内部，或完整选中整个注音对象。');
      return;
    }
    const host = document.createElement('div');
    host.appendChild(range.cloneContents());
    const html = sanitizeEditorHtml(host.innerHTML);
    event.clipboardData?.setData('text/plain', range.toString());
    if (html) event.clipboardData?.setData('text/html', html);
    event.preventDefault();
    if (!cut) return;

    const before = captureEditorSnapshot();
    historySuppressed++;
    try {
      range.deleteContents(); range.collapse(true);
      const nextSel = getSelection(); nextSel.removeAllRanges(); nextSel.addRange(range);
    } finally { historySuppressed = Math.max(0, historySuppressed - 1); }
    recordHistory(before, captureEditorSnapshot(), 'cut');
    handleEditorInput().catch(err => console.warn('cut reconciliation failed', err));
  }

  async function applyAnnotation() {
    const base = $('baseInput').value;
    const reading = $('readingInput').value.trim();
    const note = $('noteInput').value.trim();
    const mastery = $('masterySelect').value;
    if (!base) { alert('正文不能为空。'); return; }
    if (!reading) { alert('请亲手输入这次要保存的读音 / 表音。'); return; }
    const doc = activeDoc(); if (!doc) return;
    const pitchPayload = collectPitchDialogData(doc);
    if (!pitchPayload.valid) { alert(pitchPayload.error); return; }
    const pitch = pitchPayload.pitch || '';

    if (editingRuby) {
      const historyBefore = captureEditorSnapshot();
      const ruby = editingRuby;
      const currentBase = ruby.querySelector('.rb')?.textContent || '';
      annotationDialog.close(); editingRuby = null; savedRange = null;
      // Double-clicking the upper phonetic layer edits only annotation metadata.
      // Base text remains the normal editable document layer and is never replaced
      // from this dialog. Saving also reconfirms the current base/reading pairing.
      ruby.dataset.reading = reading;
      applyPitchDataToRuby(ruby, pitchPayload);
      ruby.dataset.note = note;
      ruby.dataset.mastery = mastery;
      ruby.dataset.profile = ruby.dataset.profile || doc.language;
      ruby.dataset.source = 'manual';
      ruby.dataset.confirmedBase = currentBase;
      ruby.dataset.stale = 'false';
      ruby.dataset.pitchStale = 'false';
      renderRuby(ruby); syncRubyIntegrity(ruby);
      await recordRuby(ruby, 'manual');
      captureAnnotationState(doc); markDirty();
      recordHistory(historyBefore, captureEditorSnapshot(), 'annotation metadata');
      updateStatusBar();
      if (interactionMode === 'object') selectRuby(ruby); else selectRuby(null);
      return;
    }

    if (!savedRange) return;
    const range = savedRange.cloneRange();
    const selectedText = range.toString();
    const chars = Phonetics.graphemes(base);
    const readings = reading.split(/\s+/).filter(Boolean);
    const pitchGroups = Phonetics.tokenizePitchGroups(pitch);
    const wantsSplit = annotationMode === 'segment' && $('segmentCheck').checked && chars.length > 1;
    if (wantsSplit && pitchPayload.system === 'ja-tokyo') {
      alert('日语 Pitch Accent 以词内 mora 和アクセント核为单位，不能拆成逐汉字 annotation。请取消逐字对齐，使用整词注音。');
      return;
    }
    if (wantsSplit && readings.length !== chars.length) {
      alert(`逐字对齐要求 ${chars.length} 个字符对应 ${chars.length} 段人工读音；当前输入 ${readings.length} 段。若不想逐字拆分，请取消“按空格逐字对齐”或使用整词注音。`);
      return;
    }
    const split = wantsSplit && readings.length === chars.length;
    if (split && pitch && pitchGroups.length !== chars.length) {
      alert('逐字拆分时，如果填写音高，请用“|”给每个字符分别提供一条人工音高轨迹；或者改用整词注音。');
      return;
    }
    const created = [];
    if (split) {
      chars.forEach((ch, i) => created.push(makeRuby(ch, readings[i], doc.language, mastery, note, pitch ? pitchGroups[i] : '', 'manual')));
    } else {
      const ruby = makeRuby(base || selectedText, reading, doc.language, mastery, note, pitch, 'manual');
      applyPitchDataToRuby(ruby, pitchPayload);
      renderRuby(ruby);
      created.push(ruby);
    }
    // Close the modal before restoring the editor range: a modal dialog makes the
    // background editor inert. Annotation insertion itself is DOM-range based so
    // strict end-of-paragraph selections cannot be repaired into malformed ruby.
    annotationDialog.close(); savedRange = null;
    const historyBefore = captureEditorSnapshot();
    const inserted = insertAnnotationNodesAtRange(range, created);
    if (!inserted.length) return;
    stabilizeRubyRuntime(inserted);
    for (const r of inserted) { await recordRuby(r, 'manual'); }
    if (interactionMode === 'object') selectRuby(inserted[inserted.length - 1] || null); else selectRuby(null);
    captureAnnotationState(doc); markDirty();
    recordHistory(historyBefore, captureEditorSnapshot(), 'create annotation');
    updateStatusBar();
  }

  function makeRuby(base, reading, profile, mastery = '0', note = '', pitch = '', source = 'manual', annotationId = '') {
    const ruby = document.createElement('ruby'); ruby.className = 'phono';
    ruby.dataset.annotationId = annotationId || randomId('ann'); ruby.dataset.reading = reading; ruby.dataset.profile = profile;
    ruby.dataset.mastery = mastery; ruby.dataset.note = note; ruby.dataset.pitch = pitch; ruby.dataset.source = source;
    ruby.dataset.confirmedBase = base; ruby.dataset.stale = 'false'; ruby.dataset.pitchStale = 'false';
    const rb = document.createElement('span'); rb.className = 'rb'; rb.textContent = base;
    const rt = document.createElement('rt'); rt.contentEditable = 'false'; ruby.append(rb, rt);
    applyRubyInteractivity(ruby); renderRuby(ruby); syncRubyIntegrity(ruby); return ruby;
  }

  function renderRuby(ruby) {
    let rt = ruby.querySelector('rt'); if (!rt) { rt = document.createElement('rt'); ruby.appendChild(rt); }
    rt.innerHTML = '';
    const box = document.createElement('span'); box.className = 'ruby-rt-box';
    const reading = document.createElement('span'); reading.className = 'reading-text'; reading.textContent = ruby.dataset.reading || '';
    box.appendChild(reading);
    const japanese = ruby.dataset.pitchSystem === 'ja-tokyo' ? JapanesePitch.fromDataset(ruby.dataset) : null;
    const pitch = ruby.dataset.pitch || '';
    if (japanese?.valid) {
      const plot = buildJapanesePitchSvg(japanese);
      plot.title = `Tokyo pitch accent · ${japanese.accentType}${japanese.accentNucleus == null ? '' : ` · nucleus ${japanese.accentNucleus}`}`;
      box.appendChild(plot);
    } else if (pitch) box.appendChild(buildPitchSvg(pitch));
    else { const empty = document.createElement('span'); empty.className = 'pitch-unavailable'; empty.textContent = '—'; box.appendChild(empty); }
    rt.appendChild(box);
    schedulePitchLayout();
  }

  // v0.6.2 pitch layout: the five staff lines occupy the full ruby advance box.
  // Consecutive ruby objects therefore join naturally when the source text has no
  // whitespace/punctuation between them. Tone contours, however, are aligned to
  // the actual base-text span rather than to the (often wider) romanization label.
  function buildPitchSvg(raw) {
    const contours = Phonetics.parseExplicitPitch(raw);
    if (!contours.length) { const s = document.createElement('span'); s.className = 'pitch-unavailable'; s.textContent = '—'; return s; }
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('pitch-plot');
    svg.dataset.pitch = raw;
    // A compact bootstrap width prevents the SVG from manufacturing artificial
    // inter-character spacing before the post-layout pass measures the ruby box.
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '24');
    svg.setAttribute('viewBox', '0 0 20 24');
    drawPitchPlot(svg, contours, { trackStart: 0, trackEnd: 20, baseStart: 0, baseEnd: 20 });
    return svg;
  }

  function buildJapanesePitchSvg(model) {
    if (!model?.valid || !model.levels?.length) { const s = document.createElement('span'); s.className = 'pitch-unavailable'; s.textContent = '—'; return s; }
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('pitch-plot', 'ja-pitch-plot');
    svg.dataset.jaPitchModel = model.model || JapanesePitch.MODEL;
    svg.setAttribute('width', '20'); svg.setAttribute('height', '24'); svg.setAttribute('viewBox', '0 0 20 24');
    drawJapanesePitchPlot(svg, model, { trackStart:0, trackEnd:20, baseStart:0, baseEnd:20 });
    return svg;
  }

  function drawJapanesePitchPlot(svg, model, geometry, options = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const { trackStart = 0, trackEnd = 20, baseStart = 0, baseEnd = 20 } = geometry;
    const showLabels = Boolean(options.showLabels);
    const showParticle = Boolean(options.showParticle && model?.representation === 'accent-nucleus');
    svg.replaceChildren();
    for (let level = 1; level <= 5; level++) {
      const y = 3 + (5 - level) * 4.5;
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', String(trackStart)); l.setAttribute('x2', String(trackEnd));
      l.setAttribute('y1', String(y)); l.setAttribute('y2', String(y)); l.setAttribute('class', 'pitch-grid-line'); svg.appendChild(l);
    }
    const levels = model.levels || [];
    const n = Math.max(1, levels.length);
    const span = Math.max(1, baseEnd - baseStart);
    const usableEnd = showParticle ? baseStart + span * (n / (n + 1)) : baseEnd;
    const wordSpan = Math.max(1, usableEnd - baseStart);
    const cell = wordSpan / n;
    const point = (level, i) => ({ x: baseStart + cell * (i + .5), y: 3 + (5 - (level === 'H' ? 4 : 2)) * 4.5 });
    const pts = levels.map(point);
    if (pts.length) {
      const poly = document.createElementNS(ns, 'polyline');
      poly.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' ')); poly.setAttribute('class', 'ja-pitch-contour'); poly.setAttribute('vector-effect','non-scaling-stroke'); svg.appendChild(poly);
      pts.forEach(p => { const c=document.createElementNS(ns,'circle'); c.setAttribute('cx',String(p.x)); c.setAttribute('cy',String(p.y)); c.setAttribute('r','1.45'); c.setAttribute('class','ja-pitch-dot'); svg.appendChild(c); });
    }
    if (model.representation === 'accent-nucleus' && Number(model.accentNucleus) > 0) {
      const a = Number(model.accentNucleus);
      const x = baseStart + cell * a;
      const tri = document.createElementNS(ns, 'path');
      tri.setAttribute('d', `M ${x-2.2} 1 L ${x+2.2} 1 L ${x} 4.2 Z`); tri.setAttribute('class','ja-accent-marker'); svg.appendChild(tri);
    }
    if (showParticle) {
      const pLevel = model.particleLevel || 'L';
      const px = baseStart + cell * (n + .5); const py = 3 + (5 - (pLevel === 'H' ? 4 : 2)) * 4.5;
      if (pts.length) { const link=document.createElementNS(ns,'line'); link.setAttribute('x1',String(pts[pts.length-1].x)); link.setAttribute('y1',String(pts[pts.length-1].y)); link.setAttribute('x2',String(px)); link.setAttribute('y2',String(py)); link.setAttribute('class','ja-particle-contour'); svg.appendChild(link); }
      const c=document.createElementNS(ns,'circle'); c.setAttribute('cx',String(px)); c.setAttribute('cy',String(py)); c.setAttribute('r','1.6'); c.setAttribute('class','ja-particle-dot'); svg.appendChild(c);
    }
    if (showLabels) {
      (model.morae || []).forEach((m,i)=>{ const t=document.createElementNS(ns,'text'); t.setAttribute('x',String(baseStart+cell*(i+.5))); t.setAttribute('y','34'); t.setAttribute('class','ja-mora-label'); t.textContent=m; svg.appendChild(t); });
      if (showParticle) { const t=document.createElementNS(ns,'text'); t.setAttribute('x',String(baseStart+cell*(n+.5))); t.setAttribute('y','34'); t.setAttribute('class','ja-particle-label'); t.textContent='助'; svg.appendChild(t); }
    }
  }

  function drawPitchPlot(svg, contours, geometry) {
    const ns = 'http://www.w3.org/2000/svg';
    const { trackStart = 0, trackEnd = 20, baseStart, baseEnd } = geometry;
    svg.replaceChildren();

    // Five-degree staff: deliberately edge-to-edge. Adjacent annotation boxes
    // touch when the underlying source characters touch, so no fake word gap is
    // inserted by the pitch renderer. Real spaces/punctuation remain real gaps.
    for (let level = 1; level <= 5; level++) {
      const y = 3 + (5 - level) * 4.5;
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', String(trackStart)); l.setAttribute('x2', String(trackEnd));
      l.setAttribute('y1', String(y)); l.setAttribute('y2', String(y));
      l.setAttribute('class', 'pitch-grid-line'); svg.appendChild(l);
    }

    const span = Math.max(1, baseEnd - baseStart);
    const cellCount = Math.max(1, contours.length);
    const cellWidth = span / cellCount;
    contours.forEach((levels, gi) => {
      const cellLeft = baseStart + gi * cellWidth;
      const cellRight = cellLeft + cellWidth;
      // Small contour padding stays inside each character/syllable cell, while
      // the five horizontal staff lines remain continuous across cell borders.
      const pad = Math.min(3.5, cellWidth * 0.12);
      const x0 = cellLeft + pad;
      const x1 = Math.max(x0, cellRight - pad);
      const points = levels.map((level, i) => {
        const ratio = levels.length <= 1 ? .5 : i / (levels.length - 1);
        const x = x0 + (x1 - x0) * ratio;
        return `${x},${3 + (5 - level) * 4.5}`;
      }).join(' ');
      const poly = document.createElementNS(ns, 'polyline');
      poly.setAttribute('points', points); poly.setAttribute('class', 'pitch-contour');
      poly.setAttribute('vector-effect', 'non-scaling-stroke'); svg.appendChild(poly);
      levels.forEach((level, i) => {
        const ratio = levels.length <= 1 ? .5 : i / (levels.length - 1);
        const x = x0 + (x1 - x0) * ratio;
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', String(x)); c.setAttribute('cy', String(3 + (5 - level) * 4.5));
        c.setAttribute('r', '1.45'); c.setAttribute('class', 'pitch-dot'); svg.appendChild(c);
      });
    });
  }

  let pitchLayoutFrame = 0;
  function schedulePitchLayout() {
    if (pitchLayoutFrame) cancelAnimationFrame(pitchLayoutFrame);
    pitchLayoutFrame = requestAnimationFrame(() => {
      pitchLayoutFrame = requestAnimationFrame(() => {
        pitchLayoutFrame = 0;
        layoutPitchPlots();
      });
    });
  }

  function layoutPitchPlots() {
    const currentZoom = Math.max(.01, Number(zoom) || 1);
    editor.querySelectorAll('ruby.phono').forEach(ruby => {
      const svg = ruby.querySelector('.pitch-plot');
      const rb = ruby.querySelector('.rb');
      if (!svg || !rb) return;
      const japanese = ruby.dataset.pitchSystem === 'ja-tokyo' ? JapanesePitch.fromDataset(ruby.dataset) : null;
      const contours = japanese?.valid ? null : Phonetics.parseExplicitPitch(svg.dataset.pitch || ruby.dataset.pitch || '');
      if (!japanese?.valid && !contours?.length) return;

      const rubyRect = ruby.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(rb);
      const baseRect = range.getBoundingClientRect();
      if (!(rubyRect.width > 0) || !(baseRect.width > 0)) return;

      // Keep the SVG's CSS width equal to the ruby advance box. Romanization may
      // legitimately make that box wider; the contour is still mapped only over
      // the real base characters. CSS zoom is factored out before assigning width.
      const cssWidth = Math.max(1, rubyRect.width / currentZoom);
      svg.setAttribute('width', String(cssWidth));
      svg.setAttribute('viewBox', `0 0 ${cssWidth} 24`);

      const baseStart = Math.max(0, Math.min(cssWidth, (baseRect.left - rubyRect.left) / currentZoom));
      const baseEnd = Math.max(baseStart + .5, Math.min(cssWidth, (baseRect.right - rubyRect.left) / currentZoom));
      if (japanese?.valid) drawJapanesePitchPlot(svg, japanese, { trackStart:0, trackEnd:cssWidth, baseStart, baseEnd });
      else drawPitchPlot(svg, contours, { trackStart: 0, trackEnd: cssWidth, baseStart, baseEnd });
    });
  }

  function rerenderAllRubies() {
    editor.querySelectorAll('ruby.phono').forEach(r => { applyRubyInteractivity(r); renderRuby(r); syncRubyIntegrity(r); });
    schedulePitchLayout(); scheduleEditingGuides();
    updateStatusBar();
  }

  // Chromium can finish normalizing an execCommand('insertHTML') editing transaction
  // after the synchronous call returns. Because runtime phonetic UI lives inside <rt>,
  // render it once immediately and once on the next frame so the browser cannot
  // overwrite the freshly generated upper layer with the canonical empty <rt> that
  // was inserted for persistence. Stored .phonodoc HTML remains canonical/empty-rt.
  function stabilizeRubyRuntime(rubies) {
    const list = [...(rubies || [])];
    const run = () => list.filter(r => r?.isConnected).forEach(r => { applyRubyInteractivity(r); renderRuby(r); syncRubyIntegrity(r); });
    run();
    requestAnimationFrame(() => { run(); schedulePitchLayout(); scheduleEditingGuides(); });
  }
  function selectRuby(ruby) {
    if (selectedRuby) selectedRuby.classList.remove('annotation-selected');
    selectedRuby = interactionMode === 'object' ? ruby : null;
    if (selectedRuby) selectedRuby.classList.add('annotation-selected');
  }

  async function clearSelectedAnnotation() {
    if (!selectedRuby) { alert('先单击一个已有注音对象。'); return; }
    await unwrapRuby(selectedRuby); selectRuby(null); updateStatusBar();
  }
  async function deleteEditingRuby() {
    if (!editingRuby) return;
    const r = editingRuby; annotationDialog.close(); editingRuby = null; await unwrapRuby(r); selectRuby(null); updateStatusBar();
  }
  async function unwrapRuby(ruby) {
    const doc = activeDoc(); if (!doc || !ruby?.isConnected) return;
    const id = ruby.dataset.annotationId;
    const text = ruby.querySelector('.rb')?.textContent || '';
    const historyBefore = captureEditorSnapshot();
    const range = document.createRange(); range.selectNode(ruby);
    historySuppressed++;
    try {
      if (!activateEditorRange(range) || !document.execCommand('insertText', false, text)) ruby.replaceWith(document.createTextNode(text));
    } finally { historySuppressed = Math.max(0, historySuppressed - 1); }
    markDirty();
    if (dbReady && id) await LearningDB.removeObservation(doc.id, id).catch(() => {});
    captureAnnotationState(doc);
    recordHistory(historyBefore, captureEditorSnapshot(), 'remove annotation');
  }

  function revealAllTemporarily() {
    const rubies = [...editor.querySelectorAll('ruby.phono')]; rubies.forEach(r => r.classList.add('reveal'));
    setTimeout(() => rubies.forEach(r => r.classList.remove('reveal')), 3500);
  }

  function annotationDataFromRuby(ruby, doc = activeDoc()) {
    return {
      annotationId: ruby.dataset.annotationId || '',
      language: ruby.dataset.profile || doc?.language || 'ja',
      base: ruby.querySelector('.rb')?.textContent || '',
      reading: ruby.dataset.reading || '',
      pitch: ruby.dataset.pitch || '',
      pitchSystem: ruby.dataset.pitchSystem || '',
      jaPitchModel: ruby.dataset.jaPitchModel || '',
      jaPitchDialect: ruby.dataset.jaPitchDialect || '',
      jaPitchRepresentation: ruby.dataset.jaPitchRepresentation || '',
      jaMorae: ruby.dataset.jaMorae || '',
      jaAccentNucleus: ruby.dataset.jaAccentNucleus || '',
      jaManualHl: ruby.dataset.jaManualHl || '',
      jaPitchSource: ruby.dataset.jaPitchSource || '',
      note: ruby.dataset.note || '',
      mastery: ruby.dataset.mastery || '0',
      source: ruby.dataset.source || 'manual',
      confirmedBase: ruby.dataset.confirmedBase || (ruby.querySelector('.rb')?.textContent || ''),
      stale: ruby.dataset.stale === 'true',
      pitchStale: ruby.dataset.pitchStale === 'true'
    };
  }

  function annotationState(doc = activeDoc()) {
    const map = new Map();
    if (!doc) return map;
    editor.querySelectorAll('ruby.phono').forEach(ruby => {
      let id = ruby.dataset.annotationId;
      if (!id || map.has(id)) { id = randomId('ann'); ruby.dataset.annotationId = id; }
      map.set(id, annotationDataFromRuby(ruby, doc));
    });
    return map;
  }

  function annotationSignature(item) {
    return JSON.stringify([item.language, item.base, item.reading, item.pitch, item.pitchSystem, item.jaPitchModel, item.jaPitchDialect, item.jaPitchRepresentation, item.jaMorae, item.jaAccentNucleus, item.jaManualHl, item.jaPitchSource, item.note, item.mastery, item.source, item.confirmedBase, item.stale, item.pitchStale]);
  }

  function captureAnnotationState(doc = activeDoc()) {
    if (!doc) return new Map();
    const state = annotationState(doc);
    annotationStateByDoc.set(doc.id, state);
    return state;
  }

  async function recordAnnotationData(doc, item) {
    if (!dbReady || !doc || !item?.annotationId || item.stale || !['manual', 'reused'].includes(item.source)) return;
    const keepPitch = !item.pitchStale;
    await LearningDB.upsertObservation({
      documentId: doc.id, documentTitle: doc.title, annotationId: item.annotationId,
      language: item.language || doc.language, base: item.base, reading: item.reading,
      pitch: keepPitch ? item.pitch : '', pitchSystem:keepPitch ? item.pitchSystem : '', jaPitchModel:keepPitch ? item.jaPitchModel : '',
      jaPitchDialect:keepPitch ? item.jaPitchDialect : '', jaPitchRepresentation:keepPitch ? item.jaPitchRepresentation : '',
      jaMorae:keepPitch ? item.jaMorae : '', jaAccentNucleus:keepPitch ? item.jaAccentNucleus : '', jaManualHl:keepPitch ? item.jaManualHl : '',
      jaPitchSource:keepPitch ? item.jaPitchSource : '', note: item.note, mastery: item.mastery, source: item.source
    });
  }

  async function handleEditorInput() {
    const doc = activeDoc(); if (!doc) return;
    if (selectedRuby && !selectedRuby.isConnected) selectRuby(null);
    markDirty(); schedulePitchLayout(); scheduleEditingGuides();
    editor.querySelectorAll('ruby.phono').forEach(syncRubyIntegrity);
    const previous = annotationStateByDoc.get(doc.id) || new Map();
    const current = annotationState(doc);
    annotationStateByDoc.set(doc.id, current);
    if (!dbReady) return;
    const tasks = [];
    for (const [id, oldItem] of previous) {
      if (!current.has(id) && ['manual', 'reused'].includes(oldItem.source)) tasks.push(LearningDB.removeObservation(doc.id, id));
    }
    for (const [id, item] of current) {
      const oldItem = previous.get(id);
      if (!item.stale && ['manual', 'reused'].includes(item.source) && (!oldItem || annotationSignature(oldItem) !== annotationSignature(item))) tasks.push(recordAnnotationData(doc, item));
    }
    if (tasks.length) { await Promise.allSettled(tasks); await refreshDbSummary(); }
  }

  function retrievalEligibleItems() {
    const doc = activeDoc(); if (!doc) return [];
    return [...editor.querySelectorAll('ruby.phono')].map(ruby => {
      const base = ruby.querySelector('.rb')?.textContent || '';
      const reading = ruby.dataset.reading || '';
      if (!base || !reading || ruby.dataset.stale === 'true') return null;
      const language = ruby.dataset.profile || doc.language;
      const pitchStale = ruby.dataset.pitchStale === 'true';
      return {
        annotationId: ruby.dataset.annotationId || '',
        entryKey: LearningCore.makeEntryKey({language,base,reading}),
        language, base, reading,
        pitch: pitchStale ? '' : (ruby.dataset.pitch || ''),
        pitchSystem: pitchStale ? '' : (ruby.dataset.pitchSystem || ''),
        jaPitchModel: pitchStale ? '' : (ruby.dataset.jaPitchModel || ''),
        jaPitchDialect: pitchStale ? '' : (ruby.dataset.jaPitchDialect || ''),
        jaPitchRepresentation: pitchStale ? '' : (ruby.dataset.jaPitchRepresentation || ''),
        jaMorae: pitchStale ? '' : (ruby.dataset.jaMorae || ''),
        jaAccentNucleus: pitchStale ? '' : (ruby.dataset.jaAccentNucleus || ''),
        jaManualHl: pitchStale ? '' : (ruby.dataset.jaManualHl || ''),
        jaPitchSource: pitchStale ? '' : (ruby.dataset.jaPitchSource || ''),
        note: ruby.dataset.note || '', mastery: ruby.dataset.mastery || '0', source: ruby.dataset.source || 'manual'
      };
    }).filter(Boolean);
  }

  async function startRetrievalSession() {
    if (!dbReady) throw new Error('个人积累数据库当前不可用；检索练习需要记录学习事件，因此没有静默降级。');
    const doc = activeDoc(); if (!doc) return;
    syncActiveFromEditor();
    const eligible = retrievalEligibleItems();
    if (!eligible.length) throw new Error('当前文档没有可用于检索的已确认注音。stale 注音和空读音不会进入练习。');
    const count = $('retrievalCountSelect')?.value || '10';
    const order = $('retrievalOrderSelect')?.value === 'shuffle' ? 'shuffle' : 'document';
    const queue = Retrieval.selectQueue(eligible, count, order === 'shuffle');
    const id = randomId('retrieval');
    const startedAt = Date.now();
    const sessionRecord = {
      id, documentId: doc.id, documentTitle: doc.title, language: ([...new Set(queue.map(x => x.language))].length === 1 ? queue[0].language : 'mixed'),
      startedAt, plannedCount: queue.length, order
    };
    await LearningDB.startRetrievalSession(sessionRecord);
    retrievalSession = { ...sessionRecord, queue, index: 0, events: [], finished: false };
    $('retrievalSummaryView').classList.add('hidden');
    $('retrievalPracticeView').classList.remove('hidden');
    $('retrievalEndBtn').classList.remove('hidden');
    retrievalDialog.showModal();
    showRetrievalItem();
  }

  function currentRetrievalItem() {
    return retrievalSession?.queue?.[retrievalSession.index] || null;
  }

  function resetRetrievalRatings() {
    retrievalReadingRating = '';
    retrievalPitchRating = 'unrated';
    document.querySelectorAll('[data-retrieval-reading-rating],[data-retrieval-pitch-rating]').forEach(b => b.classList.remove('selected'));
    $('retrievalNextBtn').disabled = true;
  }

  function retrievalPitchText(item) {
    if (item?.pitchSystem === 'ja-tokyo') {
      const model = JapanesePitch.validateJapanesePitch({
        representation:item.jaPitchRepresentation || 'accent-nucleus',
        moraeRaw:item.jaMorae || '', accentNucleus:item.jaAccentNucleus,
        manualHLRaw:item.jaManualHl || ''
      });
      if (model.valid) {
        const type = japaneseAccentTypeLabel(model.accentType);
        return `東京式 · ${model.morae.join('｜')} · ${model.levels.join(' ')}${model.accentNucleus == null ? '' : ` · 核 ${model.accentNucleus} (${type})`}`;
      }
    }
    return item?.pitch || I18n.t('retrieval.noPitch');
  }

  function showRetrievalItem() {
    const item = currentRetrievalItem();
    if (!item) { finishRetrievalSession(false).catch(showError); return; }
    retrievalItemShownAt = Date.now();
    retrievalRevealMode = 'none';
    retrievalRevealedAt = 0;
    resetRetrievalRatings();
    $('retrievalProgress').textContent = `${retrievalSession.index + 1} / ${retrievalSession.queue.length}`;
    $('retrievalSessionMode').textContent = retrievalSession.order === 'shuffle' ? I18n.t('retrieval.order.shuffle') : I18n.t('retrieval.order.document');
    $('retrievalPromptBase').textContent = item.base;
    const retrievalLanguageLabel = item.language === 'ja' ? I18n.t('lang.ja') : (item.language === 'zh-Mandarin' ? I18n.t('lang.mandarin') : (item.language === 'yue' ? I18n.t('lang.yue') : (LANGUAGE[item.language]?.label || item.language)));
    $('retrievalPromptSource').textContent = `${activeDoc()?.title || retrievalSession.documentTitle} · ${retrievalLanguageLabel}`;
    $('retrievalAnswerReading').textContent = item.reading;
    $('retrievalAnswerPitch').textContent = retrievalPitchText(item);
    $('retrievalPitchBlock').classList.toggle('muted-answer', !item.pitch);
    $('retrievalPitchRatingRow').classList.toggle('hidden', !item.pitch);
    $('retrievalAnswerPanel').classList.add('hidden');
    $('retrievalRatingPanel').classList.add('hidden');
    $('retrievalRevealActions').classList.remove('hidden');
    $('retrievalNextBtn').textContent = retrievalSession.index === retrievalSession.queue.length - 1 ? I18n.t('retrieval.finish') : I18n.t('retrieval.next');
  }

  function revealRetrievalAnswer(mode) {
    if (!currentRetrievalItem() || !['after-recall', 'direct'].includes(mode)) return;
    retrievalRevealMode = mode;
    retrievalRevealedAt = Date.now();
    $('retrievalRevealActions').classList.add('hidden');
    $('retrievalAnswerPanel').classList.remove('hidden');
    $('retrievalRatingPanel').classList.remove('hidden');
  }

  function setRetrievalRating(kind, value) {
    if (!['again', 'hard', 'good', 'easy', 'unrated'].includes(value)) return;
    const attr = kind === 'pitch' ? 'data-retrieval-pitch-rating' : 'data-retrieval-reading-rating';
    document.querySelectorAll(`[${attr}]`).forEach(b => b.classList.toggle('selected', b.getAttribute(attr) === value));
    if (kind === 'pitch') retrievalPitchRating = value;
    else retrievalReadingRating = value;
    $('retrievalNextBtn').disabled = !retrievalReadingRating;
  }

  async function persistRetrievalEvent({ skipped = false } = {}) {
    const item = currentRetrievalItem(); if (!item || !retrievalSession) return null;
    const ratedAt = Date.now();
    const event = Retrieval.makeEvent({
      id: `${retrievalSession.id}::${String(retrievalSession.index + 1).padStart(4, '0')}`,
      sessionId: retrievalSession.id,
      sequence: retrievalSession.index,
      documentId: retrievalSession.documentId,
      documentTitle: retrievalSession.documentTitle,
      annotationId: item.annotationId,
      entryKey: item.entryKey,
      language: item.language,
      base: item.base,
      reading: item.reading,
      pitch: item.pitch,
      pitchSystem:item.pitchSystem, jaPitchModel:item.jaPitchModel, jaPitchDialect:item.jaPitchDialect,
      jaPitchRepresentation:item.jaPitchRepresentation, jaMorae:item.jaMorae,
      jaAccentNucleus:item.jaAccentNucleus, jaManualHl:item.jaManualHl, jaPitchSource:item.jaPitchSource,
      source: item.source,
      masteryAtReview: item.mastery,
      revealMode: skipped ? 'none' : retrievalRevealMode,
      readingRating: skipped ? 'skipped' : retrievalReadingRating,
      pitchRating: skipped ? 'skipped' : (item.pitch ? retrievalPitchRating : 'unrated'),
      shownAt: retrievalItemShownAt,
      revealedAt: skipped ? 0 : retrievalRevealedAt,
      ratedAt,
      durationMs: Math.max(0, ratedAt - retrievalItemShownAt),
      skipped
    }, ratedAt);
    await LearningDB.recordRetrievalEvent(event);
    retrievalSession.events.push(event);
    return event;
  }

  async function skipRetrievalItem() {
    if (!retrievalSession || retrievalSession.finished) return;
    await persistRetrievalEvent({ skipped: true });
    retrievalSession.index += 1;
    if (retrievalSession.index >= retrievalSession.queue.length) await finishRetrievalSession(false);
    else showRetrievalItem();
  }

  async function commitRetrievalItem() {
    if (!retrievalSession || retrievalSession.finished || !retrievalReadingRating || retrievalRevealMode === 'none') return;
    await persistRetrievalEvent({ skipped: false });
    retrievalSession.index += 1;
    if (retrievalSession.index >= retrievalSession.queue.length) await finishRetrievalSession(false);
    else showRetrievalItem();
  }

  async function finishRetrievalSession(endedEarly = false) {
    if (!retrievalSession || retrievalSession.finished) { if (retrievalDialog.open) retrievalDialog.close(); return; }
    retrievalSession.finished = true;
    const summary = Retrieval.summarizeEvents(retrievalSession.events);
    await LearningDB.finishRetrievalSession(retrievalSession.id, {
      endedAt: Date.now(), endedEarly: Boolean(endedEarly && retrievalSession.index < retrievalSession.queue.length),
      plannedCount: retrievalSession.queue.length,
      completedCount: summary.completedCount,
      skippedCount: summary.skippedCount,
      afterRecallCount: summary.afterRecallCount,
      directRevealCount: summary.directRevealCount
    });
    $('retrievalPracticeView').classList.add('hidden');
    $('retrievalSummaryView').classList.remove('hidden');
    $('retrievalEndBtn').classList.add('hidden');
    $('retrievalSummaryStats').innerHTML = '';
    const rows = [
      [I18n.t('retrieval.summary.completed'), summary.completedCount],
      [I18n.t('retrieval.summary.afterRecall'), summary.afterRecallCount],
      [I18n.t('retrieval.summary.direct'), summary.directRevealCount],
      [I18n.t('retrieval.summary.skipped'), summary.skippedCount],
      [I18n.t('retrieval.summary.readingGood'), summary.reading.good + summary.reading.easy]
    ];
    for (const [label, value] of rows) {
      const div = document.createElement('div'); div.className = 'retrieval-summary-item';
      div.innerHTML = '<span></span><strong></strong>'; div.querySelector('span').textContent = label; div.querySelector('strong').textContent = String(value);
      $('retrievalSummaryStats').appendChild(div);
    }
    await refreshDbSummary();
  }

  function memoryLanguageLabel(language) {
    return language === 'ja' ? I18n.t('lang.ja') : (language === 'zh-Mandarin' ? I18n.t('lang.mandarin') : (language === 'yue' ? I18n.t('lang.yue') : (LANGUAGE[language]?.label || language || '—')));
  }

  function memoryDate(ts) {
    if (!Number(ts)) return '—';
    try { return new Intl.DateTimeFormat(I18n.locale || undefined, { year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(Number(ts))); }
    catch { return new Date(Number(ts)).toLocaleDateString(); }
  }

  function captureMemoryTargetRange() {
    memoryTargetRange = null; memoryTargetBase = ''; memoryTargetLanguage = '';
    const doc = activeDoc(); if (!doc) return '';
    const range = usableEditorRange(true);
    if (range && !range.collapsed && range.toString().trim()) {
      const check = validateAnnotationSelection(range);
      if (check.valid) {
        memoryTargetRange = range.cloneRange();
        memoryTargetBase = range.toString().trim();
        memoryTargetLanguage = doc.language;
        return memoryTargetBase;
      }
    }
    if (selectedRuby?.isConnected) return selectedRuby.querySelector('.rb')?.textContent?.trim() || '';
    return '';
  }

  async function initDatabase() {
    try { const db = await LearningDB.open(); db.close(); dbReady = true; await refreshDbSummary(); }
    catch (err) { console.warn('DB unavailable', err); dbReady = false; $('dbRibbonSummary').textContent = I18n.t('memory.unavailable'); }
  }

  async function recordRuby(ruby, source = 'manual') {
    if (!dbReady || !['manual','reused'].includes(source) || ruby?.dataset?.stale === 'true') return;
    const doc = activeDoc(); if (!doc) return;
    ruby.dataset.source = source;
    const item = annotationDataFromRuby(ruby, doc);
    await recordAnnotationData(doc, item);
    await refreshDbSummary();
  }

  async function refreshDbSummary() {
    if (!dbReady) return;
    const snap = await LearningDB.getSnapshot();
    dbRows = Memory.aggregate(snap);
    const st = Memory.stats(dbRows);
    $('dbRibbonSummary').textContent = I18n.t('memory.ribbonSummary', { entries: st.entries, observations: st.observations, retrievals: st.retrievals });
  }

  function renderMemoryStats() {
    const st = Memory.stats(dbRows);
    const host = $('memoryStats'); host.innerHTML = '';
    const rows = [
      [I18n.t('memory.stat.entries'), st.entries],
      [I18n.t('memory.stat.observations'), st.observations],
      [I18n.t('memory.stat.retrievals'), st.retrievals],
      [I18n.t('memory.stat.languages'), st.languages]
    ];
    for (const [label, value] of rows) {
      const box = document.createElement('div'); box.className = 'memory-stat';
      const a = document.createElement('span'); a.textContent = label;
      const b = document.createElement('strong'); b.textContent = String(value);
      box.append(a,b); host.appendChild(box);
    }
  }

  async function openDatabaseDialog(query = '', options = {}) {
    await refreshDbSummary();
    if (!options.keepTarget) { memoryTargetRange = null; memoryTargetBase = ''; memoryTargetLanguage = ''; }
    const st = Memory.stats(dbRows);
    $('databaseMeta').textContent = I18n.t('memory.meta', { path: appInfo?.userDataPath || '—', historical: st.historicalOnly });
    $('dbSearch').value = query || '';
    $('memoryLanguageFilter').value = '';
    memorySelectedKey = '';
    renderMemoryStats(); renderDatabaseRows(); databaseDialog.showModal();
  }

  async function openMemoryForCurrentText() {
    const query = captureMemoryTargetRange();
    if (!query) {
      alert(I18n.t('memory.lookupNone'));
      return;
    }
    await openDatabaseDialog(query, { keepTarget: true });
  }

  function renderDatabaseRows() {
    const q = $('dbSearch').value.trim();
    let language = $('memoryLanguageFilter').value;
    if (language === 'current') language = activeDoc()?.language || '';
    const rows = Memory.search(dbRows, q, language).slice(0, 500);
    const host = $('dbLedger'); host.innerHTML = '';
    if (!rows.length) {
      const empty = document.createElement('div'); empty.className = 'memory-empty'; empty.textContent = I18n.t('memory.noMatch'); host.appendChild(empty);
      $('memoryDetail').innerHTML = `<div class="memory-empty">${I18n.t('memory.selectHint')}</div>`;
      memorySelectedKey = '';
      return;
    }
    if (!rows.some(r => r.key === memorySelectedKey)) memorySelectedKey = rows[0].key;
    for (const row of rows) {
      const item = document.createElement('div'); item.className = `db-item${row.key === memorySelectedKey ? ' selected' : ''}`; item.dataset.memoryKey = row.key;
      const top = document.createElement('div');
      const base = document.createElement('span'); base.className = 'base'; base.textContent = row.base;
      const reading = document.createElement('span'); reading.className = 'reading'; reading.textContent = row.reading;
      top.append(base, reading);
      const meta = document.createElement('div'); meta.className = 'meta';
      const pitchText = (row.pitchVariants || []).slice(0,2).map(x => `${Memory.pitchLabel(x)}×${x.count}`).join(' / ');
      meta.textContent = `${memoryLanguageLabel(row.language)} · ${I18n.t('memory.encounters', { n: row.observationCount })} · ${I18n.t('memory.retrievalCount', { n: row.retrievalCount })}${pitchText ? ` · ${I18n.t('memory.pitch')} ${pitchText}` : ''}`;
      item.append(top, meta);
      item.addEventListener('click', () => { memorySelectedKey = row.key; renderDatabaseRows(); });
      host.appendChild(item);
    }
    const selected = rows.find(r => r.key === memorySelectedKey) || rows[0];
    renderMemoryDetail(selected);
  }

  function makeMemoryMetric(label, value) {
    const box = document.createElement('div'); box.className = 'memory-metric';
    const a = document.createElement('span'); a.textContent = label;
    const b = document.createElement('strong'); b.textContent = String(value);
    box.append(a,b); return box;
  }

  function renderMemoryDetail(row) {
    const host = $('memoryDetail'); host.innerHTML = '';
    if (!row) { const e=document.createElement('div'); e.className='memory-empty'; e.textContent=I18n.t('memory.selectHint'); host.appendChild(e); return; }

    const head = document.createElement('div'); head.className = 'memory-detail-head';
    const title = document.createElement('div'); title.className = 'memory-detail-title';
    const base = document.createElement('div'); base.className = 'base'; base.textContent = row.base;
    const reading = document.createElement('div'); reading.className = 'reading'; reading.textContent = row.reading;
    title.append(base, reading);
    const badge = document.createElement('span'); badge.className = 'memory-badge'; badge.textContent = row.historicalOnly ? I18n.t('memory.historical') : memoryLanguageLabel(row.language);
    head.append(title, badge); host.appendChild(head);

    const metrics = document.createElement('div'); metrics.className = 'memory-section';
    const hMetrics=document.createElement('h3'); hMetrics.textContent=I18n.t('memory.evidence'); metrics.appendChild(hMetrics);
    const grid=document.createElement('div'); grid.className='memory-grid';
    grid.append(
      makeMemoryMetric(I18n.t('memory.stat.observations'), row.observationCount),
      makeMemoryMetric(I18n.t('memory.retrievalCountLabel'), row.retrievalCount),
      makeMemoryMetric(I18n.t('memory.afterRecall'), row.afterRecallCount),
      makeMemoryMetric(I18n.t('memory.directReveal'), row.directRevealCount),
      makeMemoryMetric(I18n.t('memory.lastSeen'), memoryDate(row.lastSeenAt)),
      makeMemoryMetric(I18n.t('memory.lastReviewed'), memoryDate(row.lastReviewedAt))
    );
    metrics.appendChild(grid); host.appendChild(metrics);

    const ratings = document.createElement('div'); ratings.className='memory-section';
    const rh=document.createElement('h3'); rh.textContent=I18n.t('memory.selfRatings'); ratings.appendChild(rh);
    const chips=document.createElement('div'); chips.className='memory-chips';
    for (const key of ['again','hard','good','easy']) {
      const chip=document.createElement('span'); chip.className='memory-chip'; chip.textContent=`${I18n.t(`retrieval.rating.${key}`)} ${row.readingRatings?.[key] || 0}`; chips.appendChild(chip);
    }
    ratings.appendChild(chips); host.appendChild(ratings);

    if (row.pitchVariants?.length) {
      const sec=document.createElement('div'); sec.className='memory-section'; const h=document.createElement('h3'); h.textContent=I18n.t('memory.pitchHistory'); sec.appendChild(h);
      const c=document.createElement('div'); c.className='memory-chips';
      row.pitchVariants.forEach(x=>{const ch=document.createElement('span');ch.className='memory-chip';ch.textContent=`${Memory.pitchLabel(x)} × ${x.count}`;c.appendChild(ch);}); sec.appendChild(c); host.appendChild(sec);
    }

    if (row.documents?.length) {
      const sec=document.createElement('div'); sec.className='memory-section'; const h=document.createElement('h3'); h.textContent=I18n.t('memory.documents'); sec.appendChild(h);
      const c=document.createElement('div'); c.className='memory-chips'; row.documents.forEach(x=>{const ch=document.createElement('span');ch.className='memory-chip';ch.textContent=x.title||x.id;c.appendChild(ch);}); sec.appendChild(c); host.appendChild(sec);
    }

    const alternatives = Memory.sameBaseReadings(dbRows, row);
    if (alternatives.length) {
      const sec=document.createElement('div'); sec.className='memory-section'; const h=document.createElement('h3'); h.textContent=I18n.t('memory.otherReadings'); sec.appendChild(h);
      const list=document.createElement('div'); list.className='memory-related-list';
      alternatives.slice(0,10).forEach(x=>{const d=document.createElement('div');d.className='memory-related'; const b=document.createElement('span');b.className='base';b.textContent=x.base; const r=document.createElement('span');r.className='reading';r.textContent=x.reading; const m=document.createElement('small');m.textContent=I18n.t('memory.encounters',{n:x.observationCount}); d.append(b,r,m);list.appendChild(d);}); sec.appendChild(list); host.appendChild(sec);
    }

    const related = Memory.relatedForms(dbRows, row, 12);
    if (related.length) {
      const sec=document.createElement('div'); sec.className='memory-section'; const h=document.createElement('h3'); h.textContent=I18n.t('memory.relatedForms'); sec.appendChild(h);
      const list=document.createElement('div'); list.className='memory-related-list';
      related.forEach(x=>{const d=document.createElement('div');d.className='memory-related'; const b=document.createElement('span');b.className='base';b.textContent=x.base; const r=document.createElement('span');r.className='reading';r.textContent=x.reading; const m=document.createElement('small');m.textContent=I18n.t('memory.literalRelation');d.append(b,r,m);list.appendChild(d);}); sec.appendChild(list); host.appendChild(sec);
      const note=document.createElement('div'); note.className='memory-caution'; note.textContent=I18n.t('memory.noInference'); host.appendChild(note);
    }

    const reuse=document.createElement('div'); reuse.className='memory-reuse';
    const hint=document.createElement('div'); hint.className='hint';
    const canReuse = Boolean(memoryTargetRange && memoryTargetBase === row.base && memoryTargetLanguage === row.language);
    hint.textContent = canReuse ? I18n.t('memory.reuseHint') : I18n.t('memory.reuseUnavailable');
    const button=document.createElement('button'); button.id='memoryReuseReadingBtn'; button.type='button'; button.textContent=I18n.t('memory.reuseReading'); button.disabled=!canReuse;
    button.addEventListener('click', () => reuseMemoryReading(row));
    reuse.append(hint,button); host.appendChild(reuse);
  }

  function reuseMemoryReading(row) {
    if (!row || !memoryTargetRange || memoryTargetBase !== row.base || memoryTargetLanguage !== row.language) return;
    const range = memoryTargetRange.cloneRange();
    if (!editor.contains(range.commonAncestorContainer) || range.toString().trim() !== memoryTargetBase) {
      alert(I18n.t('memory.targetChanged')); return;
    }
    databaseDialog.close();
    loadQuickContextFromRange(range, 'group');
    $('quickReadingInput').value = row.reading;
    $('quickPitchInput').value = ''; $('quickPitchInput').readOnly = false; $('quickPitchInput').title = '';
    memoryReuseCandidate = { key: row.key, base: row.base, reading: row.reading, language: row.language };
    validateQuickContext(false);
    setQuickContextStatus(I18n.t('memory.reusedPending'), 'info');
    switchRibbon('phoneticContext');
    requestAnimationFrame(() => $('quickReadingInput')?.focus());
  }

  async function exportPhonoDb() {
    if (!dbReady) return alert(I18n.t('memory.unavailable'));
    const snap = await LearningDB.getSnapshot();
    const bytes = Archive.packStoreZip({
      'manifest.json': JSON.stringify({ format: DB_FORMAT, schema: DB_SCHEMA, appVersion: APP_VERSION, exportedAt: nowIso(), manualFirst: true, freezeCandidate: true, extensionsPolicy: 'preserve-namespaced-extensions' }, null, 2),
      'snapshot.json': JSON.stringify(snap, null, 2)
    });
    const path = await Desktop.chooseSavePhonoDb(`PhonoLayer_Personal_Memory_${new Date().toISOString().slice(0, 10)}.phonodb`);
    if (path) await Desktop.writeFile(path, Array.from(bytes));
  }

  async function importPhonoDb() {
    if (!dbReady) return alert(I18n.t('memory.unavailable'));
    const path = await Desktop.openPhonoDb(); if (!path) return;
    const file = await Desktop.readFile(path); const files = Archive.unpackStoreZip(new Uint8Array(file.bytes));
    const manifest = Archive.jsonFile(files, 'manifest.json');
    if (manifest.format !== DB_FORMAT || !READABLE_DB_SCHEMAS.has(manifest.schema)) throw new Error('当前版本只能读取 PhonoLayer .phonodb schema 0.7.0 / 0.8.0 / 0.9.0。');
    const snapshot = Archive.jsonFile(files, 'snapshot.json');
    if (!confirm(`合并导入 ${snapshot.entries?.length || 0} 个条目、${snapshot.observations?.length || 0} 次观察和 ${snapshot.retrievalEvents?.length || 0} 条检索事件？`)) return;
    const report = await LearningDB.importSnapshot(snapshot, 'merge'); await refreshDbSummary();
    alert(`导入完成：条目 ${report.entries}，当前 annotation projection ${report.observations}，检索事件 ${report.retrievalEvents}，annotation events ${report.annotationEvents}；跳过重复 ${report.duplicates}，projection 冲突 ${report.projectionConflicts}。`);
  }

  function buildPhonoDocBytes(doc) {
    const payload = {
      schema: 1,
      id: doc.id,
      title: doc.title,
      language: doc.language,
      revision: doc.revision,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
      lineage: doc.lineage || {},
      usagePolicy: doc.usagePolicy && typeof doc.usagePolicy === 'object' ? doc.usagePolicy : {},
      extensions: doc.extensions && typeof doc.extensions === 'object' ? doc.extensions : {},
      typography: doc.typography,
      layout: doc.layout,
      pdfExport: doc.pdfExport,
      view: doc.view,
      contentHtml: sanitizeEditorHtml(doc.html)
    };
    const manifest = { format: DOC_FORMAT, schema: DOC_SCHEMA, appVersion: APP_VERSION, manualFirst: true, experimental: true, freezeCandidate: true, extensionsPolicy: 'preserve-namespaced-document-extensions', savedAt: nowIso() };
    return Archive.packStoreZip({ 'manifest.json': JSON.stringify(manifest, null, 2), 'document.json': JSON.stringify(payload, null, 2) });
  }

  function parsePhonoDocBytes(bytes, local = {}) {
    const files = Archive.unpackStoreZip(bytes);
    const manifest = Archive.jsonFile(files, 'manifest.json');
    if (manifest.format !== DOC_FORMAT || !READABLE_DOC_SCHEMAS.has(manifest.schema)) throw new Error('当前版本只能读取 PhonoLayer 实验格式 schema 0.7.0 / 0.8.0 / 0.8.1 / 0.8.2 / 0.9.0。');
    const p = Archive.jsonFile(files, 'document.json');
    if (!p?.contentHtml) throw new Error('文档内容缺失。');
    return {
      id: p.id || randomId('doc'), title: p.title || local.fileName?.replace(/\.phonodoc$/i, '') || '学习文档',
      language: LANGUAGE[p.language] ? p.language : 'ja', revision: Number(p.revision) || 1,
      createdAt: Date.parse(p.createdAt) || Date.now(), updatedAt: Date.parse(p.updatedAt) || Date.now(), lineage: p.lineage && typeof p.lineage === 'object' ? p.lineage : {},
      usagePolicy: p.usagePolicy && typeof p.usagePolicy === 'object' ? p.usagePolicy : {}, extensions: p.extensions && typeof p.extensions === 'object' ? p.extensions : {},
      filePath: local.filePath || '', fileName: local.fileName || '', dirty: false,
      typography: normalizeTypography(p.typography, p.language),
      layout: normalizeLayout(p.layout), pdfExport: normalizePdfExport(p.pdfExport, normalizeLayout(p.layout)), view: normalizeView(p.view), html: sanitizeEditorHtml(p.contentHtml)
    };
  }
  function normalizeTypography(v, language) {
    const base = defaultTypography(language); const out = { ...base, ...(v || {}) };
    if (!Fonts.FONT_CATALOG.some(f => f.key === out.bodyFontKey)) out.bodyFontKey = base.bodyFontKey;
    if (!Fonts.FONT_CATALOG.some(f => f.key === out.phoneticFontKey)) out.phoneticFontKey = base.phoneticFontKey;
    out.bodyFontSizePt = Math.max(8, Math.min(96, Number(out.bodyFontSizePt) || base.bodyFontSizePt));
    out.rubyScale = Math.max(.3, Math.min(.9, Number(out.rubyScale) || base.rubyScale));
    out.lineHeight = Math.max(1.2, Math.min(3, Number(out.lineHeight) || 2)); return out;
  }
  function normalizeLayout(v) { return { paperSize: v?.paperSize === 'Letter' ? 'Letter' : 'A4', marginPreset: ['normal', 'narrow', 'wide'].includes(v?.marginPreset) ? v.marginPreset : 'normal' }; }
  function normalizeView(v) {
    return {
      phoneticMode: ['text', 'pitch', 'both'].includes(v?.phoneticMode) ? v.phoneticMode : 'text',
      studyMode: ['study', 'compact', 'reading', 'hidden'].includes(v?.studyMode) ? v.studyMode : 'study',
      masteryThreshold: Math.max(1, Math.min(3, Number(v?.masteryThreshold) || 3))
    };
  }

  function updateStatusBar() {
    const doc = activeDoc(); if (!doc) return;
    const saving = savingDocIds.has(doc.id);
    $('saveState').textContent = saving ? '… 正在保存' : (doc.recoveredFromDraft ? `● ${I18n.t('status.recovered')}` : (doc.dirty ? '● 已修改' : '✓ 已保存')); $('saveState').style.color = saving ? '#2f5bd8' : (doc.dirty ? '#b54708' : '#0b7a4b');
    $('saveBtn').disabled = saving;
    $('statusLanguage').textContent = doc.language === 'ja' ? I18n.t('lang.ja') : (doc.language === 'zh-Mandarin' ? I18n.t('lang.mandarin') : (doc.language === 'yue' ? I18n.t('lang.yue') : (LANGUAGE[doc.language]?.label || doc.language)));
    $('statusRevision').textContent = `r${doc.revision || 1}`;
    $('annotationCount').textContent = `${editor.querySelectorAll('ruby.phono').length} 条表音`;
    $('charCount').textContent = `${(editor.innerText || '').replace(/\s/g, '').length} 字符`;
    $('showFileBtn').textContent = doc.filePath || I18n.t('status.noPath'); $('showFileBtn').disabled = !doc.filePath;
    $('zoomState').textContent = `${Math.round(zoom * 100)}%`; $('windowDocTitle').textContent = `${doc.title}${doc.dirty ? ' *' : ''}`;
    document.title = `${doc.title}${doc.dirty ? ' *' : ''} - 文之形声 · PhonoLayer`;
  }

  function clampZoom(value) {
    const n = Number(value) || 1;
    return Math.min(3, Math.max(.25, Math.round(n * 20) / 20));
  }

  function syncZoomControls() {
    const pct = Math.round(zoom * 100);
    $('zoomSlider').value = String(pct);
    $('statusZoomSlider').value = String(pct);
    $('zoomResetBtn').textContent = `${pct}%`;
    $('zoomState').textContent = `${pct}%`;
  }

  function setZoom(value, options = {}) {
    const workspace = document.querySelector('.desktop-workspace');
    let anchor = null;
    const e = options.anchorEvent;
    if (workspace && e) {
      const rect = workspace.getBoundingClientRect();
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;
      anchor = {
        vx, vy,
        rx: workspace.scrollWidth ? (workspace.scrollLeft + vx) / workspace.scrollWidth : .5,
        ry: workspace.scrollHeight ? (workspace.scrollTop + vy) / workspace.scrollHeight : .5
      };
    }
    zoom = clampZoom(value);
    document.documentElement.style.setProperty('--zoom', String(zoom));
    syncZoomControls();
    saveSettings(); updateStatusBar(); scheduleEditingGuides(); scheduleImageSelectionOverlay();
    if (anchor && workspace) requestAnimationFrame(() => {
      workspace.scrollLeft = Math.max(0, anchor.rx * workspace.scrollWidth - anchor.vx);
      workspace.scrollTop = Math.max(0, anchor.ry * workspace.scrollHeight - anchor.vy);
      scheduleImageSelectionOverlay();
    });
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ zoom, showLineBreaks, showMarginMarks, interactionMode, uiLanguagePreference, recentTextColors, recentHighlightColors })); } catch {}
  }
  function restoreSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      zoom = clampZoom(s.zoom);
      showLineBreaks = s.showLineBreaks !== false;
      showMarginMarks = s.showMarginMarks !== false;
      interactionMode = s.interactionMode === 'object' ? 'object' : 'quick';
      uiLanguagePreference = ['system','zh-CN','zh-TW','en-US','ja-JP'].includes(s.uiLanguagePreference) ? s.uiLanguagePreference : 'system';
      recentTextColors = Array.isArray(s.recentTextColors) ? s.recentTextColors.slice(0,5) : [];
      recentHighlightColors = Array.isArray(s.recentHighlightColors) ? s.recentHighlightColors.slice(0,5) : [];
    } catch { zoom = 1; showLineBreaks = true; showMarginMarks = true; interactionMode = 'quick'; uiLanguagePreference = 'system'; recentTextColors = []; recentHighlightColors = []; }
    document.documentElement.style.setProperty('--zoom', String(zoom));
    syncZoomControls(); setInteractionMode(interactionMode, { persist: false }); scheduleEditingGuides();
  }

  function updateCommandState() {
    const current = selectionInsideEditor();
    if (!lastFocusedEditor && !current && !lastEditorRange) return;
    for (const cmd of ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull']) {
      const btn = document.querySelector(`[data-cmd="${cmd}"]`); if (!btn) continue;
      try { btn.classList.toggle('active-command', document.queryCommandState(cmd)); } catch {}
    }
  }

  function showError(err, prefix = '操作失败') { console.error(err); alert(`${prefix}：${err?.message || err}`); }

  init().catch(showError);
})();
