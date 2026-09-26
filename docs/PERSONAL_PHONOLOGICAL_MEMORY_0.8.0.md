# Personal Phonological Memory 0.8.0

## Scope

v0.8.0 turns the existing personal database into a learner-owned **Personal Phonological Memory**. It does not add a pronunciation generator, dictionary lookup, automatic reading inference, or automatic mastery algorithm.

The memory layer is derived from data the learner has already created or confirmed:

- long-term lexical entries (`language + base + reading`);
- annotation observations from documents;
- explicit pitch values and notes attached to those observations;
- retrieval-event snapshots and self-ratings recorded in v0.7.4.

The central separation is:

`Document Annotation != Personal Memory Record != Retrieval Event != Learning-State Model`

A memory record is a view over evidence, not a new answer source.

## Derived rather than duplicated

v0.8.0 adds `memory-core.js`. It computes memory records from the existing `.phonodb` snapshot instead of creating another IndexedDB store. This avoids duplicated truth and preserves the existing experimental `0.7.0` `.phonodb` schema.

Each derived memory record may summarize:

- language, written/base form and confirmed reading;
- number of learner-confirmed observations;
- documents in which the relation appeared;
- pitch variants the learner recorded;
- notes attached to observations;
- retrieval count;
- `after-recall` vs direct-reveal counts;
- reading and pitch self-rating histories;
- last-seen and last-retrieved timestamps.

Historical retrieval evidence may keep an item visible even after its live document observation is removed. Such rows are labelled as historical-only rather than silently presented as a current annotation.

## Same text, multiple readings

The browser groups by the existing lexical key, so the same written form can retain multiple learner-confirmed readings. For example, if the user has separately recorded readings for the same written form, the detail pane shows them as distinct entries rather than merging them into one supposedly canonical answer.

This is important for Japanese kanji, heteronyms, dialectal variants and any language where one orthographic form can map to multiple pronunciations.

## Related forms

v0.8.0 can show learned forms that share literal graphemes with the selected memory item. This is deliberately an **orthographic relation only**.

The software does not infer:

- the reading of the shared character in a new word;
- morpheme identity;
- etymological relatedness;
- pronunciation rules;
- semantic relatedness.

The related-forms view exists only to help the learner re-encounter their own previous records.

## Explicit reuse into a new annotation

The learner may strictly select unannotated document text and choose **Memory for current text**. A previously confirmed reading can be filled into the Phonetic Tools only when:

- the strict selection text exactly matches the memory item's base form;
- the current document language exactly matches the memory item's language.

Reuse is intentionally conservative:

- the reading is filled but **not automatically applied**;
- the learner must still confirm and press Apply;
- pitch is not auto-filled because pitch can be contextual;
- the resulting annotation is marked `source=reused` so provenance remains distinguishable from a freshly typed manual answer.

If the learner changes the filled reading before applying, the new annotation falls back to ordinary `manual` provenance.

## Manual-first boundary

Personal Phonological Memory never:

- looks up an unknown reading from an external dictionary;
- generates kana, Pinyin, Jyutping, IPA, tone or pitch;
- treats shared characters as evidence of shared pronunciation;
- auto-applies an old reading to a new context;
- changes annotation mastery from retrieval history;
- claims that learner self-ratings are objective pronunciation measurements.

It retrieves the learner's own prior evidence and requires an explicit confirmation step before that evidence can re-enter a document.

## Compatibility

No new persistent store is added in v0.8.0. `.phonodoc` and `.phonodb` keep their experimental `0.7.0` schema identifiers. The memory browser is reconstructed from existing entries, observations, retrieval sessions and retrieval events on demand.

## QA requirements

Regression tests must verify that:

- memory aggregation combines observation and retrieval evidence without rewriting source data;
- same-base alternative readings remain distinct;
- related forms are literal orthographic links only;
- strict-selection reuse requires exact text and language match;
- reuse fills a reading but does not auto-apply an annotation;
- an explicitly applied reused reading is stored with `source=reused`;
- editing the filled reading before Apply prevents false `reused` provenance;
- existing v0.7 editing, retrieval, display, archive and Manual-first behavior remains intact.
