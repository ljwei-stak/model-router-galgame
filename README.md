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
