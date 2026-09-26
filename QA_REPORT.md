# QA Report — 文之形声 · PhonoLayer v0.9.7 GitHub Release Preparation

Status: **PASS** for the automated release suite available in this environment.

## Scope

v0.9.7 is a GitHub-release-preparation update over the current public-beta baseline. It consolidates the repository landing README, current branding references, public release metadata and sample `appVersion` metadata. It does **not** change learning semantics, Windows setup orchestration, or the frozen-candidate `.phonodoc` / `.phonodb` schemas; both writers remain `0.9.0`.

## Public release boundary

- Root `README.md` is GitHub-ready and references the bundled current wordmark/poster.
- Public package includes only project-original public samples.
- Private study corpora and private provenance remain excluded.
- Application source remains MPL-2.0; public demo content remains CC0-1.0.

## Version consistency

```text
Application       0.9.7
.phonodoc writer  0.9.0
.phonodb writer   0.9.0
Electron          44.4.5
```

Public sample manifests record `appVersion: 0.9.7` while retaining schema `0.9.0`.

## Environment boundary

Automated Linux/container QA cannot replace a final real Windows 11 smoke test of the WinForms setup UI, persistent IndexedDB profile, Explorer association cache, long-running IME behavior, forced-termination recovery and Windows PDF output.
