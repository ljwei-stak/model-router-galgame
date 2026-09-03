# GAL 视窗问题排查指南

## 问题分析

根据你的截图，我看到：
✅ GAL 界面已经显示（有模型娘立绘）
✅ 对话框正常渲染
✅ 底部输入框可见

但可能遇到的问题：

---

## 可能的问题1: 对话框内容被遮挡

### 症状
- 界面显示正常
- 但对话内容看不清或被模糊

### 解决方案

1. **调整窗口大小**
   - 尝试拖动浏览器窗口边缘
   - 或按 F11 进入全屏模式

2. **检查浏览器缩放**
   - 按 `Ctrl + 0` 重置缩放到 100%
   - 或按 `Ctrl + 鼠标滚轮` 调整

3. **刷新页面**
   - 按 `F5` 或 `Ctrl + R`
   - 或硬刷新：`Ctrl + Shift + R`

---

## 可能的问题2: GAL 视图标签不可点击

### 症状
- "对话"、"GAL视图"、"财务状况" 等标签无法切换

### 解决方案

**检查是否有模型在运行**：
- 如果模型正在生成回复，界面可能暂时锁定
- 等待模型回复完成后再尝试切换

**检查浏览器控制台错误**：
```bash
# 按 F12 打开开发者工具
# 切换到 Console 标签页
# 查看是否有红色错误信息
```

**如果看到错误**，可能的修复：
1. 清除浏览器缓存：`Ctrl + Shift + Delete`
2. 重启 Harness：`dsh restart`
3. 重新安装插件

---

## 可能的问题3: 对话历史无法显示

### 症状
- 新建对话后，GAL 视图是空白的
- 或者对话发送后没有反应

### 解决方案

1. **确认模型已选择**
   - 检查右下角是否显示 "DeepSeek-V4-Pro High" 等模型名称
   - 如果没有，点击选择一个模型

2. **测试基础对话**
   ```
   你好
   ```
   - 发送简单消息测试
   - 观察是否有回复

3. **检查 API 连接**
   ```bash
   # 在终端运行
   dsh logs | grep "model-router"
   
   # 查找类似输出：
   # [model-router] selected deepseek/deepseek-chat
   ```

---

## 可能的问题4: 存档功能无法使用

### 症状
- 点击左侧的历史对话无响应
- 或者"会话日志"栏是空的

### 解决方案

1. **创建一条新对话**
   - 点击 "新会话" 按钮
   - 发送一条消息
   - 等待回复完成

2. **刷新页面**
   - 按 F5 刷新
   - 检查左侧是否出现历史记录

3. **检查存储权限**
   - 浏览器设置 → 隐私和安全
   - 确保允许网站存储数据

---

## 可能的问题5: 立绘显示异常

### 症状
- 模型娘图片不显示
- 或者显示为破碎图标

### 解决方案

1. **检查图片文件**
   ```bash
   cd F:\DeepSeek_harness\model-router-galgame
   dir aipicture
   
   # 应该看到：
   # DeepSeek1.png
   # Claude1.png
   # ChatGPT1.png
   # 等14个PNG文件
   ```

2. **重新构建客户端**
   ```bash
   cd F:\DeepSeek_harness\model-router-galgame
   npm run build:client
   dsh restart
   ```

3. **检查浏览器网络请求**
   - F12 → Network 标签页
   - 刷新页面
   - 查找图片请求是否失败（红色）

---

## 完整诊断步骤

### 步骤1: 收集错误信息

1. **打开浏览器控制台**（F12）
2. **切换到 Console 标签页**
3. **刷新页面**（F5）
4. **截图或复制所有红色错误信息**

### 步骤2: 检查 Harness 日志

```bash
# 查看最近的日志
dsh logs --tail 50

# 或者查看完整日志文件
type C:\Users\你的用户名\.deepseek-harness\logs\harness.log
```

### 步骤3: 验证插件状态

```bash
# 列出已安装插件
dsh plugin --profile web list

# 应该看到：
# model-router-galgame@0.4.10

# 如果没有，重新安装
dsh plugin --profile web add F:\DeepSeek_harness\model-router-galgame
dsh restart
```

### 步骤4: 测试基础功能

1. **测试路由命令**
   ```
   /router plan
   ```
   应该返回 JSON 格式的路由方案

2. **测试模式切换**
   ```
   /router mode collective
   ```
   应该返回确认消息

3. **测试简单对话**
   ```
   1+1=?
   ```
   应该收到模型回复

---

## 快速修复方案

如果上述诊断无法解决，尝试以下快速修复：

### 方案1: 重置插件

```bash
# 1. 移除插件
dsh plugin --profile web remove model-router-galgame

# 2. 清除缓存
# 在浏览器按 Ctrl+Shift+Delete，清除所有缓存

# 3. 重新安装
cd F:\DeepSeek_harness\model-router-galgame
dsh plugin --profile web add .

# 4. 重启
dsh restart
```

### 方案2: 检查端口占用

```bash
# 确认 Harness 在 3080 端口运行
netstat -ano | findstr :3080

# 如果没有输出，Harness 可能未启动
dsh start
```

### 方案3: 使用不同浏览器

- 尝试 Chrome / Edge / Firefox
- 确保浏览器版本较新
- 禁用浏览器扩展（可能冲突）

---

## 仍然无法解决？

请提供以下信息以便进一步诊断：

1. **具体症状描述**
   - "视窗打不开"的具体表现是什么？
   - 点击哪里没反应？
   - 看到什么错误提示？

2. **浏览器控制台错误**（F12 → Console）
   - 截图或复制红色错误信息

3. **Harness 日志**
   ```bash
   dsh logs --tail 100 > logs.txt
   ```
   - 将输出保存为文件

4. **系统信息**
   - Windows 版本
   - Harness 版本：`dsh version`
   - 插件版本：`dsh plugin list`

---

## 联系支持

如果问题仍未解决，可以：

1. **提交 GitHub Issue**（附上以上诊断信息）
2. **DeepSeek 社区提问**
3. **发送诊断信息到支持邮箱**

---

**临时建议**：

从你的截图看，GAL 界面其实已经正常显示了（有模型娘立绘）。如果只是对话内容被模糊遮挡，可能是：

1. **隐私截图导致的模糊**（截图软件自动模糊敏感内容）
2. **正在加载中**（等待模型回复）
3. **需要滚动对话框**（内容在下方）

建议先尝试：
- 发送一条简单消息："你好"
- 观察是否有回复
- 尝试滚动对话区域

如果能看到回复，说明功能正常！✅
