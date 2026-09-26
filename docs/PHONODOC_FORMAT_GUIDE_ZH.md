# `.phonodoc` 人类阅读指南

这份文档面向以后重新打开项目的人。它解释 `.phonodoc` **是什么、为什么这样存、应该怎样理解**。精确字段规范请看 `PHONODOC_FORMAT_SPEC_0.8.md`；上一代 `0.7` 规范作为迁移历史保留。

## 一句话理解

`.phonodoc` 是一个把“真实学习文档”和“用户人工确认的表音层”一起保存的实验性容器。

它不是二进制私有黑箱。当前版本本质上是一个结构受限的 ZIP：

```text
example.phonodoc
├─ manifest.json
└─ document.json
```

当前 ZIP 条目不压缩（store / method 0），文件名使用 UTF-8。

## 为什么不直接保存成 HTML

因为一个PhonoLayer文档不仅有 HTML 正文，还有：

- 文档 ID / revision；
- 文档语言；
- 正文与表音字体；
- 页面尺寸和页边距；
- PDF 输出设置；
- 当前学习显示状态；
- 格式版本和应用版本。

如果只保存 HTML，这些信息就只能塞进 DOM 或另建旁车文件，长期更难管理。

## manifest.json 是什么

manifest 用来回答：

> “这到底是哪一种文件？哪一代 schema？由哪个版本应用保存？”

典型结构：

```json
{
  "format": "shengjian-phonodoc-experimental",
  "schema": "0.8.1",
  "appVersion": "0.8.3",
  "manualFirst": true,
  "experimental": true,
  "savedAt": "2026-09-24T...Z"
}
```

`appVersion` 不是 schema。v0.9.0 当前 `.phonodoc` canonical writer 是 schema 0.9.0；reader 继续读取 0.7.0 / 0.8.0 / 0.8.1 / 0.8.2 / 0.9.0。详见 `PHONODOC_FORMAT_SPEC_0.9.0.md`。

## document.json 是什么

它保存一份“可以重新构建编辑器”的文档快照：

```text
元数据
  id / title / language / revision / timestamps

排版
  typography / layout

输出
  pdfExport

学习显示
  view

正文
  contentHtml
```

## 表音到底存在哪里

表音对象保存在 `contentHtml` 里的 HTML Ruby 中。

典型 canonical 结构：

```html
<ruby class="phono"
      data-annotation-id="ann-..."
      data-reading="てんない"
      data-profile="ja"
      data-mastery="0"
      data-note=""
      data-pitch=""
      data-source="manual"
      data-confirmed-base="店内"
      data-stale="false">
  <span class="rb">店内</span>
  <rt></rt>
</ruby>
```

注意：`rt` 在保存文件里故意是空的。

应用打开文档时，会从 `data-reading` / `data-pitch` 重新生成上方显示，包括运行时音高 SVG。

这么做的原因是：

- 数据只有一个 source of truth；
- 渲染结果不污染文件；
- 将来改变表音层样式时，不需要迁移每个旧 SVG。

## 为什么要有 confirmedBase / stale

假设原来：

```text
店内 -> てんない
```

后来用户直接把正文 `店内` 改成了别的文字。

软件不能假设旧读音仍然成立。因此保留 annotation，但：

```text
data-stale="true"
```

直到用户重新确认。

这比“正文一变就把学习记录删掉”更安全，也比“正文一变继续把旧读音当正确答案”更诚实。

## 什么不会保存在 `.phonodoc`

以下是运行时 UI，不是文档事实：

- 蓝色 annotation selected 框；
- 临时 reveal；
- 音高 SVG；
- 当前鼠标/Selection；
- Quick/Object 交互模式；
- UI 语言；
- Undo/Redo 栈；
- recovery timer；
- Personal Memory 派生列表；
- Retrieval history。

其中 retrieval history 和个人积累属于 `.phonodb`，不是 `.phonodoc`。

## 图片如何保存

当前编辑器允许安全的 `data:image/...;base64,...` 图片嵌入 `contentHtml`。因此大型文档可能变得很大。

桌面文件 I/O 当前限制为 64 MB；内部 archive core 自身还有独立的条目数、CRC 和总大小防护。

## 文件可以手工解压修改吗

技术上可以，但当前不推荐作为常规工作流。

原因：

- 容器要求 store ZIP；
- 文件名 / CRC / 中央目录会被严格校验；
- HTML 会经过 sanitizer；
- 未知或危险标签/属性会被去除；
- 当前 v0.x 不承诺手改后的任意扩展字段都能保留。

如果必须做转换器，应该按 `PHONODOC_FORMAT_SPEC_0.8.md` 写，并用真实应用打开后重新保存一次。

## `.phonodoc` 与 `.phonodb` 的区别

```text
.phonodoc
= 一篇文档及其中的学习标注

.phonodb
= 用户长期个人学习数据库的导出快照
```

不要把检索历史、长期 Personal Memory 直接塞回每篇 `.phonodoc`。

## 日语 Pitch Accent 在文件里怎么存

从 v0.8.3 起，日语东京式词汇 Pitch Accent 不再只靠 `data-pitch="2-4-..."` 表达。真正语义保存在 mora 与 accent 字段中，例如：

```html
<ruby class="phono"
      data-reading="にほんご"
      data-pitch-system="ja-tokyo"
      data-ja-pitch-model="ja-tokyo-accent-v1"
      data-ja-pitch-dialect="ja-Tokyo"
      data-ja-pitch-representation="accent-nucleus"
      data-ja-morae="に|ほ|ん|ご"
      data-ja-accent-nucleus="0"
      data-ja-pitch-source="manual"
      data-pitch="2-4-4-4">
  <span class="rb">日本語</span><rt></rt>
</ruby>
```

这里 `data-pitch` 只是给统一五线谱渲染使用的派生 fallback；对 `ja-tokyo`，`data-ja-*` 才是语义真相。音高 SVG、下降核小三角和虚拟助词预览仍然属于运行时渲染，不写回文档。

日语的 pitch 对齐单位是用户人工填写的 **mora（拍）**，不是汉字个数。详细设计见 `JAPANESE_PITCH_ACCENT_MODEL_0.8.3.md`。

## 当前格式状态

当前是：

```text
Experimental schema 0.8.0
```

不是公开稳定标准。v0.9.x 才计划进入 freeze candidate，v1.0.0 才计划作出第一版正式兼容承诺。


### v0.8.1 增量

新增 `data-pitch-stale`，用来表示“读音已确认，但旧音高尚未重新确认”；并明确允许段落 `text-indent`。详细见 `PHONODOC_FORMAT_SPEC_0.8.1.md`。
