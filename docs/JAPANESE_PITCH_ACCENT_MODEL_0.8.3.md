# Japanese Pitch Accent Model 0.8.3

**Status:** Private / internal experimental design  
**Reference application:** 文之形声 · PhonoLayer Desktop v0.8.3  
**Model identifier:** `ja-tokyo-accent-v1`  
**Dialect/profile identifier:** `ja-Tokyo`

## 1. Why this layer exists

PhonoLayer already has a language-neutral five-level pitch renderer. That renderer is useful for Cantonese and for manually recorded pitch contours, but Japanese Tokyo-type lexical pitch accent is not well represented as a sequence of arbitrary absolute levels.

v0.8.3 therefore separates:

```text
language-specific phonological model
        ↓
normalized pitch semantics
        ↓
shared five-line visual renderer
```

For Japanese, the semantic unit is the **mora**, and the primary lexical representation is an **accent nucleus position** or an explicitly entered **H/L sequence**.

The five-line staff remains a visual language shared with the rest of PhonoLayer; it is not the phonological theory itself.

## 2. Manual-first contract

The editor MUST NOT decide Japanese accent for the learner.

v0.8.3 does **not** provide:

- dictionary lookup;
- automatic kana-to-mora segmentation;
- automatic accent-type lookup;
- automatic accent nucleus detection;
- speech-to-F0 analysis;
- automatic correction of a user's H/L sequence;
- automatic writing of machine proposals into Personal Phonological Memory.

The user supplies the reading, mora segmentation and accent information. The program validates structural consistency and renders the result.

A future automation provider may return a **proposal**, but:

```text
Machine proposal != user-confirmed knowledge
```

The current proposal contract always carries `confirmed: false`; v0.8.3 has no provider wired to the editor.

## 3. Scope: lexical schematic, not acoustic F0 prediction

This model represents a **pedagogical lexical pitch-accent schematic** for Tokyo-type Japanese. It is deliberately not an acoustic prediction model.

In descriptions of Tokyo Japanese, lexical accent is closely associated with a pitch fall after the accent nucleus. Actual speech can realize that fall later than the idealized lexical boundary (遅下がり / late fall), and phrase-level phenomena such as phrase-initial rise/lowering, downstep, devoicing and intonation can modify the observed F0 contour.

Therefore the v0.8.3 staff means:

```text
phonological / pedagogical H-L structure
```

not:

```text
measured or predicted Hz curve
```

This boundary is intentional. It lets a learner record lexical knowledge without pretending that a word-level diagram is a full sentence-prosody engine.

## 4. Mora is the pitch alignment unit

Japanese pitch accent is aligned to morae, not to kanji count and not mechanically to Unicode characters.

Examples of intended manual segmentation:

```text
がっこう  ->  が | っ | こ | う
きょう    ->  きょ | う
にほんご  ->  に | ほ | ん | ご
```

The base text may be:

```text
学校
今日
日本語
```

while the pitch model has four, two and four mora positions respectively.

Therefore:

```text
Base-text geometry != Japanese pitch segmentation
```

The editor never derives these segmentations automatically in v0.8.3. A user enters morae separated by spaces or `|` / `｜`.

### 4.1 Validation warnings

The core performs only conservative structural checks. For example, a standalone small kana such as `ゃ` is accepted as user data but produces a warning because it is ordinarily expected to form one mora with the preceding kana.

Likewise, an accent nucleus entered on a special/dependent mora such as `っ`, `ん` or `ー` is not silently rewritten; the editor warns the user to verify the analysis.

Warnings are not automatic linguistic corrections.

## 5. Representation A: accent nucleus

This is the preferred Tokyo-type lexical representation.

For `N` manually entered morae, the accent nucleus is an integer:

```text
0..N
```

Meaning:

- `0` — unaccented / heiban (平板型), no lexical downstep inside the word;
- `1` — atamadaka (頭高型), drop after mora 1;
- `2..N-1` — nakadaka (中高型), drop after the specified mora;
- `N` — odaka (尾高型), lexical drop appears after the final mora and becomes visible with a following particle/continuation.

The semantic source of truth is the nucleus position, not the derived numeric five-line contour.

### 5.1 Canonical schematic derivation

For the internal pedagogical renderer, the nucleus is deterministically converted into H/L levels.

For multi-mora items:

```text
nucleus = 0  -> L H H H ...
nucleus = 1  -> H L L L ...
nucleus = k  -> L H ... H L ...  (drop after mora k)
```

For a one-mora lexical item, the lexical mora itself is shown H; a virtual following particle distinguishes heiban (`particle=H`) from accented (`particle=L`) in preview.

This is a rendering convention for the PhonoLayer lexical diagram, not a claim that every phonetic token must realize exactly those plateaus.

## 6. Representation B: manual H/L

A second representation exists for explicit user transcription:

```text
L | H | H | L
```

The number of H/L tokens MUST equal the number of manually entered morae.

This mode is useful when the learner wants to record a pedagogical source, dialectal material, observed contour abstraction, or an analysis that should not be reduced to a single Tokyo-type nucleus.

In `manual-hl` mode:

- `accentNucleus` is not asserted;
- the editor does not invent an accent type;
- no virtual-particle prediction is generated from a nucleus.

## 7. Five-line visual grammar

Japanese reuses the existing PhonoLayer five-line staff, but only two principal levels are used:

```text
H -> level 4
L -> level 2
```

This preserves a coherent visual identity with Cantonese/general pitch while making the Japanese logic visibly binary.

The renderer draws:

- five light horizontal staff lines;
- one point per mora;
- a connecting Japanese pitch contour;
- a small accent-nucleus marker when `accentNucleus > 0`;
- optional mora labels in the detailed editor;
- an optional virtual particle point in the detailed-editor preview.

The virtual particle is a preview aid. It is not inserted into the document text and is not persisted as an annotation field.

## 8. Accent-nucleus marker

A lexical downstep boundary deserves a visual symbol distinct from mere height.

PhonoLayer therefore draws a small marker at the boundary after the accented mora. This helps distinguish:

```text
"this mora is high"
```

from:

```text
"a lexical pitch fall is licensed after this mora"
```

Heiban has no nucleus marker.

## 9. Particle preview

The detailed Japanese pitch editor provides an optional particle/continuation preview.

Its purpose is especially to make the contrast between heiban and odaka visually available. The preview:

- is calculated only from user-entered lexical semantics;
- uses a ghost/dashed visual style;
- is runtime-only;
- is not part of `contentHtml`;
- is not a claim about a particular grammatical particle's full intonational realization.

## 10. Persistent annotation semantics

Japanese pitch annotations extend `ruby.phono` with these fields:

```text
data-pitch-system="ja-tokyo"
data-ja-pitch-model="ja-tokyo-accent-v1"
data-ja-pitch-dialect="ja-Tokyo"
data-ja-pitch-representation="accent-nucleus" | "manual-hl"
data-ja-morae="に|ほ|ん|ご"
data-ja-accent-nucleus="0"                 # nucleus mode only
data-ja-manual-hl="L H H H"                # manual mode only
data-ja-pitch-source="manual"
```

`data-pitch` remains present as a derived five-level fallback, for example:

```text
2-4-4-4
```

but for `pitch-system="ja-tokyo"` it is **not** the semantic source of truth. The `data-ja-*` fields are authoritative.

## 11. Reading and pitch confirmation are conceptually separable

A learner may know the reading but not the pitch accent. PhonoLayer therefore does not require Japanese pitch to exist merely because a reading exists.

A normal valid annotation can have:

```text
reading = confirmed
Japanese pitch = absent
```

When a Japanese-pitch annotation's reading is changed via quick editing, v0.8.3 deliberately blocks immediate Quick Apply and sends the user to detailed editing so that mora segmentation and accent semantics can be reconfirmed.

## 12. Whole-annotation scope

The Japanese pitch model applies to the whole phonetic annotation object. It is not stored as one independent accent object per kanji.

Therefore v0.8.3 blocks Japanese pitch creation in the multi-character **per-character split** workflow. The learner can still use per-character reading annotations, but a Japanese lexical pitch-accent object should be created as a whole-word/whole-annotation unit.

## 13. Personal Memory and Retrieval

When a Japanese pitch annotation is observed or used in a retrieval session, its semantic Japanese fields are copied into the observation/event snapshot.

This preserves what the user actually confirmed at that time without forcing Personal Memory to reverse-engineer meaning from a rendered SVG or numeric `data-pitch` string.

The `.phonodb` exported schema remains `0.7.0` in v0.8.3 because these are additive object fields and no new IndexedDB store or incompatible snapshot structure is introduced.

## 14. Future automation extension point

`app/japanese-pitch-core.js` exposes a proposal normalizer for future providers. A future provider could be a dictionary, corpus, morphological analyzer or acoustic tool, but any output must remain a proposal until explicit user confirmation.

A future flow SHOULD be:

```text
external/provider result
        ↓
proposal { confirmed:false }
        ↓
visible review by user
        ↓
explicit acceptance / manual correction
        ↓
confirmed annotation
        ↓
Personal Memory
```

A future implementation MUST NOT silently convert a provider result into learner-confirmed knowledge.

## 15. Explicit non-goals for v0.8.3

- no OJAD integration;
- no dictionary API;
- no automatic reading generation;
- no automatic mora parser;
- no sentence-level intonation engine;
- no acoustic F0 estimation;
- no accent sandhi engine;
- no automatic mastery change;
- no automatic accent correction.

These omissions are architectural boundaries, not unfinished hidden automation.

## 16. Research basis and caution

The design follows a conservative distinction between lexical accent structure and surface phonetics. Useful references consulted during design include:

1. Kitamura, T., Amakawa, Y., & Hatano, H. (2019). 「東京方言話者の単語音声におけるおそ下がりの生起条件の調査」, *音声研究*, 23, 165–173. DOI: `10.24467/onseikenkyu.23.0_165`.
2. Watanabe, S. (2015). “How to Teach the Japanese Pitch Pattern Visually,” *Akita International University Global Review*, 7, 47–58. DOI: `10.50866/aiugr.7.0_47`.
3. Urasoko, R. (2020). “The Phenomenon of the Loss of Accent in Japanese: Which Accented Patterns Tend to Be Affected?”, *Journal of the Phonetic Society of Japan*, 24, 1–18. DOI: `10.24467/onseikenkyu.24.0_1`.

These references support treating lexical accent as structured pitch information while also cautioning that actual F0 realization has phonetic and phrasal complexity. PhonoLayer v0.8.3 intentionally records the former and does not claim to model the latter.
