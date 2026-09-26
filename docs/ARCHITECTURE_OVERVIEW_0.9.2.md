# Architecture Overview — v0.9.2 Branding Consolidation

PhonoLayer is a document-centric Electron desktop application with local-first storage.

Core separation:

```text
Text Selection
!= Annotation Entity
!= Editing Target
!= Study Display State
!= Retrieval Event
!= Personal Memory Record
!= Future Learner-State Model
```

Main modules:

- `archive-core.js` — bounded stored-ZIP/CRC parsing and packing;
- `confirmation-core.js` — reading/pitch confirmation invariants;
- `identity-core.js` — logical document identity and copy/fork handling;
- `phonetics-core.js` — shared annotation/pitch primitives;
- `japanese-pitch-core.js` — mora/accent-nucleus/manual-HL model;
- `learning-db.js` / `learning-db-core.js` — local IndexedDB projection and append-only learning events;
- `retrieval-core.js` — retrieval session/event semantics;
- `memory-core.js` — Personal Phonological Memory projection;
- `renderer.js` — desktop document/editor orchestration;
- `main.js` / `preload.js` — sandboxed Electron boundary and trusted IPC.

The application itself contains no analytics/telemetry client. The public distribution stages only `samples/public/` into the runtime. Private corpus material is not part of this tree.

`.phonodoc` and `.phonodb` keep their 0.9.0 schema; v0.9.2 is an application/public-packaging update, not a schema revision.
