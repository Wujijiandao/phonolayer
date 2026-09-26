# `.phonodoc` Experimental Format Specification 0.8.2

Format: `shengjian-phonodoc-experimental`  
Schema: `0.8.2`

This is an additive delta over schema 0.8.1. Container, sanitizer, annotation, Japanese Pitch Accent, CRC and ZIP rules from 0.8.0/0.8.1 remain normative.

## Compatibility

- read: 0.7.0, 0.8.0, 0.8.1, 0.8.2
- write: 0.8.2

Saving a legacy document canonicalizes it to 0.8.2. Bundled private samples may remain schema 0.8.0 until re-saved.

## New optional field: `document.lineage`

A 0.8.2 writer MAY store a JSON object named `lineage`. Current defined keys are:

- `forkedFromDocumentId`
- `forkReason`
- `forkedAt`

The field records identity provenance only. It does not authorize automatic linguistic inference.

## Identity invariant

A `document.id` is a logical document identity used by recovery, retrieval provenance and annotation-projection IDs. Two simultaneously existing physical files must not silently share the same logical ID inside one local installation. Copy detection may therefore fork the newly opened physical copy.

## Confirmation invariant

Schema 0.8.1 `data-pitch-stale` remains normative. A reading edit without explicit pitch reconfirmation MUST NOT clear it.
