# `.phonodoc` Experimental Format Specification 0.8.1

Status: private/internal experimental  
Format identifier: `shengjian-phonodoc-experimental`  
Schema: `0.8.1`

This document is an additive delta over `PHONODOC_FORMAT_SPEC_0.8.md` (schema 0.8.0). Unless overridden here, all 0.8.0 container, manifest, `document.json`, sanitizer, size, ZIP and Japanese Pitch Accent rules remain normative for 0.8.1.

## Compatibility

PhonoLayer Desktop v0.8.6:

```text
read:  0.7.0, 0.8.0, 0.8.1
write: 0.8.1
```

A saved 0.7.0 or 0.8.0 document is canonicalized to 0.8.1.

## New canonical annotation field

`ruby.phono` may contain:

```html
data-pitch-stale="true|false"
```

Meaning:

- `false` or absent: stored pitch semantics are currently learner-confirmed for the current reading;
- `true`: the reading has been explicitly changed or reconfirmed independently while pre-existing pitch data has not yet been reconfirmed.

This field is independent of:

```html
data-stale="true|false"
```

`data-stale` continues to represent base-text / confirmed-reading-pair integrity. `data-pitch-stale` represents pitch confirmation only.

## Required behavior

A conforming 0.8.1 writer MUST preserve `data-pitch-stale` on `ruby.phono`.

When `data-pitch-stale="true"`:

- the visible pitch may remain in the document as stale reference data;
- the application MUST NOT silently promote that pitch to learner-confirmed memory/retrieval evidence;
- detailed user confirmation may clear the stale flag;
- changing the reading does not automatically recompute morae, H/L or accent nucleus.

The application remains Manual-first; schema 0.8.1 does not authorize automatic dictionary lookup, accent inference or acoustic analysis.

## Paragraph formatting addition

Canonical sanitized editor HTML now explicitly permits:

```css
text-indent
```

for block-level paragraph formatting. The preferred first-line indent values produced by the standard UI are `0`, `1em` and `2em`, with bounded custom em values also allowed.

Whitespace typed outside a `ruby.phono` is ordinary document text or paragraph formatting and MUST NOT be moved into `.rb` merely because the caret is visually adjacent to the annotation.

## Runtime-only state

The following remain runtime UI and MUST NOT serialize:

- inline reading input overlay;
- color palette popovers;
- annotation selection frames;
- image resize handles;
- reveal state;
- generated pitch SVG.
