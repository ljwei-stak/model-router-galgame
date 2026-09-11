# Model Router + GALGame 安装指南

本指南适用于 `@ljwei-stak/model-router-galgame@0.4.27`。当前完整实机验证环境为
DSH Desktop 2.0.7 / `@deepseek-ai/dsh@0.1.5-rc.1`。功能介绍、路由算法和 GAL
玩法见 [README.zh.md](README.zh.md)。

Router 是 DSH 插件，不是独立桌面程序。安装 Router 不会安装 DSH Desktop、模型
服务、Python 或浏览器，也不会自动写入模型凭据。

## 1. 安装前确认

### DSH Desktop

尚未安装桌面端时，从
[DSH Desktop 官方 Releases](https://github.com/anywhere-labs/dsh-desktop/releases)
下载安装包。本文已验证 2.0.7；桌面端优先使用应用自带的 Node.js、pnpm 和 `dsh`
运行时。

启动 DSH Desktop，选择实际使用的 profile，再从设置页标题区域打开 **DSH 终端**。
这个终端已经绑定所选 profile。普通 PowerShell 中的全局 `dsh` 可能使用另一个
`DSH_HOME`，不要用它修改桌面端 profile。

在 DSH 终端中只读检查：

```powershell
dsh --version
dsh plugin list
dsh --dump-config
```

已验证的 CLI 版本输出为 `0.1.5-rc.1`。切换 profile 后重新打开 DSH 终端；已有终端
仍绑定打开时的 profile。

### Harness Web / CLI

使用 Web 或自定义 profile 时，需要 Node.js 22.19.x 或 24 及更新主版本，以及可用的
`dsh` 和 pnpm。Router 及聚合的 Watcher、PPT Master peer 声明覆盖 DSH
`0.1.2-rc.1` 与 `0.1.5-rc.1` 系列；本指南的完整端到端验证基线是
`0.1.5-rc.1`。使用其他宿主版本时，应重新执行组合配置和实际启动验证。

没有全局 `dsh` 时，可以显式使用已验证版本：

```powershell
npx --yes --package=@deepseek-ai/dsh@0.1.5-rc.1 dsh --version
```

### 模型与网络

- 安装时需要访问 `https://registry.npmjs.org/`。
- 模型路由、普通 AI 对话和 GAL 自由模式需要宿主中至少一个可用的模型 provider。
- GAL 剧情模式不需要模型 API；随包角色素材也不需要图片 API。
- 凭据只在 DSH 的模型设置中配置，不要写入 Router 仓库或 npm 包。

## 2. 了解聚合包

只需把 Router 安装为 profile 的直接依赖。0.4.27 会固定加载以下组合：

| 包 | 版本 | 用途 |
| --- | --- | --- |
| `@ljwei-stak/model-router-galgame` | `0.4.27` | 模型路由、GAL 视窗与更新入口 |
| `@liustack/modlens` | `3.25.4` | 图片理解 |
| `@liustack/modsearch` | `5.10.1` | 搜索与页面读取 |
| `@ljwei-stak/dsh-ego-browser` | `0.8.3` | 可见浏览器工具 |
| `@ljwei-stak/dsh-approval-gate` | `0.5.3` | 审批策略与审计 |
| `@ljwei-stak/ppt-master-for-mgr` | `6.3.3` | 原生 PPT skill、脚本与模板 |
| `@ljwei-stak/dsh-watcher-for-mrg` | `0.4.1` | 只读工作路径与模型用量 |

不要把这些依赖再次作为独立 bundle 安装到同一 profile。尤其应在安装前检查是否已有
独立的上游 `dsh-watcher` 或 `@ljwei-stak/dsh-watcher-for-mrg`。只有在 `dsh plugin
list` 明确显示它是直接安装项时，才按实际包名移除：

```powershell
dsh plugin remove dsh-watcher
# 或
dsh plugin remove @ljwei-stak/dsh-watcher-for-mrg
```

不要为了处理一个重复项而删除整个 profile 或全部插件。

## 3. 安装到 DSH Desktop

在应用设置页打开的 **DSH 终端**中执行：

```powershell
dsh plugin add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@0.4.27
dsh plugin list
dsh --dump-config
```

桌面端终端已绑定当前 profile，所以这里不额外填写 `--profile desktop`。安装结束后，
从系统托盘完全退出 DSH Desktop，再重新打开并选择同一 profile。只关闭窗口可能只是
隐藏应用，不能保证新插件被重新加载。

## 4. 安装到 Web 或自定义 profile

以下示例使用 `web`。如使用其他 profile，把每处 `web` 替换为实际名称，并确保命令
使用宿主的同一个 `DSH_HOME`：

```powershell
dsh plugin --profile web list
dsh plugin --profile web add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@0.4.27
dsh --profile web --dump-config
dsh web --no-open
```

如果没有全局 `dsh`，每条命令使用以下形式：

```powershell
npx --yes --package=@deepseek-ai/dsh@0.1.5-rc.1 dsh plugin --profile web add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@0.4.27
npx --yes --package=@deepseek-ai/dsh@0.1.5-rc.1 dsh --profile web --dump-config
```

从已经安装依赖并完成构建的 Harness 源码运行时，才在 Harness 仓库根目录使用
`pnpm dsh`。Router 仓库本身没有宿主启动命令。

## 5. 核对组合配置

`dsh --dump-config`（桌面端当前 profile）或 `dsh --profile web --dump-config`
（指定 profile）的结果应各出现一次以下 loader ID：

```text
modlens
modsearch
ego-browser
ppt-master-for-mgr
dsh-watcher
dsh-approval-gate
model-router-galgame
```

配置导出成功只能证明 bundle 可以组合，仍需在完全重启后检查实际界面和模型请求。
若出现 `duplicate loader entry id`，重新执行 `dsh plugin list`，只移除同一 profile 中
确认重复的直接安装项。

DSH Desktop 2.0.7 的 package-inventory 元数据扩展可能无法从 Desktop ASAR 基准地址
解析第三方 loader，并因此阻断官方 DeepSeek 请求。Router 0.4.27 的 bundle 会停用这
一个元数据扩展；模型输入、工具、会话日志、Watcher 和 Router 路由仍保持启用。

## 6. 准备 PPT Master 的 Python 环境

npm 安装只部署 PPT skill 和脚本，不会运行 pip。PPT 生成需要 Python 3.10 或更新
版本，并要求依赖安装到 DSH 工作代理实际使用的同一解释器。

### 先检查现有配置

在创建环境或安装依赖前，先只读检查当前设置：

```powershell
Get-ChildItem Env:PPT_MASTER_PYTHON* -ErrorAction SilentlyContinue
[Environment]::GetEnvironmentVariable('PPT_MASTER_PYTHON_ROOT', 'User')
[Environment]::GetEnvironmentVariable('PIP_CACHE_DIR', 'User')
```

本机约定的 Python 管理根目录是字面路径 `D:\Jianwei\_Li\Python`。当前已存在：

```text
D:\Jianwei\_Li\Python\envs\ppt-master\Scripts\python.exe
D:\Jianwei\_Li\Python\cache\pip
```

可继续只读确认，不要重复创建已有环境：

```powershell
Test-Path 'D:\Jianwei\_Li\Python\envs\ppt-master\Scripts\python.exe'
& 'D:\Jianwei\_Li\Python\envs\ppt-master\Scripts\python.exe' --version
Test-Path 'D:\Jianwei\_Li\Python\cache\pip'
```

若其他机器尚无环境，先选择已安装解释器，并把虚拟环境的绝对目标放在自己的
Python 管理根目录内。例如：

```powershell
$pythonRoot = 'D:\path\to\managed-python'
& 'C:\path\to\installed\python.exe' -m venv (Join-Path $pythonRoot 'envs\ppt-master')
```

不要在 Router 仓库内创建 `.venv`，也不要把 PPT 依赖安装到全局 Python 或用户
site-packages。

### 检查并安装 PPT 依赖

本机使用以下配置。`PIP_CACHE_DIR` 保证 pip 缓存仍位于指定 Python 根目录：

```powershell
$pythonRoot = 'D:\Jianwei\_Li\Python'
$env:PPT_MASTER_PYTHON_ROOT = $pythonRoot
$env:PIP_CACHE_DIR = Join-Path $pythonRoot 'cache\pip'

npx --yes --package=@ljwei-stak/ppt-master-for-mgr@6.3.3 ppt-master-for-mgr doctor --python-root $pythonRoot
npx --yes --package=@ljwei-stak/ppt-master-for-mgr@6.3.3 ppt-master-for-mgr setup --python-root $pythonRoot
npx --yes --package=@ljwei-stak/ppt-master-for-mgr@6.3.3 ppt-master-for-mgr doctor --python-root $pythonRoot
```

其他机器把 `$pythonRoot` 替换为自己的管理根目录。`--python-root` 会在 Windows 查找
`<根目录>\envs\ppt-master\Scripts\python.exe`；也可以用 `--python <解释器绝对路径>`
指定解释器。`setup` 会明确调用该解释器的 pip，`doctor` 只检查 Python 与核心模块，
不检查模型、密钥、视觉质量或全部可选服务。

如果 DSH 工作代理需要在后续会话自动选择这个环境，应让启动 DSH 的进程能够读取
`PPT_MASTER_PYTHON_ROOT` 和 `PIP_CACHE_DIR`，然后完全退出并重新打开 Desktop。配置
持久环境变量前先读取现值，避免覆盖其他有效配置。

在工作代理预设中启用 DSH 原生 `skill`、文件读写和代码运行工具。DSH Desktop
2.0.7 的 Windows Bash 运行器存在已知故障；PPT Master 6.3.3 的适配流程通过代码
运行器调用受管 Python，不要求开启有故障的 Bash 工具。FFmpeg、Pandoc、图片和
音频服务只在相应工作流需要时另行配置。

## 7. 完全重启后验证

在新会话中依次检查：

1. 原生模型选择器能够加载模型，普通对话可以收到回复。
2. **GAL视窗**标签存在，且“对话模式”“GAL游戏”“编辑模式”都可以切换。
3. 添加并移除一张 PNG/JPEG/WebP/GIF 图片后，没有槽位或 Blob 资源错误。
4. 原生会话标题栏显示 Watcher 入口；面板能够读取工作路径、工具执行和已记录用量。
5. `/router watcher` 返回当前会话的只读加载与统计摘要。

PPT 快速验证可在有写权限的普通工作会话或 GAL 工作会话中发送：

> 请使用原生 ppt-master skill 快速制作 1 页可编辑 PPTX，保存到当前工作目录，并完成质量检查。

确认代理先加载 `ppt-master`，再生成和检查 PPTX。剧情模式和自由模式的角色对话不
承担 PPT 工作流。宿主沙箱和审批策略继续生效。

0.4.27 已在 Windows DSH Desktop 2.0.7 上完成两次冷启动检查，并完成
1 页可编辑 PPTX 的实际生成；该次 PPT 会话 6 次工具调用全部成功，质量检查为 0
错误、0 警告。

## 8. 已知宿主警告

- `[git-graph] auto-isolation disabled ...`：DSH Desktop 2.0.7 中 git-graph 对宿主
  workspace service 形状变化的兼容提示，会回退到官方新会话行为，不表示 Router
  加载失败。
- `[connection] connection lost, retry #1`：实机 PPT 验证期间记录过两次，均自动
  恢复且任务完成。若持续重复、页面不再更新或任务未完成，再检查宿主进程、网络和
  provider；一次已恢复的重试不等于 PPT 工具失败。

## 9. 常见问题

| 现象 | 处理方式 |
| --- | --- |
| `dsh` 或 pnpm 找不到 | Desktop 使用设置页打开的 DSH 终端；Web/CLI 检查 Node.js 和 `npx`。 |
| `No matching version found` 或镜像 404 | 用官方 registry 查询版本，并保留安装命令中的 `--registry=https://registry.npmjs.org/`。 |
| 安装成功但没有 GAL 标签 | 确认安装和启动使用同一 profile 与 `DSH_HOME`，再完全退出并重启宿主。 |
| `duplicate loader entry id` | 列出当前 profile 的直接依赖，只移除确认重复的独立 bundle。 |
| `EADDRINUSE` 或 profile 已被占用 | 正常关闭使用该 profile 的旧宿主进程；仅换端口不会解除 profile 锁。 |
| 普通 DeepSeek 请求被第三方包解析错误阻断 | 确认 0.4.27 的 `plugin-package-inventory-deepseek` 补丁已经出现在组合配置中。 |
| 图片不能识别 | 检查 ModLens 路由、模型能力与凭据；GAL 附件不会直接解析 PDF/DOCX 正文。 |
| 找不到 PPT skill | 检查 `ppt-master-for-mgr` loader、原生 `skill` 工具和当前代理预设。 |
| PPT Python 导入失败 | 对工作代理实际使用的同一 `--python-root` 依次执行 `doctor`、`setup`、`doctor`。 |

## 10. 手动更新与卸载

只有在需要更新时查询 npm：

```powershell
npm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
dsh plugin add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@latest
```

Web/CLI 在第二条命令的 `plugin` 后添加 `--profile web`。先比较已安装版本与 npm
版本，避免用较旧的 `latest` 覆盖本地开发版本。更新成功后完全退出并重新打开 DSH
Desktop，或正常停止并重新启动使用该 Web profile 的宿主进程。

卸载桌面端当前 profile 中的 Router：

```powershell
dsh plugin remove @ljwei-stak/model-router-galgame
```

Web/CLI 使用：

```powershell
dsh plugin --profile web remove @ljwei-stak/model-router-galgame
```

卸载后重新启动对应宿主。不要删除整个 profile、Python 管理根目录或模型凭据目录。

## 11. 版本核对

- npm：<https://www.npmjs.com/package/@ljwei-stak/model-router-galgame>
- GitHub Releases：<https://github.com/ljwei-stak/model-router-galgame/releases>
- Watcher：<https://github.com/ljwei-stak/dsh-watcher-For_MRG>
- PPT Master：<https://github.com/ljwei-stak/ppt-master-for-MGR>

发布时 npm 版本、GitHub `package.json`、Git 标签与 Release 应一致；旧 npm 版本、标签
和 Releases 保留。项目只在明确要求更新时同步，不设置定时后台更新。

---

**适用 Router 版本**：0.4.27

**完整验证宿主**：DSH Desktop 2.0.7 / `@deepseek-ai/dsh@0.1.5-rc.1`

**固定集成版本**：Watcher 0.4.1 / PPT Master 6.3.3
