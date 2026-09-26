# Direct Annotation Editing & Paragraph Ergonomics 0.8.6

Application: PhonoLayer Desktop 0.8.6  
Canonical `.phonodoc` writer schema: 0.8.1  
Status: private/internal experimental

## Purpose

v0.8.6 turns Quick interaction mode into actual direct manipulation rather than a shortcut to the full annotation dialog. It also tightens the editing boundary between ordinary document whitespace and the stable `ruby.phono` learning entity.

The governing rule is:

```text
Text outside ruby != base text inside ruby != phonetic metadata above ruby
```

## Annotation-boundary whitespace

When the caret is at the left edge of `.rb` and the user types a space, that space is inserted **before the entire `ruby.phono` node**. The annotation moves as one unit. The space is not inserted into `.rb`, so `confirmedBase` remains unchanged and the annotation does not become stale.

The same rule is applied symmetrically at the right edge.

Example:

```text
before: [場外]
after:  ·[場外]
```

not:

```text
[·場外]
```

## Smart first-line indent

At the true beginning of a paragraph, two consecutive ASCII spaces are treated as a typing shorthand for a semantic two-em first-line indent:

```css
text-indent: 2em;
```

The literal spaces are removed. The Home ribbon also exposes first-line indent presets for 0, 1 and 2 em plus a custom value.

`text-indent` is canonical document formatting and is therefore included in the HTML sanitizer allow-list.

## Quick-mode inline reading editor

In Quick mode:

- double-click the visible upper reading -> edit reading in place;
- Enter / Tab -> commit;
- click elsewhere -> commit;
- Escape -> cancel;
- double-click base text -> normal Chromium text selection/editing;
- double-click pitch graphics -> open detailed annotation editor.

Object mode retains the full object/dialog workflow.

The inline input is runtime UI. It never serializes into `.phonodoc`.

## Reading and pitch confirmation are separate

v0.8.6 distinguishes two failure modes:

```text
base/reading stale  -> data-stale="true"
pitch stale         -> data-pitch-stale="true"
```

If the base text changes, the reading/base pairing is stale as before. If the learner explicitly changes a reading while an old pitch model exists, the new reading is accepted as learner-confirmed but the old pitch is retained only as visibly stale reference data. It is excluded from memory/retrieval pitch payloads until reconfirmed in detailed editing.

This gives the project a more accurate invariant:

```text
Reading confirmed != Pitch confirmed
```

Detailed annotation save reconfirms the pitch and clears `data-pitch-stale`.

## Color ergonomics

Text color and highlighter controls retain unrestricted native color selection. A drop-down palette now adds common presets and five recent colors.

Text presets include black/dark gray/gray/red/orange/green/blue/purple/cyan. Highlighter presets use light fluorescent-style yellow/green/cyan/pink/orange plus pale red/blue/purple/gray.

## Schema note

`data-pitch-stale` is persistent semantic state. Because an older writer would drop this distinction and could silently treat stale pitch as confirmed after a round trip, the canonical writer advances from schema 0.8.0 to **0.8.1**.

The v0.8.6 reader accepts 0.7.0, 0.8.0 and 0.8.1. Existing bundled private samples remain 0.8.0 until their content is actually rewritten; opening and saving one with v0.8.6 upgrades that saved file to 0.8.1.
