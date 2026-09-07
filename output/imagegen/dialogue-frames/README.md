# 人物对话框图片

这里保存 GAL 游戏使用的 14 套位图对话框：DeepSeek 使用用户提供的原始场景资源，其余 13 套由已配置的图片 API 以 `gpt-image-2` 生成。各人物按自己的身份设计材质、徽章和边饰，游戏运行时直接加载本地图片，不调用图片 API。

| 角色 | 画面设计 |
| --- | --- |
| DeepSeek | 原蓝金框、海洋徽章、蝴蝶结与水纹 |
| DeepSeek Harness | 深色织带、罗盘徽章、金链与统筹者礼服边饰 |
| ChatGPT | 珊瑚色书信、羽毛笔与笔记本徽章、植物纹 |
| Claude | 紫色绒带、月亮与书本、钥匙与图书馆边饰 |
| 豆包 | 绿色格纹、茶杯徽章、早餐与花朵挂件 |
| 文心一言 | 朱红卷轴、玉饰、绳结与传统纹样 |
| Gemini | 晶体星徽、望远镜、星盘与金属轨道 |
| GLM | 绛红金框、建筑徽章、檐角与垂饰 |
| Grok | 黑色金属、亮蓝编绳、闪电与锐角晶体 |
| Kimi | 靛紫织物、月相徽章、灯笼与沙漏 |
| MiMo | 浅青实验玻璃、烧瓶徽章、试剂与标签 |
| MiniMax | 绯红幕布、戏剧面具、舞台灯与垂坠水晶 |
| OpenCode Zen | 钢灰与墨绿、工具徽章、电缆、铰链与螺钉 |
| Qwen | 翡翠色饰面、叶形徽章、绳结、玉珠与流苏 |

## 文件与处理

- `{key}-source.png` 是 13 张服务原始输出，处理时不改写。
- `{key}.webp` 是实际游戏资源，保留透明通道，使用 WebP quality 92。14 张运行图合计约 2.63 MB。
- `{key}-generation.json` 保存模型、尺寸和请求结果等脱敏记录；`{key}-processing.json` 记录原始尺寸、透明处理与名牌局部清理。
- `runtime-contact-sheet.png` 展示全部运行图；提示词位于 `prompts/`。
- `reference/deepseek-frame-original.png` 从 `gal-scene.json` 的 `asset-mss46j9j-00nf5m` 原样提取，为 1672×941 RGBA PNG。
- `reference/deepseek-frame.png` 是 DeepSeek 的运行图来源，裁去透明留白后为 1672×560。原框底部烘焙的英文工具栏文字与图标被局部清除，便于游戏放置真实控件；艺术主体和原始文件保留。
- `reference/reference-metadata.json` 保存原场景坐标、裁切与文字安全区；1536×512 的参考图仅用于图片生成参考。

服务没有始终遵守请求中的 1536×512 尺寸。处理器读取实际尺寸并保留完整画布：部分原图为 2019 至 2138 像素宽，其他为 1536×512。运行资源没有为了统一比例再次裁掉角色边饰。

原本已有透明通道的图片保留原生透明，只清理紧邻透明外沿的少量纯 RGB 杂点。文心一言、Grok、MiniMax、OpenCode Zen 的输出使用洋红背景，处理时移除背景及经检查确认的飘带、电缆空洞，并处理边缘混色，不删除正常红布、玉饰或晶体内容。

ChatGPT、Harness、Gemini、Kimi 的生成图在名字框中继承了参考图的淡色图案。运行图以相邻空白材质局部补齐这些区域，供真实角色名覆盖；DeepSeek 名字框保留原有图案。每张图的正文安全区、名字文字区、可独立放大的完整名字框区域和字色，分别写入 `gal-dialogue-assets.mjs`。

## 复现

安装 Pillow 后，在项目根目录运行本地处理脚本。它只读取现有图片、生成 WebP、更新资源模块和对照图，不发起网络请求：

```powershell
test-artifacts/imagegen-venv/Scripts/python.exe scripts/prepare-dialogue-assets.py
```

可用 `--keys deepseek chatgpt` 只重新处理指定人物；资源模块只引用已经存在的 WebP。DeepSeek 原始参考提取脚本为 `scripts/prepare-dialogue-reference.mjs`。

本次共成功保存 13 张新对话框。另有首次 CLI 返回格式不兼容而未保存的请求，以及一次 OpenCode 服务返回 503 后的成功重试。原始服务响应保留在被 Git 忽略的私有诊断目录，交付图片和说明不包含密钥或带签名下载链接。
