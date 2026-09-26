# PhonoDoc Experimental Format Specification 0.8

**Status:** Internal experimental specification  
**Format identifier:** `shengjian-phonodoc-experimental`  
**Schema:** `0.8.0`  
**Reference application:** 文之形声 · PhonoLayer Desktop v0.8.3  
**Compatibility promise:** none for pre-1.0 versions

This specification supersedes `PHONODOC_FORMAT_SPEC_0.7.md` as the current writer contract. The 0.7 specification is retained as historical documentation and migration input.

The keywords **MUST**, **SHOULD**, and **MAY** describe the current private reference implementation. This is not yet a public or frozen interoperability standard.

## 1. Why schema 0.8 exists

Application versions v0.8.0–v0.8.2 continued to write document schema `0.7.0` because their new features were derived views, database behavior or file-intake behavior that did not require new canonical document semantics.

v0.8.3 adds a persistent Japanese pitch-accent semantic model to `ruby.phono`. An older 0.7 writer/sanitizer does not preserve these unknown fields. Saving a Japanese-accent document through such a reader could therefore destroy semantic information.

For that reason:

```text
Application v0.8.3 -> canonical .phonodoc writer schema 0.8.0
```

The v0.8.3 reader accepts both:

```text
0.7.0   legacy readable input
0.8.0   current canonical input/output
```

When a 0.7.0 document is opened and then saved by v0.8.3, it is written as schema 0.8.0.

## 2. Container

A `.phonodoc` remains a single-disk ZIP container with the same reference constraints as schema 0.7:

- ZIP method `0` (store / uncompressed);
- UTF-8 filenames;
- no duplicate entries;
- no multi-disk archive;
- CRC-32 validated for every entry;
- local header / central directory consistency checks;
- archive-core maximum single entry: 64 MiB;
- archive-core maximum archive buffer: 128 MiB;
- maximum entry count: 4096;
- Electron document I/O cap: 64 MiB, making 64 MiB the effective application-level file limit.

A normal document contains exactly:

```text
manifest.json
document.json
```

## 3. Encoding

Both JSON members MUST be valid UTF-8. Malformed UTF-8 is rejected.

## 4. `manifest.json`

Current shape:

```json
{
  "format": "shengjian-phonodoc-experimental",
  "schema": "0.8.0",
  "appVersion": "0.8.3",
  "manualFirst": true,
  "experimental": true,
  "savedAt": "2026-09-25T00:00:00.000Z"
}
```

`appVersion` and document `schema` are different version domains.

The v0.8.3 reader MUST reject unknown schemas, but explicitly accepts `0.7.0` and `0.8.0`.

## 5. `document.json`

The document payload retains the same top-level shape as schema 0.7:

```json
{
  "schema": 1,
  "id": "doc-...",
  "title": "学习文档",
  "language": "ja",
  "revision": 3,
  "createdAt": "...",
  "updatedAt": "...",
  "typography": {},
  "layout": {},
  "pdfExport": {},
  "view": {},
  "contentHtml": "<p>...</p>"
}
```

The integer payload marker `document.schema` remains `1`; it is not the container schema string.

Normalization of document metadata, typography, layout, PDF settings and study-view settings remains as documented in `PHONODOC_FORMAT_SPEC_0.7.md` unless superseded below.

## 6. Canonical HTML and sanitizer

`contentHtml` remains the source of canonical editor content. Runtime-only UI is removed before serialization.

Allowed normal editor elements remain restricted. In particular:

- Word-style hyperlink entities are not part of PhonoLayer's document model;
- `<a>` is unwrapped to visible text;
- external image URLs are not persisted;
- dangerous script/style/form/object/SVG/MathML content is stripped or unwrapped;
- runtime-generated pitch SVG is not persisted.

Pitch diagrams are regenerated from semantic `data-*` attributes at load/render time.

## 7. Base phonetic annotation fields

A normal phonetic entity remains:

```html
<ruby class="phono"
      data-annotation-id="ann-..."
      data-reading="てんない"
      data-profile="ja"
      data-mastery="0"
      data-note=""
      data-pitch=""
      data-source="manual"
      data-confirmed-base="店内"
      data-stale="false">
  <span class="rb">店内</span>
  <rt></rt>
</ruby>
```

The schema 0.7 base fields remain valid in schema 0.8.

## 8. Pitch systems

Schema 0.8 introduces an explicit pitch-system discriminator.

### 8.1 No pitch system

Legacy and ordinary reading-only annotations MAY omit `data-pitch-system`.

### 8.2 Generic five-level pitch

A generic pitch annotation MAY use:

```text
data-pitch-system="generic"
data-pitch="2-4-4-2"
```

The generic system keeps the existing language-neutral five-level semantics.

### 8.3 Japanese Tokyo-type lexical pitch accent

A Japanese pitch annotation uses:

```text
data-pitch-system="ja-tokyo"
data-ja-pitch-model="ja-tokyo-accent-v1"
data-ja-pitch-dialect="ja-Tokyo"
data-ja-pitch-representation="accent-nucleus" | "manual-hl"
data-ja-morae="に|ほ|ん|ご"
data-ja-accent-nucleus="0"                 # nucleus mode
data-ja-manual-hl="L H H H"                # manual H/L mode
data-ja-pitch-source="manual"
data-pitch="2-4-4-4"                       # derived fallback
```

### 8.4 Semantic authority rule

For `data-pitch-system="ja-tokyo"`:

```text
data-ja-* fields = semantic source of truth
data-pitch       = derived rendering fallback
```

Consumers MUST NOT infer the accent nucleus by reverse-engineering `data-pitch` when canonical Japanese fields are available.

## 9. Japanese pitch field semantics

### `data-ja-pitch-model`

Current value:

```text
ja-tokyo-accent-v1
```

It identifies the internal semantic/rendering contract, not a dictionary source.

### `data-ja-pitch-dialect`

Current value:

```text
ja-Tokyo
```

The field exists so future dialect/profile extensions do not require overloading the generic `data-profile` field.

### `data-ja-pitch-representation`

Allowed current values:

```text
accent-nucleus
manual-hl
```

### `data-ja-morae`

A user-confirmed ordered mora sequence serialized with `|` separators.

Example:

```text
が|っ|こ|う
```

This is deliberately independent of kanji/base-text character count.

### `data-ja-accent-nucleus`

For `accent-nucleus`, integer text `0..N`, where `N` is mora count.

`0` means no lexical accent nucleus inside the item (heiban). Positive `k` means a lexical downstep boundary after mora `k` in the model.

### `data-ja-manual-hl`

For `manual-hl`, a user-confirmed H/L sequence. The number of levels MUST equal the number of morae.

### `data-ja-pitch-source`

Current writer value:

```text
manual
```

The field is reserved for explicit provenance. Future machine/provider suggestions MUST NOT silently be serialized as confirmed manual knowledge.

## 10. Runtime Japanese pitch objects are not persisted

These are rendering/UI state and MUST NOT become canonical document data:

- generated Japanese pitch SVG;
- five-line staff geometry;
- mora text labels in the detailed preview;
- virtual particle preview point/line;
- preview warnings;
- editor focus/selection;
- future machine suggestions not explicitly confirmed.

The runtime renderer regenerates visual objects from semantic fields.

## 11. Backward-read policy

v0.8.3 reads schema 0.7.0 so existing samples and user documents remain usable during the experimental period.

On load:

- legacy annotations without `data-pitch-system` retain existing generic/reading behavior;
- no Japanese accent semantics are invented for legacy pitch strings;
- opening a legacy document alone does not modify it;
- saving through v0.8.3 emits manifest schema 0.8.0.

This is migration-by-reserialization, not an invisible in-place file mutation.

## 12. Older-reader warning

Pre-v0.8.3 applications that hard-reject unknown document schemas may refuse to open schema 0.8.0. This is acceptable under the current pre-1.0 compatibility policy.

More importantly, forcing a schema-0.8 document through an older writer that does not know the new `data-ja-*` fields risks semantic loss. Do not downgrade by manually editing only the manifest schema.

## 13. `.phonodb`

The `.phonodb` exported schema remains `0.7.0` in application v0.8.3.

Japanese pitch fields are included additively in observation and retrieval-event objects, but no new store, required top-level field or incompatible snapshot representation is introduced.

Document schema and personal-database schema therefore intentionally differ:

```text
.phonodoc 0.8.0
.phonodb  0.7.0
```

## 14. Manual-first and automation extension rule

A future automatic accent source, dictionary, corpus or acoustic tool may only produce a proposal layer until the user explicitly accepts it.

Machine/provider results MUST remain distinguishable from user-confirmed document knowledge.

See `JAPANESE_PITCH_ACCENT_MODEL_0.8.3.md`.

## 15. Compatibility horizon

Schema 0.8.0 is still experimental. The project continues to target:

```text
v0.9.x -> format-freeze candidate
v1.0.0 -> first intended stable compatibility promise
```

Until then, architecture correctness and preservation of explicit semantics take priority over preserving accidental early behavior.
