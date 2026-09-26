# PhonoDoc Experimental Format Specification 0.7

**Status:** Internal experimental specification  
**Format identifier:** `shengjian-phonodoc-experimental`  
**Schema:** `0.7.0`  
**Reference application:** 文之形声 · PhonoLayer Desktop v0.8.2  
**Compatibility promise:** none for pre-1.0 versions

The keywords **MUST**, **SHOULD**, and **MAY** in this document describe the current reference implementation. This is not yet a public or frozen interoperability standard.

## 1. Container

A `.phonodoc` file is a single-disk ZIP container with these reference-implementation constraints:

- ZIP compression method MUST be `0` (store / uncompressed).
- Filenames are UTF-8 and the UTF-8 flag is written by the reference packer.
- Duplicate entry names are rejected.
- Multi-disk ZIP is rejected.
- CRC-32 is validated for every entry.
- ZIP local header and central-directory metadata MUST agree.
- Reference archive-core limits:
  - maximum one entry: 64 MiB;
  - maximum archive buffer: 128 MiB;
  - maximum entry count: 4096.
- Electron desktop file I/O independently caps `.phonodoc` / `.phonodb` files at 64 MiB, therefore **64 MiB is the effective current application-level file limit**.

Current normal `.phonodoc` files contain exactly two required entries:

```text
manifest.json
 document.json
```

Unknown extra entries are not part of the current ordinary document format. Recovery containers may carry recovery-specific metadata; they are runtime recovery artifacts, not the normal interchange contract.

## 2. Encoding

`manifest.json` and `document.json` MUST be valid UTF-8 JSON. The archive reader uses a fatal UTF-8 decoder; malformed UTF-8 is rejected.

## 3. `manifest.json`

Required reference shape:

```json
{
  "format": "shengjian-phonodoc-experimental",
  "schema": "0.7.0",
  "appVersion": "0.8.2",
  "manualFirst": true,
  "experimental": true,
  "savedAt": "2026-09-24T00:00:00.000Z"
}
```

Fields:

| Field | Type | Meaning |
|---|---|---|
| `format` | string | MUST equal `shengjian-phonodoc-experimental`. |
| `schema` | string | MUST equal the schema currently accepted by the application, presently `0.7.0`. |
| `appVersion` | string | Application version that serialized the file. It is NOT the document schema. |
| `manualFirst` | boolean | Declares the design contract used by the reference application. |
| `experimental` | boolean | Signals that the format is pre-1.0 and not compatibility-frozen. |
| `savedAt` | ISO-8601 string | Serialization time. |

The v0.8.2 parser currently hard-rejects mismatched `format` or `schema`.

## 4. `document.json`

Reference shape:

```json
{
  "schema": 1,
  "id": "doc-...",
  "title": "学习文档",
  "language": "ja",
  "revision": 3,
  "createdAt": "2026-09-24T00:00:00.000Z",
  "updatedAt": "2026-09-24T00:00:00.000Z",
  "typography": {},
  "layout": {},
  "pdfExport": {},
  "view": {},
  "contentHtml": "<p>...</p>"
}
```

### 4.1 Identity and metadata

| Field | Current behavior |
|---|---|
| `schema` | Internal document-payload marker, currently integer `1`. |
| `id` | Stable document identifier when available; a new one is generated if absent. |
| `title` | Human-facing title. |
| `language` | Current supported values: `ja`, `zh-Mandarin`, `yue`; unknown values normalize to `ja`. |
| `revision` | Positive numeric revision; invalid/missing values normalize to `1`. |
| `createdAt` | ISO date serialized by app; invalid values normalize to load time. |
| `updatedAt` | ISO date serialized by app; invalid values normalize to load time. |

### 4.2 `typography`

Current fields:

```json
{
  "bodyFontKey": "yu-mincho",
  "phoneticFontKey": "yu-gothic",
  "bodyFontSizePt": 14,
  "rubyScale": 0.47,
  "lineHeight": 2
}
```

Normalization rules:

- font keys MUST exist in the app font catalog or fall back to language defaults;
- `bodyFontSizePt`: clamped to `8..96`;
- `rubyScale`: clamped to `0.3..0.9`;
- `lineHeight`: clamped to `1.2..3`.

### 4.3 `layout`

```json
{
  "paperSize": "A4",
  "marginPreset": "normal"
}
```

Accepted values:

- `paperSize`: `A4` or `Letter`;
- `marginPreset`: `normal`, `narrow`, `wide`.

### 4.4 `view`

```json
{
  "phoneticMode": "text",
  "studyMode": "study",
  "masteryThreshold": 3
}
```

Accepted values:

- `phoneticMode`: `text`, `pitch`, `both`;
- `studyMode`: `study`, `compact`, `reading`, `hidden`;
- `masteryThreshold`: integer-like value normalized to `1..3`, default `3`.

Study presets are UI conveniences. This object remains the persisted source of truth.

### 4.5 `pdfExport`

Current normalized fields:

```json
{
  "preset": "current",
  "paperSize": "A4",
  "orientation": "portrait",
  "marginPreset": "document",
  "phonetics": "current",
  "includeHighlights": true,
  "headerMode": "none",
  "headerText": "",
  "footerMode": "none"
}
```

Allowed values:

- `preset`: `custom`, `current`, `study`, `review`, `text`, `pitch`;
- `paperSize`: `A4`, `Letter`;
- `orientation`: `portrait`, `landscape`;
- `marginPreset`: `document`, `normal`, `narrow`, `wide`;
- `phonetics`: `current`, `both`, `text`, `pitch`, `none`;
- `includeHighlights`: boolean-like, defaults true;
- `headerMode`: `none`, `title`, `custom`;
- `footerMode`: `none`, `page`, `page-total`;
- `headerText`: string.

### 4.6 `contentHtml`

`contentHtml` is canonical, sanitized editor HTML. It is required by the current parser.

The sanitizer currently allows these element names:

```text
P DIV SPAN H1 H2 H3 UL OL LI BR HR STRONG B EM I U S MARK
BLOCKQUOTE RUBY RT IMG FIGURE
```

Classes are restricted to the allowlist:

```text
phono gloss rb doc-figure doc-image align-center
```

Inline styles are restricted to an allowlist covering typography, color, highlight, text alignment, line height, margins, left padding and letter spacing. Values containing constructs such as `url(...)`, `expression(...)`, `javascript:` or `@import` are discarded.

Dangerous/unsupported elements such as script, style, iframe, object, embed, form controls, SVG and MathML are removed or unwrapped according to sanitizer behavior.

Images are accepted only as safe `data:image/(png|jpeg|gif|webp);base64,...` sources. External image URLs are not persisted by the sanitizer.

## 5. Phonetic annotation entity

Canonical phonetic annotations use:

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

Persisted phonetic `data-*` allowlist:

```text
data-annotation-id
data-reading
data-profile
data-mastery
data-note
data-pitch
data-source
data-confirmed-base
data-stale
```

### 5.1 `data-annotation-id`

Stable identifier for one annotation entity inside a document. On paste/import, duplicate/missing IDs may be regenerated.

### 5.2 `data-reading`

Learner-confirmed reading string. The application does not infer or regenerate it from the base text.

### 5.3 `data-profile`

Language/profile identifier, normally aligned with current document language (`ja`, `zh-Mandarin`, `yue`).

### 5.4 `data-mastery`

Current manually managed mastery marker. Retrieval history does not automatically rewrite it in v0.8.2.

### 5.5 `data-note`

Free user note attached to this annotation.

### 5.6 `data-pitch`

Explicit user-entered five-level pitch/contour data. Rendered SVG is derived at runtime and MUST NOT be treated as persistent source data.

### 5.7 `data-source`

Provenance marker. Current internal workflows use values such as:

- `manual`;
- `reused`;
- `pasted`;
- conversion-specific values such as `imported-docx` in internal fixtures.

This field is intentionally provenance, not truth-ranking.

### 5.8 `data-confirmed-base` and `data-stale`

`data-confirmed-base` stores the base text last explicitly confirmed with the annotation data.

At runtime:

```text
current .rb text != data-confirmed-base
    => data-stale="true"
```

A stale annotation is retained as historical document structure but is not treated as a newly confirmed learning fact until reconfirmed.

### 5.9 `<rt>` is empty in canonical persistence

The reference serializer removes generated runtime children from `<rt>` before saving. Reading text and pitch graphics are reconstructed from `data-reading` / `data-pitch` after load.

Therefore consumers MUST NOT expect `<rt>` text to be the persistent source of truth for `ruby.phono`.

## 6. Glossary ruby

A separate `ruby.gloss` entity may retain `data-gloss` and human-facing `rt` text for gloss-like annotations. It is not a Personal Phonological Memory annotation and follows different interaction semantics.

## 7. Runtime-only state that MUST NOT be persisted as document truth

Examples:

- `annotation-selected` class;
- `reveal` class;
- generated pitch SVG;
- current Chromium Selection / Range;
- Quick/Object interaction preference;
- UI locale preference;
- undo/redo history;
- retrieval dialog/session transient state;
- Personal Phonological Memory derived rows.

The canonical serializer removes/normalizes relevant runtime markup before saving.

## 8. Separation from `.phonodb`

`.phonodoc` stores document content and document-scoped annotations.

Long-term personal learning state is kept separately in the local learning database and exported as `.phonodb`. Retrieval sessions/events are personal learning data and are NOT written into `.phonodoc`.

## 9. Security / robustness expectations

A conforming internal converter SHOULD:

1. create method-0 ZIP entries with correct CRC;
2. emit valid UTF-8 JSON;
3. use the exact format/schema marker;
4. keep canonical annotation data in supported `data-*` fields;
5. avoid persisting generated runtime SVG/UI classes;
6. ensure annotation IDs are unique in the document;
7. pass output through the reference application and save once when practical;
8. test with archive integrity checks.

The reference application additionally sanitizes HTML and constrains filesystem extensions and sizes in the Electron main process.

## 10. Compatibility policy

Schema `0.7.0` remains experimental. Additive fields have been introduced across application versions without changing the schema identifier when old readers can safely normalize/ignore them.

No pre-1.0 third-party compatibility guarantee is made. The freeze-candidate target is v0.9.x; v1.0.0 is intended to be the first stable compatibility commitment.
