# Architecture 0.6

## Product model

PhonoLayer v0.6 是 document-centric desktop editor，而不是 directory-centric web tool。

Application window
→ File backstage
→ Ribbon
→ Document tabs
→ one active editable paper
→ status bar

磁盘目录不进入主界面。路径只在打开/保存对话框、最近文档和状态栏中出现。

## Document state

每个打开文档在内存中有独立状态：

- id / title / language / revision
- filePath / dirty
- typography
- layout
- view
- contentHtml

切换标签时同步当前 editor DOM → 文档对象；进入新标签时文档对象 → editor DOM。

## Annotation object

表音使用原子 `ruby.phono` 对象。它在正文中 `contenteditable=false`，避免浏览器把 `<rb>/<rt>` 拆坏。学习者通过双击对象编辑：

- base text
- reading
- explicit pitch
- mastery
- note

“拆除注音”只移除表音对象并保留正文。

## Manual-first boundary

允许：
- 用户输入 reading；
- 用户输入 1–5 / H-L 音高；
- 程序把已输入音高渲染成五线式轨迹；
- 以后从个人积累中提示“你曾经记录过”。

禁止：
- 自动汉字→假名；
- 自动汉字→拼音/粤拼；
- 自动声调/音高推断；
- 自动把外部文档标注吸收入个人积累。

## Desktop runtime

Electron 只作为嵌入式桌面运行时：用户不需要外部浏览器、HTTP 服务或端口。Chromium 仅作为应用内部的富文本/ruby 排版引擎。

## PDF output layer (v0.6.3)

PDF export is a first-class desktop output channel rather than HTML screenshotting. The renderer temporarily switches presentation-only print state; the Electron main process owns the native save dialog and `webContents.printToPDF()` call. Document data is not rewritten for export.
