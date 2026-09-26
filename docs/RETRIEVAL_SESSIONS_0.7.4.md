# Retrieval Sessions 0.7.4

## Scope

v0.7.4 turns the display-only practice introduced in v0.7.3 into an explicit retrieval-learning event loop. The goal is deliberately narrow: record what the learner did during one retrieval attempt without yet introducing an automatic spaced-repetition or mastery algorithm.

The core separation is:

`Annotation Entity != Study Display State != Retrieval Event != Mastery State`

A `.phonodoc` continues to hold learner-confirmed phonetic content. Retrieval history lives in the personal learning database (`.phonodb` export), not in the document itself.

## Eligible items

A retrieval session is built from the current document's `ruby.phono` entities that:

- have a non-empty confirmed reading;
- are not `data-stale="true"`;
- retain their stable annotation ID.

Stale annotations are excluded because their base text has changed and the old phonetic answer has not been reconfirmed. Retrieval must never train against an answer that the editor itself regards as stale.

The queue may use document order or a shuffled order. The user may request 10, 20, or all eligible annotations.

## Explicit reveal semantics

Before an answer is shown, the learner chooses one of two actions:

- `after-recall`: **I recalled first — reveal**. The learner explicitly reports that they attempted retrieval before seeing the answer.
- `direct`: **Show answer directly**. The answer was viewed without the claim of prior retrieval.

A third path, `none`, is used only for skipped items.

This distinction is recorded as behavior. It is not interpreted as success by itself.

## Self-ratings

After reveal, the learner records a reading rating:

- `again`: could not recall;
- `hard`: recalled with difficulty / uncertainty;
- `good`: correct;
- `easy`: immediate and easy.

If the annotation has explicit pitch data, pitch may be rated with the same scale or left `unrated` using **Pitch not practised**. If no pitch data exists, pitch is automatically `unrated` and the pitch-rating row is not shown.

Ratings are learner reports. v0.7.4 does not claim objective pronunciation scoring.

## Session record

A retrieval session records:

- session ID;
- document ID/title/language;
- start/end timestamps;
- planned count;
- completed count;
- skipped count;
- count of `after-recall` reveals;
- count of `direct` reveals;
- queue order policy;
- whether the session ended early.

## Event record

Each reviewed annotation produces a retrieval event containing:

- event/session IDs and sequence;
- document and annotation IDs;
- lexical entry key;
- base text, confirmed reading, explicit pitch, source and mastery-at-review snapshot;
- reveal mode;
- reading and pitch self-ratings;
- shown/revealed/rated timestamps;
- elapsed duration;
- skip status.

The event snapshots the answer that was present at review time so later document edits do not rewrite historical learning evidence.

## Database architecture

The experimental IndexedDB is upgraded internally from version 1 to version 2 with two additive stores:

- `retrievalSessions`;
- `retrievalEvents`.

Existing `entries`, `observations`, and `meta` stores remain unchanged.

`.phonodb` export remains on the experimental `0.7.0` schema and gains additive `retrievalSessions` and `retrievalEvents` arrays. Older v0.7 snapshots that lack these arrays still import as empty retrieval history.

## Manual-first boundary

Retrieval Sessions never:

- generate kana, Pinyin, Jyutping, IPA, tones, or pitch;
- score microphone audio;
- infer whether an answer was objectively correct;
- modify annotation reading/pitch automatically;
- modify mastery automatically;
- schedule spaced repetition automatically.

It records retrieval behavior and learner self-ratings only.

## Why mastery is not updated yet

A single self-rating is not enough to justify a stable learning-state update rule. v0.7.4 intentionally records evidence first. A later v0.8.x learning-state model may use repeated retrieval history after the semantics and data quality are evaluated.

## QA requirements

Regression tests must verify that:

- stale annotations are excluded;
- after-recall and direct-reveal are distinguishable in stored events;
- reading and pitch ratings persist;
- retrieval does not mutate annotation answers or mastery;
- completed session summaries are stored;
- `.phonodb` snapshot export includes retrieval history;
- existing v0.7 document editing, display modes, quick/object interaction and Manual-first rules continue to pass.
