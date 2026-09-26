# PDF Export Framework — v0.6.3

## 目标

v0.6.3 只冻结 PDF 导出的基础分层，不冻结最终排版规则。

流程：

Renderer document state
→ temporary print/export presentation state
→ Electron IPC
→ `webContents.printToPDF()`
→ PDF Buffer
→ atomic-ish file write

PDF 不是截图：正文仍由 Chromium 的打印管线输出，ruby 文本和 SVG 五度音高保持矢量/文字特性。

## Main process

新增：

- `dialog:save-pdf`：系统 PDF 保存对话框。
- `pdf:export`：校验页面参数，调用 `printToPDF()`，写入目标路径。

当前传递参数：

- `pageSize`: A4 / Letter
- `landscape`
- `margins`: inches
- `printBackground: true`
- `displayHeaderFooter: false`
- `scale: 1`

## Renderer temporary export state

导出前不改写正文数据，只临时设置：

- `.pdf-exporting`
- `.pdf-hide-phonetics`
- `.pdf-hide-highlights`
- `data-pdf-phonetics`
- 必要时临时调整 `data-phonetic-mode` / `data-study-mode`

导出完成或失败后在 `finally` 中恢复屏幕状态。

## 表音输出模式

- `current`: 完全按当前屏幕的学习显示状态导出。
- `both`: 强制显示文字注音 + 五度音高。
- `text`: 强制仅显示文字注音。
- `pitch`: 强制仅显示五度音高。
- `none`: 隐藏 `ruby.phono rt`，只保留正文。

普通外语 gloss ruby 当前不属于 phonetic layer，默认保留。

## 初始分页规则

v0.6.3 仅做最安全的第一层：

- `ruby.phono` / `ruby.gloss` 尽量不跨页拆分；
- 图片块尽量不跨页拆分；
- H1/H2 尽量与下一段保持。

后续需要专门建设：

- paragraph widow/orphan；
- keep-with-next；
- 表音密集行的分页高度估计；
- 图片缩放与孤页控制；
- 页眉页脚、页码；
- 打印预览。

## Manual-first 边界

PDF 输出只改变“显示什么”，不生成任何新的语言知识。选择“全部文字 + 音高”只能显示文档里已经存在的人工标注，不能补出缺失的读音或音高。
