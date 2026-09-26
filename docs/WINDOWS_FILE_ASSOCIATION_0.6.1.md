# Windows 文件关联 — v0.6.1

## 目标

让 `.phonodoc` 在 Windows 11 Explorer 中具有自己的文件类型身份：专属图标、友好名称，以及双击由PhonoLayer打开。

## 当前注册范围

仅写入当前用户注册表（HKCU），不请求管理员权限。

主要键：

- `HKCU\\Software\\Classes\\.phonodoc`
- `HKCU\\Software\\Classes\\ShengJian.PhonoDoc`
- `HKCU\\Software\\ShengJian\\PhonoLayer\\Capabilities`
- `HKCU\\Software\\RegisteredApplications`

ProgID：`ShengJian.PhonoDoc`

图标：`app/assets/phonodoc.ico`

打开命令：`"<current ShengJian.exe>" "%1"`

## 开发期路径变化

当前仍是便携实验构建。软件文件夹如果移动，旧注册表中的 EXE / ICO 路径会失效。PhonoLayer每次正常启动都会重新注册当前路径；也可手工执行 `REGISTER_PHONODOC.bat`。

## Windows 11 限制

Windows 11 对“默认应用”的 UserChoice 有保护。PhonoLayer会注册可用的 ProgID、Capabilities、图标和打开命令，但不会伪造或绕过系统的 UserChoice 保护。如果用户曾经把 `.phonodoc` 指定给其他程序，可能需要在“打开方式”中重新选择PhonoLayer。

Explorer 还会缓存文件图标，因此注册成功后旧图标可能暂时保留。通常等待、注销登录或重启 Explorer 后即可刷新。
