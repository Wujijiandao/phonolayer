# v0.9.3 — Dependency & Supply-Chain Hardening

v0.9.3 is a narrow public-beta hardening release built on the v0.9.2 branding and official-learning-sample baseline.

It does not revise `.phonodoc` or `.phonodb`; both remain schema `0.9.0` freeze candidates.

Changes:

- added `runtime-lock.json` for Electron 44.4.5 / win32-x64;
- installer now verifies exact runtime size and SHA-256 before extraction or execution;
- cached and sibling-version runtime archives are verified before reuse;
- mirror downloads are accepted only if they match the same official locked hash;
- installed runtime provenance is recorded locally;
- added an owner-facing offline Electron release backup script;
- documented the current dependency inventory and third-party boundary;
- release QA now asserts the runtime lock and installer verification contract.

No private corpus material is reintroduced.
