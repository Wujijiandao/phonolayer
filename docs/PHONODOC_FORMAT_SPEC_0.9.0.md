# `.phonodoc` Format Freeze Candidate 0.9.0

Format marker: `shengjian-phonodoc-experimental`  
Schema: `0.9.0`  
Status: **freeze candidate, not yet the v1.0 compatibility promise**.

Schema 0.9.0 consolidates the 0.8.2 identity model and makes forward-extension/private-use metadata explicit. Container, CRC, sanitizer, annotation, Japanese pitch and `data-pitch-stale` semantics from 0.8.x remain normative.

## Compatibility

- read: `0.7.0`, `0.8.0`, `0.8.1`, `0.8.2`, `0.9.0`
- write: `0.9.0`
- saving any readable legacy document canonicalizes it to `0.9.0`

## Container

A `.phonodoc` remains a UTF-8 ZIP container using method 0 (stored) with exactly two canonical members:

```text
manifest.json
document.json
```

Duplicate entries, CRC failures, malformed bounds, unsupported compression and invalid UTF-8 names are rejected.

## `manifest.json`

Required/defined fields for the 0.9 writer:

- `format`
- `schema`
- `appVersion`
- `manualFirst`
- `experimental`
- `freezeCandidate`
- `extensionsPolicy`
- `savedAt`

Private packaged fixtures may additionally contain `usageScope = private-personal`.

Unknown manifest keys are not a forward-extension channel and are not promised to survive a read/save round trip. Future persistent extensions belong in `document.json.extensions`.

## `document.json`

Canonical top-level fields:

- `schema` (internal document payload marker; currently `1`)
- `id`
- `title`
- `language`
- `revision`
- `createdAt`
- `updatedAt`
- `lineage`
- `usagePolicy` (optional object)
- `extensions` (optional namespaced object)
- `typography`
- `layout`
- `pdfExport`
- `view`
- `contentHtml`

### Extension policy

Writers MUST preserve `document.json.extensions` when it is an object. New experimental metadata that must survive older 0.9-aware writers SHOULD use a namespaced key under `extensions`, for example:

```json
{
  "extensions": {
    "shengjian.sample": { "private": true }
  }
}
```

Arbitrary unknown top-level keys are not guaranteed to survive. This constraint deliberately keeps the freeze surface small.

### Private-use metadata

`usagePolicy` is metadata only. It does not alter pronunciation, learning-state or rendering semantics and is not a substitute for legal rights review. Current owner-private packaged fixtures use `scope = private-personal`.

## Identity and confirmation invariants

- `document.id` is a logical document identity used for recovery/retrieval provenance.
- simultaneous physical copies must not silently share the same active logical identity inside one installation; copy detection may fork identity and record lineage.
- changing a learner-confirmed reading without explicit pitch reconfirmation MUST leave old pitch stale.
- stale pitch MUST NOT be promoted into confirmed retrieval/memory evidence.

## Annotation semantics

The canonical `ruby.phono` data fields and Japanese pitch model remain those documented in 0.8.1/0.8.2. Runtime SVG/selection/reveal state is never canonical document data.
