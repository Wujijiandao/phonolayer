# Dependency and Supply-Chain Hardening — v0.9.3

## Scope

v0.9.3 does not change PhonoLayer learning behavior or the `.phonodoc` / `.phonodb` schemas. It hardens the desktop runtime acquisition boundary.

## Dependency inventory

PhonoLayer's application layer intentionally has no npm `dependencies` or `devDependencies`. The public tree does not ship `node_modules`.

The desktop runtime boundary is:

- Electron 44.4.5 (`win32-x64`) — desktop shell;
- Chromium — bundled by Electron;
- Node.js — bundled by Electron;
- IndexedDB — provided by Chromium;
- system-installed fonts — referenced by name only;
- PowerShell — used by the Windows bootstrap scripts.

PhonoLayer application code does not currently depend on cloud APIs, analytics SDKs, advertising SDKs, React/Vue/Angular, JSZip, Dexie, SQLite bindings, or a third-party rich-text editor.

## Locked Electron runtime

`runtime-lock.json` is the release source of truth for the Windows runtime artifact.

Locked artifact:

- Electron: 44.4.5
- platform: win32-x64
- filename: `electron-v44.4.5-win32-x64.zip`
- size: 158184819 bytes
- SHA-256: `11c395820a5aaa8ebcc0686b476d0ac98a730274ebfbdc8cf5538a7c2815cb5d`
- upstream release: `https://github.com/electron/electron/releases/tag/v44.4.5`

The official `SHASUMS256.txt` is also pinned by SHA-256:

`a0379166a35f9d3e2e1b63a72b90ddfe54a9558c56a3bde82e98f63823591d72`

## Installer invariant

`tools/INSTALL_RUNTIME.ps1` must not trust a runtime merely because it downloads successfully or is larger than a minimum size.

Every candidate runtime — local cache, sibling-version cache, GitHub download, or mirror download — must satisfy both:

1. exact byte size from `runtime-lock.json`;
2. exact SHA-256 from `runtime-lock.json`.

A mismatch is rejected and never extracted or executed.

The fallback mirror is a transport convenience only. It is not an alternate trust root: it must produce the same locked bytes as the official asset.

After installation, `runtime/PHONOLAYER_RUNTIME_PROVENANCE.json` records the runtime version and verified hash used for that installation.

## Offline archival policy

The public source release intentionally does not embed the ~158 MB Electron runtime. The project owner should maintain a private offline copy of the exact runtime release used by each long-lived PhonoLayer release.

Run:

`BACKUP_ELECTRON_RELEASE.bat`

This creates an `offline-runtime-backup/` directory containing:

- the exact Electron Windows x64 ZIP;
- upstream `SHASUMS256.txt`;
- the corresponding `runtime-lock.json`;
- a small provenance README.

Keep these files together. The Electron binary remains upstream third-party software under its own licenses; archival does not transfer ownership to PhonoLayer.

## Why archive the runtime?

The lock file is sufficient for ordinary reproducibility while upstream assets remain available. A private binary backup adds resilience against future link removal, mirror changes, network restrictions, or historical reproducibility needs.

The backup should be private infrastructure, not duplicated into every public PhonoLayer source ZIP.
