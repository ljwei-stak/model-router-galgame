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

Install this directory into the original Harness Web profile:

```text
dsh plugin --profile web add <plugin-directory>
```

Restart Harness after installation. If no model is available, native model selection remains intact and the conversation is not blocked.

See the [native installation tutorial](../../docs/cookbook/model-router-galgame-installation.md) for the complete setup, provider configuration, desktop, update, and troubleshooting procedure.

## Commands

- `/router mode collective`
- `/router mode single`
- `/router plan`

`collective` is the default. The plugin exposes task labels, scores, assignments, costs, and fallback records; it never exposes private model chain-of-thought.

## Mathematical routing model

For a request `x`, the router derives a task type `t`, complexity band `c`, work-package set `I`, and candidate set `M`. Quality comes from a LiveBench task-category score (then overall, then the experimental baseline); prices come from user overrides or the baseline catalog.

For work package `i` and model `m`:

```text
U(i,m) = wq(c) Q(i,m) + wc(c) C(m) + wl(c) (1 - L(m))
         + ws(c) S(i,m) - wr(c) R(m)
         - lambda * 1[m is already used]
         - kappa * max(0, F(i) - Q(i,m))
```

`F(i)` is the quality floor. Candidates satisfying `Q(i,m) >= F(i)` form the feasible set. A budget `B` is a secondary hard constraint: if the first utility assignment exceeds `B`, lower-criticality stages are replaced by the cheapest feasible candidates until the budget is met or no valid replacement remains. Synthesis prefers DeepSeek V4 Pro and falls back deterministically when unavailable.

The algorithm is wired into the Host request path: `index.mjs` calls `buildPlan` in collective mode and executes the planned stages; single-session mode preserves the explicitly selected model instead of applying the collective override. `router.test.mjs` covers complexity, mixed-domain decomposition, LiveBench and price overrides, and budget fallback; `collaboration.test.mjs` covers multi-stage execution and final synthesis.

With user prices `p_in(m), p_out(m)` and estimated token counts:

```text
Cost(i,m) = (n_in(i) * p_in(m) + n_out(i) * p_out(m)) / 10^6
TotalCost = sum_i Cost(i, assign(i))
Saving = max(0, 1 - TotalCost / BaselineStrongCost)
```

Higher complexity increases the weight of quality, specialty, and criticality constraints; simple requests favor low cost and latency. The implementation is a bounded quality-constrained greedy solver with `O(|I||M| log |M|)` plan generation, suitable for interactive desktop use.

## OpenCode Zen settings

Choose `opencode` or `opencode-go` and enter its API key. Do not set the provider `baseURL` to the OpenCode website. If an official website override such as `https://opencode.ai` is found, the plugin clears it before requests so the model catalog can restore its protocol-specific endpoint. Custom domains are not changed.

## Inspiration, characters, and licensing

The GAL interaction is inspired by [`Ayase34/gal-view`](https://github.com/Ayase34/gal-view). Character artwork and character concepts are attributed to [Bilibili space 4168597](https://space.bilibili.com/4168597). The plugin does not claim an official partnership; artwork in `aipicture/` and screenshots containing them are not automatically covered by the root MIT license. Check the source terms and obtain permission before commercial use or redistribution.

## Desktop application

The root `desktop/` directory provides server/local mode selection and Windows packaging. The desktop window, launcher, and Windows installer use the square icon derived from `DeepSeek_Harness娘.avif`. Source, settings schema, and reproducible build scripts remain in the repository; installers are published through the project Releases.
