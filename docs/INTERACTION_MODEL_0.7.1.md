# Interaction Model 0.7.1

## Core separation

v0.7.1 formally separates three concepts that were too closely coupled in v0.7.0:

1. **Text Selection** — Chromium `Selection/Range`, used only to choose unannotated source text when creating a new annotation.
2. **Annotation Entity** — persistent `ruby.phono` data carrying annotation ID, reading, pitch, mastery, note and provenance.
3. **Editing Target** — the annotation currently opened for editing. It does not require a persistent object-selection highlight.

`Annotation Entity != Selection State`.

The base-text fields shown in annotation tools are reference fields, not an alternate text editor. New annotation text comes from the strict document Selection; existing base text is changed only in the document itself. Editing the upper phonetic layer changes reading/pitch/mastery/note metadata and can reconfirm the current base-reading pairing.

## Interaction modes

### Quick mode (default)

- Existing annotations are not auto-selected on single click.
- No blue annotation-object outline is shown.
- Double-click **the upper phonetic layer (`rt`: reading/pitch)** to edit that annotation directly.
- Double-clicking the base text (`.rb`) is left to ordinary Chromium text selection/editing behavior.
- New annotations require an explicit text selection.

### Object mode

- Retains the v0.7.0 object-selection workflow.
- Single click on an annotation may select it and load the contextual Ribbon.
- The persistent blue object outline is available only in this mode.
- Double-click editing still belongs to the upper phonetic layer, not the base text.

The mode is an **application preference**, not document data, and is therefore not serialized into `.phonodoc`.

## Strict creation selection

A new annotation selection must:

- be non-empty;
- stay inside one text block;
- not intersect any existing `ruby.phono`;
- not cross images, figures, hard line breaks or glossary ruby objects.

Any range touching an existing annotation is blocked instead of being silently snapped to that annotation.

## Editable base text and stale annotations

The base text of an existing annotation remains ordinary editable document text. When the base text changes, the annotation entity is retained but marked `data-stale=true` until the user explicitly reconfirms it through the phonetic-layer editor.

This prevents the personal learning database from silently treating an old reading as confirmed for newly edited text. Stale annotations are visually signaled on the phonetic layer and are not written back as fresh learning observations until reconfirmed.

## Direct edit handle

The canonical direct-edit gesture is:

`double click rt -> annotation ID -> detailed annotation editor`

No intermediate `selectedRuby` state is required in Quick mode.
