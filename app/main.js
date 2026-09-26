'use strict';

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');

const APP_VERSION = '0.9.7';
const MAX_DATA_FILE_BYTES = 64 * 1024 * 1024;
const PREVIEW_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RECOVERY_MAX_FILES = 24;
let mainWindow = null;
let pendingOpenPaths = [];
let allowClose = false;
let uiLocale = 'zh-CN';

const MAIN_I18N = {
  'zh-CN': { file:'文件', edit:'编辑', study:'学习', view:'视图', new:'新建', open:'打开…', save:'保存', saveAs:'另存为…', previewPdf:'预览 PDF', exportPdf:'导出 PDF…', repair:'修复 .phonodoc 文件关联', close:'关闭当前标签', exit:'退出', undo:'撤销', redo:'重做', cut:'剪切', copy:'复制', paste:'粘贴', selectAll:'全选', annotate:'添加注音', groupAnnotate:'整词注音', database:'个人积累库', zoom100:'纸张 100%', zoomIn:'放大纸张', zoomOut:'缩小纸张', devtools:'开发者工具', openDoc:'打开 PhonoLayer 文档', saveDoc:'保存 PhonoLayer 文档', docType:'PhonoLayer 文档', importDb:'导入个人积累库', exportDb:'导出个人积累库', dbType:'PhonoLayer 个人积累库', exportPdfTitle:'导出 PDF', pdfType:'PDF 文档' },
  'zh-TW': { file:'檔案', edit:'編輯', study:'學習', view:'檢視', new:'新增', open:'開啟…', save:'儲存', saveAs:'另存新檔…', previewPdf:'預覽 PDF', exportPdf:'匯出 PDF…', repair:'修復 .phonodoc 檔案關聯', close:'關閉目前分頁', exit:'退出', undo:'復原', redo:'重做', cut:'剪下', copy:'複製', paste:'貼上', selectAll:'全選', annotate:'新增注音', groupAnnotate:'整詞注音', database:'個人累積庫', zoom100:'紙張 100%', zoomIn:'放大紙張', zoomOut:'縮小紙張', devtools:'開發者工具', openDoc:'開啟 PhonoLayer 文件', saveDoc:'儲存 PhonoLayer 文件', docType:'PhonoLayer 文件', importDb:'匯入個人累積庫', exportDb:'匯出個人累積庫', dbType:'PhonoLayer 個人累積庫', exportPdfTitle:'匯出 PDF', pdfType:'PDF 文件' },
  'en-US': { file:'File', edit:'Edit', study:'Study', view:'View', new:'New', open:'Open…', save:'Save', saveAs:'Save As…', previewPdf:'Preview PDF', exportPdf:'Export PDF…', repair:'Repair .phonodoc Association', close:'Close Current Tab', exit:'Exit', undo:'Undo', redo:'Redo', cut:'Cut', copy:'Copy', paste:'Paste', selectAll:'Select All', annotate:'Add Annotation', groupAnnotate:'Whole-word Annotation', database:'Personal Memory', zoom100:'Paper 100%', zoomIn:'Zoom In', zoomOut:'Zoom Out', devtools:'Developer Tools', openDoc:'Open PhonoLayer Document', saveDoc:'Save PhonoLayer Document', docType:'PhonoLayer Document', importDb:'Import Personal Memory', exportDb:'Export Personal Memory', dbType:'PhonoLayer Personal Database', exportPdfTitle:'Export PDF', pdfType:'PDF Document' },
  'ja-JP': { file:'ファイル', edit:'編集', study:'学習', view:'表示', new:'新規', open:'開く…', save:'保存', saveAs:'名前を付けて保存…', previewPdf:'PDF プレビュー', exportPdf:'PDF 書き出し…', repair:'.phonodoc 関連付けを修復', close:'現在のタブを閉じる', exit:'終了', undo:'元に戻す', redo:'やり直し', cut:'切り取り', copy:'コピー', paste:'貼り付け', selectAll:'すべて選択', annotate:'注音を追加', groupAnnotate:'語全体に注音', database:'個人蓄積', zoom100:'用紙 100%', zoomIn:'拡大', zoomOut:'縮小', devtools:'開発者ツール', openDoc:'PhonoLayer 文書を開く', saveDoc:'PhonoLayer 文書を保存', docType:'PhonoLayer 文書', importDb:'個人蓄積を読み込む', exportDb:'個人蓄積を書き出す', dbType:'PhonoLayer 個人蓄積', exportPdfTitle:'PDF 書き出し', pdfType:'PDF 文書' }
};
function normalizeUiLocale(raw) {
  const x=String(raw||'').replace('_','-').toLowerCase();
  if (x.startsWith('zh-tw')||x.startsWith('zh-hk')||x.startsWith('zh-hant')) return 'zh-TW';
  if (x.startsWith('zh')) return 'zh-CN';
  if (x.startsWith('ja')) return 'ja-JP';
  if (x.startsWith('en')) return 'en-US';
  return 'zh-CN';
}
function mt(key){ return MAIN_I18N[uiLocale]?.[key] || MAIN_I18N['zh-CN'][key] || key; }

const FILE_PROG_ID = 'PhonoLayer.PhonoDoc';

function regAdd(key, valueName, data, type = 'REG_SZ') {
  const args = ['ADD', key];
  if (valueName == null) args.push('/ve');
  else args.push('/v', valueName);
  args.push('/t', type, '/d', String(data), '/f');
  execFileSync('reg.exe', args, { windowsHide: true, stdio: 'ignore' });
}

function notifyWindowsShell() {
  try {
    const child = spawn('ie4uinit.exe', ['-show'], { detached: true, windowsHide: true, stdio: 'ignore' });
    child.unref();
  } catch {}
}

function registerWindowsFileAssociation() {
  if (process.platform !== 'win32') return { ok: false, supported: false, message: '仅 Windows 支持资源管理器文件关联。' };
  try {
    const exePath = process.execPath;
    const docIcon = path.join(__dirname, 'assets', 'phonodoc.ico');
    const appIcon = path.join(__dirname, 'assets', 'phonolayer-app.ico');
    const classes = 'HKCU\\Software\\Classes';
    regAdd(`${classes}\\.phonodoc`, null, FILE_PROG_ID);
    regAdd(`${classes}\\.phonodoc`, 'PerceivedType', 'document');
    regAdd(`${classes}\\${FILE_PROG_ID}`, null, 'PhonoLayer 文档');
    regAdd(`${classes}\\${FILE_PROG_ID}`, 'FriendlyTypeName', 'PhonoLayer 文档');
    regAdd(`${classes}\\${FILE_PROG_ID}\\DefaultIcon`, null, `"${docIcon}",0`);
    regAdd(`${classes}\\${FILE_PROG_ID}\\shell\\open\\command`, null, `"${exePath}" "%1"`);
    regAdd(`${classes}\\Applications\\PhonoLayer.exe`, 'FriendlyAppName', '文之形声 · PhonoLayer');
    regAdd(`${classes}\\Applications\\PhonoLayer.exe`, 'ApplicationIcon', `"${appIcon}",0`);
    regAdd(`${classes}\\Applications\\PhonoLayer.exe\\shell\\open\\command`, null, `"${exePath}" "%1"`);
    const capabilities = 'HKCU\\Software\\PhonoLayer\\Desktop\\Capabilities';
    regAdd(capabilities, 'ApplicationName', '文之形声 · PhonoLayer');
    regAdd(capabilities, 'ApplicationDescription', '真实文本中的个人语音学习工作台');
    regAdd(`${capabilities}\\FileAssociations`, '.phonodoc', FILE_PROG_ID);
    regAdd('HKCU\\Software\\RegisteredApplications', 'PhonoLayer', 'Software\\PhonoLayer\\Desktop\\Capabilities');
    notifyWindowsShell();
    return { ok: true, supported: true, progId: FILE_PROG_ID, exePath, iconPath: docIcon };
  } catch (error) {
    return { ok: false, supported: true, message: error?.message || String(error) };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 1000,
    minWidth: 980,
    minHeight: 720,
    title: `文之形声 · PhonoLayer ${APP_VERSION}`,
    icon: path.join(__dirname, 'assets', 'phonolayer-app.ico'),
    backgroundColor: '#e7eaf0',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    const queued = pendingOpenPaths.splice(0);
    for (const p of queued) mainWindow.webContents.send('desktop:open-path', p);
  });
  mainWindow.on('close', (event) => {
    if (!allowClose) {
      event.preventDefault();
      mainWindow.webContents.send('desktop:command', 'exit');
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function safePath(filePath, extensions = null) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new Error('文件路径无效');
  const resolved = path.resolve(filePath);
  if (Array.isArray(extensions) && extensions.length) {
    const ext = path.extname(resolved).toLowerCase();
    if (!extensions.includes(ext)) throw new Error(`不允许的文件类型：${ext || '(无扩展名)'}`);
  }
  return resolved;
}

function assertTrustedSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error('拒绝非主窗口 IPC 请求');
}

function recoveryDir() { return path.join(app.getPath('userData'), 'Recovery'); }
function safeRecoveryId(value) {
  const id = String(value || '');
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) throw new Error('恢复草稿 ID 无效');
  return id;
}
function recoveryPath(value) { return path.join(recoveryDir(), `${safeRecoveryId(value)}.phonodoc`); }

async function atomicWrite(filePath, data) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await fs.promises.writeFile(tmp, data);
    try {
      await fs.promises.rename(tmp, filePath);
    } catch {
      await fs.promises.copyFile(tmp, filePath);
      await fs.promises.unlink(tmp).catch(() => {});
    }
  } catch (error) {
    await fs.promises.unlink(tmp).catch(() => {});
    throw error;
  }
}

async function cleanupOldPdfPreviews() {
  const dir = path.join(app.getPath('temp'), 'PhonoLayer-Desktop');
  let entries = [];
  try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
  const cutoff = Date.now() - PREVIEW_MAX_AGE_MS;
  await Promise.all(entries.filter(e => e.isFile() && /^preview-.*\.pdf$/i.test(e.name)).map(async e => {
    const p = path.join(dir, e.name);
    try { const st = await fs.promises.stat(p); if (st.mtimeMs < cutoff) await fs.promises.unlink(p); } catch {}
  }));
}

function registerIpc() {
  const trustedHandle = (channel, handler) => ipcMain.handle(channel, (event, ...args) => {
    assertTrustedSender(event);
    return handler(event, ...args);
  });

  trustedHandle('app:info', () => ({
    version: APP_VERSION,
    platform: process.platform,
    userDataPath: app.getPath('userData'),
    documentsPath: app.getPath('documents'),
    locale: normalizeUiLocale(app.getLocale())
  }));

  trustedHandle('app:set-ui-locale', (_evt, locale) => {
    uiLocale = normalizeUiLocale(locale);
    buildMenu();
    return { ok: true, locale: uiLocale };
  });

  trustedHandle('app:quit-confirmed', () => {
    allowClose = true;
    app.quit();
    return true;
  });

  trustedHandle('app:repair-file-association', () => registerWindowsFileAssociation());

  trustedHandle('recovery:list', async () => {
    const dir = recoveryDir();
    let entries = [];
    try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return []; }
    const out = [];
    for (const entry of entries.filter(e => e.isFile() && /^[A-Za-z0-9_-]+\.phonodoc$/.test(e.name))) {
      const p = path.join(dir, entry.name);
      try {
        const st = await fs.promises.stat(p);
        if (st.size <= MAX_DATA_FILE_BYTES) out.push({ id: entry.name.replace(/\.phonodoc$/i, ''), size: st.size, mtimeMs: st.mtimeMs });
      } catch {}
    }
    return out.sort((a,b) => b.mtimeMs - a.mtimeMs).slice(0, RECOVERY_MAX_FILES);
  });

  trustedHandle('recovery:read', async (_evt, recoveryId) => {
    const p = recoveryPath(recoveryId);
    const st = await fs.promises.stat(p);
    if (!st.isFile() || st.size > MAX_DATA_FILE_BYTES) throw new Error('恢复草稿无效或过大');
    const buf = await fs.promises.readFile(p);
    return { id: safeRecoveryId(recoveryId), bytes: Array.from(buf), size: buf.length, mtimeMs: st.mtimeMs };
  });

  trustedHandle('recovery:write', async (_evt, recoveryId, bytes) => {
    const p = recoveryPath(recoveryId);
    const data = Buffer.from(bytes || []);
    if (data.length > MAX_DATA_FILE_BYTES) throw new Error('恢复草稿过大');
    await fs.promises.mkdir(recoveryDir(), { recursive: true });
    await atomicWrite(p, data);
    const st = await fs.promises.stat(p);
    return { id: safeRecoveryId(recoveryId), size: st.size, mtimeMs: st.mtimeMs };
  });

  trustedHandle('recovery:delete', async (_evt, recoveryId) => {
    await fs.promises.unlink(recoveryPath(recoveryId)).catch(error => { if (error?.code !== 'ENOENT') throw error; });
    return true;
  });

  trustedHandle('dialog:open-phonodoc', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: mt('openDoc'),
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: mt('docType'), extensions: ['phonodoc'] }]
    });
    return result.canceled ? [] : result.filePaths;
  });

  trustedHandle('dialog:save-phonodoc', async (_evt, suggestedName, sourcePath) => {
    const baseDir = sourcePath ? path.dirname(safePath(sourcePath, ['.phonodoc'])) : app.getPath('documents');
    const result = await dialog.showSaveDialog(mainWindow, {
      title: mt('saveDoc'),
      defaultPath: path.join(baseDir, suggestedName || '学习文档.phonodoc'),
      filters: [{ name: mt('docType'), extensions: ['phonodoc'] }]
    });
    return result.canceled ? null : result.filePath;
  });

  trustedHandle('dialog:open-phonodb', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: mt('importDb'), properties: ['openFile'],
      filters: [{ name: mt('dbType'), extensions: ['phonodb'] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  trustedHandle('dialog:save-phonodb', async (_evt, suggestedName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: mt('exportDb'),
      defaultPath: path.join(app.getPath('documents'), suggestedName || 'PhonoLayer_Personal_Memory.phonodb'),
      filters: [{ name: mt('dbType'), extensions: ['phonodb'] }]
    });
    return result.canceled ? null : result.filePath;
  });

  trustedHandle('file:read', async (_evt, filePath) => {
    const p = safePath(filePath, ['.phonodoc', '.phonodb']);
    const st = await fs.promises.stat(p);
    if (!st.isFile()) throw new Error('目标不是普通文件');
    if (st.size > MAX_DATA_FILE_BYTES) throw new Error('文件过大，当前实验版最多读取 64 MB');
    const buf = await fs.promises.readFile(p);
    return { path: p, name: path.basename(p), bytes: Array.from(buf) };
  });

  trustedHandle('file:write', async (_evt, filePath, bytes) => {
    const p = safePath(filePath, ['.phonodoc', '.phonodb']);
    const data = Buffer.from(bytes || []);
    if (data.length > MAX_DATA_FILE_BYTES) throw new Error('文件过大，当前实验版最多写入 64 MB');
    await atomicWrite(p, data);
    const st = await fs.promises.stat(p);
    return { path: p, name: path.basename(p), size: st.size, mtimeMs: st.mtimeMs };
  });

  trustedHandle('file:exists', async (_evt, filePath) => {
    try { await fs.promises.access(safePath(filePath, ['.phonodoc', '.phonodb'])); return true; }
    catch { return false; }
  });
  trustedHandle('shell:show-item', async (_evt, filePath) => { shell.showItemInFolder(safePath(filePath, ['.phonodoc', '.phonodb'])); return true; });
  function publicSamplePath(languageFolder, fileName) {
    const candidates = [
      path.join(__dirname, 'public-samples', languageFolder, fileName),
      path.join(__dirname, '..', 'samples', 'public', languageFolder, fileName)
    ];
    const found = candidates.find(candidate => fs.existsSync(candidate));
    if (!found) throw new Error(`未找到公开 demo：${fileName}`);
    return found;
  }

  const PUBLIC_SAMPLE_CATALOG = Object.freeze({
    'guide-overview': ['Official_Learning_Guides', '00_Multilingual_Learning_Overview.phonodoc', '官方学习样例 00｜多语言学习导览'],
    'guide-text-form-sound': ['Official_Learning_Guides', '01_Text_Form_Sound.phonodoc', '官方学习样例 01｜文、形、声'],
    'guide-retrieval': ['Official_Learning_Guides', '02_Retrieval_Before_Reveal.phonodoc', '官方学习样例 02｜先回忆，再揭示'],
    'guide-transfer': ['Official_Learning_Guides', '03_Cross_Language_Transfer.phonodoc', '官方学习样例 03｜跨语言迁移'],
    'guide-memory': ['Official_Learning_Guides', '04_Personal_Phonological_Memory.phonodoc', '官方学习样例 04｜个人语音记忆'],
    'japanese-reading': ['Japanese', 'Japanese_Reading_Demo.phonodoc', '官方学习样例｜日语读音演示'],
    'cantonese-reading': ['Cantonese', 'Cantonese_Reading_Demo.phonodoc', '官方学习样例｜粤语 / Jyutping 演示']
  });

  trustedHandle('sample:public', async (_evt, key) => {
    const spec = PUBLIC_SAMPLE_CATALOG[String(key || '')];
    if (!spec) throw new Error('未知的公开学习样例');
    const [folder, fileName, title] = spec;
    const p = publicSamplePath(folder, fileName);
    const buf = await fs.promises.readFile(p);
    return { path: '', name: fileName, title, bytes: Array.from(buf), bundled: true, publicDemo: true };
  });

  trustedHandle('dialog:save-pdf', async (_evt, suggestedName, sourcePath) => {
    const baseDir = sourcePath ? path.dirname(safePath(sourcePath, ['.phonodoc'])) : app.getPath('documents');
    const result = await dialog.showSaveDialog(mainWindow, {
      title: mt('exportPdfTitle'),
      defaultPath: path.join(baseDir, suggestedName || '学习文档.pdf'),
      filters: [{ name: mt('pdfType'), extensions: ['pdf'] }]
    });
    return result.canceled ? null : result.filePath;
  });

  function escapeTemplateHtml(value) {
    return String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function pdfHeaderFooterTemplates(rawOptions = {}) {
    const title = escapeTemplateHtml(rawOptions.title || 'PhonoLayer文档');
    const custom = escapeTemplateHtml(rawOptions.headerText || '');
    const baseStyle = 'font-size:8px;color:#6b7280;width:100%;padding:0 10mm;font-family:Segoe UI,Microsoft YaHei,sans-serif;box-sizing:border-box;';
    let headerTemplate = '<div></div>';
    if (rawOptions.headerMode === 'title') headerTemplate = `<div style="${baseStyle}text-align:left;">${title}</div>`;
    else if (rawOptions.headerMode === 'custom') headerTemplate = `<div style="${baseStyle}text-align:left;">${custom}</div>`;
    let footerTemplate = '<div></div>';
    if (rawOptions.footerMode === 'page') footerTemplate = `<div style="${baseStyle}text-align:center;"><span class="pageNumber"></span></div>`;
    else if (rawOptions.footerMode === 'page-total') footerTemplate = `<div style="${baseStyle}text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`;
    const displayHeaderFooter = rawOptions.headerMode !== 'none' || rawOptions.footerMode !== 'none';
    return { displayHeaderFooter, headerTemplate, footerTemplate };
  }

  async function renderCurrentWindowPdf(rawOptions = {}) {
    if (!mainWindow) throw new Error('主窗口不可用');
    const paperSize = rawOptions.pageSize === 'Letter' ? 'Letter' : 'A4';
    const landscape = rawOptions.orientation === 'landscape';
    const rawMargins = rawOptions.margins || {};
    const clampMargin = value => Math.max(0, Math.min(2.5, Number(value) || 0));
    const margins = {
      top: clampMargin(rawMargins.top),
      bottom: clampMargin(rawMargins.bottom),
      left: clampMargin(rawMargins.left),
      right: clampMargin(rawMargins.right)
    };
    const hf = pdfHeaderFooterTemplates(rawOptions);
    return mainWindow.webContents.printToPDF({
      landscape,
      displayHeaderFooter: hf.displayHeaderFooter,
      headerTemplate: hf.headerTemplate,
      footerTemplate: hf.footerTemplate,
      printBackground: true,
      scale: 1,
      pageSize: paperSize,
      margins,
      preferCSSPageSize: false
    });
  }

  trustedHandle('pdf:export', async (_evt, filePath, rawOptions = {}) => {
    const p = safePath(filePath);
    await fs.promises.mkdir(path.dirname(p), { recursive: true });
    const data = await renderCurrentWindowPdf(rawOptions);
    await atomicWrite(p, data);
    const st = await fs.promises.stat(p);
    return { path: p, name: path.basename(p), size: st.size };
  });

  trustedHandle('pdf:preview', async (_evt, rawOptions = {}) => {
    const dir = path.join(app.getPath('temp'), 'PhonoLayer-Desktop');
    await fs.promises.mkdir(dir, { recursive: true });
    const p = path.join(dir, `preview-${process.pid}-${Date.now()}.pdf`);
    const data = await renderCurrentWindowPdf(rawOptions);
    await atomicWrite(p, data);
    const openError = await shell.openPath(p);
    if (openError) throw new Error(openError);
    return { path: p, size: data.length, temporary: true };
  });

  trustedHandle('window:print', async () => new Promise((resolve, reject) => {
    if (!mainWindow) return resolve(false);
    mainWindow.webContents.print({ printBackground: true }, (ok, reason) => ok ? resolve(true) : reject(new Error(reason || '打印失败')));
  }));
}

function buildMenu() {
  const send = cmd => mainWindow?.webContents.send('desktop:command', cmd);
  const template = [
    { label: mt('file'), submenu: [
      { label: mt('new'), accelerator: 'CmdOrCtrl+N', click: () => send('new') },
      { label: mt('open'), accelerator: 'CmdOrCtrl+O', click: () => send('open') },
      { type: 'separator' },
      { label: mt('save'), accelerator: 'CmdOrCtrl+S', click: () => send('save') },
      { label: mt('saveAs'), accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveAs') },
      { label: mt('previewPdf'), click: () => send('previewPdf') },
      { label: mt('exportPdf'), accelerator: 'CmdOrCtrl+Alt+P', click: () => send('exportPdf') },
      { type: 'separator' },
      { label: mt('repair'), click: () => send('repairFileAssociation') },
      { type: 'separator' },
      { label: mt('close'), accelerator: 'CmdOrCtrl+W', click: () => send('closeTab') },
      { label: mt('exit'), click: () => send('exit') }
    ]},
    { label: mt('edit'), submenu: [
      { label: mt('undo'), accelerator: 'CmdOrCtrl+Z', click: () => send('undo') }, { label: mt('redo'), accelerator: 'CmdOrCtrl+Y', click: () => send('redo') }, { type: 'separator' },
      { role: 'cut', label: mt('cut') }, { role: 'copy', label: mt('copy') }, { role: 'paste', label: mt('paste') }, { role: 'selectAll', label: mt('selectAll') }
    ]},
    { label: mt('study'), submenu: [
      { label: mt('annotate'), accelerator: 'CmdOrCtrl+R', click: () => send('annotate') },
      { label: mt('groupAnnotate'), accelerator: 'CmdOrCtrl+Shift+R', click: () => send('groupAnnotate') },
      { label: mt('database'), accelerator: 'CmdOrCtrl+L', click: () => send('database') }
    ]},
    { label: mt('view'), submenu: [
      { label: mt('zoom100'), accelerator: 'CmdOrCtrl+0', click: () => send('docZoomReset') },
      { label: mt('zoomIn'), accelerator: 'CmdOrCtrl+=', click: () => send('docZoomIn') },
      { label: mt('zoomOut'), accelerator: 'CmdOrCtrl+-', click: () => send('docZoomOut') },
      { type: 'separator' },
      { role: 'toggleDevTools', label: mt('devtools') }
    ]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.setName('文之形声 · PhonoLayer');
if (process.platform === 'win32') app.setAppUserModelId('PhonoLayer.Desktop');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  if (process.argv.includes('--register-file-association')) {
    const result = registerWindowsFileAssociation();
    app.exit(result.ok ? 0 : 1);
  } else app.quit();
}
else {
  app.on('second-instance', (_event, argv) => {
    if (argv.includes('--register-file-association')) registerWindowsFileAssociation();
    const candidates = argv.filter(x => typeof x === 'string' && x.toLowerCase().endsWith('.phonodoc'));
    for (const candidate of candidates) {
      if (mainWindow && !mainWindow.webContents.isLoadingMainFrame()) mainWindow.webContents.send('desktop:open-path', candidate);
      else pendingOpenPaths.push(candidate);
    }
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(() => {
    uiLocale = normalizeUiLocale(app.getLocale());
    const assocOnly = process.argv.includes('--register-file-association');
    const assocResult = registerWindowsFileAssociation();
    if (assocOnly) {
      if (!assocResult.ok) process.exitCode = 1;
      app.quit();
      return;
    }
    registerIpc(); buildMenu();
    pendingOpenPaths.push(...process.argv.filter(x => typeof x === 'string' && x.toLowerCase().endsWith('.phonodoc')));
    cleanupOldPdfPreviews().catch(() => {});
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
