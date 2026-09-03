# Model Router + GALGame

[English](README.md) | 中文

这是一个可安装到原版 DeepSeek Harness 的插件。它在 Host 侧提供面向成本的集体协作路由，在浏览器侧提供 GAL 视窗、存档、模型娘立绘和 Markdown/KaTeX 对话渲染。

## 功能

- **集体合作**：根据任务类型、复杂度、关键度和依赖关系生成工作包；建模、业务执行、验证和最终整合可以分配给不同模型。
- **单独会话**：保持 Harness 原生模型选择器，用户指定哪个模型就由哪个模型工作；集体算法不会覆盖这个模式。
- **质量约束成本优化**：复杂任务先提取代码、数学、研究、视觉等业务方向并建立独立工作包，再在满足质量下限的候选中综合考虑 LiveBench 分类质量、任务专长、输入/输出价格、延迟和风险。高关键度工作保留给高质量模型，低关键度、重复且可验证的工作优先使用低价模型。
- **LiveBench 快照**：默认连接 LiveBench 官网根地址，自动发现最新 release 并读取官方 `table_YYYY_MM_DD.csv` 与 `categories_YYYY_MM_DD.json`，同时兼容用户填写的 JSON/CSV 镜像。刷新失败时保留上一次成功快照；没有快照时回退到项目内实验基线，并在摘要中明确标注“未完成联网核验”。
- **用户价格与预算**：设置页的“模型费用与路由预算”可编辑输入、输出、缓存读取、缓存写入价格（USD/1M tokens）、LiveBench 地址、刷新周期、单任务预算以及缓存读写占输入比例；也支持用 `provider/model` 标识覆盖同一模型在不同中转站的价格。缓存比例默认为 0，只有确认供应商启用 prompt cache 后才建议填写；用户覆盖优先于实验基线，价格只影响集体路由和估价，不接触 API Key。
- **费用审计**：按工作包估算输入/输出 token，逐阶段累加费用，并展示全高质量基线、预计节省、质量下限、预算状态和实际使用模型数。
- **GAL 视窗**：新会话自动形成存档；历史记录保留实际 provider/model，名牌、颜色和立绘随当前模型变化。ERNIE、文心一言和百度 provider/model 标识统一显示 `ERNIE娘` 与 `ernie1.png`。路由分析显示的是可审计摘要，不是模型私有思维链。
- **Markdown/KaTeX**：复用 Harness 的 `MarkdownText`，支持标题、列表、表格、引用、代码、链接和数学公式；宽表格、代码块和公式在对话框内滚动，玩家输入保持纯文本。
- **附件与多模态**：图片使用原生多模态管线，Markdown/TXT/JSON/代码文件提取为文本；PDF/DOCX 等二进制文件保留解析状态，不会静默伪造内容。
- **OpenCode Zen**：官方站点覆盖会自动恢复模型目录所需的 `/zen`、`/zen/v1` 端点；自定义网关不受影响。
- **更新与桌面端**：插件设置页提供 GitHub Release 检查和一键更新；客户端过期时更新完整客户端及内置插件，否则只更新插件。网页端无法写入本机文件时会打开 Releases 页面。

## 安装

### 前置条件

- DeepSeek Harness / DSH Desktop 0.4.8 或更高版本。
- Node.js 22.19 或更高版本（当前 DSH Desktop 使用 Node 24）。
- Harness 中至少配置一个 LLM provider。
- 首次安装需要能够访问 npm registry。

### 推荐方式：安装已发布的 npm 包

这个公开包已经把官方 `@liustack/modlens@3.25.4` 作为依赖和 DSH bundle 一起打包。无需安装 Docker、Python、8000 端口服务，也无需再单独安装 ModLens。

1. 在 PowerShell 中进入 DSH Desktop 目录：

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
```

2. 使用官方 npm 源。如果使用国内镜像，刚发布的新包可能暂时返回 404：

```powershell
pnpm config set registry https://registry.npmjs.org/
pnpm config get registry
```

第二条命令应输出 `https://registry.npmjs.org/`。

3. 安装到你实际使用的 profile：

```powershell
# 查询 npm registry 当前实际可见的最新版本
$routerVersion = npm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
$routerVersion

# Web profile
pnpm dsh plugin --profile web add "@ljwei-stak/model-router-galgame@$routerVersion"

# Desktop profile（桌面程序使用 desktop profile 时执行）
pnpm dsh plugin --profile desktop add "@ljwei-stak/model-router-galgame@$routerVersion"
```

公开 registry 可能会在新版本发布后短暂延迟同步；同步完成后，同样的命令会自动使用
最新可见版本。如果 npm 提示 `No matching version found`，不要猜版本号；重新执行查询，
并使用它实际输出的版本。

如果不想修改全局 pnpm 源，可以只在安装命令中指定：

```powershell
$routerVersion = npm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
pnpm dsh plugin --profile web add --registry=https://registry.npmjs.org "@ljwei-stak/model-router-galgame@$routerVersion"
```

4. 检查路由器和它的 ModLens 依赖是否已加入 profile：

```powershell
pnpm dsh --profile web --dump-config | Select-String "model-router-galgame|modlens"
```

输出中应包含：

```text
@ljwei-stak/model-router-galgame
@liustack/modlens
```

安装本插件后不要再单独添加 `@liustack/modlens`。本插件已经包含官方 ModLens
bundle。如果以前在同一个 profile 中单独安装过 ModLens，先删除那条独立依赖，
再重新安装路由器：

```powershell
pnpm dsh plugin --profile web remove @liustack/modlens
pnpm dsh plugin --profile web add "@ljwei-stak/model-router-galgame@$routerVersion"
```

5. 关闭已经运行的 DSH，再启动对应 profile：

```powershell
pnpm dsh web
# 或 desktop profile：
pnpm dsh --profile desktop
```

不要在同一个 profile 上重复启动两个 DSH 进程。如果出现 `EADDRINUSE`，或启动时
提示 `task-board ledger is already owned by process ...`，先关闭旧 DSH 进程再重试。
只有旧进程释放 profile 锁后，才适合换端口启动：

```powershell
pnpm dsh web --no-open --port 3081
```

### 检查 ModLens

在已安装的 Web profile 中运行：

```powershell
pnpm dsh plugin --profile web exec modlens doctor
```

然后在 DSH 设置页或 `C:\Users\<你的用户名>\.modlens\config.json` 中配置视觉引擎。新建对话、上传图片并要求模型转录或解释图片即可。存在兼容的上游路由时，纯文本模型会显示对应的 `(modlens vision)` 条目。

### 更新插件

安装 npm 当前可见的最新版本：

```powershell
$routerVersion = npm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
pnpm dsh plugin --profile web add "@ljwei-stak/model-router-galgame@$routerVersion"
```

如果需要可复现部署，请把 `$routerVersion` 替换为通过 `npm view` 确认过的具体版本号
（例如 `0.4.12`）：

```powershell
pnpm dsh plugin --profile web add @ljwei-stak/model-router-galgame@0.4.12
```

已经安装过插件时，也可以让 pnpm 在当前版本范围内更新：

```powershell
pnpm dsh plugin --profile web update @ljwei-stak/model-router-galgame
```

更新后请重启 DSH；Desktop profile 使用同样的命令并把 profile 改为 `desktop`。

### 出现加载器或 profile 错误时重新安装

如果启动时报 `duplicate loader entry id: modlens`，表示 ModLens 被单独安装过，
又被本插件内置 bundle 再加载了一次。先关闭 DSH，再删除单独安装的 ModLens，
然后重新安装本插件：

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
pnpm dsh plugin --profile web remove @liustack/modlens
$routerVersion = npm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
pnpm dsh plugin --profile web add "@ljwei-stak/model-router-galgame@$routerVersion"
pnpm dsh --profile web --dump-config | Select-String "model-router-galgame|modlens"
```

输出应只显示一条 `modlens` 行和一条 `model-router-galgame` 行。如果报
`EADDRINUSE` 且端口为 3080，或报 `task-board ledger is already owned by process ...`，
说明旧的 DSH 进程仍在运行；先关闭旧进程，或换一个端口启动：

```powershell
pnpm dsh web --no-open --port 3081
```

### 本地源码安装

如果要测试 `F:\DeepSeek_harness` 中的源码，不从 npm 下载：

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
pnpm dsh plugin --profile web add F:\DeepSeek_harness\model-router-galgame
```

本地路径方式只用于开发测试；正式发布后推荐使用上面的 scoped npm 包名。

### 卸载插件

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
pnpm dsh plugin --profile web remove @ljwei-stak/model-router-galgame
pnpm dsh plugin --profile desktop remove @ljwei-stak/model-router-galgame
```

卸载只会移除插件的 profile 层，不会删除 provider 凭据，也不会删除 `C:\Users\<你的用户名>\.modlens\config.json`。

没有可用模型时，插件仍保留 Harness 原生模型选择，不会阻塞对话。完整的 provider 配置和故障排查见 [INSTALLATION_GUIDE.zh.md](INSTALLATION_GUIDE.zh.md) 与 [MODLENS_DEPLOYMENT.md](MODLENS_DEPLOYMENT.md)。

## 命令

- `/router mode collective`
- `/router mode single`
- `/router plan`

默认模式为 `collective`。系统只公开任务分类、评分、分配、费用和回退记录，不输出任何模型私有思维链。

## 数学路由模型

本节按照 `RESEARCH_PAPER_FRAMEWORK.md` 的论文框架，完整说明当前 `0.4.12`
实现。生产路由器与离线实验插件共用质量下限、费用模型、目标函数和回退语义；
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
& \sum_{i \in I} \operatorname{Cost}(i,\pi(i)) \le B
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
\text{simple:}\quad & 0.00 \le \operatorname{complexity} < 0.34 \\
\text{balanced:}\quad & 0.34 \le \operatorname{complexity} < 0.66 \\
\text{complex:}\quad & 0.66 \le \operatorname{complexity} \le 1.00
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
\operatorname{Cost}(i,m)=
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
&+\operatorname{synthesis\_bonus}(i,m)
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
Q(a)\ge Q(b),\quad \operatorname{Cost}(a)\le\operatorname{Cost}(b),\quad L(a)\le L(b),\quad
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
e_{cost}=\operatorname{clamp}\!\left(\frac{\operatorname{actual\_cost}-\operatorname{target\_cost}}
{\max(\operatorname{target\_cost},\varepsilon)}\right),\qquad
v_q=\max(0,\operatorname{quality\_floor}-\operatorname{actual\_quality})
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
\operatorname{TotalCost}&=\sum_{i\in I}\operatorname{Cost}(i,\operatorname{assign}(i)),\\
\operatorname{BaselineCost}&=\text{每个工作包使用当前可用最高质量模型的费用},\\
\operatorname{EstimatedSaving}&=\max\!\left(0,1-\frac{\operatorname{TotalCost}}{\operatorname{BaselineCost}}\right)
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

仓库根目录 `desktop/` 提供服务器端/本地运行模式切换和 Windows 打包配置。桌面窗口、启动器与 Windows 安装包使用 `DeepSeek_Harness娘.avif` 生成的方形图标。插件源码、设置 schema 和构建脚本均保留在仓库，安装包通过项目 Release 发布。
