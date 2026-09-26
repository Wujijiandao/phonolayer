文之形声 · PhonoLayer Desktop v0.9.7 — GitHub Release Preparation

Windows 11 一键开始
===================

推荐：双击 SETUP_PHONOLAYER.bat。

会出现一个小型安装窗口。点击“一键安装并启动”即可：
- 获取并验证 runtime-lock.json 锁定的 Electron 44.4.5 / win32-x64；
- 同步应用与 7 份官方公开学习样例；
- 注册当前用户的 .phonodoc 文件关联；
- 可选创建桌面与开始菜单快捷方式；
- 可选安装完成后立即启动。

无需管理员权限。PhonoLayer 保持便携 / local-first，不安装账号、遥测或后台服务。

已经安装后：
- 可直接使用桌面/开始菜单快捷方式；
- RUN_DESKTOP.bat 会同步当前 app/ 后启动；
- 再次运行 SETUP_PHONOLAYER.bat 可执行修复 / 更新。

故障排查
========

INSTALL_RUNTIME.bat  保留可见命令行诊断路径。
REGISTER_PHONODOC.bat 可单独修复文件关联。
BACKUP_ELECTRON_RELEASE.bat 可备份锁定的 Electron upstream release。

数据格式仍为 .phonodoc 0.9.0 / .phonodb 0.9.0。
