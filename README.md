# Model Router + GALGame

English | [中文](README.zh.md)

An independent plugin for the native [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It adds cost-aware collective model routing on the Host side and a GAL conversation view in the Web client. The plugin is maintained in its own repository at <https://github.com/ljwei-stak/model-router-galgame> and is not an official DeepSeek Harness distribution.

## What it provides

- **Collective mode** decomposes a request into work packages, assigns feasible models, records costs and fallbacks, and synthesizes a final answer.
- **Single-session mode** keeps the native Harness provider/model selection. The optimizer does not overwrite an explicitly selected model.
- **Quality-constrained cost optimization** uses task type, complexity, LiveBench scores, specialty, price, latency, risk, and a quality floor. A budget can trigger deterministic lower-cost substitutions.
- **LiveBench snapshots** discover the newest official release from `https://livebench.ai`, parse its versioned CSV/JSON assets, and retain the last good snapshot when refresh fails. A user JSON/CSV mirror is supported.
- **Manual prices and budgets** are edited in the plugin settings. Prices are USD per 1M tokens and can be overridden by `provider/model` for a gateway. Cache ratios default to zero.
- **GAL view** archives conversations and keeps the actual provider/model on every line, with model nameplates, colors, portraits, Markdown, KaTeX, attachments, and an editor for scene data.
- **OpenCode Zen compatibility** repairs an accidental official website `baseURL` override so the catalog-owned `/zen` or `/zen/v1` endpoint is used. Custom gateways are left unchanged.
- **Desktop update entry points** check the project Releases page. A desktop build can install the full client or plugin; a browser-only installation opens Releases because it cannot write local files.

## Requirements

- Windows, macOS, or Linux.
- A native DeepSeek Harness checkout, Node.js `^22.19.0` or `>=24.0.0`, and pnpm (the Harness repository currently pins pnpm `11.7.0`).
- At least one provider configured in Harness and at least one model visible in the native model directory.
- Network access to the provider. LiveBench access is optional; the router falls back to its checked-in experimental catalog when it is unavailable.

API keys belong in Harness' credential/settings storage or its supported environment configuration. Never put a key in this repository, a scene file, a README, or a Git commit.

## Install in DeepSeek Harness

The commands below use Windows PowerShell. You can store Harness and this plugin in any folders you like. Set the two paths once, then reuse the variables in the remaining commands.

```powershell
# Change these two paths to folders on your computer.
$HarnessDir = "C:\path\to\DSH-Desktop"
$PluginDir = "C:\path\to\model-router-galgame"
```

Keep using the same PowerShell window so these variables remain available. If either repository is already on your computer, set the matching variable to its existing folder and skip that repository's `git clone` command.

### 1. Prepare Harness

```powershell
git clone https://github.com/deepseek-ai/deepseek-harness.git $HarnessDir
Set-Location $HarnessDir
pnpm install --frozen-lockfile
pnpm run build
```

If Harness is already checked out, run `pnpm install` and `pnpm run build` once after a fresh checkout or after updating Harness.

### 2. Get this plugin

Clone the independent repository somewhere outside the Harness checkout, or download a release archive:

```powershell
git clone https://github.com/ljwei-stak/model-router-galgame.git $PluginDir
```

The directory passed to the installer must contain `package.json`, `.dsh-plugin\index.mjs`, `.dsh-plugin\client.js`, and `cordis.patch.yml`.

### 3. Install into the Web profile

Run the plugin manager from the Harness checkout:

```powershell
Set-Location $HarnessDir
pnpm dsh plugin --profile web add $PluginDir
```

`pnpm dsh` is the reliable form when the standalone `dsh` command is not on `PATH`. If a packaged Harness installation provides `dsh.exe`, the equivalent is:

```text
dsh plugin --profile web add <plugin-directory>
```

### 4. Start or restart Web

```powershell
Set-Location $HarnessDir
pnpm dsh web
```

The default URL is <http://127.0.0.1:3080/>. Use `pnpm dsh web --no-open` when the browser should not open automatically. After adding, removing, or updating a bundle, restart the Web profile so the loader applies the new bundle list.

If boot reports `task-board ledger is already owned by process <PID>`, another Harness instance still owns the profile lock. Close the other Harness window first. To inspect the process without guessing:

```powershell
Get-Process -Id <PID>
```

Only stop a process when you have confirmed it is the stale Harness instance:

```powershell
Stop-Process -Id <PID>
pnpm dsh web
```

Do not delete the profile ledger while a Harness process is running; the lock protects task history from concurrent writers.

## Configure providers and models

The plugin does not store provider credentials or create a second provider system. It discovers providers and models from Harness' native LLM directory.

1. Open Harness model/provider settings.
2. Add or enable a provider, enter its API key in the native credential field, and set the provider's API base URL when required by that provider.
3. Select a real model identifier exposed by that provider, then send a short test message in the native conversation view.
4. Confirm that the provider/model appears in the model selector. The router can only assign models that Harness reports as available.

The experimental routing catalog includes these model IDs for scoring and price defaults: `claude-fable-5`, `claude-opus-4-8`, `gpt-5.6-sol`, `gpt-5.5`, `deepseek-v4-pro`, `deepseek-v4-flash`, `kimi-k3`, `qwen3.7-max`, `qwen3.7-plus`, `glm-5.2`, `gpt-5.6-luna`, `gpt-5.6-terra`, `minimax-m3`, `gemini-3-flash`, and `big-pickle`. Your provider may expose a different identifier; the native identifier is authoritative, and an unknown route receives a conservative fallback score until you add a price entry.

For OpenCode Zen, choose `opencode` or `opencode-go` and enter the API key. Do not set the provider `baseURL` to `https://opencode.ai` or `https://www.opencode.ai`; the catalog owns the protocol endpoint. The plugin removes only that official website override. A custom OpenCode-compatible gateway remains unchanged.

## Configure routing and model prices

Open the Harness settings page and find **GAL 视窗 / Model Router + GALGame**, then expand **Model costs and routing budget**. The settings are Host-owned and persist in the `model-router` namespace.

- **LiveBench data address**: leave `https://livebench.ai` to discover the newest official snapshot, or enter a JSON/CSV mirror. The old `/api/leaderboard` URL is migrated automatically.
- **Refresh interval**: milliseconds, minimum `30000`; the default is `900000` (15 minutes).
- **Per-task budget**: USD. `0` disables the budget constraint. A positive value makes the planner try cheaper feasible assignments when the first plan is over budget.
- **Cache read/write ratios**: fractions of input tokens in `[0, 1]`. Keep both at `0` unless the provider explicitly enables prompt caching; the write ratio is capped so read plus write cannot exceed `1`.
- **Model price table**: input, output, cache-read, and cache-write prices in USD per 1M tokens. A custom model can be added when it is missing from the experimental catalog.
- **Gateway-specific price**: add a key such as `openrouter/deepseek-v4-pro` or `my-provider/deepseek-v4-pro` to price the same model differently for a specific provider. The exact `provider/model` spelling from the native selector matters.

Prices are estimates used by collective planning and the audit panel. They do not change a vendor's billing and do not affect single-session model selection.

## Routing Algorithm: A Technical Note

### Abstract

The collective router is a deterministic, quality-constrained assignment heuristic for a small task graph. It turns one user request into one or more auditable work packages, estimates each available `provider/model` route's quality, specialty, latency, risk, and token cost, and then assigns a route to every package. The primary objective is a weighted utility score; the quality floor is a feasibility constraint, and the user budget is a secondary constraint repaired after the first utility pass. The implementation deliberately favors bounded execution, reproducibility, and inspectable records over a claim of globally optimal integer programming. LiveBench data can improve the input estimates, but it is an external signal rather than a guarantee of task success.

### 1. Problem Formulation

Let a request be a text input \(x\). The planner constructs a directed acyclic task graph (DAG) \(G=(V,E)\), where each node \(v\in V\) is a work package such as analysis, execution, verification, or synthesis. Let \(R\) be the set of routes currently exposed by Harness; a route is the pair \(r=(p,m)\) with provider \(p\) and model identifier \(m\).

For every route and task type, the planner estimates:

- \(q_{r,v}\in[0,1]\): task-specific quality;
- \(s_{r,v}\in[0,1]\): specialty match;
- \(l_r\in[0,1]\): normalized latency, where lower is better;
- \(k_r\in[0,1]\): operational risk;
- \(c_{r,v}\ge 0\): estimated USD cost for that task node.

The assignment is a function \(a:V\rightarrow R\). For a complexity band \(b\), each node has a quality floor \(f_{b,v}\). The idealized constrained problem is:

\[
\max_a \sum_{v\in V} U(a(v),v) \\
\text{subject to } q_{a(v),v}\ge f_{b,v},\qquad
\sum_{v\in V} c_{a(v),v}\le B.
\]

In the product implementation, the budget is intentionally a *secondary* constraint: the router first chooses high-utility feasible routes, then attempts lower-cost replacements. This ordering prevents an arbitrary budget from silently forcing a model below the required quality floor.

### 2. Notation and Inputs

The planner combines four input layers:

| Input | Source | Role |
| --- | --- | --- |
| Request text | Current Harness message history | Complexity and task-type signals; token estimate |
| Available routes | Harness native LLM directory | Hard candidate set; unavailable models are never assigned |
| Experimental catalog | `.dsh-plugin/shared/router.mjs` | Baseline quality, latency, risk, specialty, and prices |
| User and LiveBench overrides | Plugin settings and optional snapshot | Route-specific prices and task/overall benchmark scores |

Metadata is matched by normalized model identifier. An unknown model is still routable, but receives conservative metadata (`quality=0.66`, `latency=0.55`, `risk=0.24`, no declared specialties) until a catalog or LiveBench entry is available. Provider credentials are never part of this calculation.

### 3. Complexity Assessment

`assessComplexity(text)` is an explainable heuristic, not a trained classifier. It computes six bounded signals:

\[
\begin{aligned}
L &= \operatorname{clamp}(|x|/2200),\\
M &= \operatorname{clamp}(\#\text{list markers}/8),\\
D &= \operatorname{clamp}(\#\text{domain markers}/5)\times0.28,\\
C &= 0.22\;\text{if code/engineering markers occur, else }0,\\
H &= 0.20\;\text{if high-reasoning markers occur, else }0,\\
V &= 0.12\;\text{if vision markers occur, else }0.
\end{aligned}
\]

The raw score is:

\[
z=\operatorname{clamp}(0.10+0.30L+0.18M+D+C+H+V).
\]

The band is `simple` when \(z<0.34\), `balanced` when \(0.34\le z<0.66\), and `complex` otherwise. The band selects both the objective weights and the base quality floor. Because the features are explicit, the audit panel can explain a decision in terms of request length, list structure, and recognized domains.

### 4. Task Detection and Task Graph

The router counts keyword signals for `vision`, `math`, `code`, `research`, `summarization`, and `writing`, and orders them by descending signal count. A very short request containing “translate” or “explain” is treated as `general` to avoid over-specializing a simple turn. With no signal, the task type is also `general`.

For `simple` and `balanced` requests, the graph has one execution node: “direct answer and necessary checks”. A `complex` request is expanded into an ordered DAG:

```text
analysis:     problem modeling and constraint extraction
execution:    one node per detected domain (code, research, math, vision, ...)
verification: verification, counterexamples, and risk review (when requested)
synthesis:    cross-checking and final integration
```

The synthesis node depends on all preceding reports. A complex request with multiple detected domains therefore creates parallelizable domain work conceptually, while the desktop agent loop still executes stages in a durable, ordered sequence so every report is available to the final synthesizer.

### 5. Model Capability Estimation

For task type \(t\), quality is resolved in this order:

\[
q_{r,t}=\begin{cases}
\text{LiveBench task score},&\text{if present}\\
\text{LiveBench overall score},&\text{otherwise if present}\\
\text{catalog quality},&\text{otherwise}\\
\text{conservative fallback},&\text{for an unknown model.}
\end{cases}
\]

All scores are converted to \([0,1]\); percentage values such as `87.5` become `0.875`. Specialty is estimated similarly: a task-specific LiveBench score wins; an explicitly declared specialty maps to `1.0`; `general` maps to `0.58`; the compatible `research`/`writing` and `writing`/`reasoning` pairings map to `0.68` and `0.62`; other mismatches map to `0.38`.

The quality floor is `0.64`, `0.72`, and `0.78` for `simple`, `balanced`, and `complex`. For a complex node with criticality \(\kappa\), the implementation raises the floor to:

\[
f_{b,v}=\operatorname{clamp}\left(0.78+\max(0,\kappa-0.65)\times0.12\right).
\]

The synthesis floor is at least `0.84` in the complex band. This makes final integration stricter than an ordinary execution node.

### 6. Cost and Token Estimation

The estimator uses a stable character-to-token approximation:

\[
T=\max(80,\lceil |x|/3.7\rceil).
\]

Cache ratios are clamped to \([0,1]\), and the write ratio is capped so `read + write <= 1`. For input price \(P_i\), cache-read price \(P_r\), and cache-write price \(P_w\), the effective input price used in candidate ranking is:

\[
P_i^{eff}=(1-\rho_r-\rho_w)P_i+\rho_rP_r+\rho_wP_w.
\]

The task node changes the token budget through fixed multipliers:

| Purpose | Input multiplier | Output multiplier |
| --- | ---: | ---: |
| `analysis` | 0.90 | 0.55 |
| `execution` | 1.20 | 1.00 (`1.45` in `complex`) |
| `verification` | 1.15 | 0.70 |
| `synthesis` | 1.65 | 1.30 |

If \(T_i\), \(T_r\), \(T_w\), and \(T_o\) are total input, cache-read, cache-write, and output tokens for a node, its cost is:

\[
C_{r,v}=\frac{(T_i-T_r-T_w)P_i+T_rP_r+T_wP_w+T_oP_o}{1{,}000{,}000}.
\]

This is a planning estimate in USD. It does not change vendor billing and is not used in single-session mode.

### 7. Quality-Constrained Utility

Each complexity band has a fixed weight vector \(w=(w_q,w_c,w_l,w_s,w_k)\):

| Band | Quality | Cost | Latency | Specialty | Risk |
| --- | ---: | ---: | ---: | ---: | ---: |
| `simple` | 0.30 | 0.50 | 0.14 | 0.04 | 0.02 |
| `balanced` | 0.45 | 0.30 | 0.10 | 0.10 | 0.05 |
| `complex` | 0.55 | 0.16 | 0.06 | 0.16 | 0.07 |

Prices are converted into a cost score using \(C_{max}=\max_r(P_{i,r}^{eff}+P_{o,r})\), the largest effective input-plus-output price among catalog and configured routes:

\[
g_{r}=\operatorname{clamp}\left(1-\frac{(P_i^{eff}+P_o)/2}{C_{max}}\right).
\]

The candidate utility for node \(v\) is:

\[
\begin{aligned}
U(r,v)=&\;w_q q_{r,v}+w_cg_r+w_l(1-l_r)+w_ss_{r,v}-w_kk_r\\
&-0.08\cdot\mathbf{1}[r\text{ was already used}]\\
&-\max(0,f_{b,v}-q_{r,v})\cdot\kappa_v.
\end{aligned}
\]

The last term is a soft penalty for an infeasible quality gap; feasibility is still checked explicitly. Candidates are sorted by \(U\), then routes meeting the node's floor are preferred. If none meet the floor, the highest-scoring candidate is retained and `constraintRelaxed=true` is recorded. This explicit signal is important: a fallback is visible rather than silently presented as fully compliant.

### 8. Greedy Assignment and Diversity

The implementation uses a deterministic greedy pass over the ordered task nodes:

```text
band       <- assessComplexity(request)
taskType   <- classifyTask(request)
routes     <- Harness native available provider/model pairs
metadata   <- catalog + user prices + LiveBench snapshot
tasks      <- taskPackages(taskType, request, band)
used       <- empty route set

for task in tasks:
    score every available route with U(route, task)
    discard floor failures when at least one feasible route exists
    choose the highest-scoring unused route; otherwise best feasible route
    for synthesis, prefer deepseek-v4-pro, then another DeepSeek route
    record assignment and add its provider/model to used
```

The `0.08` duplicate penalty encourages route diversity across stages, which can reduce correlated failure and makes the collaboration less dependent on one endpoint. It is a tie-breaking preference, not a prohibition: when only one route is available, reuse is allowed. Synthesis has an explicit DeepSeek preference in the current implementation; if that preferred route is below its floor, the assignment records the relaxed constraint.

### 9. Budget Repair

After the utility pass, the router computes the total node cost. If `budgetUsd > 0` and the total exceeds the budget, it sorts non-synthesis nodes by ascending criticality. For each node it searches for a different route that both:

1. satisfies the node quality floor; and
2. costs less than the current assignment.

The cheapest qualifying replacement is applied before moving to the next node. Synthesis is excluded from this repair pass because weakening the final integration stage has disproportionate impact. If no legal replacement exists, the router keeps the best available plan and reports `budgetExceeded=true`; it never drops the quality floor merely to make the number fit.

### 10. Collaborative Execution

The plan is executed through the real agent-loop stages rather than by exposing hidden reasoning. Each stage receives the original request and prior durable work reports, then emits a structured report containing conclusions, evidence, unresolved items, and reusable artifacts. Reports are logged as assistant messages in session history. The synthesis stage reads the accumulated history, performs cross-checking and conflict resolution, and produces the user-facing answer in Markdown/KaTeX.

This separation has two guarantees: later stages can verify prior outputs, and the audit panel can show what was assigned without recording private chain-of-thought. Single-session mode bypasses this planner and leaves Harness' native provider/model choice untouched.

### 11. Auditability and Correctness Claims

For a fixed request, available-route list, catalog, settings, and LiveBench snapshot, the scoring and assignment steps are deterministic. The plan records:

```text
objectiveWeights, qualityFloor, subtasks, selected route, synthesizer
costBreakdown, baselineAllStrongCost, estimatedSavings
budgetUsd, budgetExceeded, constraintRelaxed, distinctRoutes
liveBench.source, liveBench.fetchedAt, liveBench.stale, liveBench.error
```

`baselineAllStrongCost` prices every node with the strongest quality candidate available to the planner; `estimatedSavings` compares the selected plan against that baseline. These fields support inspection and regression tests, but they are not proof that a response is correct or that the selected plan is globally optimal.

### 12. Complexity

Let \(n=|R|\) be the number of available routes and \(m=|V|\) the number of task nodes. Candidate scoring and sorting cost \(O(mn\log n)\). Budget repair adds at most another \(O(mn\log n)\) pass. Memory use is \(O(m+n)\). Since Harness sessions normally expose a small catalog and complex requests produce a bounded number of nodes, this heuristic keeps planning latency predictable in a desktop process.

### 13. Worked Example

Consider the request:

```text
Design a complex engineering architecture, split it into modules, write code and tests,
describe deployment, and provide a paper-quality explanation.
```

The length, engineering markers, list-like requirements, and reasoning markers push the request into `complex`. The detected domains include `code`, `writing`, and `research`, so the graph contains modeling, domain execution, and synthesis; a verification node is also added because tests and evaluation are requested.

Assume, for illustration only, that Harness exposes `gpt-5.6-sol`, `deepseek-v4-pro`, and `qwen3.7-plus`, with no LiveBench overrides. The analysis floor is approximately \(0.812\) because its criticality is `0.92`. A first pass may choose `gpt-5.6-sol` or `deepseek-v4-pro` for high-quality reasoning. Once one route is used, the `0.08` diversity penalty can make a still-feasible second route such as `qwen3.7-plus` preferable for a lower-criticality execution package. The synthesis node then prefers `deepseek-v4-pro` when it is available, and the cost breakdown includes the larger synthesis input/output multipliers.

If this first plan exceeds the configured budget, the repair pass examines the least-critical execution package first. It may replace that package with `qwen3.7-plus` only if its task quality remains above the package floor. The final audit record shows every replacement, the resulting total, the all-strong baseline, and whether the budget was still exceeded. Exact choices can change when the native route list, manual prices, cache ratios, or LiveBench snapshot change.

### 14. Limitations and Scope

- Complexity and task detection are keyword-based heuristics; unusual wording can be misclassified.
- Catalog and LiveBench scores are proxies. They do not equal real-world success probability, factuality, or safety, and they do not constitute a quality guarantee.
- Prices and token multipliers are estimates. Provider billing, hidden reasoning tokens, retries, and rate limits may differ.
- The greedy assignment is bounded and auditable, but it is not a proof of global optimality and does not solve a general integer program.
- Only routes currently reported by Harness are candidates. A model can appear in the experimental catalog yet remain unavailable until its provider is configured natively.
- A stale or unavailable LiveBench snapshot is retained or replaced by the experimental baseline and is surfaced in the audit fields.
- A budget that is lower than every quality-feasible plan can remain exceeded; preserving the quality floor takes precedence over an artificial zero-overrun claim.

## Use the router

Collective mode is enabled by default:

```text
/router mode collective
/router plan
```

Send a request after selecting collective mode. Expand **Session mode**, **Collaboration flow**, and **Route analysis** in the GAL view to inspect task directions, quality scores, assignments, estimated cost, quality floors, budget status, LiveBench freshness, and fallback reasons. The panel is an auditable summary and never exposes private model chain-of-thought.

For a follow-up that must stay on one model:

```text
/router mode single
```

Select the provider and model in the native Harness selector, send the request, and return to `/router mode collective` when automatic decomposition is wanted again.

## Verify the installation

After the first launch, check the following:

1. The plugin settings page contains the GAL switch and the model-cost section.
2. A new conversation has a **GAL视窗** tab alongside the native conversation and trace tabs.
3. The GAL tab opens before any message is sent and shows an empty state instead of a JavaScript error.
4. A short message produces a dialogue line with the actual provider/model nameplate.
5. `/router plan` returns a route summary when at least one native model is available.
6. Switching to single mode preserves the model explicitly selected in Harness.

The repository includes keyless regression tests for routing, collaboration, provider repairs, persona identity, archives, typography, and update selection.

## Development and tests

Run these commands from this repository directory:

```powershell
pnpm install
npm test
npm run check:client
```

`npm run build:client` regenerates `.dsh-plugin/client.js` from `.dsh-plugin/client/index.mjs`; commit the generated bundle together with its source. The plugin package is intentionally private and is installed as a local directory or release archive, not published to npm.

## Update, release, and uninstall

To update a native Web profile, download the new release directory/archive and run the same `pnpm dsh plugin --profile web add "<new-directory>"` command, then restart Web. The settings page can open the project Releases page; browser-only profiles cannot write local files themselves.

To remove the plugin from the Web profile:

```powershell
Set-Location $HarnessDir
pnpm dsh plugin --profile web remove model-router-galgame
pnpm dsh web
```

Removing the plugin does not remove provider credentials, model prices, session history, or GAL archives. Delete those separately only when a full reset is intended.

## Repository layout

- `.dsh-plugin/index.mjs`: Host plugin, settings namespace, routing hooks, and commands.
- `.dsh-plugin/client/index.mjs`: Web plugin entry and GAL slot registration.
- `.dsh-plugin/client/GalView.jsx`: GAL view and empty-state-safe rendering.
- `.dsh-plugin/shared/router.mjs`: deterministic routing model and cost estimator.
- `gal-scene.json` and `aipicture/`: default scene and character artwork.
- `scripts/build-client.mjs`: reproducible client bundle generation/check.
- `tests/`: keyless regression tests.

## License and artwork

The source code is released under the MIT License; see [LICENSE](LICENSE). The GAL interaction is inspired by [`Ayase34/gal-view`](https://github.com/Ayase34/gal-view). Character artwork and character concepts are attributed to [Bilibili space 4168597](https://space.bilibili.com/4168597). Artwork in `aipicture/`, scene assets, and screenshots are not automatically covered by the source-code MIT license. Check the source terms and obtain permission before commercial use or redistribution.
