# Changelog

## v0.9.7 — GitHub Release Preparation

- Replaced the root README with the GitHub-ready public project landing page.
- Unified current application version metadata at 0.9.7 across app, citation, public demos and QA.
- Added the current GitHub release-note draft and public-release preparation notes.
- Kept `.phonodoc` and `.phonodb` writer schemas at 0.9.0.
- Preserved the v0.9.6 public-beta poster/logo refresh and all private/public corpus boundaries.

## v0.9.5 — Brand Asset Refresh

- Replaced the Public Beta poster with the current `文之形声 · PhonoLayer` artwork.
- Replaced application PNG/ICO and legacy compatibility icon aliases with the new `文 + layered pages + waveform` mark.
- Added a horizontal wordmark and high-resolution icon master under `media/`.
- Updated README branding references and added `docs/BRAND_ASSETS_0.9.5.md`.
- No learning behavior or data schema changes; `.phonodoc` and `.phonodb` writers remain 0.9.0.

## v0.9.4 — Windows Setup UX & Promo Integration

- Kept `.phonodoc` / `.phonodb` schema at **0.9.0**.
- Bundled the official **文之形声 · PhonoLayer** Public Beta promotional artwork under `media/` and referenced it directly from README.
- Added `SETUP_PHONOLAYER.bat` + `tools/SETUP_GUI.ps1`, a small Windows 11 WinForms one-click setup dialog.
- One-click setup delegates to the v0.9.3 locked Electron runtime verifier, stages the app/public samples, registers `.phonodoc`, optionally creates Desktop/Start Menu shortcuts, and can launch immediately.
- `RUN_DESKTOP.bat` now opens the setup dialog automatically when no runtime exists.
- Kept `INSTALL_RUNTIME.bat` as a transparent command-line diagnosis/recovery path.
- No administrator privileges, service installation, telemetry, account system or machine-wide registry keys were introduced.

## v0.9.3 — Dependency & Supply-Chain Hardening

- Kept `.phonodoc` / `.phonodb` schema at **0.9.0**; no learning-model or document-format changes.
- Added `runtime-lock.json` as the auditable source of truth for Electron 44.4.5 / win32-x64.
- Pinned the official Electron runtime archive by exact byte size and SHA-256.
- Hardened `INSTALL_RUNTIME.ps1`: cached, sibling-cache, GitHub and mirror artifacts are rejected unless they match the same lock before extraction/execution.
- Added local installed-runtime provenance metadata.
- Added `BACKUP_ELECTRON_RELEASE.bat` / `tools/BACKUP_ELECTRON_RELEASE.ps1` for owner-side offline archival of the exact upstream runtime and SHASUMS file.
- Added dependency inventory and supply-chain documentation/QA.
- Public source package still does not bundle the Electron binary runtime.

## v0.9.2 — Branding Consolidation

- Adopted the canonical public identity **文之形声 · PhonoLayer**; Chinese short name **文之形声**, English short name **PhonoLayer**.
- Added the brand line **“见文之形，记文之声。”** and aligned current UI, README, window titles, citation metadata and Windows display labels.
- Kept `.phonodoc` / `.phonodb` schema at **0.9.0** and preserved historical `shengjian-*` wire identifiers and storage keys for compatibility.
- Added five original CC0 official learning guides explaining multilingual learning, text/form/sound separation, retrieval-before-reveal, cross-language transfer boundaries and Personal Phonological Memory.
- Retained the original Japanese and Cantonese reading demos, producing a seven-document public sample corpus with no private materials.
- Consolidated the sample launcher around an allow-listed official public-sample catalog and expanded release QA to cover every public learning document.

## v0.9.1 — Public Beta Preparation

- Adopted **PhonoLayer** as the primary public-facing name, with **音笺** as the then-current Chinese display name.
- Kept legacy `shengjian-*` wire-format/storage identifiers for backward compatibility.
- Licensed application source under MPL-2.0; added AUTHORS, CITATION, contribution, security, privacy, support and trademark documentation.
- Removed the owner-private learning corpus and all private provenance/audit artifacts from the public tree.
- Added two original CC0 public demo `.phonodoc` files (Japanese and Cantonese).
- Changed built-in quick-open/sample staging to use only public demos.
- Renamed the portable Windows runtime executable to `PhonoLayer.exe` and public file-association labels to PhonoLayer.
- Added public-release QA that fails on known private-corpus paths/names and verifies no app telemetry/network client is introduced.
- Application version advanced to 0.9.1; `.phonodoc` and `.phonodb` schema remain 0.9.0.

## v0.9.0 — Format Freeze Candidate

- Consolidated `.phonodoc` and `.phonodb` into 0.9.0 freeze-candidate schemas.
- Formalized namespaced `extensions`, optional `usagePolicy`, migration fixtures, and compatibility rules.
- Continued semantic-integrity hardening for reading/pitch confirmation, document identity, retrieval evidence and Personal Memory.

## v0.8.x — Summary

- Added Personal Phonological Memory, retrieval sessions, Japanese mora/accent modeling, direct annotation editing, high-zoom geometry, UI ergonomics, semantic-integrity fixes and Unicode packaging QA.

