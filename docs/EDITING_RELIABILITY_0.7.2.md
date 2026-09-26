# Editing Reliability 0.7.2

## Scope

v0.7.2 is a reliability release for the interaction architecture introduced in v0.7.1. It deliberately avoids expanding the product surface. The goal is to make ordinary text editing, annotation editing, IME composition, undo/redo, clipboard operations, and crash recovery behave as one coherent editor.

The central invariant remains:

`Text Selection != Annotation Entity != Editing Target`

## Unified editor history

v0.7.1 still relied on two different history mechanisms: Chromium handled ordinary text changes, while annotation metadata changes were direct dataset mutations. That meant Ctrl+Z could not reliably reverse a reading/pitch/mastery edit.

v0.7.2 introduces a per-document semantic history layer. It records canonical editor snapshots for:

- ordinary text insertion/deletion;
- IME composition as a single transaction;
- annotation creation/removal;
- annotation reading/pitch/mastery/note updates;
- rich-text formatting operations;
- cut/paste operations.

The toolbar, Ctrl+Z/Ctrl+Y, and Electron Edit menu now route through the same history layer. History is document-local and capped to prevent unbounded memory growth.

## IME transaction boundary

Chinese/Japanese IME editing is treated as composition, not as a stream of independent stable edits.

During `compositionstart -> compositionend`:

- intermediate composition input marks the document dirty but does not reconcile annotation stale state against the learning database;
- selection-driven phonetic context refresh is suspended;
- one history transaction is created after composition ends;
- stale annotation status is reconciled only against the final committed base text.

This avoids transient IME text being interpreted as a confirmed document state.

## Annotation-safe clipboard

Copy/cut from the editor writes canonical HTML rather than the rendered runtime ruby subtree. Generated pitch SVG, temporary reveal state, and object-selection UI do not enter the clipboard representation.

Pasted annotation entities:

- receive fresh annotation IDs;
- are marked `source=pasted`;
- preserve explicit reading/pitch metadata;
- do not silently become new personal-learning observations;
- are re-rendered from canonical annotation data.

A cut that starts inside an annotation and ends outside it (or the reverse) is blocked, because that operation would create a structurally partial ruby entity. Editing entirely inside base text remains allowed, as does removing a whole annotation through the explicit annotation command.

## Strict selection boundary semantics

v0.7.1 used broad DOM intersection checks. v0.7.2 distinguishes real overlap from mere boundary contact.

A text selection immediately before or after an existing ruby can be annotated. A selection whose endpoints are inside an annotation, or whose cloned content actually contains an annotation entity, is blocked.

This makes strict creation predictable without making adjacent text impossible to annotate.

## Crash-recovery drafts

Dirty documents are written, after a short debounce, to an application-owned recovery directory under Electron `userData/Recovery`.

Recovery drafts:

- use the same `.phonodoc` container and schema as the current document;
- add only a small `recovery.json` entry containing source-path metadata;
- use atomic main-process writes;
- are removed after a successful save or an explicit discard;
- survive an abnormal process/window termination;
- are automatically reopened as dirty documents on the next launch.

A recovered document therefore remains editable and can be saved normally. Recovery state is application safety infrastructure, not part of the user's persistent `.phonodoc` format contract.

## Mode-switch consistency

Quick/Object mode remains an application preference. Switching modes never changes annotation data.

- Quick mode clears persistent object-selection UI.
- Object mode restores single-click object selection.
- Direct editing remains bound to the upper phonetic layer in both modes.
- Base-text double click remains ordinary text behavior.

## Remaining Windows-only checks

The automated environment can exercise Chromium composition events but is not a real Windows 11 IME session. Real-device observation is still required for:

- Microsoft Pinyin / Japanese IME candidate-window behavior;
- long composition sessions around ruby boundaries;
- Electron focus transitions between native menus/dialogs and IME;
- Explorer file-association/icon cache after upgrade;
- final Windows PDF font pagination.
