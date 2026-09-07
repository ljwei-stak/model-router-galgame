# Historical Image Edit Gateway Check

Current status: resolved. This document describes the initial bundled CLI attempt before the user authorized the project adapter. All five expression PNGs and WebP assets now exist and passed visual QA. See `README.md`, `asset-manifest.json`, and `expression-contact-sheet.png` for the completed delivery. Do not interpret the historical failure below as the current state.

Date: 2026-09-07.

At this initial stage, only one live image edit request had been submitted. The other four expression edits had not yet been submitted, and no retry or model substitution had been attempted.

- Operation: bundled `image_gen.py edit`, `/v1/images/edits`.
- Gateway base URL: `https://newapi.neonode.cloud/v1`.
- Model: `gpt-image-2`.
- Edit target: `aipicture/DeepSeek1.png`.
- Prompt: `output/imagegen/prompts/deepseek-happy.txt`.
- Requested image: 1024 by 1824, high quality, PNG.
- Intended output: `output/imagegen/deepseek-happy.png`.
- Credentials: read only from the user environment and passed into the invoking child process; no secret values were printed or written.

The CLI reported that the edit request completed in 46.6 seconds. Saving then failed:

```text
Edit completed in 46.6s.
TypeError: argument should be a bytes-like object or ASCII string, not 'NoneType'
```

The bundled CLI extracts `item.b64_json` from each result before decoding it. At least one returned item had `b64_json=None`, which caused `base64.b64decode` to fail. That first raw response was not retained, so its exact content is unknown. No output PNG was created by that first attempt and visual verification was not possible at that point.

This initial request reached the gateway and may have been billed despite the local save failure. Further requests were paused while response compatibility was investigated. The standard CLI required an actual base64 image in `data[].b64_json`; the later authorized adapter resolved the mismatch by accepting the returned HTTPS image URL.

The skill CLI was not modified. At this first stage, no alternate SDK runner, image filter, or fabricated output was used.

## Authorized Recovery

The user subsequently explicitly authorized `scripts/generate-gal-expressions.py` to support both base64 and URL responses. Its HAPPY request confirmed a nonempty HTTPS image URL with no base64 field. The image was downloaded without passing the API Authorization header. The raw response was preserved only in a Git-ignored, ACL-protected directory; trackable diagnostics contain field types, lengths, and hashes rather than signed URLs.

The returned HAPPY image was 940 by 1672, so its first strict local dimension check stopped saving the final file. The adapter then recovered that already-downloaded image without another paid request and fitted it uniformly to a 1024 by 1824 white canvas. After visual verification, one edit request was submitted for each of SHY, SAD, ANGRY, and THOUGHTFUL, with concurrency limited to two. All five expressions were saved, inspected, and exported as RGB WebP. Original provider-resolution PNGs are preserved separately.

The initial request and the five later expression requests are distinct. No retries were hidden inside the adapter, no model was changed, and no image-generation calls remain active.
