# Study Workflow 0.7.0

## Product rule

PhonoLayer的表音层是**学习记录**，不是自动答案层。所有读音、声调和五度音高都由用户亲手确认。

## Contextual phonetic tools

正文中存在两种可进入上下文 Ribbon 的对象：

1. 未标注的正文选区；
2. 一个已经存在的 `ruby.phono` 学习对象。

选区出现时顶部显示“表音工具”。普通正文未选择时该标签自动隐藏，避免长期占用 Ribbon。

## Explicit alignment modes

### 逐字对齐

- 使用 Unicode grapheme cluster 统计字符；
- 读音必须由用户用空格明确分段；
- 分段数必须严格等于字符数；
- 若填写五度音高，则用 `|` 明确分组，组数同样必须等于字符数；
- 不满足条件时拒绝应用，不自动降级为整词。

### 整词注音

整组选区作为一个原子学习对象；PhonoLayer不分析或猜测内部字音边界。

## Existing annotation editing

单击已有注音后，上下文 Ribbon 原样读取：

- 正文；
- 读音 / 表音；
- 人工五度音高；
- 熟练度；
- 备注。

修改后应用时保留 annotation ID，从而维持撤销/重做与个人观察记录的一致性。

## Reading mode

阅读模式隐藏 ruby 提示；单击对象可临时揭示该对象。该 `reveal` 状态属于瞬时 UI 状态，序列化保存时会被清除。

## Keyboard

- `Ctrl+Alt+R`：打开当前选区/当前注音对象的上下文表音工具。
- `Ctrl+Enter`：焦点位于上下文表音输入框时应用。
- `Ctrl+Shift+8`：显示/隐藏换行编辑标记。

## Non-goals for 0.7.0

- 不自动查字典；
- 不自动复用个人数据库；
- 不自动预测音高；
- 不新增公式编辑器、目录、脚注等办公套件能力。
