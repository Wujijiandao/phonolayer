# Branding and Compatibility — v0.9.2

Official public identity:

- Chinese name: **文之形声**
- English name: **PhonoLayer**
- Full display name: **文之形声 · PhonoLayer**
- Chinese descriptor: **真实文本中的个人语音学习工作台**
- English descriptor: **Personal Phonological Learning Workspace**
- Brand line: **见文之形，记文之声。**

The Chinese name refers to the relationship among text/context (文), visible orthographic form (形), and learner-confirmed phonological knowledge (声). It does not redefine the underlying file formats.

Rebranding does **not** change file-format identity. For backward compatibility, the following wire identifiers remain unchanged:

```text
shengjian-phonodoc-experimental
shengjian-phonodb-experimental
```

Existing `shengjian.*` local-settings keys may remain until a later explicit migration. They are historical implementation identifiers, not the current public product name.

The portable executable remains `PhonoLayer.exe`, and stable internal Windows identifiers continue to use `PhonoLayer` so future display-name changes do not create avoidable compatibility churn.
