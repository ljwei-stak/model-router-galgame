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

## 1. 前置要求

### ✅ 确认 DeepSeek Harness 已安装

```bash
# 检查 Harness 版本
dsh version

# 预期输出示例：
# DeepSeek Harness v0.4.8 或更高版本
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

1. 访问 https://platform.deepseek.com
2. 注册/登录账号
3. 在"API Keys"页面创建新的 API Key
4. 复制保存（后续配置时使用）

---

## 2. 下载插件

### 方法1: Git 克隆（推荐）

```bash
# 克隆插件仓库
git clone https://github.com/your-repo/model-router-galgame.git

# 进入插件目录
cd model-router-galgame
```

### 方法2: 下载压缩包

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

### 方法3: 直接使用现有目录

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
├── aipicture/           ✅ 必需（立绘资源）
├── cordis.patch.yml
└── README.md
```

### 步骤2: 执行安装命令

如果插件已经发布到 npm，直接使用包名安装：

```powershell
pnpm dsh plugin --profile web add @ljwei-stak/model-router-galgame@0.4.10
pnpm dsh plugin --profile desktop add @ljwei-stak/model-router-galgame@0.4.10
```

其中 `@0.4.10` 可以替换为目标版本号。官方 ModLens 依赖会自动解析，无需另行安装。

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
✓ Plugin 'model-router-galgame' added to profile 'web'
```

### 步骤3: 验证插件已安装

```bash
# 列出已安装的插件
dsh plugin --profile web list

# 预期输出包含：
# model-router-galgame@0.4.10
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

# 4. 重新安装插件
dsh plugin --profile web remove model-router-galgame
dsh plugin --profile web add /path/to/model-router-galgame
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
dsh plugin --profile web remove model-router-galgame

# 2. 重启 Harness
dsh restart

# 3. 删除插件文件（可选）
rm -rf /path/to/model-router-galgame
```

---

## 10. 更新插件

### 方法1: Git 更新

```bash
cd /path/to/model-router-galgame
git pull origin main
dsh restart
```

### 方法2: 手动更新

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

- [ ] DeepSeek Harness 已安装（v0.4.8+）
- [ ] 插件已下载到本地
- [ ] 插件已通过 `dsh plugin add` 安装
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
**适用插件版本**: 0.4.10  
**适用 Harness 版本**: 0.4.8+
