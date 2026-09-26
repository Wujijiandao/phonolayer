# Engineering Guide

## 1. Primary runtime

Current target is Windows 11 + Electron/Chromium. The distribution model is a private portable runtime plus application source/assets synced into the runtime.

Top-level Windows helpers:

```text
RUN_DESKTOP.bat
INSTALL_RUNTIME.bat
REGISTER_PHONODOC.bat
OPEN_CATS_SAMPLE.bat
```

Batch files are intentionally ASCII + CRLF for Windows `cmd.exe` compatibility.

## 2. Module map

### `app/main.js`

Owns privileged desktop capabilities:

- BrowserWindow lifecycle;
- native menus;
- open/save dialogs;
- `.phonodoc` file association;
- validated file read/write;
- recovery directory I/O;
- PDF preview/export;
- printing;
- recent/open-path handling;
- IPC validation and security restrictions.

### `app/preload.js`

Exposes a restricted `desktopAPI` through contextBridge. Do not expose raw `ipcRenderer`, `fs`, `path` or arbitrary shell execution to renderer code.

### `app/renderer.js`

Current application orchestration layer:

- document tabs;
- editor state;
- Ribbon;
- Selection/Range;
- annotation create/edit/remove;
- stale semantics;
- undo/redo;
- IME transactions;
- copy/paste;
- study display;
- retrieval sessions;
- Personal Memory UI;
- `.phonodoc` / `.phonodb` serialization entry points.

This file is large. New pure logic SHOULD be extracted into dedicated `*-core.js` modules rather than expanding renderer indefinitely.

### Pure modules

- `archive-core.js` — ZIP store container, UTF-8, CRC, bounds;
- `phonetics-core.js` — grapheme segmentation and generic explicit pitch parsing;
- `japanese-pitch-core.js` — pure Manual-first mora / Tokyo accent-nucleus / manual-HL validation and derivation;
- `learning-db-core.js` — database snapshot logic;
- `retrieval-core.js` — retrieval queue/event/session pure logic;
- `memory-core.js` — derived Personal Memory aggregation;
- `font-core.js` — font catalog/defaults;
- `i18n.js` — UI messages and locale application.

### `learning-db.js`

Browser/Electron IndexedDB implementation. Current experimental DB name:

```text
shengjian-phonolayer-learning-v07-experimental
```

Internal DB version is currently 2 because v0.7.4 added retrieval stores.

## 3. Persistence boundaries

### `.phonodoc`

Document content, layout, annotations and document display settings.

### `.phonodb`

Personal long-term learning snapshot. It exports:

- entries;
- observations;
- metadata;
- retrieval sessions;
- retrieval events.

### application preferences

UI locale, Quick/Object interaction preference, zoom-related/editor preferences belong to app settings, not `.phonodoc` content unless explicitly defined otherwise.

### recovery

Recovery drafts are transient resilience artifacts.

## 4. Editing invariants

Do not regress these:

- new annotation requires strict unannotated Selection;
- range merely touching a ruby boundary is allowed, true overlap is blocked;
- lower base text remains ordinary editable document content;
- upper phonetic layer is direct annotation edit handle;
- Quick mode suppresses object-selection outline;
- Object mode can restore object-selection workflow;
- base-text edit marks annotation stale;
- stale annotations are not recorded as new confirmed personal observations;
- runtime pitch graphics are reconstructed from explicit stored pitch data.

## 5. Sanitization

All persisted editor HTML passes through `sanitizeEditorHtml()`.

When adding a new HTML feature, decide explicitly whether it belongs in:

- `SAFE_EDITOR_TAGS`;
- `SAFE_EDITOR_CLASSES`;
- `SAFE_STYLE_PROPS`;
- `SAFE_PHONO_DATA`.

Do not simply save `editor.innerHTML` raw.

## 6. File-format changes

Before changing schema:

1. ask whether new state is document truth, personal data, app preference or derived UI;
2. prefer additive/derived representation when semantics are unchanged;
3. update `EXPERIMENTAL_FORMAT_0.7.md`;
4. update human guide and formal spec if persistent behavior changes;
5. add QA for old-file normalization and new-file serialization;
6. only then decide whether schema identifier must change.

## 7. Internal build / release

The package is currently source + portable runtime workflow, not a public installer pipeline.

Before archiving a new version:

- remove test caches;
- run all QA;
- rebuild manifest;
- generate a single FULL.zip;
- run 7-Zip integrity test;
- extract that final ZIP to a new directory;
- rerun QA on the extracted copy.

See `TESTING_AND_RELEASE_INTERNAL.md`.

## 8. Known test boundary

Headless Chromium QA can validate real browser editing behavior, but not every Win11-native surface. Keep separate smoke tests for:

- Microsoft/Japanese IME in actual Electron window;
- Explorer file association/icon cache;
- native dialogs;
- existing real IndexedDB profile upgrades;
- final PDF font and pagination behavior.


## v0.8.3 Japanese pitch engineering boundary

`japanese-pitch-core.js` MUST remain usable as pure logic in Node QA and browser runtime. It must not call dictionaries, network services or IndexedDB. The renderer owns UI and SVG; the core owns deterministic validation/derivation only.

Canonical Japanese semantics live in `data-ja-*`; generated SVG and virtual particle preview are runtime-only. Current `.phonodoc` writer schema is `0.8.1`, while the reader also accepts `0.7.0` and `0.8.0`. Schema 0.8.1 adds persistent `data-pitch-stale` and explicit `text-indent` support.
