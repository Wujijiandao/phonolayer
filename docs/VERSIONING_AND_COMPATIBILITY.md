# Versioning and Compatibility

## Three different versions exist

Do not conflate them.

### 1. Application version

Example:

```text
0.8.9
0.8.8
```

Means product/code milestone.

### 2. `.phonodoc` schema

Current canonical writer (v0.9 freeze candidate):

```text
0.9.0
```

The v0.9 reader retains support for `0.7.0`, `0.8.0`, `0.8.1`, `0.8.2` and `0.9.0`; saves are canonicalized to `0.9.0`.

### 3. `.phonodb` schema

Current canonical export marker (v0.9 freeze candidate):

```text
0.9.0
```

The importer accepts `0.7.0`, `0.8.0` and `0.9.0`. Internal IndexedDB engine version is a separate implementation detail.

## When to bump app version only

Examples:

- UI improvement;
- documentation refresh;
- icon redesign;
- interaction implementation change that does not alter document semantics;
- derived view added from existing data.

v0.8.1 and v0.8.2 are examples of app-only releases. v0.8.3 is intentionally **not** app-only because it adds persistent Japanese pitch semantics.

## When a schema bump may be justified

Examples:

- required new persistent field with incompatible semantics;
- changing meaning/type of an existing field;
- changing canonical annotation representation;
- container entries change in a way older readers cannot safely ignore;
- removing data old readers require.

## Current pre-1.0 policy

- backward compatibility is not guaranteed;
- test documents may be disposable unless promoted to fixtures;
- major architecture correctness takes priority over retaining accidental early formats;
- nevertheless, every current format should be documented precisely enough for future migration work.

## Planned stabilization

```text
v0.9.0  -> first format freeze candidate
v0.9.x  -> stabilization/adversarial evidence
v1.0.0  -> first intended compatibility promise
```

At freeze time the project should define:

- normative required/optional fields;
- extension strategy;
- migration rules;
- version negotiation;
- unknown-field preservation policy;
- long-term fixture corpus.

## v0.8.3 compatibility note

v0.8.3 adds canonical Japanese pitch-accent fields to `ruby.phono`, so `.phonodoc` writer schema advances to `0.8.0`.

Compatibility behavior:

- read: `0.7.0`, `0.8.0`;
- write: `0.8.0`;
- legacy 0.7 annotations are not assigned invented Japanese accent semantics;
- `.phonodb` remains `0.7.0`;
- do not downgrade a 0.8.0 file by editing its manifest, because older writers may strip `data-ja-*` semantics.

## v0.8.4 sample-corpus note

v0.8.4 is an app-only release with respect to document semantics: the canonical writer remains schema `0.8.0`. The release migrates every bundled private sample to the existing 0.8.0 schema and enriches a conservative subset with the already-defined Japanese pitch fields.

Legacy reader support remains in code, but routine release QA no longer depends on intentionally shipping old-schema samples. Future migration testing can use purpose-built fixtures when needed.


## v0.8.5 UI-polish note

v0.8.5 is application-only with respect to persistent learning/document semantics. It improves UI-language discoverability, editing-guide scaling, image resizing and navigation transitions while continuing to write `.phonodoc` schema `0.8.0` and `.phonodb` schema `0.7.0`.


## v0.8.6 direct-editing / schema 0.8.1 note

v0.8.6 adds one persistent semantic distinction: `data-pitch-stale`. A reading can be learner-confirmed while pre-existing pitch remains unconfirmed. Because dropping this flag on a round trip can silently promote stale pitch, the canonical `.phonodoc` writer advances to schema `0.8.1`.

Compatibility behavior:

- read: `0.7.0`, `0.8.0`, `0.8.1`;
- write: `0.8.1`;
- bundled private samples remain `0.8.0` until actually saved;
- `.phonodb` remains `0.7.0`;
- `text-indent` is now explicitly allowed in canonical sanitized paragraph styling.


## v0.8.7 high-zoom geometry note

v0.8.7 changes only viewport/layout geometry. `.phonodoc` writer remains schema `0.8.1`; no document semantics or migration rules change. The paper is no longer a shrinkable flex item, and the stage expands at high zoom so the complete scaled paper remains scrollable.


## v0.8.8 sample-editorial note

v0.8.8 changes private bundled sample content and audit metadata only. The canonical `.phonodoc` writer remains schema `0.8.1`; the edited JLPT fixture itself remains schema `0.8.0` until re-saved by the current editor.

## v0.8.9 sample-editorial note

v0.8.9 changes private bundled sample content, provenance, and audit metadata only. The canonical `.phonodoc` writer remains schema `0.8.1`; edited private fixtures remain schema `0.8.0` until re-saved by the current editor. No new compatibility promise is introduced.


## v0.8.10 semantic-integrity / schema note

Application 0.8.10 reads `.phonodoc` 0.7.0 / 0.8.0 / 0.8.1 / 0.8.2 and writes 0.8.2. The 0.8.2 delta persists optional identity lineage. `.phonodb` advances to 0.8.0 because observation/event semantics and structured pitch provenance now have an explicit snapshot contract; 0.7.0 remains readable. Unknown future data belongs under a preserved `extensions` object.
\n\n## v0.9.0 format-freeze candidate note\n\nApplication 0.9.0 reads `.phonodoc` 0.7.0 / 0.8.0 / 0.8.1 / 0.8.2 / 0.9.0 and writes 0.9.0. It reads `.phonodb` 0.7.0 / 0.8.0 / 0.9.0 and exports 0.9.0. The supported forward-extension channel is a preserved namespaced `extensions` object; arbitrary unknown top-level fields are not a compatibility contract. Current private learning fixtures use explicit `usagePolicy` metadata and are not public samples. This remains a candidate until v1.0.\n