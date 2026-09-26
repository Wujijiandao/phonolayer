'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('desktopAPI', {
  appInfo: () => ipcRenderer.invoke('app:info'),
  setUiLocale: (locale) => ipcRenderer.invoke('app:set-ui-locale', locale),
  quitConfirmed: () => ipcRenderer.invoke('app:quit-confirmed'),
  openPhonoDocs: () => ipcRenderer.invoke('dialog:open-phonodoc'),
  pathForDroppedFile: (file) => webUtils.getPathForFile(file),
  chooseSavePhonoDoc: (name, sourcePath) => ipcRenderer.invoke('dialog:save-phonodoc', name, sourcePath),
  openPhonoDb: () => ipcRenderer.invoke('dialog:open-phonodb'),
  chooseSavePhonoDb: (name) => ipcRenderer.invoke('dialog:save-phonodb', name),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, bytes) => ipcRenderer.invoke('file:write', filePath, bytes),
  fileExists: (filePath) => ipcRenderer.invoke('file:exists', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:show-item', filePath),
  openPublicSample: (key) => ipcRenderer.invoke('sample:public', key),
  print: () => ipcRenderer.invoke('window:print'),
  chooseSavePdf: (name, sourcePath) => ipcRenderer.invoke('dialog:save-pdf', name, sourcePath),
  exportPdf: (filePath, options) => ipcRenderer.invoke('pdf:export', filePath, options),
  previewPdf: (options) => ipcRenderer.invoke('pdf:preview', options),
  repairFileAssociation: () => ipcRenderer.invoke('app:repair-file-association'),
  listRecoveryDrafts: () => ipcRenderer.invoke('recovery:list'),
  readRecoveryDraft: (id) => ipcRenderer.invoke('recovery:read', id),
  writeRecoveryDraft: (id, bytes) => ipcRenderer.invoke('recovery:write', id, bytes),
  deleteRecoveryDraft: (id) => ipcRenderer.invoke('recovery:delete', id),
  onCommand: (handler) => ipcRenderer.on('desktop:command', (_event, command) => handler(command)),
  onOpenPath: (handler) => ipcRenderer.on('desktop:open-path', (_event, filePath) => handler(filePath))
});
