# Semantic Integrity / Architecture Hardening 0.8.10

Application: **PhonoLayer Desktop 0.8.10**

This release adds no automatic answers and no learner-state scheduler. It hardens semantic invariants before the 0.9 format-freeze line.

## Fixed invariants

1. Any reading change without an explicit pitch edit makes existing pitch stale; Quick Context and inline editing share the same pure rule. A previously stale pitch is never silently reconfirmed by note/mastery edits.
2. Annotation linguistic identity comes from `data-profile`; changing a document default language does not relabel an existing annotation. Retrieval uses annotation profile and a mixed-language session is labeled `mixed`.
3. A stale pitch contributes no confirmed `pitch`, `pitchSystem`, or `data-ja-*` semantics to retrieval events or Personal Memory observations.
4. Immediate database recording uses the full annotation semantic object, including Tokyo pitch fields and `jaPitchSource`.
5. Personal Memory aggregates structured Japanese pitch variants rather than collapsing them to a numeric contour alone.

## Document identity

`.phonodoc` schema 0.8.2 adds optional `document.lineage`. A local document-ID registry detects a known document ID at a second live path. If the previously registered path still exists, the newly opened copy is forked to a fresh document ID and records `forkedFromDocumentId`, `forkReason`, and `forkedAt`. If the old path no longer exists, the change is treated as a move/rename and the identity is rebound.

This protects tab state, recovery drafts, observation IDs, and retrieval provenance from physical-file-copy collisions. Explicit Save As keeps the current logical identity; reopening the old still-existing file later is therefore recognized as the copy and forked.

## Observation vs event

`observations` are now explicitly **current annotation projections** (`kind=annotation-projection`, `projectionRevision>=1`). They are not encounter history. The IndexedDB engine adds append-only `annotationEvents` recording created / updated / removed transitions. Retrieval events remain append-only behavioral evidence.

## `.phonodb`

Export schema advances from 0.7.0 to 0.8.0. Reader accepts 0.7.0 and 0.8.0. Merge rules are explicit: entries merge conservatively; current projections use `updatedAt`; retrieval/annotation event ID collisions with different contents abort import; exact duplicate events are skipped. An `extensions` object is the reserved forward-extension namespace and is preserved by normalizers.

## Non-goals

No spaced-repetition scheduler, mastery estimator, dictionary lookup, automatic mora segmentation, automatic accent lookup, or F0 analysis is introduced.
