# Architecture Overview — v0.9.3

v0.9.3 retains the v0.9.2 application architecture and v0.9.0 data schemas. The new architectural boundary is an explicit, locked desktop runtime supply chain.

## Layers

1. **Document layer** — `.phonodoc` schema 0.9.0, editable real-text content and annotation entities.
2. **Learning evidence layer** — retrieval events, annotation projections/events, Personal Phonological Memory.
3. **Application layer** — plain JavaScript modules, HTML/CSS renderer, Electron IPC boundary.
4. **Runtime layer** — Electron/Chromium/Node, pinned by `runtime-lock.json` and verified before extraction.

The application layer has no npm runtime dependency graph. Electron is the single deliberate heavyweight runtime dependency.

## Runtime trust boundary

The installer accepts runtime bytes only when exact size and SHA-256 match `runtime-lock.json`. Official and mirror URLs are transport sources, not independent authorities. The lock is checked before extraction/execution.

See `DEPENDENCY_AND_SUPPLY_CHAIN_0.9.3.md` for the release contract.
