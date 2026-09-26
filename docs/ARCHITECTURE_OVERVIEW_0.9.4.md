# Architecture Overview — v0.9.4

v0.9.4 retains the v0.9.0 data schemas and v0.9.3 locked Electron supply-chain architecture. The new layer is Windows setup orchestration only.

```text
SETUP_PHONOLAYER.bat
        ↓
tools/SETUP_GUI.ps1  (WinForms UX)
        ↓
INSTALL_RUNTIME.ps1  → runtime-lock.json → verified Electron
        ↓
SYNC_APP.ps1         → app/ + samples/public/
        ↓
PhonoLayer.exe --register-file-association
        ↓
optional Desktop / Start Menu shortcuts
        ↓
PhonoLayer.exe
```

The GUI does not duplicate archive, migration, learning, or dependency-validation logic. It delegates to the existing scripts so the security boundary stays auditable.
