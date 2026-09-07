# DeepSeek Expression Edits

Status: complete. All five expressions were generated through the user-authorized gateway adapter, downloaded, validated, and visually inspected. Final PNGs and RGB WebP assets are present, together with `expression-contact-sheet.png` (original plus five expressions) and `asset-manifest.json`. The initial bundled CLI failure is retained only as historical context in `gateway-edit-check.md`; the URL response compatibility issue is resolved. No image-generation requests are still running. Never paste a key into chat, prompts, source files, or this document.

The edit target is the existing `aipicture/DeepSeek1.png` (1052 by 1870, RGBA). Each request used that original directly, with prompts to preserve the same adult character, clothing, pose, hands, silhouette, and white background. All final game assets are 1024 by 1824. The provider returned smaller images with nearly the requested aspect ratio; originals are retained as `deepseek-{expression}-source.png`. Adaptation used uniform scaling and white padding without cropping.

| Expression | Provider Image | Final PNG / WebP | WebP Bytes |
| --- | --- | --- | --- |
| happy | 940 x 1672 | 1024 x 1824 | 204306 |
| shy | 941 x 1672 | 1024 x 1824 | 205600 |
| sad | 941 x 1672 | 1024 x 1824 | 201688 |
| angry | 864 x 1536 | 1024 x 1824 | 202554 |
| thoughtful | 862 x 1536 | 1024 x 1824 | 195764 |

The five WebP files use RGB, quality 90, method 6, totaling 1,009,912 bytes. Their filenames are `deepseek-happy.webp`, `deepseek-shy.webp`, `deepseek-sad.webp`, `deepseek-angry.webp`, and `deepseek-thoughtful.webp` in this directory. Same-name PNGs remain available for review.

Visual QA: the adult character identity, full-body pose, clothing, and general eye placement remain consistent; expressions differ visibly in brows, eyes, mouth, and blush. Fine clothing and hair details were lightly redrawn by the model, so these are not pixel-identical body layers. Against the normalized original, the first four variants' dark-pixel outer bounds differ by at most 3 pixels. The thoughtful image has one extra fine hair strand extending 32 pixels above the original hair boundary and a 3-pixel difference at the feet. No additional paid redraw was requested for these small differences. The six-column contact sheet uses the same face/upper-body crop for each image and Chinese Microsoft YaHei labels.

Validation: 21 offline adapter tests passed. All five outputs decode as nonblank PNGs and RGB WebP at the intended final dimensions. The adapter submitted one paid edit request per expression; the HAPPY result was recovered from its saved response after local size validation, without another image API request. The separate initial bundled-CLI attempt is recorded in the historical gateway check.

Runtime used for the completed generation:

- Python and the original image CLI came from the locally installed Codex runtime and imagegen skill; their installation paths vary by machine.
- Independent environment: `test-artifacts/imagegen-venv/`, relative to the repository root.
- The independent environment contains `openai==3.8.0` and `pillow==12.3.0`.
- The environment was created from the bundled Python. Its directory is already ignored by Git through `test-artifacts/`.
- The bundled and system Python packages were not modified.
- `uv` was not on PATH during the recorded generation.

After the initial bundled CLI attempt could not save the gateway response, the user explicitly authorized the project adapter `scripts/generate-gal-expressions.py`. It accepts either `data[0].b64_json` or an HTTPS `data[0].url`; it does not change the skill's CLI. The adapter sends at most one API request per invocation and disables automatic API retries. It omits `response_format` by default, preserving the accepted edit parameters instead of guessing which format flag the gateway supports.

Real generation requires `OPENAI_API_KEY` and the selected `OPENAI_BASE_URL` in the invoking process. The following PowerShell commands pass the configured user variables into that child process without printing their values. The standalone HTTPS image downloader receives no API Authorization header and rejects redirects to HTTP.

Trackable diagnostics contain only response field types, lengths, hashes, and output metadata. Raw responses and original image bytes are retained in the Git-ignored `test-artifacts/imagegen-private/` directory. On Windows, that directory grants access only to the current user and SYSTEM. Never attach those raw response files, since returned URLs may contain signed credentials.

From the repository root, use a local Python environment with the dependencies above. The following PowerShell example resolves the project environment and passes configured credentials to each independent edit. On a fresh machine, create that environment or set `$galImagePython` to an equivalent Python executable. Add `--dry-run` to inspect a request without contacting the API. Existing completed expressions are preserved and no new request is sent for them.

```powershell
$galImagePython = Join-Path (Get-Location) 'test-artifacts/imagegen-venv/Scripts/python.exe'
$env:OPENAI_API_KEY = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'User')
$env:OPENAI_BASE_URL = [Environment]::GetEnvironmentVariable('OPENAI_BASE_URL', 'User')

& $galImagePython scripts/generate-gal-expressions.py --expression happy

& $galImagePython scripts/generate-gal-expressions.py --expression shy

& $galImagePython scripts/generate-gal-expressions.py --expression sad

& $galImagePython scripts/generate-gal-expressions.py --expression angry

& $galImagePython scripts/generate-gal-expressions.py --expression thoughtful
```

`gpt-image-2` automatically uses high input fidelity. Do not add `--input-fidelity` or request a transparent background with this model. The original white backdrop is intentional. Do not silently substitute another model or use filtered copies as generated expression variants.

For future variants, inspect the expression at face scale and the entire silhouette at full-body scale. Reject material changes to identity, clothing, hands, pose, composition, or background; record minor redraw differences explicitly. Verify dimensions and that the PNG is nonempty before integration.

To rebuild the WebP derivatives, contact sheet, and asset manifest without any network call:

```powershell
& $galImagePython scripts/generate-gal-expressions.py --prepare-assets
```

Generation refuses to overwrite an existing final PNG and will send no API request for an already-completed expression. For future local-save recovery, `--recover-result` accepts only that expression's previously stored response under the protected project directory and does not submit an image edit request.
