# Windows Setup UX — v0.9.4

## Goal

v0.9.4 keeps PhonoLayer portable and local-first while replacing the first-run command-line experience with a small Windows 11 setup dialog. No administrator privileges are required.

## One-click flow

Double-click `SETUP_PHONOLAYER.bat`. The GUI performs the existing audited setup chain:

1. acquire the Electron artifact pinned by `runtime-lock.json`;
2. verify exact byte size and SHA-256 before extraction;
3. stage `app/` and the official public learning samples into the runtime;
4. register the per-user `.phonodoc` association;
5. optionally create Desktop and Start Menu shortcuts;
6. optionally launch PhonoLayer.

The GUI is only an orchestration layer. `tools/INSTALL_RUNTIME.ps1` and `tools/SYNC_APP.ps1` remain the source of truth and can still be run independently for diagnosis.

## Installation model

This is intentionally a **portable/current-folder install**, not a Program Files/MSI installation. It writes no machine-wide registry keys and does not require elevation. File associations are registered under the current user's `HKCU` hive.

The setup window does not move or upload Personal Memory. PhonoLayer remains local-first.

## Failure behavior

If runtime verification or installation fails, setup stops and shows an error. The unverified artifact is never executed. Users can run `INSTALL_RUNTIME.bat` for a visible command-line diagnostic path.

## Future

A signed MSIX/installer may be considered after Public Beta usage establishes whether a conventional installed-app lifecycle is worth maintaining. The portable setup remains useful for reproducibility and research use.
