# Model Router + GALGame

[English](README.md) | 中文

这是一个可安装到原版 DeepSeek Harness 的插件。它在 Host 侧提供面向成本的集体协作路由，在浏览器侧提供 GAL 视窗、存档、模型娘立绘和 Markdown/KaTeX 对话渲染。

## 功能

- **集体合作**：根据任务类型、复杂度、关键度和依赖关系生成工作包；建模、业务执行、验证和最终整合可以分配给不同模型。
- **单独会话**：保持 Harness 原生模型选择器，用户指定哪个模型就由哪个模型工作；集体算法不会覆盖这个模式。
- **质量约束成本优化**：复杂任务先提取代码、数学、研究、视觉等业务方向并建立独立工作包，再在满足质量下限的候选中综合考虑 LiveBench 分类质量、任务专长、输入/输出价格、延迟和风险。高关键度工作保留给高质量模型，低关键度、重复且可验证的工作优先使用低价模型。
- **LiveBench 快照**：默认连接 LiveBench 官网根地址，自动发现最新 release 并读取官方 `table_YYYY_MM_DD.csv` 与 `categories_YYYY_MM_DD.json`，同时兼容用户填写的 JSON/CSV 镜像。刷新失败时保留上一次成功快照；没有快照时回退到项目内实验基线，并在摘要中明确标注“未完成联网核验”。
- **用户价格与预算**：设置页的“模型费用与路由预算”可编辑输入、输出、缓存读取、缓存写入价格（USD/1M tokens）、LiveBench 地址、刷新周期、单任务预算以及缓存读写占输入比例；也支持用 `provider/model` 标识覆盖同一模型在不同中转站的价格。缓存比例默认为 0，只有确认供应商启用 prompt cache 后才建议填写；用户覆盖优先于实验基线，价格只影响集体路由和估价，不接触 API Key。
- **费用审计**：按工作包估算输入/输出 token，逐阶段累加费用，并展示全高质量基线、预计节省、质量下限、预算状态和实际使用模型数。
- **GAL 视窗**：新会话自动形成存档；历史记录保留实际 provider/model，名牌、颜色和立绘随当前模型变化。ERNIE、文心一言和百度 provider/model 标识统一显示 `ERNIE娘` 与 `ernie1.png`。路由分析显示的是可审计摘要，不是模型私有思维链。
- **Markdown/KaTeX**：复用 Harness 的 `MarkdownText`，支持标题、列表、表格、引用、代码、链接和数学公式；宽表格、代码块和公式在对话框内滚动，玩家输入保持纯文本。
- **附件与多模态**：图片使用原生多模态管线，Markdown/TXT/JSON/代码文件提取为文本；PDF/DOCX 等二进制文件保留解析状态，不会静默伪造内容。
- **OpenCode Zen**：官方站点覆盖会自动恢复模型目录所需的 `/zen`、`/zen/v1` 端点；自定义网关不受影响。
- **更新与桌面端**：插件设置页提供 GitHub Release 检查和一键更新；客户端过期时更新完整客户端及内置插件，否则只更新插件。网页端无法写入本机文件时会打开 Releases 页面。

## 安装

### 前置条件

- DeepSeek Harness / DSH Desktop 0.4.8 或更高版本。
- Node.js 22.19 或更高版本（当前 DSH Desktop 使用 Node 24）。
- Harness 中至少配置一个 LLM provider。
- 首次安装需要能够访问 npm registry。

### 推荐方式：安装已发布的 npm 包

这个公开包已经把官方 `@liustack/modlens@3.25.4` 作为依赖和 DSH bundle 一起打包。无需安装 Docker、Python、8000 端口服务，也无需再单独安装 ModLens。

1. 在 PowerShell 中进入 DSH Desktop 目录：

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
```

2. 使用官方 npm 源。如果使用国内镜像，刚发布的新包可能暂时返回 404：

```powershell
pnpm config set registry https://registry.npmjs.org/
pnpm config get registry
```

第二条命令应输出 `https://registry.npmjs.org/`。

3. 安装到你实际使用的 profile：

```powershell
# Web profile
pnpm dsh plugin --profile web add @ljwei-stak/model-router-galgame@0.4.11

# Desktop profile（桌面程序使用 desktop profile 时执行）
pnpm dsh plugin --profile desktop add @ljwei-stak/model-router-galgame@0.4.11
```

如果 npm 提示 `No matching version found`，说明 registry 还没有同步该版本。
先执行 `npm view @ljwei-stak/model-router-galgame version`，使用它显示的最新版本
（当前公开 registry 为 `0.4.10`），或等待 `0.4.11` 发布完成。

如果不想修改全局 pnpm 源，可以只在安装命令中指定：

```powershell
pnpm dsh plugin --profile web add --registry=https://registry.npmjs.org @ljwei-stak/model-router-galgame@0.4.11
```

4. 检查路由器和它的 ModLens 依赖是否已加入 profile：

```powershell
pnpm dsh --profile web --dump-config | Select-String "model-router-galgame|modlens"
```

输出中应包含：

```text
@ljwei-stak/model-router-galgame
@liustack/modlens
```

安装本插件后不要再单独添加 `@liustack/modlens`。本插件已经包含官方 ModLens
bundle。如果以前在同一个 profile 中单独安装过 ModLens，先删除那条独立依赖，
再重新安装路由器：

```powershell
pnpm dsh plugin --profile web remove @liustack/modlens
pnpm dsh plugin --profile web add @ljwei-stak/model-router-galgame@0.4.11
```

5. 关闭已经运行的 DSH，再启动对应 profile：

```powershell
pnpm dsh web
# 或 desktop profile：
pnpm dsh --profile desktop
```

不要在 3080 端口上重复启动两个 DSH 进程。如果出现 `EADDRINUSE`，先关闭旧进程，或者使用 `pnpm dsh web --port 3081`。

### 检查 ModLens

在已安装的 Web profile 中运行：

```powershell
pnpm dsh plugin --profile web exec modlens doctor
```

然后在 DSH 设置页或 `C:\Users\<你的用户名>\.modlens\config.json` 中配置视觉引擎。新建对话、上传图片并要求模型转录或解释图片即可。存在兼容的上游路由时，纯文本模型会显示对应的 `(modlens vision)` 条目。

### 更新插件

需要固定版本时：

```powershell
pnpm dsh plugin --profile web add @ljwei-stak/model-router-galgame@0.4.11
```

希望直接更新到 npm 最新版本时：

```powershell
pnpm dsh plugin --profile web update @ljwei-stak/model-router-galgame
```

更新后请重启 DSH；Desktop profile 使用同样的命令并把 profile 改为 `desktop`。

### 出现加载器或 profile 错误时重新安装

如果启动时报 `duplicate loader entry id: modlens`，表示 ModLens 被单独安装过，
又被本插件内置 bundle 再加载了一次。先关闭 DSH，再删除单独安装的 ModLens，
然后重新安装本插件：

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
pnpm dsh plugin --profile web remove @liustack/modlens
pnpm dsh plugin --profile web add @ljwei-stak/model-router-galgame@0.4.11
pnpm dsh --profile web --dump-config | Select-String "model-router-galgame|modlens"
```

输出应只显示一条 `modlens` 行和一条 `model-router-galgame` 行。如果报
`EADDRINUSE` 且端口为 3080，说明旧的 DSH
进程仍在运行；关闭旧进程，或换一个端口启动：

```powershell
pnpm dsh web --no-open --port 3081
```

### 本地源码安装

如果要测试 `F:\DeepSeek_harness` 中的源码，不从 npm 下载：

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
pnpm dsh plugin --profile web add F:\DeepSeek_harness\model-router-galgame
```

本地路径方式只用于开发测试；正式发布后推荐使用上面的 scoped npm 包名。

### 卸载插件

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
pnpm dsh plugin --profile web remove @ljwei-stak/model-router-galgame
pnpm dsh plugin --profile desktop remove @ljwei-stak/model-router-galgame
```

卸载只会移除插件的 profile 层，不会删除 provider 凭据，也不会删除 `C:\Users\<你的用户名>\.modlens\config.json`。

没有可用模型时，插件仍保留 Harness 原生模型选择，不会阻塞对话。完整的 provider 配置和故障排查见 [INSTALLATION_GUIDE.zh.md](INSTALLATION_GUIDE.zh.md) 与 [MODLENS_DEPLOYMENT.md](MODLENS_DEPLOYMENT.md)。

## 命令

- `/router mode collective`
- `/router mode single`
- `/router plan`

默认模式为 `collective`。系统只公开任务分类、评分、分配、费用和回退记录，不输出任何模型私有思维链。

## 数学路由模型

对请求 `x`，系统先得到任务类型 `t`、复杂度档位 `c`、工作包集合 `I` 和候选模型集合 `M`。每个候选的质量来自 LiveBench 的任务分类分数（其次为 overall，最后回退实验基线），价格来自用户覆盖或实验目录。

单个工作包 `i` 分配给模型 `m` 的效用为：

```text
U(i,m) = wq(c) Q(i,m) + wc(c) C(m) + wl(c) (1 - L(m))
         + ws(c) S(i,m) - wr(c) R(m)
         - lambda * 1[m is already used]
         - kappa * max(0, F(i) - Q(i,m))
```

其中 `F(i)` 是工作包质量下限；只有满足 `Q(i,m) >= F(i)` 的候选才优先进入可行集合。复杂任务还设置预算 `B`，若初始效用分配超预算，算法按关键度从低到高尝试替换为更便宜且仍满足质量下限的模型。最终汇总阶段默认优先 DeepSeek V4 Pro，若不可用则按候选排序回退。

该算法已经接入 Host 请求路径：`index.mjs` 在集体模式调用 `buildPlan`，并按计划执行各阶段；单独模式保留用户指定模型，不经过集体路由覆盖。`router.test.mjs` 覆盖复杂度、混合业务拆分、LiveBench 与价格覆盖及预算回退，`collaboration.test.mjs` 覆盖多阶段执行和最终整合。

阶段费用使用用户价格 `p_in(m), p_out(m)` 和 token 估计：

```text
Cost(i,m) = (n_in(i) * p_in(m) + n_out(i) * p_out(m)) / 10^6
TotalCost = sum_i Cost(i, assign(i))
Saving = max(0, 1 - TotalCost / BaselineStrongCost)
```

复杂度越高，质量、专长和关键度约束越重要；简单请求则更多使用低价、低延迟模型。该实现是有界的质量约束贪心求解器，复杂度约为 `O(|I||M| log |M|)`，适合桌面端实时生成计划。

## OpenCode Zen 设置

在模型设置中选择 `opencode` 或 `opencode-go` 并填写 API Key。官方路由不需要把网站地址填入 provider 的 `baseURL`；如果检测到 `https://opencode.ai` 等官方站点覆盖，插件会在启动和请求前清除覆盖，让模型目录恢复正确端点。自定义域名不会被修改。

## 灵感、人物与许可证边界

GAL 交互方式参考 [`Ayase34/gal-view`](https://github.com/Ayase34/gal-view)。模型娘形象与人物设定来源于 [Bilibili 用户 4168597](https://space.bilibili.com/4168597)。插件不宣称与上游项目或创作者存在官方合作；`aipicture/` 图片及包含图片的截图不自动继承根项目 MIT 许可证，商业使用或再分发前请核对素材许可并取得必要授权。

## 桌面端

仓库根目录 `desktop/` 提供服务器端/本地运行模式切换和 Windows 打包配置。桌面窗口、启动器与 Windows 安装包使用 `DeepSeek_Harness娘.avif` 生成的方形图标。插件源码、设置 schema 和构建脚本均保留在仓库，安装包通过项目 Release 发布。
