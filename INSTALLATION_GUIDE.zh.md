# DeepSeek Harness 插件安装完整教程

> 📦 从零开始，手把手教你安装 Model Router + GALGame 插件

---

## 📋 目录

1. [前置要求](#1-前置要求)
2. [下载插件](#2-下载插件)
3. [安装插件](#3-安装插件)
4. [配置 DeepSeek](#4-配置-deepseek)
5. [验证安装](#5-验证安装)
6. [启动使用](#6-启动使用)
7. [常见问题](#7-常见问题)

---

## Watcher 工作路径与用量统计

0.4.26 聚合包自动安装 `@ljwei-stak/dsh-watcher-for-mrg@0.4.0`。重启后，在普通
对话或 GAL 工作会话的原生标题栏点击眼睛按钮，可查看工作路径、工具执行和模型用量；
设置中的 Watcher 页面提供本地会话汇总。`/router watcher` 可检查当前会话投影是否
加载。此功能不改变模型路由和审批规则，也不额外发起模型请求。

同一配置只保留一个 Watcher 实例。安装 Router 前先执行 `dsh plugin list`；若列表中
有独立安装的上游 `dsh-watcher` 或 `@ljwei-stak/dsh-watcher-for-mrg`，按实际包名执行
`dsh plugin remove dsh-watcher` 或
`dsh plugin remove @ljwei-stak/dsh-watcher-for-mrg`。然后再安装 Router 聚合包，避免
重复 loader ID。详情见 [Watcher 项目](https://github.com/ljwei-stak/dsh-watcher-For_MRG)。

## PPT 生成扩展

从 0.4.22 起，Router 聚合包自动安装并加载 PPT Master；当前 0.4.26 固定使用 `@ljwei-stak/ppt-master-for-mgr@6.3.2`，修复 Python 3.13 及更新版本在 Windows DSH 沙箱中导出 PPTX 时的临时目录权限错误。制作 PPT 时使用普通工作会话或 GAL 工作会话，在代理预设中启用 DSH 原生 `skill`、文件和终端工具，并在实际执行环境中安装 Python 3.10+；继续保留宿主沙箱和审批设置。

```sh
npx --yes --package=@ljwei-stak/ppt-master-for-mgr@6.3.2 ppt-master-for-mgr doctor
npx --yes --package=@ljwei-stak/ppt-master-for-mgr@6.3.2 ppt-master-for-mgr setup
npx --yes --package=@ljwei-stak/ppt-master-for-mgr@6.3.2 ppt-master-for-mgr doctor
```

`setup` 主动运行 pip 安装依赖，npm 安装本身不会安装 Python 依赖。指定解释器时为命令添加 `--python <解释器绝对路径>`，也可使用 `PPT_MASTER_PYTHON`；工作代理需使用相同解释器。随后在可写工作目录中请求“使用 ppt-master 生成 PPTX”，确认模型通过原生 `skill` 加载 `ppt-master` 后生成并检查文件。剧情模式和自由模式的角色对话不承担 PPT 工作流。完整配置与可选功能要求见 [README 的 PPT 安装步骤](README.zh.md#4-准备-ppt-生成环境) 和 [PPT Master 项目](https://github.com/ljwei-stak/ppt-master-for-MGR)。

## 1. 前置要求

### ✅ 确认 DeepSeek Harness 已安装

```bash
# 检查 Harness 版本
dsh version

# 预期输出示例：
# 已验证：@deepseek-ai/dsh 0.1.2-rc.1；桌面端使用 DSH Desktop 2.0.7+
```

**如果未安装 Harness**，请先安装：

#### Windows 安装

```powershell
# 方法1: 使用官方安装器
# 从 DeepSeek 官网下载 Harness 安装包
# https://platform.deepseek.com/harness

# 方法2: 使用命令行（需要管理员权限）
winget install DeepSeek.Harness
```

#### macOS 安装

```bash
# 方法1: 使用 Homebrew
brew install deepseek-harness

# 方法2: 手动下载安装包
# 从官网下载 .dmg 文件并安装
```

#### Linux 安装

```bash
# 方法1: 使用包管理器
curl -fsSL https://platform.deepseek.com/install.sh | sh

# 方法2: 下载二进制文件
wget https://platform.deepseek.com/releases/harness-linux-x64.tar.gz
tar -xzf harness-linux-x64.tar.gz
sudo mv dsh /usr/local/bin/
```

### ✅ 确认网络连接

插件需要联网获取 LiveBench 评分数据（可选）。

### ✅ 准备 DeepSeek API Key（推荐）

仅游玩 **“GAL视窗 → GAL游戏 → 剧情模式”** 时不需要 API Key；以下模型配置用于 AI 对话、路由与自由模式，也可以使用宿主支持的其他模型厂商。

1. 访问 https://platform.deepseek.com
2. 注册/登录账号
3. 在"API Keys"页面创建新的 API Key
4. 复制保存（后续配置时使用）

---

## 2. 下载插件

### 方法1: npm registry 安装（推荐）

插件已经发布为公开 npm 包。直接安装时不需要克隆仓库：

```powershell
pnpm config set registry https://registry.npmjs.org/
pnpm dsh plugin --profile web add @ljwei-stak/model-router-galgame@0.4.26
pnpm dsh plugin --profile desktop add @ljwei-stak/model-router-galgame@0.4.26
```

### 方法2: Git 克隆（仅源码开发）

```bash
# 克隆插件仓库
git clone https://github.com/ljwei-stak/model-router-galgame.git

# 进入插件目录
cd model-router-galgame
```

### 方法3: 下载压缩包（仅源码开发）

1. 访问项目 GitHub Release 页面
2. 下载最新版本的 `model-router-galgame.zip`
3. 解压到本地目录

```bash
# Windows (使用 PowerShell)
Expand-Archive -Path model-router-galgame.zip -DestinationPath C:\harness-plugins\

# macOS/Linux
unzip model-router-galgame.zip -d ~/harness-plugins/
cd ~/harness-plugins/model-router-galgame
```

### 方法4: 直接使用现有目录（仅源码开发）

如果你已经有插件文件（如本次适配工作的目录）：

```bash
# 假设插件在 F:\DeepSeek_harness\model-router-galgame
cd F:\DeepSeek_harness\model-router-galgame
```

---

## 3. 安装插件

### 步骤1: 确认插件目录结构

确保目录包含以下关键文件：

```
model-router-galgame/
├── package.json          ✅ 必需
├── .dsh-plugin/         ✅ 必需
│   ├── index.mjs
│   ├── client.js
│   └── shared/
├── aipicture/           源码开发用原始立绘；npm 包已内嵌到 client.js
├── output/imagegen/     源码开发用表情与对话框；npm 包已内嵌到 client.js
├── cordis.patch.yml
└── README.md
```

### 步骤2: 执行安装命令

插件已发布到 npm，直接使用公开包名安装（推荐）：

```powershell
pnpm config set registry https://registry.npmjs.org/
pnpm dsh plugin --profile web add @ljwei-stak/model-router-galgame@0.4.26
pnpm dsh plugin --profile desktop add @ljwei-stak/model-router-galgame@0.4.26
```

其中 `@0.4.26` 可以替换为通过 `npm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/` 查询到的版本号。官方 ModLens、审批门控、ModSearch、Ego Browser、PPT Master 和 Watcher 依赖会自动解析；PPT 的 Python 依赖另按本指南开头步骤配置。

如果正在本地开发，再使用目录安装：

```bash
# 进入插件目录
cd /path/to/model-router-galgame

# 安装插件到 Web profile
dsh plugin --profile web add .

# 如果使用绝对路径
dsh plugin --profile web add /path/to/model-router-galgame
```

**预期输出**：
```
✓ Plugin '@ljwei-stak/model-router-galgame' added to profile 'web'
```

### 步骤3: 验证插件已安装

```bash
# 列出已安装的插件
dsh plugin --profile web list

# 预期输出包含：
# @ljwei-stak/model-router-galgame@0.4.26
```

### 步骤4: 重启 Harness

```bash
# 停止 Harness
dsh stop

# 启动 Harness
dsh start

# 或者一步重启
dsh restart
```

**等待启动完成**（约10-30秒）

---

## 4. 配置 DeepSeek

### 步骤1: 打开 Harness 设置

1. 启动 Harness 后，打开浏览器访问 `http://localhost:3000`（默认地址）
2. 点击右上角 **设置** 图标（齿轮⚙️）
3. 进入 **LLM** → **Providers** 页面

### 步骤2: 添加 DeepSeek Provider

点击 **Add Provider** 按钮，填写以下信息：

```yaml
# Provider 配置
ID: deepseek
Name: DeepSeek
Type: openai-compatible  # 或者选择 deepseek

# API 配置
API Key: sk-your-api-key-here  # 粘贴你的 API Key
Base URL: https://api.deepseek.com  # 或你的中转地址

# 模型配置（点击 Add Model 添加）
Models:
  - ID: deepseek-chat
    Name: DeepSeek V3
    Type: chat
  
  - ID: deepseek-reasoner
    Name: DeepSeek R1
    Type: chat
```

**配置截图参考**：
```
┌──────────────────────────────────────┐
│ Provider ID: deepseek                │
│ Provider Name: DeepSeek              │
│ API Key: sk-*********************    │
│ Base URL: https://api.deepseek.com  │
│                                      │
│ Models:                              │
│ ┌──────────────────────────────────┐│
│ │ • deepseek-chat                  ││
│ │ • deepseek-reasoner              ││
│ └──────────────────────────────────┘│
│                                      │
│ [Save] [Cancel]                      │
└──────────────────────────────────────┘
```

### 步骤3: 保存配置

点击 **Save** 按钮保存配置。

### 步骤4: 测试连接

```bash
# 测试模型是否可用
dsh model list --provider deepseek

# 预期输出：
# deepseek/deepseek-chat
# deepseek/deepseek-reasoner
```

或者在 Web 界面：
1. 创建新对话
2. 模型选择器中应该能看到 DeepSeek 模型
3. 发送测试消息："你好"

---

## 5. 验证安装

### ✅ 检查1: 插件是否加载

打开浏览器开发者工具（F12），查看 Console：

**预期输出**（无错误）：
```
[model-router] Plugin loaded successfully
[model-router] Discovered 2 models
```

**如果有错误**：参见[常见问题](#7-常见问题)

### ✅ 检查2: GAL 界面是否显示

在已有会话中打开 **“GAL视窗”**。进入 **“GAL游戏”** 后，可切换“剧情模式”和“自由模式”；原有会话与场景编辑入口仍可使用。

- 剧情模式使用固定中文剧本与选项，无需模型 API。扩展故事有 1,111 个节点、28 处选择、14 位模型娘的角色事件、5 个结局及 5 条后日谈。
- 自由模式允许玩家自行打字，使用宿主中已配置的模型回应；好感度和信任既会增加也会降低，正常游玩不显示数值与后台判定。
- 14 位角色各有独立美术对话框；DeepSeek 带五种生成表情差分。素材已经打包，游玩无需配置图片 API，场景仍使用空白与描述占位。
- 剧情设置提供存档、导入/导出及“重新开始剧情”。两个模式的存档分开保存；旧短篇存档继续原路线，请先存档或导出，再重新开始以体验扩展篇。

创建新对话后，应该看到：
- ✅ 模型娘立绘（右侧或底部）
- ✅ 对话框带有模型娘名牌
- ✅ 打字机效果

**对比截图**：

```
未安装插件：
┌─────────────────────────┐
│ 标准对话框              │
│ ┌─────────────────────┐ │
│ │ User: 你好          │ │
│ │ Assistant: 你好！   │ │
│ └─────────────────────┘ │
└─────────────────────────┘

安装插件后：
┌─────────────────────────┬─────────┐
│ 对话框                  │ 立绘    │
│ ┌─────────────────────┐ │ ┌─────┐│
│ │ 主人: 你好          │ │ │ 🐋  ││
│ │                     │ │ │     ││
│ │ DeepSeek·小鲸鱼:    │ │ │     ││
│ │ 你好！先把问题列... │ │ └─────┘│
│ └─────────────────────┘ │         │
└─────────────────────────┴─────────┘
```

### ✅ 检查3: 路由功能是否正常

在对话框输入命令：

```bash
/router plan
```

**预期输出**（JSON格式）：
```json
{
  "mode": "collective",
  "complexity": { "value": 0, "band": "simple" },
  "taskType": "general",
  "candidates": [...],
  "selected": null
}
```

### ✅ 检查4: 运行完整测试

```bash
# 进入插件目录
cd /path/to/model-router-galgame

# 安装测试依赖（首次运行）
npm install

# 运行测试套件
npm test

# 预期输出：
# ✓ 21+ tests passed
```

---

## 6. 启动使用

### 🎮 基础使用

#### 1. 创建新对话

点击 Harness 界面的 **New Chat** 按钮。

#### 2. 选择模式

```bash
# 集体协作模式（默认，推荐）
/router mode collective

# 单独会话模式（手动选择模型）
/router mode single
```

#### 3. 开始提问

```
你好！请介绍一下你自己
```

插件会：
- 自动分析任务类型
- 选择最优模型
- 以模型娘角色回答
- 显示对应立绘

#### 4. 查看路由分析

```bash
/router plan
```

查看插件的路由决策细节。

### 🎯 典型场景示例

#### 场景1: 代码调试

```python
这段代码有问题，帮我找出来：

def add(a, b):
    return a + b
    print("Done")  # 这行永远不会执行
```

**插件行为**：
- 任务类型：`code`
- 复杂度：`simple`
- 选择模型：DeepSeek（code专长）
- 表达风格：推理研究员·小鲸鱼

#### 场景2: 系统设计（复杂任务）

```
设计一个电商网站的后端架构，包括：
1. 用户系统
2. 商品管理
3. 订单处理
4. 支付集成
```

**插件行为**：
- 任务类型：`code`
- 复杂度：`complex`
- 启动协作模式：
  - 阶段1: 问题建模
  - 阶段2: 架构设计
  - 阶段3: 风险评估
  - 阶段4: 方案整合

#### 场景3: 简单翻译

```
翻译成英文：今天天气真好
```

**插件行为**：
- 任务类型：`general`
- 复杂度：`simple`
- 选择模型：DeepSeek Flash（低成本）
- 费用：~$0.00001

---

## 7. 常见问题

### ❌ 问题1: 插件未加载

**症状**：
- 界面没有变化
- 没有模型娘立绘
- `/router` 命令无响应

**排查步骤**：

```bash
# 1. 确认插件已安装
dsh plugin --profile web list
# 应该能看到 model-router-galgame

# 2. 检查 Harness 日志
dsh logs

# 查找错误信息，例如：
# [ERROR] Failed to load plugin: model-router-galgame

# 3. 检查插件目录权限
ls -la /path/to/model-router-galgame
# 确保文件可读

# 4. 从 npm registry 重新安装插件
pnpm config set registry https://registry.npmjs.org/
dsh plugin --profile web remove @ljwei-stak/model-router-galgame
dsh plugin --profile web add @ljwei-stak/model-router-galgame@latest
dsh restart
```

### ❌ 问题2: 立绘不显示

**症状**：
- 对话框样式正常
- 但没有模型娘图片

**解决方案**：

```bash
# 1. 检查图片文件
ls aipicture/*.png
# 应该有 DeepSeek1.png, ChatGPT1.png 等14个文件

# 2. 检查浏览器控制台
# 打开 F12 → Network 标签页
# 查找图片加载失败的请求（404错误）

# 3. 重新构建客户端
cd /path/to/model-router-galgame
npm run build:client
dsh restart

# 4. 清除浏览器缓存
# Ctrl+Shift+Delete → 清除缓存
```

### ❌ 问题3: DeepSeek 模型不可用

**症状**：
- 插件正常加载
- 但路由器没有选择 DeepSeek

**排查步骤**：

```bash
# 1. 验证模型可见
dsh model list --provider deepseek

# 如果为空，检查 provider 配置

# 2. 测试 API Key
curl https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer sk-your-api-key"

# 应该返回模型列表

# 3. 检查 provider 配置
# 在 Harness 设置中确认：
# - API Key 正确
# - Base URL 正确
# - 模型 ID 正确（deepseek-chat）

# 4. 查看路由日志
dsh logs | grep "model-router"
# 查找 "model discovery" 相关消息
```

### ❌ 问题4: 路由决策异常

**症状**：
- 简单任务却选择了昂贵模型
- 或者完全没有选择模型

**排查步骤**：

```bash
# 1. 查看详细路由方案
/router plan

# 检查输出：
# - taskType: 是否正确识别任务类型
# - complexity: 是否合理评估复杂度
# - candidates: 是否有可用候选
# - selected: 是否有选中的模型

# 2. 检查 LiveBench 状态
# 在路由方案的 optimization.liveBench 字段：
# - fetchedAt: 是否成功刷新
# - error: 是否有错误信息

# 3. 手动触发刷新
# 重启 Harness 会重新获取 LiveBench 数据
dsh restart

# 4. 使用本地评分
# 如果 LiveBench 持续失败，插件会自动使用实验基线
# 这是正常的降级行为
```

### ❌ 问题5: npm test 失败

**症状**：
- 运行测试时报错

**解决方案**：

```bash
# 1. 安装依赖
npm install

# 2. 检查 Node.js 版本
node --version
# 需要 v18.0.0 或更高版本

# 3. 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install

# 4. 单独运行测试文件定位问题
node --test tests/router.test.mjs
```

### ❌ 问题6: 性能问题

**症状**：
- 响应缓慢
- 界面卡顿

**优化方案**：

```bash
# 1. 降低 LiveBench 刷新频率
# 在 Model Router 设置中：
liveBenchTtlMs: 1800000  # 30分钟

# 2. 减少日志输出
# 在 Harness 配置中：
logLevel: "warn"  # 只输出警告和错误

# 3. 使用本地 LiveBench 镜像
# 如果网络慢，使用缓存的快照
liveBenchEndpoint: "file:///path/to/local-snapshot.json"

# 4. 禁用协作模式（如不需要）
/router mode single
```

---

## 8. 高级配置（可选）

### 配置价格与预算

在 Harness 设置 → Model Router：

```yaml
pricing:
  deepseek-chat:
    input: 0.14
    output: 0.28
    cacheRead: 0.014
    cacheWrite: 0.028
    currency: "USD"

budgetUsd: 0.01  # 单任务预算上限
cacheReadRatio: 0.3  # 假设30%缓存命中
cacheWriteRatio: 0.1
```

### 自定义 LiveBench 端点

```yaml
# 使用镜像加速
liveBenchEndpoint: "https://your-mirror.com/livebench.json"

# 或使用本地文件
liveBenchEndpoint: "file:///path/to/snapshot.json"
```

### 调整路由权重

编辑 `.dsh-plugin/shared/router.mjs`：

```javascript
export const OBJECTIVE_WEIGHTS = Object.freeze({
  simple: { 
    quality: 0.20,   // 降低质量权重
    cost: 0.70,      // 提高成本权重
    latency: 0.06, 
    specialty: 0.02, 
    risk: 0.02 
  },
  // ... balanced, complex
})
```

保存后重启 Harness。

---

## 9. 卸载插件（如需要）

```bash
# 1. 移除插件
dsh plugin --profile web remove @ljwei-stak/model-router-galgame

# 2. 重启 Harness
dsh restart

# 3. 删除插件文件（可选）
rm -rf /path/to/model-router-galgame
```

---

## 10. 更新插件与完整客户端

### 设置页更新控件

插件和 DSH Desktop 使用不同的版本号与发布渠道，设置页不再把两者视为同一个 Release：

| 控件 | 更新来源与行为 |
|------|----------------|
| **检查更新** | 独立检查 npm 官方 registry 上的 `@ljwei-stak/model-router-galgame` 和 [`anywhere-labs/dsh-desktop` 最新 Release](https://github.com/anywhere-labs/dsh-desktop/releases)。其中一项检查失败时，另一项结果仍然有效。 |
| **仅从 npm 更新插件** | DSH Desktop 先解析 npm `latest`，再在当前 profile 中以 `--save-exact` 添加解析出的 `@ljwei-stak/model-router-galgame@<确切版本>`，并指定 `https://registry.npmjs.org/`。完成后完全退出并重启 DSH Desktop。 |
| **仅更新完整客户端** | 调用 DSH Desktop 原生更新器检查并安装官方客户端 Release，不会顺带安装或替代 npm 插件。 |
| **一键更新插件与客户端** | 按需先安装 npm 插件，再调用完整客户端原生更新；两项都可用时两项都会执行。 |
| **查看 npm 包 / 客户端 Releases** | 分别打开 [插件 npm 页面](https://www.npmjs.com/package/@ljwei-stak/model-router-galgame) 和 [官方客户端 Releases](https://github.com/anywhere-labs/dsh-desktop/releases)。纯网页环境不能写入本机时也使用这两个入口。 |

`ljwei-stak/deepseek-harness` Release 不再是插件或完整客户端的统一更新源，完整客户端安装包也不代表已经包含同版本插件。

### 命令行从 npm registry 更新插件（推荐）

```powershell
pnpm config set registry https://registry.npmjs.org/
pnpm dsh plugin --profile web update @ljwei-stak/model-router-galgame
pnpm dsh plugin --profile desktop update @ljwei-stak/model-router-galgame
pnpm dsh --profile web --dump-config | Select-String "model-router-galgame|dsh-approval-gate"
```

### Git 更新插件（仅源码开发）

```bash
cd /path/to/model-router-galgame
git pull origin main
dsh plugin --profile web add .
dsh restart
```

### 手动更新插件

1. 下载新版本
2. 备份旧版本配置
3. 卸载旧插件
4. 安装新插件
5. 恢复配置

---

## 11. 获取帮助

### 📖 文档资源

- **快速入门**: `QUICK_START.zh.md`
- **完整报告**: `DEEPSEEK_ADAPTATION_REPORT.md`
- **优化建议**: `MODEL_OPTIMIZATION.md`
- **文档索引**: `ADAPTATION_INDEX.md`

### 🐛 问题反馈

- **GitHub Issues**: (项目仓库地址)
- **DeepSeek 社区**: https://platform.deepseek.com/community
- **邮件支持**: support@example.com

### 💬 社区讨论

- Discord: (社区链接)
- QQ群: (群号)
- 微信群: (添加方式)

---

## 12. 总结

### ✅ 安装完成检查清单

- [ ] 已安装 DSH Desktop 2.0.7+，或已验证的 `@deepseek-ai/dsh@0.1.2-rc.1`
- [ ] 已从 npm registry 安装 `@ljwei-stak/model-router-galgame`
- [ ] 插件已通过 `dsh plugin --profile <name> add` 安装
- [ ] Harness 已重启
- [ ] DeepSeek provider 已配置
- [ ] API Key 已添加
- [ ] 模型已添加（deepseek-chat等）
- [ ] 浏览器能看到模型娘立绘
- [ ] `/router plan` 命令有响应
- [ ] 测试对话正常工作

### 🎉 恭喜！

如果以上清单全部完成，你已经成功安装了 Model Router + GALGame 插件！

**下一步**：
1. 阅读 `QUICK_START.zh.md` 了解基本用法
2. 尝试不同的任务场景
3. 查看 `大模型娘人物设定.md` 了解角色
4. 探索高级配置选项

**祝你使用愉快！** 🚀

---

**文档版本**: 1.0  
**更新日期**: 2026-09-01  
**适用插件版本**: 0.4.26
**已验证宿主版本**: DSH Desktop 2.0.7 / `@deepseek-ai/dsh@0.1.2-rc.1`
