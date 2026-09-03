# GAL 视图功能测试报告

## 环境信息

- Harness 版本：`0.1.2-alpha.2-254d213`（页面显示版本）
- Harness 路径：`F:\DeepSeek_harness\DSH-Desktop`
- 插件版本：`0.4.10`
- 插件运行目录：`F:\DeepSeek_harness\model-router-galgame`
- 操作系统：Windows 10.0.26200
- PowerShell：7.6.4
- Node.js：v24.20.0
- pnpm：11.7.0
- 浏览器：Codex In-app Browser（Chromium-backed）
- Harness 地址：`http://127.0.0.1:3080/`（报告不记录认证参数）
- Harness 进程：PID `11804`
- 测试日期：2026-09-01
- 测试执行者：Codex / AI Agent

## 测试结果摘要

| 阶段 | 结果 | 说明 |
|---|---|---|
| 阶段1 环境验证 | ✅ 通过 | 关键文件、进程、端口和插件界面均正常 |
| 阶段2 前端功能 | ✅ 通过 | 模型、发送、会话更新、历史和 `dialogue-text` 均验证 |
| 阶段3 后端集成 | ⚠️ 部分通过 | UI 真实请求完成模型回复；未伪造或猜测原始 API 请求 |
| 阶段4 数据流追踪 | ✅ 通过 | `useChat().legacy`、输入机、归一化和渲染链路已修复并验证 |
| 阶段5 修复流程 | ✅ 完成 | 对应 P0/P1/P2 问题已修复 |
| 阶段6 完整性验证 | ✅ 通过 | 37/37 自动化测试通过，主要 GAL 交互通过 |

## 阶段1：环境验证

### 1.1 插件安装状态

以下文件均存在：

- `.dsh-plugin/index.mjs`
- `.dsh-plugin/client.js`
- `.dsh-plugin/client/GalView.jsx`
- `gal-scene.json`
- `aipicture/DeepSeek1.png` 及场景内嵌素材

### 1.2 Harness 运行状态

- Node 进程 PID `11804` 正在运行。
- `127.0.0.1:3080` 页面可访问，GAL 视图正常加载。
- 启动日志只有正常的 `dsh web` 启动命令，没有新的启动异常。

### 1.3 插件加载状态

页面显示“GAL 视窗”、模型路由任务栏、DeepSeek 娘立绘和 GAL 输入区，说明插件客户端已加载。当前页面控制台错误/警告读取结果为空。

## 阶段2：前端功能测试

### 2.1 模型配置检查

验证结果：✅

- GAL 路由摘要显示当前模型 `deepseek-v4-pro`。
- 模型状态区域显示 `DeepSeek`，并显示本轮计价信息。
- 真实发送消息后模型成功返回，说明当前 provider/model 配置可用。
- 本次测试没有修改 API key、provider 地址或其他凭据配置。

### 2.2 消息发送流程检查点

测试消息：`你好`

#### 检查点 A：前端发送

- 发送按钮从禁用变为可用。
- 点击后宿主输入机提交成功。
- 收到模型回复并刷新 GAL 台词区。
- 由于浏览器控制层无法稳定导出原始 XHR/WebSocket 记录，本报告不臆造具体请求 URL。

#### 检查点 B：输入框状态

- 发送瞬间：输入框值为 `""`。
- 等待约 10 秒、回复完成后：输入框值仍为 `""`，控件保持可用。
- 该结果覆盖了本次修复的本地草稿/宿主草稿异步回写竞态。

#### 检查点 C：会话状态更新

- 左侧会话条目由旧时间更新为“刚刚”。
- GAL 台词区由旧欢迎语更新为本轮模型回复。
- 路由任务栏显示 `deepseek-v4-pro` 且协作流程完成。

#### 检查点 D：历史记录

- 点击“日志”后成功打开“对话历史”面板。
- 面板同时显示用户 `你好` 和 DeepSeek 娘回复。
- 历史内容包含路由分析与 Persona 上下文，说明消息已经进入 Harness 会话记录。

### 2.3 场景配置检查

编辑模式结果：✅

- 场景共显示 10 个元素。
- 存在 `type: "dialogue-text"` 的“台词”元素。
- `hidden: false`
- `x: 364`
- `y: 788`
- `w: 1288`
- `h: 172`
- `opacity: 1`
- `z: 21`

元素位于 `1920×1080` 舞台的可见区域，且游戏模式中可实际显示模型回复。

### 2.4 路由器状态

已验证：

- `/router plan`：返回路由分析上下文。
- `/router mode collective`：切换为集体合作模式。
- `/router mode single`：切换为单独模式。
- 复杂任务“设计一个电商系统架构”触发路由分析，页面显示协作流程完成。

## 阶段3：后端集成测试

### 3.1 API 连接

通过 UI 集成结果间接验证：浏览器发送消息后，Harness 收到请求并返回模型回复，随后更新会话、历史和 GAL 舞台。

### 3.2 直接 API 调用

状态：⚠️ 未单独执行。

原因：文档给出的 `/api/models`、`/api/chat` 是通用示例，当前 Harness 使用的实际认证与会话传输由宿主输入机/连接层管理；浏览器控制层不能可靠导出原始请求记录。为避免把猜测的端点、请求体或认证 token 写入报告，本次以真实 UI 端到端调用作为集成证据。

## 阶段4：数据流追踪

已完成的代码级修复：

1. `GalView.jsx` 从 `useChat().legacy` 读取节点、流式内容和运行调用。
2. `useSession` 仅负责生命周期状态，避免把生命周期快照误当作聊天节点。
3. `normalizeNodes()` 统一保护空会话和异常节点值。
4. `SafeMarkdownText` 保护流式 Mermaid/fenced Markdown 渲染。
5. 本地草稿和宿主草稿通过等待确认引用同步，避免发送后被旧宿主值覆盖。
6. 日志按钮提高层级并修正命中区域，避免被 Harness 拖拽层拦截。

自动验证：

```text
npm test
ℹ tests 37
ℹ pass 37
ℹ fail 0

npm run check:client
[build-client] OK
```

## 阶段5：问题清单与修复结果

### 问题1：空会话打开 GAL 视图崩溃（P0）

- 症状：`undefined.length`，GAL 视图无法加载。
- 根因：会话初始化时节点列表暂时缺失，多个下游逻辑直接访问 `nodes.length`。
- 修复：入口归一化节点，增加空会话回归测试。
- 状态：✅ 已解决。

### 问题2：GAL 视图显示但消息功能未启用（P1）

- 症状：输入框、历史和台词没有随普通对话同步。
- 根因：GAL 读取了错误的会话层数据源。
- 修复：改用 `useChat().legacy`，发送走宿主 `inputActions.submit()`。
- 状态：✅ 已解决。

### 问题3：发送后输入框被旧草稿回写（P1）

- 症状：发送后输入框偶发重新出现刚发送的内容。
- 根因：宿主草稿异步更新晚于本地清空操作。
- 修复：增加 `draftRef` 和宿主草稿确认门控。
- 状态：✅ 已解决，发送后立即为空且回复完成后仍为空。

### 问题4：对话框/台词不显示（P1）

- 症状：消息已经返回，但场景没有文本区域。
- 检查结果：`dialogue-text` 存在且可见，位置和尺寸有效。
- 修复：统一场景元素查找与空值保护；不需要修改用户场景坐标。
- 状态：✅ 已解决并验证。

### 问题5：历史按钮不可点击（P2）

- 症状：顶部“日志”按钮被右侧拖拽层拦截。
- 修复：调整按钮层级和命中区域。
- 状态：✅ 已解决，历史面板可打开。

### 问题6：流式 Markdown 可能让 GAL 渲染崩溃（P2）

- 症状：未闭合代码围栏或 Mermaid 流式内容可能触发宿主 Markdown 渲染异常。
- 修复：`SafeMarkdownText` 捕获渲染异常并回退为纯文本。
- 状态：✅ 已解决并有自动化测试覆盖。

### 问题7：Windows 构建找不到 esbuild 或宿主 primitives（P2）

- 症状：客户端构建在 Windows/pnpm 布局下不稳定。
- 修复：增强原生二进制解析和宿主 UI primitives alias。
- 状态：✅ 已解决，构建和一致性检查通过。

## 控制台日志

历史错误证据：

```text
TypeError: Cannot read properties of undefined (reading 'length')
at GalView (client.js:60644:1)
```

修复后当前页面控制台读取结果：

```text
error/warn/debug entries: none
```

Harness 启动日志只确认了正常启动命令；其中可能包含认证地址，本报告不复制该地址。

## 网络请求

- 真实 UI 消息发送、模型回复和会话更新已通过端到端行为确认。
- 浏览器控制层无法可靠访问 `window.performance` 或导出原始 XHR/WebSocket 明细。
- 因此没有虚构 `/api/chat`、`/api/models` 的请求 URL、请求体、状态码或响应体。
- 直接 API 调用保留为人工 DevTools 复测项，需在用户自己的已认证浏览器中查看 Network 面板后记录。

## 截图

### GAL 游戏模式（发送后）

![GAL 游戏模式发送后](F:/DeepSeek_harness/model-router-galgame/test-artifacts/gal-view-after-send.png)

### 对话历史面板

![对话历史面板](F:/DeepSeek_harness/model-router-galgame/test-artifacts/history-dialog.png)

### 编辑模式与 dialogue-text 属性

![编辑模式 dialogue-text](F:/DeepSeek_harness/model-router-galgame/test-artifacts/edit-mode-dialogue-text.png)

## 建议

1. 发布前在普通 Chrome/Edge DevTools 中补录一次 Network 面板，确认宿主当前版本使用的具体连接协议；不要在报告中记录认证 token。
2. 将 `npm test` 和 `npm run check:client` 纳入插件发布前检查。
3. 保留空会话、流式 Markdown 和草稿竞态回归测试，避免后续切换 Harness API 时复发。
4. 用户修改场景时继续保持 `dialogue-text` 可见，并确保其位于对话框元素之上。

## 最终结论

GAL 视图的核心功能已经恢复并完成验证：模型配置有效、消息可发送、会话和历史会更新、模型回复可显示在台词区、路由命令可用、编辑模式可检查场景元素。自动化测试 37/37 通过，Harness 当前运行正常。

唯一未独立完成的是通用文档示例中的直接 API 请求抓包；这是浏览器控制层和 Harness 认证/传输实现的限制，不是已观察到的插件故障。

**测试完成时间**：2026-09-01 19:06（UTC+08:00）

**测试执行者**：Codex / AI Agent
