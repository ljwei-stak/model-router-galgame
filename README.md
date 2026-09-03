# Model Router + GALGame

English | [中文](README.zh.md)

This plugin installs on an original DeepSeek Harness checkout. It adds a cost-aware collective router on the Host side and a GAL conversation view with archives, model portraits, and Markdown/KaTeX rendering in the browser.

## Features

- **Collective mode** decomposes complex requests into work packages. Modelling, domain execution, verification, and synthesis may be assigned to different models.
- **Single-session mode** preserves the native Harness model selector. The collective optimizer never overwrites a model explicitly selected for a single session.
- **Quality-constrained cost optimization** extracts code, math, research, vision, and other business directions into separate work packages, then scores feasible candidates by LiveBench category quality, task specialty, input/output price, latency, and risk. High-criticality work stays with stronger models; repetitive, verifiable work is routed to lower-cost models when the floor allows it.
- **LiveBench snapshots** default to the official site root, discover the newest release, and parse its `table_YYYY_MM_DD.csv` plus `categories_YYYY_MM_DD.json` assets. User-provided JSON/CSV mirrors are also supported. A failed refresh keeps the last successful snapshot; with no snapshot, the router uses the checked-in experimental baseline and labels the plan as not network-verified.
- **Manual prices and budgets** are edited in the plugin settings page: input, output, cache-read, cache-write prices (USD per 1M tokens), LiveBench endpoint/TTL, per-task budget, and optional cache read/write ratios. A `provider/model` key can override the same model's price for a specific gateway. Ratios default to zero and should only be set when the provider actually enables prompt caching. User overrides take precedence over the experimental catalog and never contain API keys.
- **Auditable cost breakdown** estimates input/output tokens per work package and reports total cost, all-strong baseline, estimated savings, quality floors, budget status, and the number of distinct routes.
- **GAL view** turns each new conversation into an archive. Every line retains its actual provider/model, so the nameplate, color, and portrait follow the active model. ERNIE, Wenxin, and Baidu provider/model identifiers consistently select `ERNIE娘` and `ernie1.png`. The route explanation is an auditable summary, not private model chain-of-thought.
- **Markdown/KaTeX** reuses Harness `MarkdownText` for headings, lists, tables, quotes, code, links, and formulas. Wide content scrolls inside the dialogue box; player input remains plain text.
- **Attachments and multimodality** use the native image pipeline and extract Markdown/TXT/JSON/code as text. PDF/DOCX and other binary files keep an explicit parsing state rather than silently inventing content.
- **OpenCode Zen compatibility** repairs official website overrides to the catalog-owned `/zen` and `/zen/v1` endpoints while leaving custom gateways untouched.
- **Release updates and desktop support** provide release checks and a one-click updater. When the desktop is outdated it updates the full client and bundled plugin; otherwise it updates only the plugin. Browser-only installs open Releases because they cannot write local files.

## Installation

### Requirements

- DeepSeek Harness / DSH Desktop 0.4.8 or newer.
- Node.js 22.19 or newer (the current DSH Desktop release uses Node 24).
- At least one LLM provider configured in Harness.
- A network connection to the npm registry for the first installation.

### Recommended: install the published npm package

The package is public and already includes the official `@liustack/modlens@3.25.4` bundle. You do not need to install Docker, Python, a ModLens server, or a second ModLens package.

1. Open PowerShell in the DSH Desktop checkout:

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
```

2. Use the official npm registry. This avoids a temporary 404 when a mirror has not synchronized a newly published package:

```powershell
pnpm config set registry https://registry.npmjs.org/
pnpm config get registry
```

The second command should print `https://registry.npmjs.org/`.

3. Install into the profile you use:

```powershell
# Query the newest version that is actually visible on npm.
$routerVersion = npm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
$routerVersion

# Web profile
pnpm dsh plugin --profile web add "@ljwei-stak/model-router-galgame@$routerVersion"

# Desktop profile (use this when the desktop application runs the desktop profile)
pnpm dsh plugin --profile desktop add "@ljwei-stak/model-router-galgame@$routerVersion"
```

The public registry may lag behind a just-created release. After publication,
the same commands automatically use the newest visible version. If npm reports
`No matching version found`, do not guess a version: rerun the query and use the
version it prints.

If you do not want to change the global pnpm registry, add this option to the `add` command instead:

```powershell
$routerVersion = npm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
pnpm dsh plugin --profile web add --registry=https://registry.npmjs.org "@ljwei-stak/model-router-galgame@$routerVersion"
```

4. Verify that the router and its ModLens dependency are present:

```powershell
pnpm dsh --profile web --dump-config | Select-String "model-router-galgame|modlens"
```

The output should contain:

```text
@ljwei-stak/model-router-galgame
@liustack/modlens
```

Do not add `@liustack/modlens` separately after installing this package. The
router already includes the official ModLens bundle. If you previously added
ModLens separately to the same profile, remove that standalone dependency first,
then reinstall the router:

```powershell
pnpm dsh plugin --profile web remove @liustack/modlens
pnpm dsh plugin --profile web add "@ljwei-stak/model-router-galgame@$routerVersion"
```

5. Stop any already-running DSH process, then start the selected profile:

```powershell
pnpm dsh web
# or, for the desktop profile:
pnpm dsh --profile desktop
```

Do not start a second process on the same profile. If port 3080 is already in
use, or startup says `task-board ledger is already owned by process ...`, close
the existing DSH process before retrying. You can use another port only after
the old process has released its profile lock:

```powershell
pnpm dsh web --no-open --port 3081
```

### Verify ModLens

Run the diagnostic from the installed Web profile (the command is forwarded to
the profile's installed binary):

```powershell
pnpm dsh plugin --profile web exec modlens doctor
```

Configure the vision provider in the DSH settings page or in `C:\Users\<your-user>\.modlens\config.json`. Then create a conversation, upload an image, and ask the model to transcribe or explain it. Text-only models appear with a `(modlens vision)` entry when a compatible upstream route is available.

### Update

To install the newest version visible on npm:

```powershell
$routerVersion = npm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
pnpm dsh plugin --profile web add "@ljwei-stak/model-router-galgame@$routerVersion"
```

For a reproducible deployment, replace `$routerVersion` with a concrete version
that you have verified with `npm view` (for example `0.4.12`):

```powershell
pnpm dsh plugin --profile web add @ljwei-stak/model-router-galgame@0.4.12
```

You can also ask pnpm to update an already-installed package within its declared
version range:

```powershell
pnpm dsh plugin --profile web update @ljwei-stak/model-router-galgame
```

Restart DSH after updating. Repeat the same command with `--profile desktop` for the desktop profile.

### Clean reinstall after a loader or profile error

If startup reports `duplicate loader entry id: modlens`, it means the same
ModLens bundle was installed separately and is also included by the router.
Stop DSH, remove the standalone ModLens dependency, and add the router again:

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
pnpm dsh plugin --profile web remove @liustack/modlens
$routerVersion = npm view @ljwei-stak/model-router-galgame version --registry=https://registry.npmjs.org/
pnpm dsh plugin --profile web add "@ljwei-stak/model-router-galgame@$routerVersion"
pnpm dsh --profile web --dump-config | Select-String "model-router-galgame|modlens"
```

The dump should show one `modlens` row and one `model-router-galgame` row. If the
error is `EADDRINUSE` on port 3080, or `task-board ledger is already owned by
process ...`, an old DSH process is still running; close that process before
starting another instance, or choose another port:

```powershell
pnpm dsh web --no-open --port 3081
```

### Local development installation

To test the checkout in `F:\DeepSeek_harness` without downloading from npm:

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
pnpm dsh plugin --profile web add F:\DeepSeek_harness\model-router-galgame
```

The local path form is only for development. The installed package is still named `@ljwei-stak/model-router-galgame` after the package is published.

### Remove the plugin

```powershell
cd F:\DeepSeek_harness\DSH-Desktop
pnpm dsh plugin --profile web remove @ljwei-stak/model-router-galgame
pnpm dsh plugin --profile desktop remove @ljwei-stak/model-router-galgame
```

Removing the router also removes its profile layer. It does not delete your provider credentials or `C:\Users\<your-user>\.modlens\config.json`.

If no model is available, native model selection remains intact and the conversation is not blocked. For the full provider setup and troubleshooting guide, see [INSTALLATION_GUIDE.zh.md](INSTALLATION_GUIDE.zh.md) and [MODLENS_DEPLOYMENT.md](MODLENS_DEPLOYMENT.md).

## Commands

- `/router mode collective`
- `/router mode single`
- `/router plan`

`collective` is the default. The plugin exposes task labels, scores, assignments, costs, and fallback records; it never exposes private model chain-of-thought.

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

The root `desktop/` directory provides server/local mode selection and Windows packaging. The desktop window, launcher, and Windows installer use the square icon derived from `DeepSeek_Harness娘.avif`. Source, settings schema, and reproducible build scripts remain in the repository; installers are published through the project Releases.
