# Localization 0.7.1

v0.7.1 adds an explicit application UI-language layer independent from document language and phonetic system.

Initial UI locales:

- `zh-CN` — 简体中文
- `zh-TW` — 繁體中文
- `en-US` — English
- `ja-JP` — 日本語
- `system` — follow the Windows/Electron locale

Architecture:

- `app/i18n.js` owns renderer translations and locale normalization.
- renderer preference is persisted in application settings only.
- `preload.js` exposes a narrow locale IPC call.
- `main.js` rebuilds native Electron menus and localizes subsequent native file dialogs after locale changes.

Document language (`ja`, `zh-Mandarin`, `yue`) remains document metadata and is not coupled to UI language.
