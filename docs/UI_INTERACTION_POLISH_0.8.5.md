# UI Interaction Polish 0.8.5

Application: PhonoLayer Desktop 0.8.5  
Scope: UI/interaction only; no `.phonodoc` or `.phonodb` schema change.

## Goals

v0.8.5 reduces everyday editing friction without changing the Manual-first learning model.

### 1. Discoverable UI language switch

The canonical setting remains:

```text
视图 / View
  -> 界面语言 / UI Language
  -> 系统语言 / System language
```

A globe shortcut is also added to the Quick Access toolbar. It switches to the View ribbon and focuses the UI-language selector. UI language remains an application preference and is not document metadata.

### 2. Font-relative line-break marks

The visible `↵` editing guide is runtime-only. It is not serialized and never appears in PDF/print.

Previously the glyph was effectively fixed near 11 px. In v0.8.5 its screen size is derived from the local text font size and document zoom:

```text
marker_size ~= local_font_size * document_zoom * 0.82
```

with conservative minimum/maximum bounds. A line break in a heading therefore receives a larger guide than a line break in small body text.

### 3. Embedded image corner resizing

Single-clicking an image inside the document displays a transient selection frame with four corner handles:

```text
NW ------------- NE
 |       ·        |
 |     center     |
SW ------------- SE
```

Dragging any handle:

- preserves the image aspect ratio;
- uses the image centre as the fixed geometric anchor;
- clamps the width to the document content area;
- stores the resulting image width in the canonical document HTML;
- does not serialize the blue selection frame or resize handles;
- participates in the semantic Undo/Redo history.

For centered `figure.doc-figure` images, normal centered layout keeps the centre fixed. For an inline image, symmetric left/right margin compensation preserves the visual centre during resizing.

### 4. Ribbon and File-page transitions

Ribbon panel switching now uses a short opacity + vertical-motion transition rather than a hard display jump. The File backstage uses a short fade + horizontal entrance/exit.

The motion is intentionally small and fast; it is intended to provide continuity, not decoration. `prefers-reduced-motion: reduce` disables these transitions.

## Persistence boundaries

No new document semantics are introduced.

- Application version: `0.8.5`
- `.phonodoc` writer schema: `0.8.0`
- `.phonodb` schema: `0.7.0`

Image width is ordinary canonical HTML presentation data already supported by the sanitizer. UI transitions, image selection frames, handles, and language-focus animation are runtime-only.
