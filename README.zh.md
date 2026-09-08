# Model Router + GALGame

[English](README.md) | 中文

适用于 DeepSeek Harness / DSH Desktop 的模型路由与 GAL 对话插件。它把任务分配、费用估算、模型角色对话、联网工具、PPT 生成技能和审批适配整合为一个 npm 插件包，需要在已有的 DSH 宿主中使用。

**当前发布版本：0.4.23** · [npm 包](https://www.npmjs.com/package/@ljwei-stak/model-router-galgame) · [GitHub Releases](https://github.com/ljwei-stak/model-router-galgame/releases) · [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop/releases)

## 功能介绍

### 模型路由与费用估算

- **集体合作**：默认模式。根据任务复杂度、业务方向和依赖关系生成工作包，为执行、验证和最终整合选择可用模型。复杂任务按阶段执行，保留各阶段的模型和分配记录。
- **单独会话**：使用 Harness 原生模型选择器中指定的模型，集体路由不覆盖你的选择。
- **质量与预算约束**：结合模型专长、LiveBench 分类分数、输入/输出价格、缓存价格及延迟估计进行分配；使用 Pareto 剪枝和有界 Beam Search，展示预算是否可行、约束是否放宽及回退结果。
- **价格可编辑**：在“GAL 视窗”设置中的“模型费用与路由预算”填写 USD / 1M tokens 价格、单任务预算和缓存比例，也可用 `provider/model` 设置不同渠道的价格。默认缓存比例为 0。
- **可检查的费用摘要**：查看逐阶段费用估算、预计节省、质量下限和实际使用的模型。LiveBench 刷新失败时保留上次快照；没有快照时明确标记使用实验基线。

费用和质量分数用于路由估计，不是供应商账单或结果质量保证。只有已在宿主配置好、可调用的模型才会参与路由；填写价格不会创建模型账号，也不会保存 API Key。

### GAL 对话与附件

- 在会话中增加“GAL视窗”，提供模型角色立绘、名字颜色、对话分页和与会话关联的存档；历史记录保留实际使用的 provider/model。
- 支持场景编辑、背景与立绘素材、自定义字体、布局保存及场景导入/导出。角色表达作用于最终回答，路由面板显示任务摘要和分配信息。
- AI 回复支持 Markdown 和 KaTeX。宽表格、公式和代码可在对话区域内滚动；不完整或不兼容的 Markdown 会回退为纯文本，用户输入保持纯文本。
- 图片支持 PNG、JPEG、WebP 和 GIF，使用宿主附件流程，并通过兼容的 ModLens 路由辅助文本模型理解图片。Markdown、TXT、JSON 和代码文件可作为文本输入，单个文本文件上限为 4 MB；**PDF/DOCX 等二进制文件需要先转换为 Markdown/TXT**，当前 GAL 附件入口不会直接解析其正文。

### 剧情模式与自由模式

在已有 Harness 会话中打开 **“GAL视窗 → GAL游戏”**，即可直接在视窗内游玩；原有会话与场景编辑入口仍可使用。

- **剧情模式**：无需调用模型 API 的中文固定剧本，包含 1,111 个节点、28 处选择、角色事件、分支、5 个结局和 5 条后日谈。14 位模型娘均有多次出场与专属事件，一条完整路线约 2.27 万字。
- **自由模式**：玩家自行打字，由 Harness 中配置的模型生成回应。互动会影响好感度与信任，既可增加也可降低，并影响关系发展后的回应。正常游玩隐藏关系数值、判定详情与推进条件，开发调试默认关闭。
- **角色美术**：14 位角色各有独立美术对话框，DeepSeek 保留原框并配有五种生成的表情差分。场景背景暂用空白与文字描述占位。
- **游玩与存档**：剧情模式支持自动播放、历史回看、三个手动存档槽、JSON 导入/导出与重新开始；剧情和自由模式分别保存。已有短篇剧情存档继续原来的故事，请先存档或导出，再在 **“设置 → 重新开始剧情”** 进入扩展篇。

剧情模式不需要配置模型凭据；自由模式需要可用模型连接。对话框与表情素材已经随插件提供，游玩不需要图片 API。

### 联网、浏览器与审批

- **ModSearch**：通过 bundle 将原生 `web_search` 接入 ModSearch，并提供 `read_page` / `x_search`。
- **Ego Browser**：为需要 JavaScript、登录态或页面交互的任务提供可见浏览器工具。路由器向模型提供搜索失败后切换浏览器的指导；验证码和人机验证交由用户完成。
- **审批适配**：在多任务沙箱升级请求中附加工作包、阶段、模型和任务数量。审批决定、人工确认、审计与学习由 `@ljwei-stak/dsh-approval-gate` 和宿主权限策略负责，安装路由器不等于开启自动批准。
- **OpenCode Zen 兼容**：修复误填成官方网页地址的 OpenCode 端点覆盖，保留自定义网关。

### PPT Master 演示文稿生成

- **PPT Master** 以 DSH 原生 skill 随包加载。在普通工作会话中收到 PowerPoint/PPT/PPTX 需求后，模型可通过宿主 `skill` 工具加载 `ppt-master`，按规划、SVG 制作、检查和 PPTX 导出的流程执行。
- Model Router 在选择模型和推进工作阶段时保留宿主技能目录、已加载的技能指令及文件/终端工具。制作 PPT 应使用普通聊天或 GAL 工作会话；剧情模式不调用工具，自由模式的角色对话也不是工作代理。
- 包内包含技能、Python 脚本和模板。Python 依赖需按下方步骤主动安装，npm 安装不会自动安装 Python 或运行 pip。生成的演示文稿保存在会话可写工作目录中。
- Router 0.4.23 随包加载 PPT Master 6.3.2，修复 Python 3.13 及更新版本在 Windows DSH 沙箱中导出 PPTX 时的临时目录权限错误，宿主沙箱和审批设置仍然生效。

### 插件与桌面端分别更新

“GAL 视窗 → 项目更新”分别检查插件 npm 版本和官方 DSH Desktop 版本。支持“仅更新 npm 插件”“仅更新完整客户端”和“一键更新插件与客户端”。桌面端插件安装通过已认证的宿主连接执行，成功后需要完全退出并重启 DSH Desktop。

普通浏览器中的页面可以查询插件版本、打开下载页面，但不能直接安装桌面端或修改其 profile。插件的 `0.4.23` 与 DSH Desktop 的版本号相互独立。

## 安装

### 1. 确认运行环境

| 环境 | 要求与安装入口 |
| --- | --- |
| 已安装 DSH Desktop | 已验证 DSH Desktop 2.0.5。Windows / macOS 使用设置页的“打开 DSH 终端”；没有该入口时按下方 CLI 方式指定实际 profile。 |
| Harness Web / CLI | 已验证 `@deepseek-ai/dsh@0.1.2-rc.1`。需要可用的 `dsh` 与 `pnpm`，使用明确的 `--profile`。 |
| Node.js | 插件声明 `>=22.19`；上述官方 CLI 要求 `^22.19.0` 或 `>=24.0.0`，建议 Node.js 24。桌面端优先使用其内置运行时。 |
| 模型与网络 | 路由、AI 对话与自由模式至少需要一个可用的模型 provider；剧情模式不需要模型 API。安装时能访问 `https://registry.npmjs.org/`。 |

仅安装本 npm 包不会安装 DSH Desktop、模型服务或浏览器程序。尚未安装桌面端时，先从 [DSH Desktop 官方 Releases](https://github.com/anywhere-labs/dsh-desktop/releases) 获取客户端。

### 2A. DSH Desktop：安装到当前 profile

1. 启动 DSH Desktop，选择实际使用的 profile，在设置页标题区域打开 **“DSH 终端”**。
2. 在这个终端中执行以下命令。它已经绑定当前 profile，不要额外假定 profile 名称为 `desktop`：

```sh
dsh --version
dsh plugin add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@0.4.23
```

3. 安装成功后，使用桌面端的重启入口，或从托盘明确退出后重新打开，仍选择刚才的 profile。仅关闭窗口可能只是隐藏应用。

不需要克隆 GitHub 仓库，也不需要进入某个固定磁盘目录。普通终端里的全局 `dsh` 可能使用不同的数据目录；桌面端安装优先使用应用打开的终端。切换 profile 后应重新打开终端，已有终端仍绑定原来的 profile。

### 2B. Harness Web / CLI：安装到指定 profile

以下示例只安装到 `web`。如使用自定义 profile，把命令中的 `web` 全部替换为实际名称，并确保使用与宿主相同的 `DSH_HOME`。

如果没有全局 `dsh`，但已有 Node.js/npm 和 pnpm，可把以下每条命令开头的 `dsh` 替换为 `npx @deepseek-ai/dsh@0.1.2-rc.1`，例如 `npx @deepseek-ai/dsh@0.1.2-rc.1 --version`。

```sh
dsh --version
dsh plugin --profile web add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@0.4.23
dsh --profile web --dump-config
```

安装后先关闭使用该 profile 的旧进程，再启动 Web：

```sh
dsh web
```

打开终端输出的地址。在同一个 profile 上不要同时运行两个宿主进程。自定义 profile 使用宿主对应的启动配置。

如果从已经安装依赖并构建好的 Harness 源码运行，在 **Harness 仓库根目录**把上述命令开头的 `dsh` 替换为 `pnpm dsh`。不要在本插件目录中执行 `pnpm dsh`，本插件没有宿主启动命令。

### 3. 检查安装结果

桌面端在应用打开的 DSH 终端中执行：

```sh
dsh --dump-config
```

Web / CLI 使用 `dsh --profile web --dump-config`。组合后的配置应包含以下六个插件，且没有重复 loader ID。配置导出不能替代实际启动验证；只需安装 Router 聚合包，依赖和 bundle 条目会自动加入。

| 插件 | 0.4.23 固定依赖版本 | 用途 |
| --- | --- | --- |
| `@ljwei-stak/model-router-galgame` | `0.4.23` | 路由、GAL 视窗、剧情/自由模式和更新入口 |
| `@liustack/modlens` | `3.25.4` | 兼容路由的图片理解 |
| `@liustack/modsearch` | `5.10.1` | 搜索与页面读取 |
| `@ljwei-stak/dsh-ego-browser` | `0.8.3` | 可见浏览器工具 |
| `@ljwei-stak/dsh-approval-gate` | `0.5.3` | 审批策略与审计 |
| `@ljwei-stak/ppt-master-for-mgr` | `6.3.2` | 原生 PPT 技能、脚本和模板 |

`schemastery@3.18.0` 和 PPT Master 的原生技能提供器也会作为运行依赖自动安装。上述依赖采用固定版本；更新 Router 时使用新 Router 包声明的依赖组合，而不是自动升级每个依赖到各自的 `latest`。

在 DSH 中新建会话，确认有 **“GAL视窗”** 标签。若没有，先确认 profile 正确、已重启宿主，并检查设置中的“启用 GAL 视窗”。

### 4. 准备 PPT 生成环境

在 DSH 工作代理执行命令的环境中安装 Python 3.10 或更新版本。在该代理的预设中启用宿主原生 `skill` 工具（`@deepseek-ai/dsh-tool-skill`）以及文件和终端工具。随包加载的提供器会把 `ppt-master` 注册到原生技能目录，不会改写预设的工具和权限。

在 DSH 终端或与工作代理相同的执行环境中运行：

```sh
npx --yes --package=@ljwei-stak/ppt-master-for-mgr@6.3.2 ppt-master-for-mgr doctor
npx --yes --package=@ljwei-stak/ppt-master-for-mgr@6.3.2 ppt-master-for-mgr setup
npx --yes --package=@ljwei-stak/ppt-master-for-mgr@6.3.2 ppt-master-for-mgr doctor
```

`setup` 会明确运行 pip 安装包内 requirements。可以先创建专用 Python 虚拟环境，再为每条命令添加 `--python /absolute/path/to/python`，或将环境变量 `PPT_MASTER_PYTHON` 设置为该解释器；Windows 路径包含空格时需加引号。工作代理也应使用同一个解释器。`doctor` 检查核心 Python 模块，不代表视觉质量或全部可选服务已通过检查。部分转换、渲染、配音和生图功能还需要 [PPT Master 文档](https://github.com/ljwei-stak/ppt-master-for-MGR) 中说明的额外软件或凭据。

重启 DSH，在可写工作目录中开启普通工作会话，例如发送：“请使用 ppt-master 制作一份 10 页的项目汇报，并将 PPTX 保存到当前工作目录。”确认模型通过 `skill` 加载 `ppt-master`，随后生成并检查文件。文件和命令访问仍遵循宿主正常审批。PPT 由工作代理生成；GAL 附件入口仍不会直接解析二进制文档。

## 首次使用

只玩剧情时，直接打开 **“GAL视窗 → GAL游戏 → 剧情模式”**，无需模型 API。以下步骤用于配置原有路由与 AI 对话，自由模式也使用宿主的模型配置。

1. 在宿主“设置 → 模型”里配置 provider 和凭据，先确认普通对话能正常回答，不要求使用特定模型厂商。
2. 打开“GAL视窗”。要手动选择模型，执行 `/router mode single`；要由插件分配任务，执行 `/router mode collective`。
3. 发送任务后执行 `/router plan` 查看计划。没有产生计划前，该命令会提示暂无方案。
4. 按实际供应商价格填写“模型费用与路由预算”。预算和缓存比例先保持默认，再根据已确认的价格与缓存能力调整。
5. 需要图片理解时配置 ModLens 的视觉引擎；需要网页交互时按 Ego Browser 的浏览器配置和登录提示操作。依赖安装完成不代表这些外部服务已经配置好。

| 命令 | 作用 |
| --- | --- |
| `/router mode collective` | 切换到集体合作，后续任务按方案分配 |
| `/router mode single` | 保留原生模型选择器中的模型 |
| `/router plan` | 查看当前会话最近一次路由方案 |
| `/router safety` | 查看审批桥接状态和当前阶段上下文 |
| `/router web` | 查看联网能力声明、宿主服务探测和任务策略 |

默认模式为 `collective`。`/router safety` 和 `/router web` 是状态摘要，不代表审批服务或浏览器端到端诊断已通过；路由摘要不展示模型私有思维链。

## 更新与卸载

### 更新插件

已安装 `0.4.20` 的桌面端用户，可在“GAL 视窗 → 项目更新”先点击“检查更新”，再选择“仅更新 npm 插件”。宿主会重新查询 npm，安装确切版本并避免降级。成功后完全退出并重新启动 DSH Desktop。

也可在当前 profile 的 DSH 终端中手动更新：

```sh
pnpm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
dsh plugin add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@latest
```

Web / CLI 把第二条命令改为 `dsh plugin --profile web add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@latest`，然后重启 Web 宿主。如果本地是更新的开发版本，先比较查询结果，不要用 `@latest` 覆盖它。

| 更新对象 | 发布来源 | 生效方式 |
| --- | --- | --- |
| Router 及其固定依赖组合 | [本插件 npm 包](https://www.npmjs.com/package/@ljwei-stak/model-router-galgame) | 更新当前 profile，重启宿主 |
| DSH Desktop 完整客户端 | [官方桌面端 Releases](https://github.com/anywhere-labs/dsh-desktop/releases) | 交由桌面端原生更新器按提示完成 |
| 本插件源码与安装包下载 | [本仓库 Releases](https://github.com/ljwei-stak/model-router-galgame/releases) | 用于查看发布记录、获取源码或安装包，不是桌面客户端更新源 |

“一键更新插件与客户端”会按需执行两项更新。安装完整客户端不能替代插件更新；纯网页中的按钮会打开相应页面。

### 卸载

桌面端在其 DSH 终端中执行：

```sh
dsh plugin remove @ljwei-stak/model-router-galgame
```

Web / CLI 使用 `dsh plugin --profile web remove @ljwei-stak/model-router-galgame`。完成后重启宿主。不要为卸载插件而删除整个 profile 或模型凭据目录。

## 常见安装问题

| 现象 | 处理方式 |
| --- | --- |
| `dsh` / `pnpm` 找不到，或出现 `ERR_PNPM_NO_SCRIPT` | 桌面端使用“打开 DSH 终端”；源码方式确认在已配置好的 Harness 根目录运行。 |
| `No matching version found` / 镜像 404 | 用上面的 `pnpm view` 查询官方 registry；安装命令保留 `--registry=https://registry.npmjs.org/`。 |
| 安装成功但没有 GAL 标签 | 检查安装与启动是否使用同一 profile、同一 `DSH_HOME`，完全重启后检查“启用 GAL 视窗”。 |
| `duplicate loader entry id` | 同一 profile 中某个依赖可能被单独安装，又被 Router bundle 加载；只删除确认重复的独立条目。 |
| `EADDRINUSE` / `task-board ledger is already owned` | 先正常关闭占用该 profile 的旧宿主进程。换端口不能解除 profile 锁。 |
| 图片不能识别 | 检查 ModLens 引擎、凭据和可用路由。PDF/DOCX 先转换为文本。 |
| 找不到 PPT 技能或 PPTX 导出失败 | 确认同一 profile 中存在 `ppt-master-for-mgr` bundle 条目，并在工作代理预设启用原生 `skill`；使用工作会话，按代理实际 Python 运行 `doctor`，缺少核心依赖时执行 `setup`，同时检查工作目录权限。 |
| 更新检查失败 | 检查 npm / GitHub 网络连接；“无法确认版本”不表示已经是最新版。 |

例如，仅在确认 ModLens 是同一 profile 中重复安装的独立依赖后，执行：

```sh
dsh plugin remove @liustack/modlens
dsh plugin add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@0.4.23
```

Web / CLI 在两条命令的 `plugin` 后加 `--profile web`。其他重复依赖按实际报错处理，不要一次删除全部插件。没有重复条目时不需要执行这些移除命令。

## 源码开发安装

源码安装用于修改插件；正常使用优先选择 npm 包。先在自己的开发目录克隆仓库，再从宿主的 DSH 终端安装本地目录：

```sh
git clone https://github.com/ljwei-stak/model-router-galgame.git
dsh plugin add /absolute/path/to/model-router-galgame
```

把路径替换为实际绝对路径，含空格时加引号；Web / CLI 使用 `dsh plugin --profile web add <实际路径>`。npm 包含可直接加载的构建产物，但不包含完整客户端源码、测试和原始素材。

修改客户端源码后，在插件仓库运行 `npm test`、`npm run build:client` 和 `npm run check:client`。当前构建脚本依赖相邻的 `DSH-Desktop` 源码构建产物及 esbuild；仅安装本插件的 npm 依赖不足以建立完整构建环境。出现 `SKIP` 不算构建校验通过。

## 数学路由模型

本节按照 `RESEARCH_PAPER_FRAMEWORK.md` 的论文框架，完整说明沿用自 `0.4.20`
的路由实现。生产路由器与离线实验插件共用质量下限、费用模型、目标函数和回退语义；
生产实现进一步加入 Pareto 剪枝与有界全局搜索，因此不再是互相独立的逐阶段局部贪心。

### 1. 问题定义

给定用户请求 `x`，系统构造：

```text
t       任务类型：general、code、math、research、writing、summarization、vision
c       复杂度档位：simple、balanced、complex
I       有序工作包集合
M       已发现的 provider/model 路由集合
F(i)    工作包 i 的质量下限
B       可选的单请求 USD 预算
```

分配函数为 $\pi: I \to M$。首要目标是在满足质量约束的前提下最大化多目标效用；
设置预算时，预算是第二层硬约束：

$$
\begin{aligned}
\text{最大化}\quad & \sum_{i \in I} U(i,\pi(i)) \\
\text{约束}\quad & Q(i,\pi(i)) \ge F(i), && \forall i \in I \\
& \sum_{i \in I} \mathrm{Cost}(i,\pi(i)) \le B
\end{aligned}
$$

如果某个工作包没有任何模型达到质量下限，系统会选择可用候选中质量最高的回退模型，
并写入 `constraintRelaxed: true`；不会把未满足的约束伪装成已满足。

### 2. 请求分析与工作包构造

任务分类是确定性的信号计数过程。系统分别统计代码、数学、研究、写作、摘要和视觉
关键词，以信号最多的类型作为主类型，同时保留所有检测到的类型用于复杂任务拆分。

复杂度分数由文本长度、条目/要求密度、领域关键词、代码/推理标记和视觉标记组成，
并限制在 `[0,1]`：

$$
\begin{aligned}
\text{simple:}\quad & 0.00 \le \mathrm{complexity} < 0.34 \\
\text{balanced:}\quad & 0.34 \le \mathrm{complexity} < 0.66 \\
\text{complex:}\quad & 0.66 \le \mathrm{complexity} \le 1.00
\end{aligned}
$$

简单和均衡请求使用一个执行工作包。复杂请求展开为一个小型 DAG 序列：

```text
analysis -> 领域执行工作包 -> 可选 verification -> synthesis
```

每个工作包都具有 id、类型、用途、关键度、质量下限和 `dependsOn` 依赖列表。默认
质量下限为：simple `0.75`、balanced `0.78`、complex `0.82`。复杂任务的 synthesis
工作包最低为 `0.84`；关键度较高的非 synthesis 工作包会在基础下限上获得小幅增量。

### 3. 模型质量、专长、费用与风险

对于模型路由 `m` 和任务类型 `t`，质量按以下顺序解析：

$$
Q(m,t)=
\begin{cases}
\text{LiveBench 分类分数}, & \text{可用时};\\
\text{LiveBench overall 分数}, & \text{否则};\\
\text{仓库内实验基线分数}, & \text{否则}
\end{cases}
$$

专长 `S(m,t)`：模型明确声明该专长时为 `1.0`；general 任务为 `0.58`；研究/写作等
相关方向使用确定性的部分匹配。风险 `R(m)` 与延迟 `L(m)` 使用目录归一化值；用户
价格覆盖只改变费用，不会伪造质量分数。

输入/输出价格单位为 USD/百万 token，支持 prompt cache 的费用公式为：

$$
\mathrm{Cost}(i,m)=
\frac{(n_{in}-n_{cache\_read}-n_{cache\_write})p_{in}
      +n_{cache\_read}p_{cache\_read}
      +n_{cache\_write}p_{cache\_write}
      +n_{out}p_{out}}{10^6}
$$

缓存读写比例会被限制在 `[0,1]`，写入比例不会与读取比例重叠；没有配置缓存比例时，
全部输入按普通输入价格计费。

### 4. 多目标效用函数

代码使用归一化费用效用
$C_{\mathrm{norm}}=1-p_{\mathrm{effective}}/p_{\max}$，因此
实际价格越低，成本目标贡献越高。单个工作包 `i` 选择模型 `m` 的效用为：

$$
\begin{aligned}
U(i,m)={}&w_q(c)Q(i,m)+w_c(c)C_{\mathrm{norm}}(m)+w_l(c)(1-L(m))\\
&+w_s(c)S(i,m)-w_r(c)R(m)\\
&-\lambda\,\mathbb{1}[m\text{ 已经使用}]
-\kappa\max(0,F(i)-Q(i,m))\\
&+\mathrm{synthesis\_bonus}(i,m)
\end{aligned}
$$

默认权重为：

| 复杂度 | 质量 | 成本 | 延迟 | 专长 | 风险 |
|---|---:|---:|---:|---:|---:|
| simple | 0.30 | 0.50 | 0.14 | 0.04 | 0.02 |
| balanced | 0.45 | 0.30 | 0.10 | 0.10 | 0.05 |
| complex | 0.55 | 0.16 | 0.06 | 0.16 | 0.07 |

synthesis 使用质量优先的 `0.70/0.10/0.04/0.10/0.06` 权重；存在 DeepSeek V4 Pro
时只增加一个小的确定性偏好项，并非硬编码强制选择，不可用时仍按可行候选排序回退。
重复使用同一路由扣除 `0.08` 效用；依赖边跨越不同模型时，在全局分配中每条边扣除
`0.015`，用于抑制不必要的上下文交接。

### 5. 生产算法：Pareto 剪枝的质量约束 Beam Assignment

当前 Host 路由器由五个步骤组成。

#### 5.1 候选发现与质量过滤

对每个工作包，若至少存在一个达到质量下限的模型，就删除所有低于下限的候选；若一个
都不存在，则保留质量最高的至多三个候选，并标记该工作包需要放宽约束。这样既保证正常
情况下的质量硬约束，也让约束失败可见，并限制大模型目录下的计算量。

#### 5.2 Pareto 剪枝

对于同一个工作包，候选 `a` 支配候选 `b` 的条件是：五个维度全部不差，且至少一个维度
严格更好：

$$
Q(a)\ge Q(b),\quad \mathrm{Cost}(a)\le\mathrm{Cost}(b),\quad L(a)\le L(b),\quad
S(a)\ge S(b),\quad R(a)\le R(b)
$$

被支配的模型不可能同时改善质量、费用、延迟、专长或风险，因此可以安全删除。系统保留
Pareto 前沿，并额外保留三个锚点：最低费用、最高综合效用和最高质量候选；每个工作包
最终至多保留 12 条路由。

#### 5.3 依赖感知的 Beam Search

每个 Beam 状态保存：部分分配、已完成工作包的路由映射、累计费用、累计效用、依赖交接
次数和质量缺口。算法按工作包顺序扩展状态；如果当前模型与依赖工作包模型不同，就按
每条依赖边扣除 `0.015`。Beam 宽度为 256。并列状态按质量缺口、综合效用、费用、交接
次数和 provider/model 字典序稳定决胜，因此相同输入会得到相同方案。

搜索排序优先减少质量约束违规，再减少质量缺口，最后最大化效用。预算搜索使用“后缀最低
费用”下界，提前剪掉即使后续全部使用最便宜模型也无法满足预算的部分状态。

#### 5.4 预算策略

系统依次评估三种方案：

1. 不设预算的效用最优方案；
2. 必须满足 `B` 的效用方案；
3. 如果第 2 项不可行，则求仍保持所有可用质量下限的最低费用方案。

如果连保持质量下限的方案都不存在，就返回“质量最高的低成本回退”，并在审计结果中明确
写入 `budgetExceeded` 和/或 `constraintRelaxed`。这是全局组合替换，不是简单地只替换
最后一个阶段。

#### 5.5 生产伪代码

```text
BuildPlan(x, M, B):
  (t, c, I) <- AnalyzeRequest(x)
  for i in I:
      P_i <- FeasibleCandidates(i, M)
      P_i <- ParetoPrune(P_i) + {最低费用、最高效用、最高质量}
  plan <- BeamAssign(I, P, B = infinity)
  if B > 0:
      budgetPlan <- BeamAssign(I, P, B)
      plan <- budgetPlan if feasible
              else BeamAssign(I, P, minimize total cost)
  return assignments、费用、质量下限、交接次数和回退标记
```

### 6. 实验插件中的三种算法

`experiment-plugin` 提供论文六项实验使用的独立算法实现。它们使用与 Host 相同的模型
字段，并采用固定随机种子保证离线结果可复现。

**QCG-Router（质量约束贪心 / Pareto 变体）**

QCG 对每个模型进行质量、费用、延迟、专长和风险评估；质量预测为基线分数加专长奖励，
复杂任务有小幅复杂度扣减。算法先过滤低于 `F(i)` 的候选，再从 Pareto 前沿中选择效用
最高者。若没有可行候选，则返回质量最高的回退并设置 `constraintRelaxed: true`。

**AMO-Router（自适应多目标路由）**

AMO 从论文规定的三组复杂度权重开始。得到真实费用和质量后计算：

$$
e_{cost}=\mathrm{clamp}\!\left(\frac{\mathrm{actual\_cost}-\mathrm{target\_cost}}
 {\max(\mathrm{target\_cost},\varepsilon)}\right),\qquad
v_q=\max(0,\mathrm{quality\_floor}-\mathrm{actual\_quality})
$$

反馈使用 `0.10` 的指数平滑。实际费用高于目标时提高成本目标权重；质量违反时提高质量
和专长权重。每次更新后投影回正权重单纯形，保证五个权重有限、为正且总和为 1。这样修正
了旧实现中“费用超标反而降低成本压力”的符号问题。

**DAG-Assign（依赖感知任务分配）**

DAG-Assign 使用 Kahn 拓扑排序，拒绝未知节点边和环；关键度定义为唯一后继数量，并为
synthesis 节点额外加 `100`。每个节点保留 QCG Pareto 候选，然后以 Beam 宽度 256 做
依赖感知分配，加入依赖交接惩罚、synthesis 质量奖励和关键度奖励。预算剪枝使用后缀最低
费用；如果预算不可能满足，结果显式报告 `budgetFeasible: false`，而不是静默分配低于质量
下限的模型。

### 7. 复杂度与正确性性质

令 $N=\lvert M\rvert$、$K\le 12$ 为剪枝后的候选数、
$P=\lvert I\rvert$、$W=256$ 为 Beam 宽度，
当前实现的有界最坏情况复杂度为：

| 组件 | 时间复杂度 | 空间复杂度 |
|---|---:|---:|
| 候选评分 | $O(PN)$ | $O(PN)$ |
| 两两 Pareto 剪枝 | $O(PN^2)$ | $O(PN)$ |
| Beam 分配 | $O(PWK)$ | $O(WK+P)$ |
| DAG 拓扑排序 | $O(\lvert V\rvert+\lvert E\rvert)$ | $O(\lvert V\rvert+\lvert E\rvert)$ |

桌面端模型目录通常较小，且所有循环都受已发现路由数、每包 12 个候选和 Beam 宽度 256
限制，适合交互式生成计划。

系统强制并在结果中公开以下不变量：

1. **质量保证**：只要某个工作包存在合格候选，正常分配中所有候选都满足 $Q\ge F$。
2. **预算保证**：标记 `budgetFeasible: true` 的方案，其估算总费用不超过 `B`（以配置的
   token 和价格估算为准）。
3. **依赖保证**：协作阶段按拓扑顺序输出，并记录模型交接次数。
4. **确定性**：相同分数按费用和路由 id 稳定决胜；相同输入、目录和设置产生相同方案。
5. **优雅降级**：没有模型、provider 失败、LiveBench 过期或质量下限不可满足时，都通过
   显式回退元数据表达，不阻塞 Harness 原生请求路径。

Beam 求解器是有界的。它为桌面端交互式路由提供可审计、确定性的近似最优启发式，
并不声称对任意 DAG 都能形式化保证全局最优。增大 Beam 可以提高搜索覆盖率，但会增加
决策延迟；Pareto 剪枝和后缀费用下界使默认 `W = 256` 保持可用。

### 8. 费用与审计输出

每个计划输出：

$$
\begin{aligned}
\mathrm{TotalCost}&=\sum_{i\in I}\mathrm{Cost}(i,\mathrm{assign}(i)),\\
\mathrm{BaselineCost}&=\text{每个工作包使用当前可用最高质量模型的费用},\\
\mathrm{EstimatedSaving}&=\max\!\left(0,1-\frac{\mathrm{TotalCost}}{\mathrm{BaselineCost}}\right)
\end{aligned}
$$

同时输出每阶段 token 估计、缓存读写 token、预测质量、质量下限、provider/model、Pareto
剪枝数量、Beam 宽度、交接次数、预算可行性及约束是否放宽。`/router plan` 和 GAL 路由
分析面板展示这些可审计字段，但不会展示模型私有思维链。

算法已接入 Host 请求路径：集体模式由 `index.mjs` 调用 `buildPlan` 并按计划执行；单独
模式保留用户明确选择的模型，不被集体路由覆盖。回归测试覆盖复杂度、混合业务拆分、
LiveBench/价格覆盖、预算行为、Pareto 剪枝、AMO 反馈方向、DAG 顺序、多阶段执行和最终
整合。

## OpenCode Zen 设置

在模型设置中选择 `opencode` 或 `opencode-go` 并填写 API Key。官方路由不需要把网站地址填入 provider 的 `baseURL`；如果检测到 `https://opencode.ai` 等官方站点覆盖，插件会在启动和请求前清除覆盖，让模型目录恢复正确端点。自定义域名不会被修改。

## 灵感、人物与许可证边界

GAL 交互方式参考 [`Ayase34/gal-view`](https://github.com/Ayase34/gal-view)。模型娘形象与人物设定来源于 [Bilibili 用户 4168597](https://space.bilibili.com/4168597)。插件不宣称与上游项目或创作者存在官方合作；`aipicture/` 图片及包含图片的截图不自动继承根项目 MIT 许可证，商业使用或再分发前请核对素材许可并取得必要授权。

## 桌面端

DSH Desktop 与本插件分别发布、分别确定版本。完整客户端从官方 [`anywhere-labs/dsh-desktop` Releases](https://github.com/anywhere-labs/dsh-desktop/releases) 更新；插件从 npm 官方 registry 更新 `@ljwei-stak/model-router-galgame`，必须独立检查和安装。



