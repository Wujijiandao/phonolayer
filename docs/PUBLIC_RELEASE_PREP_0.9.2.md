# v0.9.2 — Branding Consolidation

v0.9.2 is a branding-consolidation and official-learning-sample release built on the v0.9.1 public/private boundary. It does **not** change the `.phonodoc` or `.phonodb` schema; both remain schema `0.9.0` freeze candidates.

## Public/private separation

The public tree contains only original official learning documents under `samples/public/`: five conceptual guides plus Japanese and Cantonese reading demos. The owner's private study corpus, exam-derived material, lyrics, game text, private editorial audits, and third-party pitch-reference subsets are excluded.

The application sample catalog loads only allow-listed public samples. Runtime staging copies only `samples/public/`.

## Public identity

User-facing product name: **文之形声 · PhonoLayer**. Internal `shengjian-*` wire-format identifiers are intentionally preserved so rebranding does not break existing files.

## Licensing

- application source: MPL-2.0;
- original public demo document text: CC0-1.0;
- Electron runtime: downloaded separately by the installer and governed by its own upstream licenses.

## Product model

Free, local-first desktop core; open/auditable formats; voluntary support; optional paid official sync may be considered later. No account or paid service is required for local core use.
