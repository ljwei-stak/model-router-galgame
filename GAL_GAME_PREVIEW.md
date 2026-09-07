# GAL 游戏本地预览

GAL 游戏作为原有「GAL视窗」内的一个模块，提供「剧情模式」与「自由模式」。视窗内仍有「对话模式」「GAL游戏」「编辑模式」三个标签；「对话模式」是原「游戏模式」的改名，原有对话表现、场景编辑器、模型路由与设置继续保留。

故事、人物冲突和数值设计见 [初级构想文档](GAL_GAME_CONCEPT.zh.md)。六表情对照图见 [表情预览](output/imagegen/expression-contact-sheet.png)，生成提示词与 API 适配说明见 [图片说明](output/imagegen/README.md)。

## 在 DeepSeek Harness 中打开

本地插件加载后，在已有会话中打开原有「GAL视窗」，切换到「GAL游戏」，再选择「剧情模式」或「自由模式」。游戏直接呈现在该视窗中；切换到「对话模式」或「编辑模式」可继续使用原有功能。侧栏不添加独立游戏入口，也不打开单独的全屏游戏弹层。

当前 Harness 在完全空白的新会话中不会展示任何会话视图标签，这是宿主原有行为。本地试玩可直接打开已有会话，再进入「GAL视窗」；不需要向该会话发送游戏台词。

首次进入默认使用「剧情模式」，可以离线读完整故事，不需要配置模型，也不会为了打开游戏查询模型目录。之后会记住上次选择的模式。两种模式分别保存进度与手动存档，已有自由模式存档继续保留。

## 剧情模式

《未写完的约定》已扩展为 1,111 个台词与事件节点、28 处分支选择、5 种关系结局及各自后日谈。故事从旧城最后一周延续到迁移后的生活，包含 46 个地点与时段组合。默认选择的一条完整路线有 853 次推进、约 2.27 万字对话和旁白；其他路线长度略有不同，这不是全部分支的总字数。

14 位模型娘各有一段带选择的专属事件，围绕夜宵、读书会、旧八音盒、套圈摊、修长椅、纸翼试飞、星图、舞台和私人来信展开。公共记忆展的筹备、雨夜转移档案、凌晨夜谈、展览开门把这些人重新聚在一起，之后会提起玩家之前的选择。普通完整路线中每位人物有 35 至 86 句对白，跨 16 至 24 个场景时段反复出现。DeepSeek 保留关系主线，其余人物获得独立事件和回收，尚非 14 条独立恋爱路线。

点击继续阅读，在分支处选择自己想说的话。好感、信任、隔阂和事件标记在后台随选择改变，后续台词与结局由实际经历决定。模式内提供逐字显示与文字速度、自动播放、对话回顾、三个手动存档、JSON 导入导出和重新开始。自动播放遇到选项会等待玩家，打开设置、对话回顾等面板时暂停推进。

剧情存档保存阅读路径，读取时重新核验并重放已经做过的选择；直接改写导出文件里的隐藏分数不会改变路线。损坏路径或其他模式的存档不会被静默当作新故事覆盖。剧情全程不调用图片或语言模型 API。

旧版 200 节点的自动存档和手动存档仍按原路线读取，保留当时的位置、选择与结局。体验全部扩展剧情时，可先手动保存旧进度，再在「剧情与显示设置 → 重新开始剧情」开启新篇；重新开始只替换当前剧情自动存档，手动存档与自由模式不受影响。新篇使用内容修订 2，随插件 `0.4.21` 发布。

## 自由模式

原有 DeepSeek 六幕样章作为「自由模式」保留。玩家自由输入文字，由宿主提供的真实模型先判断关系变化，再生成角色台词；两次调用使用当前选定的同一个模型。模式包含好感与信任增减、隔阂与修复、明确关系选择、四类结局、共同记忆、三个手动存档与 JSON 导入导出。接口失败时保留输入与原进度。

自由模式的「模型与显示设置」可选择宿主提供的模型。尚无模型时，先在宿主设置中配置可用模型。自由游戏不提交工作会话消息、不调用工作工具，也不改变原会话的模型选择。

## 画面与调试

两种模式的场景图片都按要求保留空白和文字描述，使用已有角色立绘及 DeepSeek 表情差分。对话框改用精细位图：DeepSeek 保留用户原框的艺术主体，另 13 位人物通过图片 API 生成各自的材质、徽章和边饰。图片由原 GAL 渲染器共用的 `DialogueBox` 呈现，设置内的「对话框图鉴」可以查看全部样式。原始素材继续保留，游戏运行时直接读取本地 WebP，不请求图片 API。详见 [对话框图片说明](output/imagegen/dialogue-frames/README.md) 和 [14 套对照图](output/imagegen/dialogue-frames/runtime-contact-sheet.png)。

普通游玩界面只呈现场景、角色、对话、剧情选项或自由输入与轻量菜单。好感、信任、隔阂、关系阶段、情绪标签、场景完成条件、进度和判定证据都在后台运行，不以数字、标签或进度条向玩家显示；角色的台词、态度与表情承载这些变化。回忆、对话历史、存档列表和结局呈现也不显示内部判定。

测试时可以在当前模式的设置中开启「开发调试」，查看后台状态面板。两种模式的开关都默认关闭，不写入存档或持久化设置；重新打开模式后需要重新开启。日常试玩保持关闭即可。导出的 JSON 是用于恢复进度的完整数据文件，仍包含内部状态，不是面向玩家的剧情回顾。

这仍是本地开发版本：关系阈值和剧情节奏需要继续试玩，模型判断也可能有偏差；开发者可通过调试状态核查这些问题。浏览器本地存档可以导出，不是跨设备云存档。

## 真实 Harness 开发环境

使用已安装宿主的 CLI 和独立 `DSH_HOME` 可以测试实际的插件加载、会话槽位、模型目录和 LLM 服务，而不替换日常 profile。

本地源码通过 `link:` 试装时，pnpm 不会自动提供所有宿主 peer 包。先将安装宿主中缺少的 `@deepseek-ai` 包链接到开发目录；此脚本只创建缺失链接，不覆盖现有依赖，不修改宿主目录或配置。链接均位于被 Git 忽略的 `node_modules`。

```powershell
node scripts/setup-harness-dev.mjs --host-node-modules 'F:\DeepSeek_harness\DSH Desktop\resources\app.asar.unpacked\node_modules'
$env:DSH_UI_PRIMITIVES_PATH = 'F:\DeepSeek_harness\DSH Desktop\resources\app.asar.unpacked\node_modules\@deepseek-ai\dsh-client-ui-primitives\lib\index.js'
pnpm build:client

$env:DSH_HOME = 'F:\codex\model-router-gal-preview\test-artifacts\dsh-host-home'
$galDshCli = 'F:\DeepSeek_harness\DSH Desktop\resources\app.asar.unpacked\node_modules\@deepseek-ai\dsh\lib\bin.js'
node $galDshCli plugin --profile web add 'link:F:\codex\model-router-gal-preview'
node $galDshCli --profile web --host 127.0.0.1 --port 0 --no-open
```

启动日志中的 Harness 地址包含临时认证信息，只用于打开自己的本地实例。隔离 home 不会自动读取日常 home 的模型密钥；只有自由模式需要在此 Harness 的模型设置中连接模型，剧情模式无需配置。重新构建后刷新客户端；修改宿主代码后重启这个测试进程。

当前本机已准备好完整隔离 profile，并保留日常宿主使用的 `@linxin666/dsh-web-all` 增强包。它提供现有 Ego Browser 所需的 `betterSidebar`；测试时不能为了绕过依赖而删去原有浏览器功能。

本次试玩使用真实 Harness Web 客户端，地址为 `http://127.0.0.1:55923`。认证入口可从 `test-artifacts/dsh-host2.log` 的 `dsh web:` 行取得。手动重新启动已准备的本机实例，可以运行：

```powershell
node scripts/start-harness-preview.mjs --host-node-modules 'F:\DeepSeek_harness\DSH Desktop\resources\app.asar.unpacked\node_modules' --model-credentials-file 'F:\DeepSeek_harness\.dsh\.credentials.yaml' --port 55923
```

该命令显式读取指定凭据文件中的 `refs.DEEPSEEK_API_KEY`，仅传入测试子进程内存，不复制凭据文件、不打印密钥。未传 `--model-credentials-file` 时不会读取该文件；只试玩剧情模式可以省略这一参数。请先关闭自己之前启动的测试进程，或使用其他空闲端口；本脚本不会终止已有进程。自由模式每轮通常调用模型两次，分别完成关系评估与台词生成；剧情模式不调用模型。

以上路径是当前机器示例，应按实际安装位置调整。直接打开桌面程序还会使用 Electron 自己的用户数据和单实例状态，不能仅凭 `DSH_HOME` 断言桌面窗口也完全隔离。

## 启动辅助独立预览

独立预览仅供开发时检查游戏内容；正式集成入口是 Harness 的「GAL视窗」内的「GAL游戏」标签。

需要 Node.js 22.19 或更新版本以及 pnpm。

```powershell
pnpm install --frozen-lockfile
pnpm preview:gal
```

启动后终端输出 `http://127.0.0.1:端口`。默认自动选择空闲端口；也可以用 `pnpm preview:gal --port 4317` 指定端口。服务仅监听本机回环地址。

打开页面后可以直接游玩剧情模式。要测试自由模式，在其模型设置中填写 OpenAI 兼容 API 的基础地址、模型名称和密钥，例如基础地址通常以 `/v1` 结尾。远程接口要求 HTTPS，本机接口可以使用 HTTP。自由模式的回复和关系判断均使用真实 API，未配置时不会生成模拟回复；剧情模式使用已经编写的台词与选项，不受这些配置影响。

也可以在启动前设置 `GAL_BASE_URL`、`GAL_MODEL` 和可选的 `GAL_API_KEY` 环境变量。预览不会读取其他软件的密钥文件，也不会把密钥写入磁盘或浏览器存储。页面中提交的配置仅保留在服务器内存，服务器重启后失效。游戏存档保存在当前浏览器的本地存储，清除浏览器数据会删除存档。

## 构建宿主插件

```powershell
pnpm build:client
pnpm check:client
pnpm test
```

构建默认使用相邻 `DSH-Desktop` 源码中的 UI 包；如果使用已安装的宿主，可以指定真实 UI 包入口：

```powershell
$env:DSH_UI_PRIMITIVES_PATH = 'F:\DeepSeek_harness\DSH Desktop\resources\app.asar.unpacked\node_modules\@deepseek-ai\dsh-client-ui-primitives\lib\index.js'
pnpm build:client
pnpm check:client
```

独立浏览器预览自带 React；宿主插件构建继续使用宿主的 React，避免重复实例。运行预览不会发布 npm、推送 GitHub 或替换日常使用的宿主插件。正式发布时使用同一份经验证的源码与 npm tarball，同步 GitHub 标签和 Release，保留所有旧版本。
