# Release and Testing

A public release must pass at least:

- static/source policy checks;
- core logic tests;
- database merge/event tests;
- format migration/freeze tests;
- Chromium interaction regression tests;
- public-release privacy/licensing scan;
- runtime-lock and installer supply-chain invariant checks;
- Windows one-click setup orchestration/static contract checks;
- manifest verification and final ZIP integrity check.

Container QA must not be reported as a substitute for Windows physical-machine tests involving persistent Electron IndexedDB profiles, Explorer association caches, long-running IME behavior, forced-process recovery, or Windows PDF pagination.
