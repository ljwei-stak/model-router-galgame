# Model Router + GALGame

English | [中文](README.zh.md)

A model-routing and GAL conversation plugin for DeepSeek Harness / DSH Desktop. It combines task assignment, cost estimates, model-character dialogue, web tools, and approval integration in one npm package, and runs inside an existing DSH host.

**Current release: 0.4.20** · [npm package](https://www.npmjs.com/package/@ljwei-stak/model-router-galgame) · [GitHub Releases](https://github.com/ljwei-stak/model-router-galgame/releases) · [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop/releases)

## Features

### Model routing and cost estimates

- **Collective mode** is the default. It creates work packages based on task complexity, domain, and dependencies, then selects available models for execution, verification, and final synthesis. Complex tasks run in stages, with each stage's model and assignment recorded.
- **Single-session mode** uses the model selected in the native Harness model selector. The collective router does not override it in this mode.
- **Quality and budget constraints** combine model specialties, LiveBench category scores, input/output prices, cache prices, and latency estimates. Pareto pruning and bounded Beam Search produce assignments and show budget feasibility, relaxed constraints, and fallback results.
- **Editable prices** are available under "模型费用与路由预算" (Model costs and routing budget) in the GAL view settings. Set USD / 1M tokens prices, a per-task budget, and cache ratios; use `provider/model` to override prices for a particular gateway. Cache ratios default to 0.
- **Inspectable cost summaries** show per-stage estimates, expected savings, quality floors, and the models actually used. A failed LiveBench refresh keeps the previous snapshot; if none exists, the experimental baseline is explicitly identified.

Costs and quality scores are routing estimates, not provider bills or guarantees of answer quality. Only callable models already configured in the host participate in routing. Entering prices does not create model accounts or store API keys.

### GAL dialogue and attachments

- Adds a "GAL视窗" (GAL view) tab to conversations, with model-character portraits, name colors, dialogue pagination, and conversation-linked archives. History retains the actual provider/model used.
- Supports scene editing, background and portrait assets, custom fonts, saved layouts, and scene import/export. Character expression applies to final answers; the routing panel shows task summaries and assignments.
- AI replies support Markdown and KaTeX. Wide tables, formulas, and code scroll within the dialogue area. Incomplete or incompatible Markdown falls back to plain text, and user input stays plain text.
- PNG, JPEG, WebP, and GIF images use the host attachment pipeline, with compatible ModLens routes helping text models understand images. Markdown, TXT, JSON, and code files can be supplied as text, with a 4 MB limit per text file. **Binary files such as PDF/DOCX must first be converted to Markdown/TXT**; the current GAL attachment input does not parse their contents directly.

### Web tools, browser access, and approvals

- **ModSearch** connects native `web_search` to ModSearch through the bundle and supplies `read_page` / `x_search`.
- **Ego Browser** provides visible browser tools for tasks requiring JavaScript, login sessions, or page interaction. The router guides models to switch to the browser after search failures; users complete CAPTCHAs and human verification.
- **Approval integration** attaches work-package, stage, model, and task-count context to sandbox escalation requests in multi-task work. Approval decisions, human confirmation, auditing, and learning are handled by `@ljwei-stak/dsh-approval-gate` and the host permission policy. Installing the router does not enable automatic approval.
- **OpenCode Zen compatibility** repairs OpenCode endpoint overrides mistakenly set to official website URLs while preserving custom gateways.

### Separate plugin and desktop updates

"GAL 视窗 → 项目更新" (GAL view → Project updates) checks the plugin's npm version and the official DSH Desktop version separately. It offers "仅更新 npm 插件" (Update only the npm plugin), "仅更新完整客户端" (Update only the full client), and "一键更新插件与客户端" (Update plugin and client). Desktop plugin installation runs through the authenticated host connection. Fully exit and restart DSH Desktop after a successful installation.

A page opened in a regular browser can check the plugin version and open download pages, but cannot install the desktop client or change its profile directly. The plugin's `0.4.20` version and DSH Desktop's version are independent.

## Installation

### 1. Check the environment

| Environment | Requirements and installation entry point |
| --- | --- |
| DSH Desktop installed | Verified with DSH Desktop 2.0.5. On Windows / macOS, use "打开 DSH 终端" (Open DSH terminal) in Settings. If this entry is unavailable, use the CLI instructions below with the actual profile. |
| Harness Web / CLI | Verified with `@deepseek-ai/dsh@0.1.2-rc.1`. Requires working `dsh` and `pnpm` commands and an explicit `--profile`. |
| Node.js | The plugin declares `>=22.19`; the official CLI above requires `^22.19.0` or `>=24.0.0`. Node.js 24 is recommended. Prefer the bundled runtime for desktop installations. |
| Models and network | Configure at least one working model provider. Installation requires access to `https://registry.npmjs.org/`. |

Installing this npm package does not install DSH Desktop, model services, or a browser. If the desktop client is not installed yet, download it from the [official DSH Desktop Releases](https://github.com/anywhere-labs/dsh-desktop/releases).

### 2A. DSH Desktop: install into the current profile

1. Launch DSH Desktop, select the profile you use, and open **"DSH 终端" (DSH terminal)** from the Settings page header.
2. Run these commands in that terminal. It is already bound to the current profile; do not assume the profile is named `desktop`:

```sh
dsh --version
dsh plugin add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@0.4.20
```

3. After installation succeeds, use the desktop restart control, or explicitly quit from the system tray and reopen the app. Select the same profile. Closing the window may only hide the application.

No GitHub clone or fixed working directory is required. A global `dsh` in a regular terminal may use a different data directory, so use the terminal opened by the desktop app for desktop installation. Open a new terminal after switching profiles; an existing terminal remains bound to its original profile.

### 2B. Harness Web / CLI: install into a specific profile

These examples install only into `web`. For a custom profile, replace every `web` in the commands with its actual name and use the same `DSH_HOME` as the host.

If you do not have a global `dsh` but already have Node.js/npm and pnpm, replace `dsh` at the start of each command below with `npx @deepseek-ai/dsh@0.1.2-rc.1`, for example `npx @deepseek-ai/dsh@0.1.2-rc.1 --version`.

```sh
dsh --version
dsh plugin --profile web add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@0.4.20
dsh --profile web --dump-config
```

After installation, stop the old process using that profile, then start Web:

```sh
dsh web
```

Open the URL printed in the terminal. Do not run two host processes on the same profile. For a custom profile, use the host's corresponding launch configuration.

If you run from a Harness source checkout with dependencies installed and the build completed, replace `dsh` at the start of these commands with `pnpm dsh` and run them from the **Harness repository root**. Do not run `pnpm dsh` from this plugin directory; the plugin has no host startup command.

### 3. Check the installation

For desktop, run this in the DSH terminal opened by the app:

```sh
dsh --dump-config
```

For Web / CLI, use `dsh --profile web --dump-config`. The combined configuration should include all five plugins below, with no duplicate loader IDs. A configuration dump does not replace checking that the host starts successfully. Install only the Router aggregate package; its dependencies and bundle entries are added automatically.

| Plugin | Pinned version for 0.4.20 | Purpose |
| --- | --- | --- |
| `@ljwei-stak/model-router-galgame` | `0.4.20` | Routing, GAL view, and update controls |
| `@liustack/modlens` | `3.25.4` | Image understanding through compatible routes |
| `@liustack/modsearch` | `5.10.1` | Search and page reading |
| `@ljwei-stak/dsh-ego-browser` | `0.8.3` | Visible browser tools |
| `@ljwei-stak/dsh-approval-gate` | `0.5.3` | Approval policies and auditing |

`schemastery@3.18.0` is also installed automatically. It is a runtime dependency, not a sixth standalone plugin. These dependencies are pinned: updating Router uses the dependency combination declared by the new Router package, rather than updating every dependency to its own `latest`.

Create a conversation in DSH and confirm that the **"GAL视窗" (GAL view)** tab appears. If it is missing, first confirm the profile, restart the host, and check "启用 GAL 视窗" (Enable GAL view) in Settings.

## First use

1. Configure a provider and credentials in the host's "设置 → 模型" (Settings → Models), then confirm that ordinary chat can respond. No particular model vendor is required.
2. Open "GAL视窗". Run `/router mode single` to choose a model manually, or `/router mode collective` to let the plugin assign tasks.
3. After sending a task, run `/router plan` to view its plan. Until a plan has been generated, the command reports that none is available.
4. Enter your provider's actual prices under "模型费用与路由预算" (Model costs and routing budget). Start with the default budget and cache ratios, then adjust them based on confirmed prices and cache support.
5. Configure a ModLens vision engine for image understanding. For web interaction, follow Ego Browser's browser setup and login prompts. Installing dependencies does not configure these external services.

| Command | Purpose |
| --- | --- |
| `/router mode collective` | Switch to collective mode, assigning subsequent tasks according to routing plans |
| `/router mode single` | Keep the model chosen in the native model selector |
| `/router plan` | Show the latest routing plan for the current conversation |
| `/router safety` | Show approval bridge status and the current stage context |
| `/router web` | Show declared web capabilities, host service detection, and task strategy |

The default mode is `collective`. `/router safety` and `/router web` are status summaries; they do not certify that end-to-end approval or browser diagnostics have passed. Routing summaries do not expose private model chain-of-thought.

## Updating and uninstalling

### Update the plugin

Desktop users already running `0.4.20` can open "GAL 视窗 → 项目更新" (GAL view → Project updates), click "检查更新" (Check for updates), then choose "仅更新 npm 插件" (Update only the npm plugin). The host queries npm again, installs the exact version, and avoids downgrades. Fully exit and restart DSH Desktop afterward.

You can also update manually in the DSH terminal for the current profile:

```sh
pnpm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
dsh plugin add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@latest
```

For Web / CLI, replace the second command with `dsh plugin --profile web add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@latest`, then restart the Web host. If your local installation is a newer development version, compare the query result first and avoid replacing it with `@latest`.

| Component | Release source | How the update takes effect |
| --- | --- | --- |
| Router and its pinned dependency combination | [This plugin's npm package](https://www.npmjs.com/package/@ljwei-stak/model-router-galgame) | Update the current profile and restart the host |
| Full DSH Desktop client | [Official desktop Releases](https://github.com/anywhere-labs/dsh-desktop/releases) | Follow the native desktop updater's prompts |
| This plugin's source and package downloads | [This repository's Releases](https://github.com/ljwei-stak/model-router-galgame/releases) | View release history or download source/packages; this is not the desktop client update source |

"一键更新插件与客户端" (Update plugin and client) performs both updates as needed. Installing the full client does not replace updating the plugin. In a browser-only session, the buttons open the relevant pages.

### Uninstall

For desktop, run this in its DSH terminal:

```sh
dsh plugin remove @ljwei-stak/model-router-galgame
```

For Web / CLI, use `dsh plugin --profile web remove @ljwei-stak/model-router-galgame`. Restart the host afterward. Do not delete the entire profile or model credentials directory to uninstall the plugin.

## Installation troubleshooting

| Symptom | Action |
| --- | --- |
| `dsh` / `pnpm` not found, or `ERR_PNPM_NO_SCRIPT` | On desktop, use "打开 DSH 终端" (Open DSH terminal). For source installations, confirm you are running from a configured Harness repository root. |
| `No matching version found` / mirror 404 | Query the official registry with `pnpm view` as shown above. Keep `--registry=https://registry.npmjs.org/` in the installation command. |
| Installation succeeds but the GAL tab is missing | Confirm that installation and startup use the same profile and `DSH_HOME`. Fully restart, then check "启用 GAL 视窗" (Enable GAL view). |
| `duplicate loader entry id` | A dependency may be installed separately and also loaded by the Router bundle in the same profile. Remove only standalone entries confirmed to be duplicates. |
| `EADDRINUSE` / `task-board ledger is already owned` | Shut down the old host process using that profile normally. Changing the port does not release the profile lock. |
| Image understanding fails | Check the ModLens engine, credentials, and available routes. Convert PDF/DOCX files to text first. |
| Update check fails | Check npm / GitHub connectivity. "Unable to confirm version" does not mean the installation is current. |

For example, only after confirming that ModLens is a duplicate standalone dependency in the same profile, run:

```sh
dsh plugin remove @liustack/modlens
dsh plugin add --save-exact --registry=https://registry.npmjs.org/ @ljwei-stak/model-router-galgame@0.4.20
```

For Web / CLI, add `--profile web` after `plugin` in both commands. Handle other duplicate dependencies according to the actual error; do not remove all plugins at once. These removal commands are unnecessary when no duplicate entry exists.

## Local development installation

Install from source when modifying the plugin; use the npm package for normal use. Clone the repository in your development directory, then install the local directory from the host's DSH terminal:

```sh
git clone https://github.com/ljwei-stak/model-router-galgame.git
dsh plugin add /absolute/path/to/model-router-galgame
```

Replace the path with the actual absolute path and quote it if it contains spaces. For Web / CLI, use `dsh plugin --profile web add <actual-path>`. The npm package includes ready-to-load build output, but excludes the full client source, tests, and original assets.

After modifying client source, run `npm test`, `npm run build:client`, and `npm run check:client` in the plugin repository. The current build script depends on build output from an adjacent `DSH-Desktop` source checkout and on esbuild. Installing this plugin's npm dependencies alone is not enough to set up the complete build environment. A `SKIP` result does not count as successful build verification.

## Mathematical routing model

This section describes the implementation in the form of the research framework in
`RESEARCH_PAPER_FRAMEWORK.md`. The production router and the offline experiment
plugin share the same objective, quality floors, cost model, and fallback semantics.
The production implementation adds Pareto pruning and bounded global search so that
the result is not merely a sequence of unrelated local choices.

### 1. Problem definition

For a request `x`, the router constructs:

```text
t       task type: general, code, math, research, writing, summarization, vision
c       complexity band: simple, balanced, or complex
I       ordered work-package set
M       discovered provider/model routes
F(i)    quality floor for work package i
B       optional per-request budget in USD
```

The assignment is $\pi: I \to M$. The primary objective is to maximize multi-objective
utility while satisfying quality constraints. When a budget is configured, it is a
hard secondary constraint:

$$
\begin{aligned}
\text{maximize}\quad & \sum_{i \in I} U(i,\pi(i)) \\
\text{subject to}\quad & Q(i,\pi(i)) \ge F(i), && \forall i \in I \\
& \sum_{i \in I} \mathrm{Cost}(i,\pi(i)) \le B
\end{aligned}
$$

If no model satisfies a particular floor, the router chooses the highest-quality
available fallback and records `constraintRelaxed: true`; it never silently claims
that an unavailable constraint was satisfied.

### 2. Request analysis and work-package construction

Task classification is signal based and deterministic. The classifier counts explicit
markers for code, mathematics, research, writing, summarization, and vision, then
uses the strongest signal as the primary type while retaining all detected types for
complex-task decomposition.

Complexity is a bounded score assembled from text length, list/requirement density,
domain markers, code/reasoning markers, and vision markers. The bands are:

$$
\begin{aligned}
\text{simple:}\quad & 0.00 \le \mathrm{complexity} < 0.34 \\
\text{balanced:}\quad & 0.34 \le \mathrm{complexity} < 0.66 \\
\text{complex:}\quad & 0.66 \le \mathrm{complexity} \le 1.00
\end{aligned}
$$

Simple and balanced requests use one execution package. A complex request is expanded
into a small DAG-like sequence:

```text
analysis -> domain execution packages -> optional verification -> synthesis
```

Every package has an id, type, purpose, criticality, quality floor, and `dependsOn`
list. The default floors are `0.75`, `0.78`, and `0.82` for simple, balanced, and
complex work. A complex synthesis package has a minimum floor of `0.84`; critical
non-synthesis packages receive a small additional floor based on criticality.

### 3. Model quality, specialty, cost, and risk

For route `m` and task type `t`, quality is resolved in this order:

$$
Q(m,t)=
\begin{cases}
\text{LiveBench category score}, & \text{when available};\\
\text{LiveBench overall score}, & \text{otherwise};\\
\text{catalog quality baseline}, & \text{otherwise}
\end{cases}
$$

Specialty `S(m,t)` is `1.0` for an explicit catalog specialty, `0.58` for a general
task, and a deterministic partial match for related domains. Risk `R(m)` and latency
`L(m)` are normalized catalog values; user pricing overrides only affect cost.

With input/output prices in USD per one million tokens, cache-aware cost is:

$$
\mathrm{Cost}(i,m)=
\frac{(n_{in}-n_{cache\_read}-n_{cache\_write})p_{in}
      +n_{cache\_read}p_{cache\_read}
      +n_{cache\_write}p_{cache\_write}
      +n_{out}p_{out}}{10^6}
$$

The cache ratios are clamped to `[0,1]` and write ratio cannot overlap the read ratio.
If no cache ratio is configured, ordinary input pricing is used.

### 4. Multi-objective utility

The implementation uses the normalized cost score
$C_{\mathrm{norm}}=1-p_{\mathrm{effective}}/p_{\max}$, so a lower price receives a
larger utility contribution. For a
work package `i` and candidate `m`:

$$
\begin{aligned}
U(i,m)={}&w_q(c)Q(i,m)+w_c(c)C_{\mathrm{norm}}(m)+w_l(c)(1-L(m))\\
&+w_s(c)S(i,m)-w_r(c)R(m)\\
&-\lambda\,\mathbb{1}[m\text{ already used}]
-\kappa\max(0,F(i)-Q(i,m))\\
&+\mathrm{synthesis\_bonus}(i,m)
\end{aligned}
$$

The default weight vectors are:

| Complexity | Quality | Cost | Latency | Specialty | Risk |
|---|---:|---:|---:|---:|---:|
| simple | 0.30 | 0.50 | 0.14 | 0.04 | 0.02 |
| balanced | 0.45 | 0.30 | 0.10 | 0.10 | 0.05 |
| complex | 0.55 | 0.16 | 0.06 | 0.16 | 0.07 |

For synthesis, the quality-oriented vector is `0.70/0.10/0.04/0.10/0.06`, and
DeepSeek V4 Pro receives a small deterministic preference bonus when present. The
bonus is soft: if that route is unavailable, the normal feasible ranking remains in
force. Reusing a route costs `0.08` utility; changing routes across a dependency
boundary costs `0.015` in the global assignment search.

### 5. Production algorithm: Pareto-pruned constrained beam assignment

The current Host router is a bounded global solver with five stages.

#### 5.1 Candidate discovery and quality filtering

For each work package, routes below its quality floor are removed when at least one
qualified route exists. If none exists, at most the three highest-quality routes are
retained and the package is marked as relaxed. This makes constraint failure visible
and bounds the work on large model catalogs.

#### 5.2 Pareto pruning

Candidate `a` dominates candidate `b` for the same package when it is no worse in all
five dimensions and strictly better in at least one:

$$
Q(a)\ge Q(b),\quad \mathrm{Cost}(a)\le\mathrm{Cost}(b),\quad L(a)\le L(b),\quad
S(a)\ge S(b),\quad R(a)\le R(b)
$$

Dominated candidates cannot improve quality, cost, latency, specialty, or risk. The
router keeps the Pareto frontier plus three anchors: the cheapest candidate, the
highest-utility candidate, and the highest-quality candidate. The per-package pool is
limited to 12 routes.

#### 5.3 Dependency-aware beam search

Each beam state stores the partial assignment, route selected for every completed
package, total cost, utility, number of dependency handoffs, and accumulated quality
shortfall. States are expanded in package order. A child receives the candidate
utility minus `0.015` for every dependency edge that crosses to a different route.
The beam width is 256. Ties are resolved by quality shortfall, utility, cost,
handoffs, and finally lexical provider/model order, making repeated plans stable.

The search first minimizes constraint violations, then quality shortfall, and then
maximizes utility. With a budget, suffix minimum-cost bounds prune partial states that
cannot possibly fit the remaining budget.

#### 5.4 Budget strategy

The router evaluates three plans:

1. an unconstrained utility plan;
2. a utility plan that must fit `B`;
3. when (2) is infeasible, a minimum-cost plan that still preserves every available
   quality floor.

If no floor-preserving plan exists, the least-cost best-quality fallback is returned,
`budgetExceeded` and/or `constraintRelaxed` are exposed in the audit record, and the
UI explains why the target could not be met. This is a global replacement strategy,
not a greedy “replace the last stage” rule.

#### 5.5 Production pseudocode

```text
BuildPlan(x, M, B):
  (t, c, I) <- AnalyzeRequest(x)
  for i in I:
      P_i <- FeasibleCandidates(i, M)
      P_i <- ParetoPrune(P_i) + {cheapest, best-utility, best-quality}
  plan <- BeamAssign(I, P, B = infinity)
  if B > 0:
      budgetPlan <- BeamAssign(I, P, B)
      plan <- budgetPlan if feasible
              else BeamAssign(I, P, minimize total cost)
  return auditable assignments, costs, floors, handoffs, and fallback flags
```

### 6. Experiment algorithms

The `experiment-plugin` contains standalone implementations used by the six paper
experiments. They are intentionally deterministic and use the same model schema as
the Host router.

**QCG-Router (quality-constrained greedy / Pareto variant)**

QCG evaluates every model in $O(\lvert M\rvert)$, predicts quality from the baseline score plus a
specialty bonus, removes candidates below `F(i)`, computes the five-objective utility,
and selects the first Pareto/utility candidate. If the feasible set is empty, it
returns the highest-quality fallback with `constraintRelaxed: true`.

**AMO-Router (adaptive multi-objective routing)**

AMO starts from the paper's complexity-specific weights. After observing actual cost
and quality it computes:

$$
e_{cost}=\mathrm{clamp}\!\left(\frac{\mathrm{actual\_cost}-\mathrm{target\_cost}}
 {\max(\mathrm{target\_cost},\varepsilon)}\right),\qquad
v_q=\max(0,\mathrm{quality\_floor}-\mathrm{actual\_quality})
$$

The feedback is exponentially smoothed (`0.10`). Positive cost error increases cost
pressure; a quality violation increases quality and specialty pressure. Weights are
projected back to the positive simplex after every update, so they remain finite,
positive, and sum to one. This fixes the sign ambiguity that could previously reduce
cost pressure when observed cost was too high.

**DAG-Assign (dependency-aware task allocation)**

DAG-Assign uses Kahn topological sorting, rejects unknown edge endpoints and cycles,
and computes criticality as the number of unique descendants plus `100` for a
synthesis node. For every node it keeps the QCG Pareto candidates, then runs a bounded
beam assignment with dependency handoff penalties, a synthesis quality bonus, and a
criticality bonus. Budget pruning uses suffix lower bounds; if the budget is
impossible, the result explicitly reports `budgetFeasible: false` instead of silently
assigning a below-floor model.

### 7. Complexity and correctness properties

Let $N=\lvert M\rvert$, $K\le 12$ be the retained candidate pool,
$P=\lvert I\rvert$, and $W=256$ be
the beam width. The current implementation has the following bounded worst-case
costs:

| Component | Time complexity | Space complexity |
|---|---:|---:|
| Candidate scoring | $O(PN)$ | $O(PN)$ |
| Pairwise Pareto pruning | $O(PN^2)$ | $O(PN)$ |
| Beam assignment | $O(PWK)$ | $O(WK+P)$ |
| DAG topological sort | $O(\lvert V\rvert+\lvert E\rvert)$ | $O(\lvert V\rvert+\lvert E\rvert)$ |

The constants are small for desktop catalogs, and all loops are bounded by the
discovered routes, 12 candidates per package, and beam width 256.

The following invariants are enforced and exposed in the result:

1. **Quality guarantee**: if a qualified candidate exists for a package, every normal
   assignment considered by the solver satisfies $Q\ge F$.
2. **Budget guarantee**: a plan marked `budgetFeasible: true` has estimated total cost
   no greater than `B`, subject to the configured token and price estimates.
3. **Dependency guarantee**: every collaboration stage is emitted in topological
   order, and handoff count is recorded.
4. **Determinism**: equal scores use stable cost and route-id tie breakers; repeated
   input/catalog/settings produce the same plan.
5. **Graceful degradation**: no models, failed providers, stale LiveBench data, and
   unsatisfied floors are represented as explicit fallback metadata rather than
   blocking the native Harness request path.

The beam solver is deliberately bounded. It provides an auditable, deterministic
near-optimal heuristic for interactive desktop routing, not a formal global-optimum
guarantee for arbitrary DAGs. A larger beam improves search coverage at the cost of
latency; Pareto pruning and suffix lower bounds keep the default `W = 256` practical.

### 8. Cost and audit outputs

For every plan the router reports:

$$
\begin{aligned}
\mathrm{TotalCost}&=\sum_{i\in I}\mathrm{Cost}(i,\mathrm{assign}(i)),\\
\mathrm{BaselineCost}&=\text{cost of the strongest available model per package},\\
\mathrm{EstimatedSaving}&=\max\!\left(0,1-\frac{\mathrm{TotalCost}}{\mathrm{BaselineCost}}\right)
\end{aligned}
$$

The plan also contains per-stage token estimates, cache read/write tokens, predicted
quality, quality floor, provider/model, Pareto-pruned count, beam width, handoff count,
budget feasibility, and whether constraints were relaxed. `/router plan` and the GAL
analysis panel display these audit fields; neither exposes private model chain of
thought.

The algorithm is wired into the Host request path: `index.mjs` calls `buildPlan` in
collective mode and executes the planned stages. Single-session mode preserves the
explicitly selected model instead of applying the collective override. The regression
suite covers complexity, mixed-domain decomposition, LiveBench and price overrides,
budget behavior, Pareto pruning, AMO feedback direction, DAG ordering, multi-stage
execution, and final synthesis.

## OpenCode Zen settings

Choose `opencode` or `opencode-go` and enter its API key. Do not set the provider `baseURL` to the OpenCode website. If an official website override such as `https://opencode.ai` is found, the plugin clears it before requests so the model catalog can restore its protocol-specific endpoint. Custom domains are not changed.

## Inspiration, characters, and licensing

The GAL interaction is inspired by [`Ayase34/gal-view`](https://github.com/Ayase34/gal-view). Character artwork and character concepts are attributed to [Bilibili space 4168597](https://space.bilibili.com/4168597). The plugin does not claim an official partnership; artwork in `aipicture/` and screenshots containing them are not automatically covered by the root MIT license. Check the source terms and obtain permission before commercial use or redistribution.

## Desktop application

DSH Desktop is versioned and distributed separately from this plugin. Full-client updates use the official [`anywhere-labs/dsh-desktop` Releases](https://github.com/anywhere-labs/dsh-desktop/releases); plugin updates use the official npm package `@ljwei-stak/model-router-galgame` and must be checked and installed independently.



