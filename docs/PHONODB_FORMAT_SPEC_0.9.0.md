# `.phonodb` Format Freeze Candidate 0.9.0

Format marker: `shengjian-phonodb-experimental`  
Schema: `0.9.0`  
Status: **freeze candidate**.

## Compatibility

- read/import: `0.7.0`, `0.8.0`, `0.9.0`
- export/write: `0.9.0`

Schema 0.9.0 does not add an automatic mastery model. It freezes the semantic separation introduced in 0.8.0:

- `entries`: stable language + base + reading relations;
- `observations`: current annotation projections, not append-only encounter history;
- `annotationEvents`: append-only annotation lifecycle evidence;
- `retrievalSessions` / `retrievalEvents`: behavioral retrieval history;
- `meta`: database metadata;
- `extensions`: namespaced extension payloads on records where defined.

## Merge contract

Import remains an auditable merge, not blind replacement:

- exact duplicate events may be skipped;
- same event ID with different content is a conflict and must not silently overwrite history;
- current projections may resolve using the implemented projection/update ordering;
- legacy 0.7 data may lack fields introduced later and must not be assigned invented Japanese pitch semantics.

## Extension policy

Namespaced `extensions` objects are the supported forward-extension channel. Unknown semantic fields outside defined contracts are not grounds for inference.

## Manual-first boundary

The database records user-confirmed observations and behavior. Schema 0.9.0 does not define spacing, automatic mastery, pronunciation correctness scoring or an answer engine.
