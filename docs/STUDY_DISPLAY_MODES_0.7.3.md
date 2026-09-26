# Study Display Modes 0.7.3

## Scope

v0.7.3 turns one fully annotated `.phonodoc` into both a reference document and a practice document. It does not duplicate or delete annotation data to create exercises. Instead, the document keeps the complete Manual-first phonetic record and changes only the presentation policy.

The core invariant is:

`Annotation Entity != Study Display State`

Hiding a reading or pitch contour never removes it from the document, changes its annotation ID, modifies the personal-learning database, or marks the document content stale.

## Two-dimensional display model

Study presentation is represented by two independent dimensions.

### Phonetic layer

- `text`: show manual reading / phonetic text;
- `pitch`: show only the explicit five-level pitch layer;
- `both`: show reading and pitch together.

### Visibility strategy

- `study`: always show the selected phonetic layer;
- `hidden`: hide all selected phonetic hints;
- `reading`: click an annotation to reveal it; click again to hide it;
- `compact`: hide hints at or above the selected mastery threshold.

The visible preset chooser is only a convenience mapping onto those two dimensions. Advanced controls remain available and may create a custom combination.

## Presets

| Preset | Phonetic layer | Visibility strategy |
| --- | --- | --- |
| Full hints | both | study |
| Reading only | text | study |
| Pitch only | pitch | study |
| Hide all | both | hidden |
| Click to reveal | both | reading |
| Hide mastered | both | compact |

`Hide reading` is therefore equivalent to `Pitch only`; `Hide pitch` is equivalent to `Reading only`. They are not stored as redundant document states.

## Click-to-reveal semantics

The reveal mode is deliberately **click-only**. Hover does not expose the answer.

A reveal is transient UI state:

- it is represented by the runtime-only `reveal` class;
- it is stripped from canonical `.phonodoc` serialization;
- switching study display policy clears existing reveal state;
- `Reveal all temporarily` can still expose all hints for a short interval without changing the document.

This keeps practice behavior predictable and prevents accidental answer leakage when the pointer merely passes over a word.

## Mastery-based hiding

The user may select a threshold of 1, 2, or 3.

- threshold 1 hides mastery 1–3;
- threshold 2 hides mastery 2–3;
- threshold 3 hides mastery 3 only.

Annotations marked stale because their base text changed are **never hidden by mastery policy**, even when their old mastery value is high. A stale annotation requires reconfirmation and therefore must remain visible.

## Layout stability

Study hiding uses CSS `visibility` for the `rt` layer rather than deleting nodes or rewriting document HTML. Ruby geometry therefore stays stable and the body text does not jump between reference and practice views.

Layer selection (`text` vs `pitch`) may legitimately change the internal phonetic-layer height because it changes which representation is being studied; visibility strategies do not mutate the document.

## Persistence

The view object remains additive within the experimental `0.7.0` document schema:

```json
{
  "phoneticMode": "both",
  "studyMode": "compact",
  "masteryThreshold": 3
}
```

Older v0.7 documents that do not contain `masteryThreshold` normalize to `3`.

## Manual-first boundary

Study Display Modes never generate kana, Pinyin, Jyutping, IPA, tone values, or pitch contours. They only show, hide, or reveal information that the user or a curated sample already contains.
