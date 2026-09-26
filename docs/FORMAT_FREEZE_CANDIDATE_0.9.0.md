# v0.9.0 — Format Freeze Candidate

v0.9.0 is the first release whose primary goal is long-term format discipline rather than feature growth.

## Frozen-candidate decisions

1. `.phonodoc` canonical writer advances to schema `0.9.0`; legacy 0.7/0.8 readers remain supported.
2. `.phonodb` canonical export advances to schema `0.9.0`; legacy 0.7/0.8 imports remain supported.
3. `document.json.extensions` becomes the explicit namespaced forward-extension channel and is preserved across read/save.
4. `usagePolicy` is a defined optional document metadata object; it does not alter linguistic semantics.
5. identity lineage, reading/pitch confirmation separation, structured Japanese pitch, observation-vs-event distinction and merge conflict behavior are retained as freeze-candidate invariants.
6. migration fixtures are separated from private learning samples under `qa/fixtures/`.
7. the public package keeps a single source of truth for redistributable demo documents under `samples/public/`.
8. owner-private learning documents and private provenance are outside the public distribution; public demos carry explicit `public-demo` metadata.

## Not frozen yet

v0.9.0 is not v1.0. We still reserve the right to change the candidate after adversarial/Win11 evidence, especially around:

- real persistent IndexedDB profiles;
- long-duration IME editing;
- process-kill recovery;
- Windows file-association cache behavior;
- PDF pagination;
- very large documents;
- future learner-state research.

No automatic learner-state or scheduler is introduced by this release.
