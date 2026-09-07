"""User-authorized image gateway adapter; the bundled imagegen CLI is unchanged."""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import uuid

from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageStat


ROOT = Path(__file__).resolve().parents[1]
EXPRESSIONS = ("happy", "shy", "sad", "angry", "thoughtful")
MAX_IMAGE_BYTES = 50 * 1024 * 1024
EXPECTED_SIZE = (1024, 1824)


def validate_https_url(value: str) -> str:
    if not isinstance(value, str) or len(value) > 16000:
        raise ValueError("Image URL is invalid.")
    try:
        parsed = urlsplit(value)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username is not None
                or parsed.password is not None or parsed.fragment or any(char.isspace() for char in value)):
            raise ValueError
        _ = parsed.port
    except ValueError:
        raise ValueError("Image URL must be HTTPS without credentials or fragments.") from None
    return value


def describe_response(raw: dict) -> dict:
    """Only retain the shape of image fields, never signed URLs or returned text."""
    items = raw.get("data") if isinstance(raw, dict) else None
    description = {"response_type": type(raw).__name__, "data_type": type(items).__name__, "items": []}
    if not isinstance(items, list):
        return description
    for item in items[:10]:
        entry = {"type": type(item).__name__}
        if isinstance(item, dict):
            for key in ("b64_json", "url", "revised_prompt"):
                value = item.get(key)
                field = {"type": type(value).__name__, "present": value is not None}
                if isinstance(value, str):
                    field["length"] = len(value)
                    field["sha256"] = hashlib.sha256(value.encode("utf-8")).hexdigest()
                entry[key] = field
        description["items"].append(entry)
    return description


class HttpsRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        validate_https_url(newurl)
        return super().redirect_request(request, fp, code, msg, headers, newurl)


def download_image(url: str) -> bytes:
    # A separate standard-library client never receives the API client's Authorization header.
    safe_url = validate_https_url(url)
    request = Request(safe_url, headers={"Accept": "image/png,image/jpeg,image/webp", "User-Agent": "GalExpressionAsset/1.0"})
    with build_opener(HttpsRedirectHandler()).open(request, timeout=180) as response:
        validate_https_url(response.geturl())
        media_type = response.headers.get_content_type()
        if media_type not in ("image/png", "image/jpeg", "image/webp", "application/octet-stream"):
            raise ValueError("Image download returned a non-image content type.")
        payload = response.read(MAX_IMAGE_BYTES + 1)
    if not payload or len(payload) > MAX_IMAGE_BYTES:
        raise ValueError("Image download has an invalid size.")
    return payload


def extract_image_bytes(raw: dict, downloader=download_image) -> tuple[bytes, str]:
    data = raw.get("data") if isinstance(raw, dict) else None
    if not isinstance(data, list) or len(data) != 1 or not isinstance(data[0], dict):
        raise ValueError("Expected exactly one image result.")
    item = data[0]
    encoded = item.get("b64_json")
    if isinstance(encoded, str) and encoded.strip():
        try:
            payload = base64.b64decode(encoded, validate=True)
            if payload and len(payload) <= MAX_IMAGE_BYTES:
                return payload, "base64"
        except (ValueError, TypeError):
            pass
    if isinstance(item.get("url"), str) and item["url"]:
        return downloader(validate_https_url(item["url"])), "url"
    raise ValueError("The gateway returned neither a usable base64 image nor an HTTPS image URL.")


def validate_image(payload: bytes, expected_size=EXPECTED_SIZE) -> bytes:
    if not isinstance(payload, bytes) or not payload or len(payload) > MAX_IMAGE_BYTES:
        raise ValueError("Image bytes have an invalid size.")
    try:
        with Image.open(io.BytesIO(payload)) as probe:
            if probe.format not in ("PNG", "JPEG", "WEBP") or probe.size != expected_size:
                raise ValueError("Image format or dimensions do not match the request.")
            probe.verify()
        with Image.open(io.BytesIO(payload)) as source:
            source.load()
            rgba = source.convert("RGBA")
            background = Image.new("RGBA", rgba.size, "white")
            visible = Image.alpha_composite(background, rgba).convert("RGB")
            if max(ImageStat.Stat(visible).var) < 1.0:
                raise ValueError("The returned image is blank.")
            output = io.BytesIO()
            rgba.save(output, format="PNG")
            return output.getvalue()
    except (OSError, SyntaxError, Image.DecompressionBombError):
        raise ValueError("The returned content is not a valid image.") from None


def prepare_image(payload: bytes) -> tuple[bytes, bytes, dict]:
    with Image.open(io.BytesIO(payload)) as source:
        actual_size = source.size
    ratio = actual_size[0] / actual_size[1]
    expected_ratio = EXPECTED_SIZE[0] / EXPECTED_SIZE[1]
    if min(actual_size) < 512 or actual_size[0] * actual_size[1] > 8_294_400 or abs(ratio / expected_ratio - 1) > 0.01:
        raise ValueError("Returned image framing is inconsistent with the requested portrait.")
    original = validate_image(payload, actual_size)
    metadata = {"actual_size": list(actual_size), "output_size": list(EXPECTED_SIZE), "normalization": "none"}
    if actual_size == EXPECTED_SIZE:
        return original, original, metadata
    with Image.open(io.BytesIO(original)) as source:
        fitted = ImageOps.contain(source.convert("RGBA"), EXPECTED_SIZE, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", EXPECTED_SIZE, "white")
        canvas.alpha_composite(fitted, ((EXPECTED_SIZE[0] - fitted.width) // 2, (EXPECTED_SIZE[1] - fitted.height) // 2))
        encoded = io.BytesIO()
        canvas.save(encoded, format="PNG")
    metadata["normalization"] = "uniform-scale-white-padding"
    return validate_image(encoded.getvalue()), original, metadata


def private_directory() -> Path:
    directory = ROOT / "test-artifacts" / "imagegen-private"
    directory.mkdir(parents=True, exist_ok=True)
    if os.name == "nt":
        account = subprocess.check_output(["whoami"], text=True).strip()
        subprocess.run(["icacls", str(directory), "/inheritance:r", "/grant:r",
                        f"{account}:(OI)(CI)F", "/grant:r", "*S-1-5-18:(OI)(CI)F"],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        directory.chmod(0o700)
    return directory


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if os.name != "nt":
        path.chmod(0o600)


def prepare_web_assets() -> int:
    output_dir = ROOT / "output" / "imagegen"
    labels = ("正常", "开心", "害羞", "低落", "生气", "思考")
    paths = [ROOT / "aipicture" / "DeepSeek1.png"] + [output_dir / f"deepseek-{name}.png" for name in EXPRESSIONS]
    font_path = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "msyh.ttc"
    font = ImageFont.truetype(str(font_path), 28)
    caption_font = ImageFont.truetype(str(font_path), 18)
    sheet = Image.new("RGB", (1860, 405), "#f2f4f6")
    draw = ImageDraw.Draw(sheet)
    manifest = {"target_size": list(EXPECTED_SIZE), "webp_quality": 90, "webp_method": 6, "images": []}
    for index, path in enumerate(paths):
        with Image.open(path) as image:
            rgba = image.convert("RGBA")
            fitted = ImageOps.contain(rgba, EXPECTED_SIZE, Image.Resampling.LANCZOS)
            frame = Image.new("RGBA", EXPECTED_SIZE, "white")
            frame.alpha_composite(fitted, ((EXPECTED_SIZE[0] - fitted.width) // 2, (EXPECTED_SIZE[1] - fitted.height) // 2))
            rgb = frame.convert("RGB")
        crop = rgb.crop((320, 140, 710, 530)).resize((300, 300), Image.Resampling.LANCZOS)
        left = 5 + index * 310
        sheet.paste(crop, (left, 48))
        draw.text((left + 150, 10), labels[index], font=font, fill="#23272c", anchor="mt")
        dark_pixels = rgb.convert("L").point(lambda value: 255 if value < 180 else 0)
        entry = {"expression": "original" if index == 0 else EXPRESSIONS[index - 1],
                 "png": str(path.relative_to(ROOT)), "normalized_content_bounds": list(dark_pixels.getbbox())}
        if index:
            source_path = output_dir / f"deepseek-{EXPRESSIONS[index - 1]}-source.png"
            with Image.open(source_path) as source:
                entry.update({"source_png": str(source_path.relative_to(ROOT)), "source_size": list(source.size)})
            webp = output_dir / f"deepseek-{EXPRESSIONS[index - 1]}.webp"
            rgb.save(webp, format="WEBP", quality=90, method=6)
            entry.update({"webp": str(webp.relative_to(ROOT)), "png_bytes": path.stat().st_size, "webp_bytes": webp.stat().st_size})
        manifest["images"].append(entry)
    draw.text((930, 370), "高质量图像编辑 / 同一角色 / 原姿势保留，局部细节可能轻微重绘", font=caption_font, fill="#535b63", anchor="mt")
    sheet.save(output_dir / "expression-contact-sheet.png")
    write_json(output_dir / "asset-manifest.json", manifest)
    print(f"Prepared five RGB WebP assets and {output_dir / 'expression-contact-sheet.png'}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expression", choices=EXPRESSIONS)
    parser.add_argument("--prepare-assets", action="store_true", help="Export RGB WebP assets and the expression contact sheet without network calls.")
    parser.add_argument("--response-format", choices=("b64_json", "url"), default=None)
    parser.add_argument("--recover-result", help="Resume a response already saved in this project's private image directory; sends no edit request.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.prepare_assets:
        return prepare_web_assets()
    if args.expression is None:
        parser.error("--expression is required for generation or recovery")
    output_dir = ROOT / "output" / "imagegen"
    output = output_dir / f"deepseek-{args.expression}.png"
    prompt_file = output_dir / "prompts" / f"deepseek-{args.expression}.txt"
    target = ROOT / "aipicture" / "DeepSeek1.png"
    if output.exists():
        print("An output already exists; no API request was sent.", file=sys.stderr)
        return 1
    prompt = prompt_file.read_text(encoding="utf-8")
    if not target.is_file() or not prompt.strip():
        raise ValueError("The original image and expression prompt are required.")
    parameters = {"model": "gpt-image-2", "prompt": prompt, "n": 1,
                  "size": "1024x1824", "quality": "high", "output_format": "png"}
    if args.response_format is not None:
        parameters["response_format"] = args.response_format
    if args.dry_run:
        print(json.dumps({"expression": args.expression, "target": str(target), "output": str(output),
                          "model": parameters["model"], "size": parameters["size"], "quality": parameters["quality"],
                          "response_format": args.response_format, "network_calls": 0}, indent=2))
        return 0
    if not args.recover_result and not os.environ.get("OPENAI_API_KEY", "").strip():
        print("OPENAI_API_KEY is not configured; no API request was sent.", file=sys.stderr)
        return 1
    if not args.recover_result and os.environ.get("OPENAI_BASE_URL"):
        validate_https_url(os.environ["OPENAI_BASE_URL"])
    scratch = private_directory()
    recovered_path = None
    if args.recover_result:
        recovered_path = Path(args.recover_result).resolve()
        if recovered_path.parent != scratch.resolve() or not recovered_path.name.startswith(f"{args.expression}-") or not recovered_path.name.endswith("-response.json"):
            raise ValueError("Recovery must use this expression's previously saved private response.")
    run_id = f"{args.expression}-{uuid.uuid4().hex[:12]}"
    diagnostics = output_dir / "diagnostics"
    diagnostics.mkdir(parents=True, exist_ok=True)
    diagnostic_path = diagnostics / f"{run_id}.json"
    status = {"adapter": "user-authorized-gateway-compatibility", "expression": args.expression,
              "model": "gpt-image-2", "size": "1024x1824", "quality": "high", "api_attempts": 0 if recovered_path else 1,
              "response_format": args.response_format, "status": "requesting"}
    write_json(diagnostic_path, status)
    started = time.monotonic()
    try:
        from openai import OpenAI

        if recovered_path:
            print(f"Recovering {args.expression} from its saved response; no image API request.", flush=True)
            raw = json.loads(recovered_path.read_text(encoding="utf-8"))
            response_path = recovered_path
        else:
            print(f"Requesting {args.expression}: one image edit, no automatic API retries.", flush=True)
            with OpenAI(max_retries=0, timeout=600.0) as client, target.open("rb") as image:
                result = client.images.edit(image=image, **parameters)
            raw = result.model_dump(mode="json")
            response_path = scratch / f"{run_id}-response.json"
            write_json(response_path, raw)
        status.update({"status": "received", "elapsed_seconds": round(time.monotonic() - started, 2),
                       "response": describe_response(raw), "private_response_file": str(response_path.relative_to(ROOT))})
        write_json(diagnostic_path, status)
        cached_image = response_path.with_name(response_path.name.replace("-response.json", "-image.bin"))
        if recovered_path and cached_image.is_file():
            payload, source = cached_image.read_bytes(), "saved-download"
        else:
            payload, source = extract_image_bytes(raw)
        private_image = scratch / f"{run_id}-image.bin"
        private_image.write_bytes(payload)
        if os.name != "nt":
            private_image.chmod(0o600)
        validated, original, dimensions = prepare_image(payload)
        original_path = output_dir / f"deepseek-{args.expression}-source.png"
        original_path.write_bytes(original)
        output.write_bytes(validated)
        status.update({"status": "saved", "source": source, "output": str(output.relative_to(ROOT)),
                       "source_output": str(original_path.relative_to(ROOT)), **dimensions,
                       "output_bytes": len(validated), "output_sha256": hashlib.sha256(validated).hexdigest(),
                       "elapsed_seconds": round(time.monotonic() - started, 2)})
        write_json(diagnostic_path, status)
        print(f"Saved {output} ({source}, validated 1024x1824 PNG).", flush=True)
        return 0
    except Exception as error:
        status.update({"status": "failed", "error_type": type(error).__name__,
                       "elapsed_seconds": round(time.monotonic() - started, 2)})
        code = getattr(error, "status_code", None)
        if isinstance(code, int):
            status["http_status"] = code
        write_json(diagnostic_path, status)
        print(f"Image edit failed ({type(error).__name__}); sanitized diagnostics: {diagnostic_path}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
