# Experimental Format 0.7

PhonoLayer仍处于 v0.x 测试期。本页只描述当前 v0.7 实验数据边界，不承诺向前或向后兼容。

## PhonoDoc

Manifest：

```json
{
  "format": "shengjian-phonodoc-experimental",
  "schema": "0.7.0",
  "appVersion": "0.8.2",
  "manualFirst": true,
  "experimental": true
}
```

文档主体仍保存编辑器 HTML、排版属性、页面设置、显示模式和 PDF 输出设置。表音对象使用 `ruby.phono`，核心人工数据保存在 `data-reading / data-pitch / data-mastery / data-note / data-source`。

生成出来的五度音高 SVG、选中态和临时 reveal 状态均不作为持久数据保存。

## Personal database

当前实验 DB schema：`0.7.0`，浏览器/Electron 本地数据库名为：

`shengjian-phonolayer-learning-v07-experimental`

v0.7.0 不从 v0.6 数据库自动迁移。

## v0.7.1 compatibility note

v0.7.1 keeps the document and database schema identifiers at `0.7.0`; interaction mode, UI locale and icon preferences are application state rather than document data. New annotations may additionally persist `data-confirmed-base` / `data-stale` for safe base-text editing; v0.7.1 initializes older v0.7 annotations on load.

## v0.7.2 compatibility note

v0.7.2 keeps the same `0.7.0` document/database schema. Unified history, IME transaction state, Quick/Object interaction preference and recovery drafts are application/runtime state rather than new persistent document schema. Recovery containers may contain an extra `recovery.json` entry; ordinary `.phonodoc` readers ignore it.


## v0.7.3 compatibility note

v0.7.3 still keeps the document/database schema identifier at `0.7.0`. The `view` object gains an additive `masteryThreshold` field with a default of `3`; older v0.7 documents normalize cleanly when the field is absent. Study presets are UI conveniences and are not stored as a second source of truth: persistence remains `phoneticMode + studyMode + masteryThreshold`. Runtime reveal classes are transient and stripped during canonical serialization.

## v0.7.4 compatibility note

v0.7.4 keeps the `.phonodoc` and exported `.phonodb` schema identifiers at `0.7.0`. Retrieval history is personal learning state, not document content, so no retrieval event is stored in `.phonodoc`. The local IndexedDB upgrades internally from version 1 to version 2 with additive `retrievalSessions` and `retrievalEvents` stores. `.phonodb` snapshots gain additive `retrievalSessions` / `retrievalEvents` arrays; older v0.7 snapshots that omit them import as empty retrieval history. Retrieval does not mutate annotation answers or `data-mastery`.



## v0.8.0 compatibility note

v0.8.0 adds a derived Personal Phonological Memory layer without changing the `.phonodoc` or exported `.phonodb` schema identifiers (`0.7.0`). The memory browser is computed from learner-confirmed entries, observations, and retrieval-event snapshots already present in the personal database. No generated answer cache is added.


## v0.8.1 compatibility note

v0.8.1 is an internal documentation/engineering-archive refresh. It does not change `.phonodoc` or `.phonodb` persistent semantics and therefore retains schema identifier `0.7.0`. The package adds a formal human-readable format specification, architecture/engineering documentation, internal testing/release guidance, private-use notice, and an internal converted JLPT N3 fixture. Application version markers advance to `0.8.1`; file schema markers do not.


## v0.8.2 compatibility note

v0.8.2 changes file intake and internal samples only. Drag-to-open still enters the normal archive parser; hyperlinks remain outside canonical document HTML. Persistent schema stays `0.7.0`.
