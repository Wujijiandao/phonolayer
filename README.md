# 文之形声 · PhonoLayer

<p align="center">
  <img src="media/phonolayer-wordmark.png" alt="文之形声 · PhonoLayer" width="860">
</p>

<p align="center">
  <strong>见文之形，记文之声。</strong><br>
  <em>Personal Phonological Learning Workspace</em>
</p>

<p align="center">
  Free · Local-first · Manual-first
</p>

<p align="center">
  <img src="media/phonolayer-public-beta-poster.png" alt="PhonoLayer Public Beta Poster" width="860">
</p>

---

## What is PhonoLayer?

**PhonoLayer** is a free, local-first phonological learning workspace for working with pronunciation inside real texts.

It is designed for learners who want to:

- work directly inside real reading materials;
- annotate readings manually instead of relying only on automatic answers;
- keep pitch / tone knowledge alongside text;
- record retrieval attempts before reveal;
- build a long-term **Personal Phonological Memory**.

PhonoLayer is currently especially oriented toward:

- **Japanese** reading and pitch-aware annotation;
- **Cantonese** reading and tone-aware annotation;
- future multilingual learning workflows built on the same document-first foundation.

## Core ideas

### 1. Real texts first
PhonoLayer starts from **real documents** and lets phonological knowledge grow inside them instead of forcing learning into isolated cards first.

### 2. Manual-first
PhonoLayer does not aim to replace learning with automatic answers. It preserves the learner's own annotation, judgment, confirmation, and retrieval process.

### 3. Text, form, and sound are related but not identical
The project keeps the following distinctions explicit:

```text
Text Selection
!= Annotation Entity
!= Editing Target
!= Study Display State
!= Retrieval Event
!= Personal Memory Record
!= Future Learner-State Model
```

Reading confirmation and pitch confirmation are separate. A machine proposal is not the same thing as user-confirmed knowledge.

### 4. Local-first
Your documents, reading annotations, retrieval history, and Personal Phonological Memory remain under your control.

Current builds have:

- no account system;
- no ads;
- no analytics;
- no telemetry.

### 5. Open and auditable formats
PhonoLayer uses inspectable project formats:

- `.phonodoc`
- `.phonodb`

The goal is long-term usability and migration, not data lock-in.

### 6. Retrieval before reveal
PhonoLayer can distinguish between attempting recall before reveal and directly revealing an answer, so later learning research can be based on behavioral evidence rather than guessed mastery.

## Why PhonoLayer?

- **A phonological workspace inside real texts**
- **Manual-first annotation instead of automatic answer filling**
- **Japanese pitch / mora-aware annotation**
- **Cantonese tone-aware annotation**
- **Retrieval workflow + Personal Phonological Memory**
- **Open and auditable `.phonodoc / .phonodb` formats**
- **Local-first desktop architecture**
- **No account, telemetry, analytics, or ads**

## Current status

**Public Beta (pre-1.0)**

Current versions:

```text
Application       0.9.7
.phonodoc writer  0.9.0
.phonodb writer   0.9.0
Electron          44.4.5 (Windows x64 runtime lock)
```

v0.9.x is still a public-beta and format-freeze-candidate line, not the final v1.0 compatibility promise.

## Official public learning guides

The public package includes original `.phonodoc` learning materials:

```text
samples/public/
├─ Official_Learning_Guides/
│  ├─ 00_Multilingual_Learning_Overview.phonodoc
│  ├─ 01_Text_Form_Sound.phonodoc
│  ├─ 02_Retrieval_Before_Reveal.phonodoc
│  ├─ 03_Cross_Language_Transfer.phonodoc
│  └─ 04_Personal_Phonological_Memory.phonodoc
├─ Japanese/
│  └─ Japanese_Reading_Demo.phonodoc
└─ Cantonese/
   └─ Cantonese_Reading_Demo.phonodoc
```

These materials are project-original public demos. Private study corpora, JLPT-related private materials, lyrics, game text, and private editorial data are not included in the public package.

## Windows quick start

1. Download and extract the latest release ZIP.
2. Double-click:

```text
SETUP_PHONOLAYER.bat
```

3. In the setup window, choose **一键安装并启动**.

The setup flow can:

- verify / install the pinned Electron runtime;
- synchronize the application files and official public samples;
- register `.phonodoc` for the current Windows user;
- optionally create Desktop and Start Menu shortcuts;
- launch PhonoLayer after setup.

The Electron runtime is pinned by version, file size, and SHA-256. Runtime integrity information is stored in `runtime-lock.json`.

Detailed Windows setup notes: `docs/WINDOWS_SETUP_0.9.4.md`.

## Dependency model

PhonoLayer currently has:

- **0 application npm dependencies**;
- **0 application npm devDependencies**;
- no bundled `node_modules`;
- Electron as the main external desktop runtime dependency.

Core application logic is implemented in project-owned JavaScript modules and browser/Electron platform APIs.

See `docs/DEPENDENCY_AND_SUPPLY_CHAIN_0.9.3.md` for the runtime and supply-chain policy.

## Privacy and data ownership

PhonoLayer is currently:

- local-first;
- account-free;
- telemetry-free;
- analytics-free;
- ad-free.

Your `.phonodoc`, `.phonodb`, retrieval history, and Personal Phonological Memory remain under your control.

See `PRIVACY.md` for details.

## License

- Application source code: **MPL-2.0**
- Official public demo content: **CC0-1.0**
- Electron / Chromium / Node.js: their respective upstream licenses

The source-code license does **not** automatically grant rights to impersonate the official **文之形声 · PhonoLayer** brand, logo, or visual identity.

See:

- `LICENSE`
- `TRADEMARKS.md`
- `docs/THIRD_PARTY_NOTICES.md`

## Project direction

Current product direction:

> **Free, local-first desktop core + open and auditable formats + voluntary support now + optional paid official sync later.**

The local desktop core is intended to remain fully usable without a future cloud service.

## Contributing and security

- Contribution guide: `CONTRIBUTING.md`
- Security reporting: `SECURITY.md`
- Support model: `SUPPORT.md`
- Citation metadata: `CITATION.cff`

## Brand

**中文名：文之形声**  
**English name: PhonoLayer**  
**Full name: 文之形声 · PhonoLayer**

Brand line:

> **见文之形，记文之声。**

Current public visual assets are under `media/`.

## Author

Created and maintained by **Yuzhan Zhang**.

---

PhonoLayer is currently developed as a serious public beta. Early feedback on learning workflow, readability, Windows usability, and long-term local-first behavior is especially welcome.
