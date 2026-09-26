# Experimental Format 0.8 — Compatibility Note

PhonoLayer Desktop v0.8.3 introduces `.phonodoc` schema `0.8.0`.

The container still uses `manifest.json + document.json`, but canonical phonetic annotations can now carry structured Japanese Tokyo-type pitch-accent semantics (`morae`, representation mode, accent nucleus/manual H-L, dialect/model/provenance).

The v0.8.3 application:

- reads `.phonodoc` schema `0.7.0`, `0.8.0` and `0.8.1`;
- writes `0.8.1`;
- does not infer Japanese accent fields for legacy files;
- keeps `.phonodb` schema at `0.7.0`;
- remains pre-1.0 with no stable compatibility promise.

For exact fields, see `PHONODOC_FORMAT_SPEC_0.8.md`. For the linguistic/UI model, see `JAPANESE_PITCH_ACCENT_MODEL_0.8.3.md`.


## Schema 0.8.1 (v0.8.6)

The 0.8 family receives an additive schema revision in v0.8.6. The reader accepts 0.7.0 / 0.8.0 / 0.8.1 and the writer emits 0.8.1. The new persistent field is `data-pitch-stale`; `text-indent` is also explicitly admitted by the sanitizer. See `PHONODOC_FORMAT_SPEC_0.8.1.md`.
