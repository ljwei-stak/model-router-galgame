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

下面的命令以 Windows PowerShell 为例。Harness 和插件可以放在任意目录，不要求使用特定盘符或文件夹名称。先设置两个路径变量，后面的命令直接复用它们。

```powershell
# 把下面两个路径改成你电脑上的实际目录。
$HarnessDir = "C:\path\to\DSH-Desktop"
$PluginDir = "C:\path\to\model-router-galgame"
```

请在同一个 PowerShell 窗口中继续执行下面的命令，这样变量会一直有效。如果电脑上已经有其中一个仓库，只需把对应变量改成现有目录，并跳过那个仓库的 `git clone` 命令。

### 1. 准备 Harness

```powershell
git clone https://github.com/deepseek-ai/deepseek-harness.git $HarnessDir
Set-Location $HarnessDir
pnpm install --frozen-lockfile
pnpm run build
```

如果 Harness 已经存在，首次 checkout 或更新 Harness 后至少执行一次 `pnpm install` 和 `pnpm run build`。

### 2. 获取插件

将独立仓库克隆到 Harness 目录之外，或者下载 Release 压缩包：

```powershell
git clone https://github.com/ljwei-stak/model-router-galgame.git $PluginDir
```

传给安装器的目录必须同时包含 `package.json`、`.dsh-plugin\index.mjs`、`.dsh-plugin\client.js` 和 `cordis.patch.yml`。

### 3. 安装到 Web profile

从 Harness 根目录运行插件管理器：

```powershell
Set-Location $HarnessDir
pnpm dsh plugin --profile web add $PluginDir
```

当独立 `dsh` 命令没有加入 `PATH` 时，应使用 `pnpm dsh`。如果桌面安装版提供了 `dsh.exe`，等价命令是：

```text
dsh plugin --profile web add <plugin-directory>
```

### 4. 启动或重启 Web

```powershell
Set-Location $HarnessDir
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

## 路由算法技术说明

### 摘要

集体路由器是一个面向小型任务图的、确定性的质量约束分配启发式。它把一条用户请求拆成可审计的工作包，为 Harness 当前可用的每个 `provider/model` 路由估计质量、专长、延迟、风险和 Token 费用，再为每个工作包分配模型。主要目标是加权效用分数；质量下限是可行性约束；用户预算则在第一次效用分配之后作为二级约束进行回退修复。实现优先保证桌面进程中的有界执行、可复现性和可检查记录，不宣称自己是全局最优的整数规划求解器。LiveBench 可以改进输入估计，但它只是外部评测信号，不等于任务成功保证。

### 1. 问题定义

设用户请求文本为 \(x\)。规划器构造一个有向无环任务图（DAG）\(G=(V,E)\)，其中每个节点 \(v\in V\) 是一个工作包，例如分析、执行、验证或整合。令 \(R\) 为 Harness 当前暴露的路由集合；一个路由是 provider \(p\) 与模型标识 \(m\) 的二元组 \(r=(p,m)\)。

对于每个路由和任务类型，规划器估计：

- \(q_{r,v}\in[0,1]\)：该任务上的质量；
- \(s_{r,v}\in[0,1]\)：专长匹配度；
- \(l_r\in[0,1]\)：归一化延迟，越低越好；
- \(k_r\in[0,1]\)：运行风险；
- \(c_{r,v}\ge0\)：该任务节点的预计美元费用。

分配函数记为 \(a:V\rightarrow R\)。对于复杂度档位 \(b\)，每个节点有质量下限 \(f_{b,v}\)。理想化的约束优化问题是：

\[
\max_a \sum_{v\in V} U(a(v),v) \\
\text{约束： } q_{a(v),v}\ge f_{b,v},\qquad
\sum_{v\in V} c_{a(v),v}\le B。
\]

产品实现把预算明确作为*二级*约束：先选择高效用且满足质量下限的路由，再尝试更便宜的替换。这样可以避免一个任意设置的预算悄悄把模型压到要求的质量下限以下。

### 2. 符号与输入

规划器合并四层输入：

| 输入 | 来源 | 作用 |
| --- | --- | --- |
| 请求文本 | Harness 当前消息历史 | 复杂度、任务类型信号和 Token 估算 |
| 可用路由 | Harness 原生 LLM 目录 | 硬候选集合；不可用模型绝不会被分配 |
| 实验目录 | `.dsh-plugin/shared/router.mjs` | 基准质量、延迟、风险、专长和价格 |
| 用户与 LiveBench 覆盖 | 插件设置和可选快照 | 路由专属价格、任务/总体评测分数 |

模型标识会先归一化再匹配。未知模型仍可参与路由，但在出现目录或 LiveBench 条目之前，会使用保守元数据（`quality=0.66`、`latency=0.55`、`risk=0.24`、无声明专长）。Provider 凭据不参与此计算。

### 3. 请求复杂度建模

`assessComplexity(text)` 是可解释的启发式模型，不是训练得到的分类器。它计算六类有界信号：

\[
\begin{aligned}
L &= \operatorname{clamp}(|x|/2200),\\
M &= \operatorname{clamp}(\#\text{列表标记}/8),\\
D &= \operatorname{clamp}(\#\text{领域标记}/5)\times0.28,\\
C &= 0.22\;\text{（出现代码/工程标记，否则为 }0\text{）},\\
H &= 0.20\;\text{（出现高推理标记，否则为 }0\text{）},\\
V &= 0.12\;\text{（出现视觉标记，否则为 }0\text{）。}
\end{aligned}
\]

原始分数为：

\[
z=\operatorname{clamp}(0.10+0.30L+0.18M+D+C+H+V)。
\]

当 \(z<0.34\) 时为 `simple`，当 \(0.34\le z<0.66\) 时为 `balanced`，否则为 `complex`。档位同时决定目标权重和基础质量下限。由于特征是显式的，审计面板可以从请求长度、列表结构和识别出的领域解释路由结果。

### 4. 任务类型识别与任务图构建

路由器统计 `vision`、`math`、`code`、`research`、`summarization` 和 `writing` 的关键词信号，并按信号数从高到低排序。很短且包含“翻译”或“解释”的请求会直接视为 `general`，避免一个简单回合被过度专业化；没有信号时同样使用 `general`。

对于 `simple` 和 `balanced` 请求，任务图只有一个“直接回答与必要校验”的执行节点。`complex` 请求会按顺序扩展为：

```text
analysis：     问题建模与约束提取
execution：    每个检测领域一个节点（代码、研究、数学、视觉等）
verification： 验证、反例与风险审查（请求中出现相关信号时）
synthesis：    交叉校验与最终整合
```

整合节点依赖所有前序报告。因此，多领域复杂请求在逻辑上可以并行处理各领域工作；桌面端的 agent-loop 仍按持久化、有序的阶段执行，确保最终整合模型能够读取每一份报告。

### 5. 模型能力、质量与专长估计

对任务类型 \(t\)，质量按如下优先级解析：

\[
q_{r,t}=\begin{cases}
\text{LiveBench 任务分数},&\text{存在时}\\
\text{LiveBench 总体分数},&\text{否则若存在}\\
\text{实验目录质量},&\text{否则}\\
\text{未知模型保守回退值},&\text{路由未知时}。
\end{cases}
\]

所有分数都会转换到 \([0,1]\)；例如 `87.5` 会转换为 `0.875`。专长也按相同思路估计：存在任务专属 LiveBench 分数时优先使用；模型明确声明该专长时为 `1.0`；`general` 为 `0.58`；兼容的 `research`/`writing` 和 `writing`/`reasoning` 组合分别为 `0.68` 和 `0.62`；其他不匹配为 `0.38`。

质量下限在 `simple`、`balanced`、`complex` 中分别为 `0.64`、`0.72`、`0.78`。复杂档位的节点还会根据关键度 \(\kappa\) 提高下限：

\[
f_{b,v}=\operatorname{clamp}\left(0.78+\max(0,\kappa-0.65)\times0.12\right)。
\]

复杂档位的 synthesis 下限至少为 `0.84`，因此最终整合比普通执行节点更严格。

### 6. 成本与 Token 估算

估算器使用稳定的字符到 Token 近似：

\[
T=\max(80,\lceil |x|/3.7\rceil)。
\]

缓存比例会被限制到 \([0,1]\)，并保证读写之和不超过 `1`。设输入价格为 \(P_i\)，缓存读取价格为 \(P_r\)，缓存写入价格为 \(P_w\)，候选排序使用的有效输入价格为：

\[
P_i^{eff}=(1-\rho_r-\rho_w)P_i+\rho_rP_r+\rho_wP_w。
\]

任务节点通过固定乘数改变 Token 预算：

| 用途 | 输入乘数 | 输出乘数 |
| --- | ---: | ---: |
| `analysis` | 0.90 | 0.55 |
| `execution` | 1.20 | 1.00（`complex` 为 `1.45`） |
| `verification` | 1.15 | 0.70 |
| `synthesis` | 1.65 | 1.30 |

如果 \(T_i\)、\(T_r\)、\(T_w\)、\(T_o\) 分别是节点总输入、缓存读取、缓存写入和输出 Token，则费用为：

\[
C_{r,v}=\frac{(T_i-T_r-T_w)P_i+T_rP_r+T_wP_w+T_oP_o}{1{,}000{,}000}。
\]

这是规划费用，不改变服务商账单，也不用于单独会话模式。

### 7. 质量约束效用函数

每个复杂度档位使用固定权重向量 \(w=(w_q,w_c,w_l,w_s,w_k)\)：

| 档位 | 质量 | 成本 | 延迟 | 专长 | 风险 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `simple` | 0.30 | 0.50 | 0.14 | 0.04 | 0.02 |
| `balanced` | 0.45 | 0.30 | 0.10 | 0.10 | 0.05 |
| `complex` | 0.55 | 0.16 | 0.06 | 0.16 | 0.07 |

令 \(C_{max}=\max_r(P_{i,r}^{eff}+P_{o,r})\)，即目录和已配置路由中最大的有效输入加输出价格，再据此归一化成本：

\[
g_r=\operatorname{clamp}\left(1-\frac{(P_i^{eff}+P_o)/2}{C_{max}}\right)。
\]

节点 \(v\) 的候选效用为：

\[
\begin{aligned}
U(r,v)=&\;w_q q_{r,v}+w_cg_r+w_l(1-l_r)+w_ss_{r,v}-w_kk_r\\
&-0.08\cdot\mathbf{1}[r\text{ 已被前序节点使用}]\\
&-\max(0,f_{b,v}-q_{r,v})\cdot\kappa_v。
\end{aligned}
\]

最后一项会对质量缺口施加软惩罚，但实现仍会显式检查可行性。候选按 \(U\) 排序后，优先选择达到节点下限的路由；如果没有任何候选达到下限，才保留排序第一的候选，并记录 `constraintRelaxed=true`。这样回退行为是可见的，不会被伪装成完全满足约束的结果。

### 8. 贪心分配与多样性惩罚

实现按任务节点顺序执行确定性的贪心过程：

```text
band       <- assessComplexity(request)
taskType   <- classifyTask(request)
routes     <- Harness 原生可用的 provider/model 对
metadata   <- 实验目录 + 用户价格 + LiveBench 快照
tasks      <- taskPackages(taskType, request, band)
used       <- 空路由集合

for task in tasks:
    用 U(route, task) 为每条可用路由评分
    如果存在可行路由，则排除低于质量下限的候选
    选择最高分且尚未使用的路由；否则选择最高分可行路由
    synthesis 优先选择 deepseek-v4-pro，其次选择其他 DeepSeek 路由
    记录分配，并将 provider/model 加入 used
```

`0.08` 的重复惩罚鼓励不同阶段使用不同路由，可以降低相关性故障，也避免协作过度依赖一个端点。它只是偏好而不是硬禁止：只有一条路由可用时仍允许复用。当前实现对 synthesis 有显式 DeepSeek 偏好；如果首选路由低于该节点下限，分配记录会标明约束已放宽。

### 9. 预算回退算法

效用分配完成后，路由器计算所有节点的总费用。如果 `budgetUsd > 0` 且总费用超出预算，它按关键度从低到高遍历非 synthesis 节点。对每个节点寻找同时满足以下条件的其他路由：

1. 满足该节点的质量下限；
2. 费用低于当前分配。

找到后使用其中最便宜的候选，再处理下一个节点。synthesis 不参与此回退，因为削弱最终整合阶段的影响最大。如果不存在合法替换，路由器保留当前最佳计划并报告 `budgetExceeded=true`；它不会仅为让数字落入预算而删除质量下限。

### 10. 复杂任务协作与结果合成

计划通过真实的 agent-loop 阶段执行，而不是暴露隐藏思维。每个阶段接收原始请求和前序持久化工作报告，输出包含结论、依据、未决事项和可复用产物的结构化报告。报告作为 assistant 消息写入会话历史。synthesis 阶段读取累积历史，进行交叉校验与冲突处理，并以 Markdown/KaTeX 生成面向用户的最终回答。

这种分离带来两点保证：后续阶段可以检查前序产物，审计面板可以展示任务分配而不记录私有思维链。单独会话模式绕过该规划器，完全保留 Harness 原生 provider/model 选择。

### 11. 正确性与可审计性说明

当请求、可用路由列表、目录、设置和 LiveBench 快照固定时，评分与分配步骤是确定性的。计划会记录：

```text
objectiveWeights、qualityFloor、subtasks、selected、synthesizer
costBreakdown、baselineAllStrongCost、estimatedSavings
budgetUsd、budgetExceeded、constraintRelaxed、distinctRoutes
liveBench.source、liveBench.fetchedAt、liveBench.stale、liveBench.error
```

`baselineAllStrongCost` 用规划器可见的最高质量候选为每个节点计价；`estimatedSavings` 将实际计划与该基线比较。这些字段适合检查和回归测试，但不能证明回答一定正确，也不能证明计划是全局最优。

### 12. 复杂度分析

令 \(n=|R|\) 为可用路由数，\(m=|V|\) 为任务节点数。候选评分和排序为 \(O(mn\log n)\)；预算回退最多再增加一次 \(O(mn\log n)\) 遍历；内存使用为 \(O(m+n)\)。Harness 通常只暴露少量模型，复杂请求生成的节点数也有界，因此该启发式可以让桌面端规划延迟保持可预测。

### 13. 完整算例

考虑请求：

```text
请设计一个复杂工程架构，拆分模块，编写代码、测试、部署方案，并给出论文级说明。
```

请求长度、工程标记、列表式要求和推理标记会使它进入 `complex`。检测到的领域包括 `code`、`writing` 和 `research`，因此任务图包含建模、领域处理和整合；由于请求明确要求测试与评估，还会加入验证节点。

仅作示意，假设 Harness 当前暴露 `gpt-5.6-sol`、`deepseek-v4-pro` 和 `qwen3.7-plus`，且没有 LiveBench 覆盖。分析节点关键度为 `0.92`，其质量下限约为 \(0.812\)。第一次分配可能让 `gpt-5.6-sol` 或 `deepseek-v4-pro` 负责高质量推理；当一条路由已经使用后，`0.08` 的多样性惩罚可能使仍满足下限的 `qwen3.7-plus` 更适合较低关键度的执行包。synthesis 在 DeepSeek 可用时优先使用 `deepseek-v4-pro`，费用明细则包含更大的整合输入/输出乘数。

如果第一次计划超过配置预算，回退过程先检查关键度最低的执行包。只有当 `qwen3.7-plus` 仍高于该包质量下限时，才会替换。最终审计记录会展示每次替换、最终总费用、全强模型基线，以及预算是否仍然超出。原生路由列表、手工价格、缓存比例或 LiveBench 快照变化时，具体选择也会变化。

### 14. 局限性与适用范围

- 复杂度和任务类型识别依赖关键词启发式，特殊措辞可能被误判。
- 实验目录和 LiveBench 分数只是代理指标，不等于真实成功概率、事实性或安全性，也不构成质量保证。
- 价格和 Token 乘数是估计值；服务商的隐藏推理 Token、重试、限流和实际计费可能不同。
- 贪心分配有界且可审计，但不是全局最优证明，也不求解一般整数规划。
- 候选集合只包含 Harness 当前报告可用的路由。模型出现在实验目录中，不代表其 provider 已经在 Harness 原生配置完成。
- LiveBench 刷新失败时会保留上一份有效快照或回退到实验基线，并在审计字段中标记陈旧状态。
- 如果预算低于所有满足质量约束的方案，最终仍可能超预算；保持质量下限优先于制造“零超支”的表象。

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
Set-Location $HarnessDir
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
