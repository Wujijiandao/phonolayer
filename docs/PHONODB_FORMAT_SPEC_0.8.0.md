# `.phonodb` Experimental Format Specification 0.8.0

Format: `shengjian-phonodb-experimental`  
Schema: `0.8.0`

## Container

Store-only ZIP with exactly `manifest.json` and `snapshot.json` for normal exports. Archive validation follows the same bounded/CRC-checked core used by `.phonodoc`.

## Snapshot collections

- `entries`: long-term `language + base + reading` relations.
- `observations`: current annotation projections, not append-only encounter history. Each normalized projection uses `kind=annotation-projection` and `projectionRevision`.
- `annotationEvents`: append-only created / updated / removed projection transitions.
- `retrievalSessions`: retrieval-session metadata.
- `retrievalEvents`: append-only reveal/rating evidence.
- `meta`: database metadata.

Japanese pitch fields (`pitchSystem`, `jaPitchModel`, `jaPitchDialect`, `jaPitchRepresentation`, `jaMorae`, `jaAccentNucleus`, `jaManualHl`, `jaPitchSource`) are first-class semantics in observations and retrieval events.

## Extension policy

Records may contain an `extensions` JSON object. The 0.8 normalizers preserve this object. New experimental/vendor data should use namespaced keys such as `x-example.feature`; unknown top-level fields have no preservation guarantee.

## Import compatibility

Reader accepts 0.7.0 and 0.8.0. Missing 0.8 arrays/fields in a 0.7 snapshot normalize to empty/default values. Import is not blind `put`:

- entry collision: merge timestamps and extensions conservatively;
- observation collision: later `updatedAt` wins; equal-time differing projections keep local data and are reported as conflicts;
- retrieval/annotation event collision: identical event is a duplicate and skipped; same ID with different contents aborts import;
- metadata: local known keys win unless absent.

The append-only event conflict rule exists to prevent silent rewriting of learning history.
