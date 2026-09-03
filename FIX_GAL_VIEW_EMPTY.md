# GAL 视图空对话修复补丁

## 问题分析

错误：`TypeError: Cannot read properties of undefined (reading 'length')`

位置：`client.js:60644:1` → `GalView.jsx:473`

```javascript
// 第 473 行
const lines = useMemo(() => nodesToLines(nodes), [nodes])
```

当 `nodes` 为 `undefined` 或 `nodesToLines` 返回 `undefined` 时，后续代码尝试访问 `lines.length` 会报错。

---

## 修复方案

### 方法1: 添加空值保护（推荐）

编辑 `.dsh-plugin/client/GalView.jsx`：

```javascript
// 修改第 473 行
const lines = useMemo(() => nodesToLines(nodes), [nodes])

// 改为：
const lines = useMemo(() => {
  if (!Array.isArray(nodes)) return []
  return nodesToLines(nodes) || []
}, [nodes])
```

### 方法2: 在 nodesToLines 函数中修复

编辑 `.dsh-plugin/client/transcript.mjs`，找到 `nodesToLines` 函数：

```javascript
export function nodesToLines(nodes) {
  // 添加这一行
  if (!Array.isArray(nodes)) return []
  
  // 原有代码...
}
```

---

## 完整修复步骤

### 步骤1: 备份原文件

```bash
cd F:\DeepSeek_harness\model-router-galgame
copy .dsh-plugin\client\GalView.jsx .dsh-plugin\client\GalView.jsx.backup
```

### 步骤2: 应用修复

打开 `.dsh-plugin/client/GalView.jsx`，找到第 473 行：

**原代码**：
```javascript
const lines = useMemo(() => nodesToLines(nodes), [nodes])
```

**修改为**：
```javascript
const lines = useMemo(() => {
  if (!Array.isArray(nodes)) return []
  const result = nodesToLines(nodes)
  return Array.isArray(result) ? result : []
}, [nodes])
```

### 步骤3: 重新构建客户端

```bash
npm run build:client
```

### 步骤4: 重启 Harness

```bash
dsh restart
```

### 步骤5: 测试

1. 打开浏览器访问 `http://127.0.0.1:3080`
2. 创建新对话
3. **直接点击"GAL视图"标签**（不发送消息）
4. 应该能看到空白界面，不报错

---

## 临时解决方案（无需修改代码）

如果不想改代码，可以：

**先发送一条消息，再切换到 GAL 视图**：

1. 留在"对话"标签
2. 发送：`你好`
3. 等待回复完成
4. 点击"GAL视图"标签

这样 GAL 视图就有数据可以渲染，不会报错。

---

## 预防性修复（建议追加）

除了第 473 行，还有其他地方可能有类似问题，建议一并修复：

### 位置2: 第 475 行

```javascript
// 原代码
const lastLine = lines.length > 0 ? lines[lines.length - 1] : null

// 改为（已经有 lines 是数组的保证，这行不需要改）
const lastLine = lines.length > 0 ? lines[lines.length - 1] : null
```

### 位置3: 第 476 行

```javascript
// 原代码
const latestUserText = useMemo(() => {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.kind === 'player') return lines[index].text
  }
  return ''
}, [lines])

// 这段已经有安全的空数组处理，不需要改
```

---

## 验证修复

修复后，运行测试确保没有破坏其他功能：

```bash
npm test
```

预期：所有测试通过 ✅

---

## 如果修复后仍然报错

### 检查 transcript.mjs

打开 `.dsh-plugin/client/transcript.mjs`，找到 `nodesToLines` 函数开头：

```javascript
export function nodesToLines(nodes) {
  // 确保第一行是这个
  if (!Array.isArray(nodes)) return []
  
  // ... 其余代码
}
```

### 检查构建是否成功

```bash
# 查看 client.js 文件大小
dir .dsh-plugin\client.js

# 如果文件很小（<100KB），说明构建失败
# 重新构建：
del .dsh-plugin\client.js
npm run build:client
```

---

## 一键修复脚本（PowerShell）

```powershell
# 保存为 fix-gal-view.ps1
cd F:\DeepSeek_harness\model-router-galgame

# 备份
Copy-Item .dsh-plugin\client\GalView.jsx .dsh-plugin\client\GalView.jsx.backup

# 修复（需要手动编辑，这里只是提示）
Write-Host "请手动编辑 .dsh-plugin\client\GalView.jsx 第 473 行"
Write-Host "将："
Write-Host "  const lines = useMemo(() => nodesToLines(nodes), [nodes])"
Write-Host "改为："
Write-Host "  const lines = useMemo(() => { if (!Array.isArray(nodes)) return []; const result = nodesToLines(nodes); return Array.isArray(result) ? result : [] }, [nodes])"
Write-Host ""
Write-Host "修改完成后按任意键继续..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 重新构建
npm run build:client

# 重启
dsh restart

Write-Host "修复完成！请在浏览器中测试 GAL 视图。"
```

---

## 问题根因分析

**为什么会出现这个错误？**

1. 用户在**空对话**中直接切换到 GAL 视图
2. 此时 `nodes` 可能是 `undefined` 或空数组
3. `nodesToLines()` 没有处理这种情况
4. 返回 `undefined`
5. 后续代码尝试 `lines.length` → 💥 报错

**为什么之前没发现？**

- 测试用例都是先发送消息，再测试 GAL 视图
- 没有覆盖"空对话直接打开 GAL 视图"的场景

---

需要我帮你直接修改文件吗？我可以为你应用这个修复。
