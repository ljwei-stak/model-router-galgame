# Model Router + GALGame

[English](README.md) | 中文

这是一个可安装到原版 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的独立插件。它在 Host 侧提供面向成本的集体模型路由，在 Web 客户端提供 GAL 对话视图。插件单独维护在 <https://github.com/ljwei-stak/model-router-galgame>，不代表 DeepSeek Harness 官方发行版。

## 功能

- **集体模式**：把请求拆成工作包，分配满足质量下限的模型，记录费用与回退，并生成最终整合结果。
- **单独会话**：保留 Harness 原生 provider/model 选择；用户明确选定模型后，优化器不会覆盖它。
- **质量约束成本优化**：综合任务类型、复杂度、LiveBench 分数、专长、价格、延迟、风险和质量下限。超过预算时会确定性地尝试更便宜但仍可行的替换。
- **LiveBench 快照**：从 `https://livebench.ai` 自动发现最新 release，解析版本化 CSV/JSON 资源；刷新失败时保留上一次成功快照，也支持用户提供 JSON/CSV 镜像。
- **模型价格与预算**：设置页可编辑价格和路由预算，单位为每百万 Token 的美元价格；可以用 `provider/model` 针对中转站覆盖价格；缓存比例默认为零。
- **GAL 视图**：自动保存会话，逐行保留实际 provider/model，显示模型名牌、颜色、立绘、Markdown、KaTeX 和附件，并提供场景编辑器。
- **OpenCode Zen 兼容**：如果误把官方站点填入 `baseURL`，插件会恢复目录拥有的 `/zen` 或 `/zen/v1` 端点；自定义网关不会被修改。
- **桌面更新入口**：检查项目 Releases。桌面端可以安装完整客户端或插件；纯网页环境无法写入本机文件时会打开 Releases 页面。

## 环境要求

- Windows、macOS 或 Linux。
- 一个原版 DeepSeek Harness 源码目录、Node.js `^22.19.0` 或 `>=24.0.0`，以及 pnpm（Harness 当前固定 pnpm `11.7.0`）。
- 至少一个已在 Harness 中配置的模型服务，并且原生模型目录中能看到至少一个模型。
- 能访问模型服务的网络。LiveBench 不是硬性要求；不可用时路由器会回退到项目内实验目录。

API Key 应放在 Harness 的凭据/设置存储或其支持的环境配置中。不要把 Key 写进本仓库、场景文件、README 或 Git 提交。

## 在 DeepSeek Harness 中安装

下面的命令以 Windows PowerShell 为例。建议使用绝对插件路径，避免误把同名目录安装进去。

### 1. 准备 Harness

```powershell
git clone https://github.com/deepseek-ai/deepseek-harness.git F:\DeepSeek_harness\DSH-Desktop
Set-Location F:\DeepSeek_harness\DSH-Desktop
pnpm install --frozen-lockfile
pnpm run build
```

如果 Harness 已经存在，首次 checkout 或更新 Harness 后至少执行一次 `pnpm install` 和 `pnpm run build`。

### 2. 获取插件

将独立仓库克隆到 Harness 目录之外，或者下载 Release 压缩包：

```powershell
git clone https://github.com/ljwei-stak/model-router-galgame.git F:\DeepSeek_harness\model-router-galgame
```

传给安装器的目录必须同时包含 `package.json`、`.dsh-plugin\index.mjs`、`.dsh-plugin\client.js` 和 `cordis.patch.yml`。

### 3. 安装到 Web profile

从 Harness 根目录运行插件管理器：

```powershell
Set-Location F:\DeepSeek_harness\DSH-Desktop
pnpm dsh plugin --profile web add "F:\DeepSeek_harness\model-router-galgame"
```

当独立 `dsh` 命令没有加入 `PATH` 时，应使用 `pnpm dsh`。如果桌面安装版提供了 `dsh.exe`，等价命令是：

```text
dsh plugin --profile web add <plugin-directory>
```

### 4. 启动或重启 Web

```powershell
pnpm dsh web
```

默认地址是 <http://127.0.0.1:3080/>。不希望自动打开浏览器时使用 `pnpm dsh web --no-open`。添加、删除或更新 bundle 后必须重启 Web profile，让 Loader 应用新的 bundle 列表。

如果启动报错 `task-board ledger is already owned by process <PID>`，说明另一个 Harness 实例仍持有 profile 锁。先关闭另一个 Harness 窗口，再检查进程：

```powershell
Get-Process -Id <PID>
```

只有确认它是已经失效的 Harness 实例后，才执行：

```powershell
Stop-Process -Id <PID>
pnpm dsh web
```

Harness 仍在运行时不要删除 profile ledger；该锁用于保护任务历史，避免多个进程同时写入。

## 配置模型服务和模型

插件不会保存 provider 凭据，也不会建立第二套 provider 系统，而是读取 Harness 原生 LLM 目录。

1. 打开 Harness 的模型/Provider 设置。
2. 添加或启用一个 provider，在原生凭据字段填写 API Key；如果服务商要求，再填写该 provider 的 API 基地址。
3. 选择该 provider 暴露的真实模型标识，在原生对话视图发送一条短消息。
4. 确认 provider/model 出现在模型选择器中。路由器只能分配 Harness 报告为可用的模型。

实验路由目录包含以下用于评分和默认价格的模型 ID：`claude-fable-5`、`claude-opus-4-8`、`gpt-5.6-sol`、`gpt-5.5`、`deepseek-v4-pro`、`deepseek-v4-flash`、`kimi-k3`、`qwen3.7-max`、`qwen3.7-plus`、`glm-5.2`、`gpt-5.6-luna`、`gpt-5.6-terra`、`minimax-m3`、`gemini-3-flash` 和 `big-pickle`。你的 provider 可能使用不同 ID；原生模型 ID 才是准确信息，未知路由会先使用保守的回退评分，可在价格表中添加覆盖。

OpenCode Zen 请选 `opencode` 或 `opencode-go` 并填写 API Key。不要把 `https://opencode.ai` 或 `https://www.opencode.ai` 填到 provider 的 `baseURL`；协议端点由模型目录管理。插件只会删除这个官方站点覆盖，自定义 OpenCode 兼容网关保持不变。

## 配置路由和模型价格

打开 Harness 设置页中的 **GAL 视窗 / Model Router + GALGame**，展开 **模型费用与路由预算**。这些设置由 Host 持有，保存在 `model-router` 命名空间。

- **LiveBench 数据地址**：保持 `https://livebench.ai` 可自动发现最新榜单，也可以填 JSON/CSV 镜像。旧的 `/api/leaderboard` 地址会自动迁移。
- **刷新周期**：单位毫秒，最小 `30000`；默认 `900000`（15 分钟）。
- **单任务预算**：单位 USD。`0` 表示关闭预算约束；大于零时，初始方案超预算会尝试替换为更便宜且质量达标的模型。
- **缓存读/写占比**：输入 Token 的 `[0, 1]` 分数。除非服务商明确启用 prompt cache，否则都保持 `0`；读写之和不会超过 `1`。
- **模型价格表**：填写输入、输出、缓存读、缓存写价格，单位为 USD/1M tokens。实验目录没有的模型可以使用“新增模型价格”。
- **中转站专属价格**：添加类似 `openrouter/deepseek-v4-pro` 或 `my-provider/deepseek-v4-pro` 的键，为同一个模型设置不同网关价格。必须与原生选择器中的 `provider/model` 拼写完全一致。

这些价格只用于集体规划和费用审计，不改变服务商实际计费，也不影响单独会话的模型选择。

## 使用路由器

默认启用集体模式：

```text
/router mode collective
/router plan
```

选择集体模式后发送请求，在 GAL 视图中展开“会话方式”“协作流程”和“路由分析”，查看任务方向、质量分数、模型分配、预计费用、质量下限、预算状态、LiveBench 新鲜度和回退原因。面板是可审计摘要，不会暴露模型私有思维链。

需要让后续请求固定使用一个模型时：

```text
/router mode single
```

在 Harness 原生选择器中选定 provider/model，发送请求；需要再次自动拆分时使用 `/router mode collective`。

## 安装验证

首次启动后检查：

1. 插件设置中有 GAL 开关和模型费用区域。
2. 新会话同时出现原生“对话”“轨迹”和“GAL视窗”标签。
3. 在没有发送消息前打开 GAL 视图，显示空状态而不是 JavaScript 错误。
4. 发送短消息后，台词显示实际 provider/model 名牌。
5. 至少有一个原生模型可用时，`/router plan` 返回路由摘要。
6. 切换到单独模式后，Harness 中明确选择的模型保持不变。

仓库包含无 Key 回归测试，覆盖路由、协作、provider 修复、人物身份、存档、排版和更新选择。

## 开发和测试

在本仓库目录执行：

```powershell
pnpm install
npm test
npm run check:client
```

`npm run build:client` 会从 `.dsh-plugin\client\index.mjs` 重新生成 `.dsh-plugin\client.js`；源码和生成 bundle 应一起提交。本插件在 `package.json` 中标记为 private，按本地目录或 Release 压缩包安装，不发布到 npm。

## 更新、发布和卸载

更新原生 Web profile 时，下载新的插件目录或 Release 压缩包，再运行同一个 `pnpm dsh plugin --profile web add "<new-directory>"` 命令并重启 Web。设置页可以打开项目 Releases；纯网页 profile 无法直接写入本机文件。

从 Web profile 卸载：

```powershell
pnpm dsh plugin --profile web remove model-router-galgame
pnpm dsh web
```

卸载不会删除 provider 凭据、模型价格、会话历史或 GAL 存档。只有在需要完全重置时才单独删除这些数据。

## 仓库结构

- `.dsh-plugin/index.mjs`：Host 插件、设置命名空间、路由钩子和命令。
- `.dsh-plugin\client\index.mjs`：Web 插件入口和 GAL 槽位注册。
- `.dsh-plugin\client\GalView.jsx`：GAL 视图与空状态保护。
- `.dsh-plugin\shared\router.mjs`：确定性的路由模型和费用估算。
- `gal-scene.json` 与 `aipicture/`：默认场景和人物素材。
- `scripts/build-client.mjs`：可复现的客户端 bundle 构建/检查。
- `tests/`：无 Key 回归测试。

## 许可证和素材

源代码采用 MIT License，见 [LICENSE](LICENSE)。GAL 交互方式参考 [Ayase34/gal-view](https://github.com/Ayase34/gal-view)。模型娘形象与人物设定来源于 [Bilibili 用户 4168597](https://space.bilibili.com/4168597)。`aipicture/`、场景素材和截图不自动继承源代码 MIT 许可证；商业使用或再分发前请核对素材许可并取得必要授权。

