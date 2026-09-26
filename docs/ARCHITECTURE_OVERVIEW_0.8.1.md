# Architecture Overview 0.8.1

## System layers

```text
┌───────────────────────────────────────────────────────────┐
│ Electron Main Process                                    │
│ file I/O · dialogs · recovery · PDF · file association  │
│ main.js                                                   │
└───────────────────────┬───────────────────────────────────┘
                        │ contextBridge / validated IPC
┌───────────────────────▼───────────────────────────────────┐
│ Preload                                                   │
│ preload.js                                                │
└───────────────────────┬───────────────────────────────────┘
                        │ restricted desktop API
┌───────────────────────▼───────────────────────────────────┐
│ Renderer / Editor                                        │
│ renderer.js + index.html + styles.css + i18n.js          │
│ tabs · Ribbon · Selection · Annotation · study workflow  │
└──────────────┬───────────────────┬─────────────────────────┘
               │                   │
      ┌────────▼────────┐  ┌───────▼──────────────────────┐
      │ Pure Core Logic │  │ Personal Learning Database  │
      │ phonetics-core  │  │ learning-db.js / IndexedDB │
      │ archive-core    │  │ entries / observations     │
      │ retrieval-core  │  │ retrieval sessions/events │
      │ memory-core     │  └─────────────────────────────┘
      └─────────────────┘
```

## Electron security boundary

Main process uses:

- `contextIsolation: true`;
- `nodeIntegration: false`;
- `sandbox: true`;
- permission request denial/guarding;
- navigation restrictions;
- trusted IPC sender checks;
- filesystem extension allowlists for `.phonodoc` / `.phonodb`;
- file-size limits;
- atomic writes.

Renderer does not receive arbitrary Node.js access.

## Document state

Each open document is represented in renderer memory with fields such as:

```text
id / title / language / revision
filePath / fileName / dirty
createdAt / updatedAt
typography / layout / pdfExport / view
html
```

The active editor DOM is synchronized back into the active document before save/switch operations.

## Annotation lifecycle

```text
strict text Selection
      │
      ▼
create ruby.phono
      │
      ├─ stable annotation ID
      ├─ reading / pitch / mastery / note
      ├─ provenance
      └─ confirmed base text
      │
      ▼
normal document editing
      │
      ├─ unchanged base -> confirmed
      └─ changed base   -> stale
                          │
                          ▼
                explicit reconfirmation
```

Quick mode suppresses persistent object selection. Direct annotation edit gesture is upper phonetic layer double-click -> annotation ID -> editor.

## Canonical vs runtime representation

Persistent `ruby.phono` stores data in attributes and uses an empty `<rt>`.

Runtime rendering reconstructs:

```text
reading label
+ pitch SVG
+ interaction handles
```

Before serialization, runtime-only markup and states are removed.

This prevents the rendering implementation from becoming part of the file format.

## Learning data flow

```text
manual / reused confirmed annotation
             │
             ▼
      document observation
             │
             ▼
     IndexedDB learning data
       │               │
       │               └── Retrieval Sessions / Events
       │
       └── lexical entries
             │
             ▼
 Personal Phonological Memory
     (derived, not duplicated)
```

Personal Memory is a view over user-owned evidence, not a second authoritative database.

## Study display

Display state is separate from annotation content:

```text
Annotation content
    × phoneticMode
    × studyMode
    × masteryThreshold
    × transient reveal
```

No study preset copies or deletes the annotation answer.

## Recovery

Dirty documents are periodically serialized into recovery containers under Electron `userData/Recovery`. Successful save/explicit discard removes the corresponding recovery draft. Recovery is runtime resilience, not a normal `.phonodoc` interchange feature.

## Version 0.8.1 scope

v0.8.1 intentionally changes documentation and project organization only. It does not add a new persistent store and does not change the `0.7.0` `.phonodoc` / `.phonodb` schema identifier.


## v0.8.3 delta — Japanese Pitch Accent Model

The 0.8.1 architecture remains the base, with a new pure phonological layer:

```text
user-confirmed reading
  + manual mora segmentation
  + manual nucleus or H/L
          │
          ▼
app/japanese-pitch-core.js
          │
          ├─ semantic validation
          ├─ schematic H/L derivation
          └─ future unconfirmed proposal contract
          │
          ▼
renderer Japanese five-line staff
          │
          ▼
canonical data-ja-* persistence
```

This is intentionally separate from base-text character alignment. `.phonodoc` canonical writer schema is now 0.8.0.


> Current-format note (v0.8.6): the canonical writer is now schema 0.8.1. The architecture above remains valid; v0.8.6 adds `data-pitch-stale`, direct reading editing and semantic paragraph indentation.
