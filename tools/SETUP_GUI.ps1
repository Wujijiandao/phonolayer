$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$Root = Split-Path -Parent $PSScriptRoot
$RuntimeExe = Join-Path $Root 'runtime\PhonoLayer.exe'
$InstallScript = Join-Path $PSScriptRoot 'INSTALL_RUNTIME.ps1'
$SyncScript = Join-Path $PSScriptRoot 'SYNC_APP.ps1'
$AppIcon = Join-Path $Root 'app\assets\phonolayer-app.ico'
$LaunchScript = Join-Path $PSScriptRoot 'LAUNCH_PHONOLAYER.ps1'
$LockPath = Join-Path $Root 'runtime-lock.json'
$ProvenancePath = Join-Path $Root 'runtime\PHONOLAYER_RUNTIME_PROVENANCE.json'
$DesktopLink = Join-Path ([Environment]::GetFolderPath('Desktop')) '文之形声 · PhonoLayer.lnk'
$StartMenuDir = Join-Path ([Environment]::GetFolderPath('Programs')) 'PhonoLayer'
$StartMenuLink = Join-Path $StartMenuDir '文之形声 · PhonoLayer.lnk'

$script:Busy = $false
$script:Stage = 'idle'
$script:CurrentProcess = $null
$script:Options = @{ desktop=$true; startmenu=$true; launch=$true }

function Test-RuntimeReady {
    if (-not (Test-Path -LiteralPath $RuntimeExe)) { return $false }
    if (-not (Test-Path -LiteralPath $LockPath) -or -not (Test-Path -LiteralPath $ProvenancePath)) { return $false }
    try {
        $lock = Get-Content -LiteralPath $LockPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $prov = Get-Content -LiteralPath $ProvenancePath -Raw -Encoding UTF8 | ConvertFrom-Json
        return ([string]$prov.version -eq [string]$lock.runtime.version -and [string]$prov.sha256 -eq [string]$lock.runtime.sha256)
    } catch { return $false }
}

function New-PhonoLayerShortcut([string]$Path) {
    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($Path)
    $shortcut.TargetPath = 'powershell.exe'
    $shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $LaunchScript + '"'
    $shortcut.WorkingDirectory = $Root
    $shortcut.Description = '文之形声 · PhonoLayer — 真实文本中的个人语音学习工作台'
    if (Test-Path -LiteralPath $AppIcon) { $shortcut.IconLocation = "$AppIcon,0" }
    $shortcut.Save()
}

function Start-HiddenPowerShell([string]$ScriptPath) {
    if (-not (Test-Path -LiteralPath $ScriptPath)) { throw "Missing setup component: $ScriptPath" }
    $arg = '"' + $ScriptPath + '"'
    return Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$arg) -WindowStyle Hidden -PassThru
}

function Set-ControlsEnabled([bool]$Enabled) {
    $installButton.Enabled = $Enabled
    $launchButton.Enabled = $Enabled
    $closeButton.Enabled = $Enabled
    $desktopCheck.Enabled = $Enabled
    $startCheck.Enabled = $Enabled
    $launchAfterCheck.Enabled = $Enabled
}

function Set-InstalledUi([bool]$Installed) {
    if ($Installed) {
        $statusLabel.Text = '检测到可用运行时。可直接启动，或执行修复 / 更新。'
        $installButton.Text = '一键修复 / 更新'
        $launchButton.Visible = $true
    } else {
        $statusLabel.Text = '首次使用需要准备 Electron Runtime（约 158 MB）。下载内容会校验 SHA-256。'
        $installButton.Text = '一键安装并启动'
        $launchButton.Visible = $false
    }
}

function Fail-Setup([string]$Message) {
    $script:Busy = $false
    $script:Stage = 'idle'
    $script:CurrentProcess = $null
    $timer.Stop()
    $progress.Style = 'Blocks'
    $progress.Value = 0
    Set-ControlsEnabled $true
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(180,45,45)
    $statusLabel.Text = '安装失败：' + $Message
    [System.Windows.Forms.MessageBox]::Show(
        $form,
        "安装未完成。`r`n`r`n$Message`r`n`r`n可以运行 INSTALL_RUNTIME.bat 查看命令行诊断。",
        'PhonoLayer Setup',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
}

function Finish-Setup {
    try {
        if ($script:Options.desktop) { New-PhonoLayerShortcut $DesktopLink }
        if ($script:Options.startmenu) { New-PhonoLayerShortcut $StartMenuLink }
    } catch {
        Fail-Setup ('快捷方式创建失败：' + $_.Exception.Message)
        return
    }
    $script:Busy = $false
    $script:Stage = 'idle'
    $script:CurrentProcess = $null
    $timer.Stop()
    $progress.Style = 'Blocks'
    $progress.Value = 100
    Set-ControlsEnabled $true
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(35,130,76)
    $statusLabel.Text = '安装完成。运行时已校验，应用文件已同步，Windows 集成已就绪。'
    $installButton.Text = '一键修复 / 更新'
    $launchButton.Visible = $true
    if ($script:Options.launch -and (Test-Path -LiteralPath $RuntimeExe)) {
        Start-Process -FilePath $RuntimeExe -WorkingDirectory $Root | Out-Null
    }
}

function Start-InstallStage {
    $script:Stage = 'install'
    $statusLabel.Text = '正在获取并校验 Electron Runtime… 首次下载约 158 MB。'
    $script:CurrentProcess = Start-HiddenPowerShell $InstallScript
    $timer.Start()
}

function Start-SyncStage {
    $script:Stage = 'sync'
    $statusLabel.Text = '正在同步应用文件和官方学习样例…'
    $script:CurrentProcess = Start-HiddenPowerShell $SyncScript
}

function Start-AssociationStage {
    if (-not (Test-Path -LiteralPath $RuntimeExe)) { throw 'PhonoLayer.exe was not created by setup.' }
    $script:Stage = 'associate'
    $statusLabel.Text = '正在注册 .phonodoc 文件关联…'
    $script:CurrentProcess = Start-Process -FilePath $RuntimeExe -ArgumentList '--register-file-association' -WindowStyle Hidden -PassThru
}

$form = New-Object System.Windows.Forms.Form
$form.Text = '文之形声 · PhonoLayer 安装'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object System.Drawing.Size(540,420)
$form.MinimumSize = New-Object System.Drawing.Size(540,420)
$form.MaximumSize = New-Object System.Drawing.Size(540,420)
$form.MaximizeBox = $false
$form.FormBorderStyle = 'FixedDialog'
$form.BackColor = [System.Drawing.Color]::White
if (Test-Path -LiteralPath $AppIcon) { $form.Icon = New-Object System.Drawing.Icon($AppIcon) }

$title = New-Object System.Windows.Forms.Label
$title.Location = New-Object System.Drawing.Point(28,24)
$title.Size = New-Object System.Drawing.Size(475,42)
$title.Text = '文之形声 · PhonoLayer'
$title.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',18,[System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.Color]::FromArgb(30,48,84)
$form.Controls.Add($title)

$tagline = New-Object System.Windows.Forms.Label
$tagline.Location = New-Object System.Drawing.Point(31,68)
$tagline.Size = New-Object System.Drawing.Size(470,26)
$tagline.Text = '见文之形，记文之声。  ·  Free · Local-first · Manual-first'
$tagline.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',9.5)
$tagline.ForeColor = [System.Drawing.Color]::FromArgb(80,95,120)
$form.Controls.Add($tagline)

$line = New-Object System.Windows.Forms.Panel
$line.Location = New-Object System.Drawing.Point(32,104)
$line.Size = New-Object System.Drawing.Size(460,1)
$line.BackColor = [System.Drawing.Color]::FromArgb(225,230,238)
$form.Controls.Add($line)

$mode = New-Object System.Windows.Forms.Label
$mode.Location = New-Object System.Drawing.Point(32,119)
$mode.Size = New-Object System.Drawing.Size(460,44)
$mode.Text = "便携式本地安装 · 无需管理员权限`r`n程序与 Electron Runtime 保存在当前文件夹；不安装账号、遥测或后台服务。"
$mode.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',9)
$mode.ForeColor = [System.Drawing.Color]::FromArgb(66,74,88)
$form.Controls.Add($mode)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Location = New-Object System.Drawing.Point(32,174)
$statusLabel.Size = New-Object System.Drawing.Size(460,42)
$statusLabel.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',9.5)
$statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(35,82,150)
$form.Controls.Add($statusLabel)

$desktopCheck = New-Object System.Windows.Forms.CheckBox
$desktopCheck.Location = New-Object System.Drawing.Point(35,226)
$desktopCheck.Size = New-Object System.Drawing.Size(190,26)
$desktopCheck.Text = '创建桌面快捷方式'
$desktopCheck.Checked = $true
$desktopCheck.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',9)
$form.Controls.Add($desktopCheck)

$startCheck = New-Object System.Windows.Forms.CheckBox
$startCheck.Location = New-Object System.Drawing.Point(250,226)
$startCheck.Size = New-Object System.Drawing.Size(200,26)
$startCheck.Text = '加入开始菜单'
$startCheck.Checked = $true
$startCheck.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',9)
$form.Controls.Add($startCheck)

$launchAfterCheck = New-Object System.Windows.Forms.CheckBox
$launchAfterCheck.Location = New-Object System.Drawing.Point(35,254)
$launchAfterCheck.Size = New-Object System.Drawing.Size(240,26)
$launchAfterCheck.Text = '完成后自动启动 PhonoLayer'
$launchAfterCheck.Checked = $true
$launchAfterCheck.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',9)
$form.Controls.Add($launchAfterCheck)

$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location = New-Object System.Drawing.Point(35,291)
$progress.Size = New-Object System.Drawing.Size(457,18)
$progress.Minimum = 0
$progress.Maximum = 100
$progress.Value = 0
$form.Controls.Add($progress)

$installButton = New-Object System.Windows.Forms.Button
$installButton.Location = New-Object System.Drawing.Point(35,325)
$installButton.Size = New-Object System.Drawing.Size(230,42)
$installButton.Text = '一键安装并启动'
$installButton.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',10,[System.Drawing.FontStyle]::Bold)
$installButton.BackColor = [System.Drawing.Color]::FromArgb(43,105,219)
$installButton.ForeColor = [System.Drawing.Color]::White
$installButton.FlatStyle = 'Flat'
$installButton.FlatAppearance.BorderSize = 0
$form.Controls.Add($installButton)

$launchButton = New-Object System.Windows.Forms.Button
$launchButton.Location = New-Object System.Drawing.Point(278,325)
$launchButton.Size = New-Object System.Drawing.Size(102,42)
$launchButton.Text = '直接启动'
$launchButton.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',9)
$launchButton.Visible = $false
$form.Controls.Add($launchButton)

$closeButton = New-Object System.Windows.Forms.Button
$closeButton.Location = New-Object System.Drawing.Point(390,325)
$closeButton.Size = New-Object System.Drawing.Size(102,42)
$closeButton.Text = '关闭'
$closeButton.Font = New-Object System.Drawing.Font('Microsoft YaHei UI',9)
$form.Controls.Add($closeButton)

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 350
$timer.Add_Tick({
    if (-not $script:Busy -or $null -eq $script:CurrentProcess) { return }
    if (-not $script:CurrentProcess.HasExited) { return }
    $exitCode = $script:CurrentProcess.ExitCode
    try { $script:CurrentProcess.Dispose() } catch {}
    $script:CurrentProcess = $null
    if ($exitCode -ne 0) {
        Fail-Setup ("$($script:Stage) 阶段退出码：$exitCode")
        return
    }
    try {
        switch ($script:Stage) {
            'install' { Start-SyncStage; break }
            'sync' { Start-AssociationStage; break }
            'associate' { Finish-Setup; break }
            default { Fail-Setup '未知安装状态。' }
        }
    } catch {
        Fail-Setup $_.Exception.Message
    }
})

$installButton.Add_Click({
    if ($script:Busy) { return }
    $script:Busy = $true
    $script:Options = @{
        desktop = $desktopCheck.Checked
        startmenu = $startCheck.Checked
        launch = $launchAfterCheck.Checked
    }
    Set-ControlsEnabled $false
    $progress.Style = 'Marquee'
    $progress.MarqueeAnimationSpeed = 24
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(35,82,150)
    try { Start-InstallStage } catch { Fail-Setup $_.Exception.Message }
})

$launchButton.Add_Click({
    if (-not (Test-RuntimeReady)) {
        [System.Windows.Forms.MessageBox]::Show($form,'尚未检测到已验证的 PhonoLayer Runtime，请先执行一键安装 / 修复。','PhonoLayer Setup',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
        return
    }
    try {
        $statusLabel.Text = '正在同步应用文件…'
        $form.Refresh()
        $p = Start-HiddenPowerShell $SyncScript
        $p.WaitForExit()
        if ($p.ExitCode -ne 0) { throw "同步失败，退出码：$($p.ExitCode)" }
        Start-Process -FilePath $RuntimeExe -WorkingDirectory $Root | Out-Null
        $statusLabel.Text = 'PhonoLayer 已启动。'
    } catch {
        [System.Windows.Forms.MessageBox]::Show($form,$_.Exception.Message,'PhonoLayer Setup',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
    }
})

$closeButton.Add_Click({ if (-not $script:Busy) { $form.Close() } })
$form.Add_FormClosing({ param($sender,$e) if ($script:Busy) { $e.Cancel = $true } })

Set-InstalledUi (Test-RuntimeReady)
[void]$form.ShowDialog()
