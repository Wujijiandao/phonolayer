# v0.x Development Policy

- Backward compatibility: not guaranteed before v1.0.0.
- Test documents: disposable unless intentionally promoted to fixtures.
- Database migration: introduced only when persistence semantics require it.
- Product correctness, Manual-first boundaries and learning workflow take priority over accidental early-schema stability.
- File format freeze target: v0.9.x candidate.
- v1.0.0: first intended compatibility promise.
- Application version and file schema are independent.
- New persistent state must first be classified as document truth, personal learning data, application preference, runtime recovery state, or derived view.
- Prefer derived/additive representation over duplicated sources of truth.
- Final internal deliverables are one versioned FULL.zip plus in-package documentation/QA/provenance; do not rely on scattered chat files.

See also:

- `DESIGN_PHILOSOPHY.md`
- `PHONODOC_FORMAT_SPEC_0.8.md`
- `VERSIONING_AND_COMPATIBILITY.md`
- `TESTING_AND_RELEASE_INTERNAL.md`
