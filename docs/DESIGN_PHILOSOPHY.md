# Design Philosophy

## 1. 软件不替用户学习

PhonoLayer最核心的原则是 **Manual-first**。

用户学习某个读音时，关键认知动作应由用户本人完成：注意、判断、输入、确认、回忆、再确认。软件负责把这些动作留下结构化记录，而不是在用户尚未学习之前替他生成答案。

所以“方便”不是最高目标。更准确的目标是：

> 尽量降低记录和复习的机械摩擦，同时保留真正需要用户认知参与的步骤。

## 2. 文档先于题库

学习材料首先是一篇真实文档，而不是被拆成卡片后才存在。

PhonoLayer保留：

- 上下文；
- 段落；
- 对话关系；
- 高亮；
- 图片；
- 版式；
- 用户自己的局部注音。

学习功能叠加在真实文本之上。

## 3. 内部实体严格，外部体验尽量轻

Annotation Entity 必须有稳定 ID、读音、音高、provenance 和 stale 状态；但普通阅读时用户不应该一直感到自己在操纵数据库对象。

因此默认 Quick mode：

- 单击已有注音不出现实体蓝框；
- 双击正文留给正文；
- 双击上方表音层才直接编辑 annotation。

严格的数据模型不应自动转化成侵入性的 UI。

## 4. 正文与表音是耦合但不同的层

正文可以修改。读音记录不是正文的不可分割装饰。

当正文发生变化时，原 annotation 不直接消失，而是进入 stale 状态。这表达的是：

> “这个旧读音记录曾经存在，但它与现在正文的对应关系已经需要重新确认。”

## 5. 学习显示不是文档副本

同一份完整标注文档可以变成：

- 参考版；
- 只看读音；
- 只看音高；
- 全部隐藏；
- 点击揭示；
- 隐藏已掌握。

这些都是 view policy，不应该制造多个内容副本。

## 6. 行为证据先于算法判断

v0.7.4 开始记录 retrieval event，但不自动更新 mastery。

原因是：一次“我觉得我答对了”并不足以证明一个稳定、可泛化的学习状态。系统先积累行为记录，未来再单独设计 learning-state model。

## 7. Personal Memory 是用户自己的历史，不是外部答案引擎

个人语音记忆只重新组织：

- 用户确认过的文字—读音；
- 用户记录过的音高；
- 文档上下文；
- 用户的检索历史。

它可以提醒“你以前自己记录过什么”，但不能把字形相同自动解释为读音相同，更不能替代字典/语言学判断。

## 8. Provenance 要保留

注音来源至少需要区分：

- `manual` — 本次由用户人工输入并确认；
- `reused` — 从用户自己的 Personal Memory 带入后再次确认；
- `pasted` — 从剪贴板复制而来，不能自动等同于用户新确认；
- 导入转换场景可保留特定来源标签，如内部样例的 `imported-docx`。

来源信息的意义是防止软件日后把“看见过的数据”误解成“用户确实重新学习并确认的数据”。

## 9. 应用版本与数据 schema 分离

功能升级不等于格式升级。

v0.8.3 是一个反例：新增 Japanese Pitch Accent 的 canonical `data-ja-*` 语义后，旧 writer 无法可靠保留这些字段，因此 `.phonodoc` writer schema 正式升到 `0.8.0`。应用仍读取旧 `0.7.0`，但保存会升级为 `0.8.0`。

## 10. v0.x 可以重构，但不能模糊边界

v0.x 尚未承诺稳定兼容，因此允许破坏性架构调整；但每次调整必须明确：

- 哪些是当前实现；
- 哪些只是实验；
- 哪些未验证；
- 哪些未来才计划实现。

“实验阶段”不是省略规范和 QA 的理由。


## v0.8.3：语言专用音系模型，统一视觉层

PhonoLayer不应该把所有语言强行压成同一种音高数据。粤语可以自然使用 1–5 五度值；东京式日语词汇アクセント更适合用 mora + accent nucleus / H-L。

因此原则是：

```text
底层尊重语言自己的音系结构
            +
上层共享PhonoLayer的五线谱视觉语言
```

日语模式仍严格 Manual-first：软件可以把用户填写的 nucleus **确定性渲染**成图，但不会替用户决定 nucleus。未来自动化最多先产生 suggestion，不能冒充已学知识。


### v0.8.6 confirmation-state refinement

Manual-first now explicitly permits reading confirmation and pitch confirmation to diverge. A user may directly correct a reading while leaving the old pitch marked `data-pitch-stale=true` until separately reconfirmed. This is why the canonical writer advances to schema 0.8.1.
