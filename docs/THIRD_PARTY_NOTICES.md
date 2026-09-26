# Third-Party Notices

## Electron

The Windows bootstrap script downloads an upstream Electron runtime when no verified cache is available. Electron is a separate upstream project and is not relicensed by PhonoLayer. v0.9.3+ pins the exact Electron 44.4.5 Windows x64 archive in `runtime-lock.json`; every cached or downloaded artifact must match the locked SHA-256 before extraction. The downloaded runtime includes its own licensing and third-party notices (including Chromium and Node.js components).

PhonoLayer's public source ZIP does not bundle the Electron binary runtime.

## Fonts

PhonoLayer selects installed/system fonts by name; font files are not redistributed in this package.

## Public demos

The public demo document text is original project material and is dedicated to CC0-1.0. No private or third-party study corpus is bundled.

## Runtime archival

`BACKUP_ELECTRON_RELEASE.bat` can create an owner-side offline copy of the exact upstream runtime ZIP and SHASUMS file. These archived binaries remain governed by their upstream licenses and are not part of the PhonoLayer source-code license grant.
