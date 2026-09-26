# Stabilization notes — v0.6.5

v0.6.5 is a mechanism-hardening release.

The central invariant is: **rendered learning UI is disposable; learner-authored data is canonical**. Pitch SVG, selection classes and other transient display artifacts are rebuilt from saved annotation attributes instead of being stored as document truth.

Saving is treated as a transaction: prepare a snapshot, attempt disk replacement, and only after success advance revision/path/clean state. Failed writes leave the document visibly unsaved.

Phonetic annotation creation, replacement and removal now participate in the contenteditable native edit history, allowing Ctrl+Z / Ctrl+Y to behave like a desktop text editor rather than bypassing annotation objects.

The personal learning ledger is reconciled from current learner-authored annotation state. Imported, demo and pasted annotations remain document data until the learner explicitly turns them into personal observations.

The experimental archive reader now rejects malformed bounds, unsupported compression, duplicate names, oversized content and CRC mismatches instead of attempting permissive recovery.
