"""Prepare local dialogue artwork for runtime without changing API source files."""

import argparse
from collections import deque
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent.parent
ARTWORK = ROOT / "output" / "imagegen" / "dialogue-frames"
MODULE = ROOT / ".dsh-plugin" / "client" / "gal-dialogue-assets.mjs"
KEYS = ("deepseek", "harness", "chatgpt", "claude", "doubao", "ernie", "gemini", "glm", "grok", "kimi", "mimo", "minimax", "opencode", "qwen")
LIGHT_PAPER = {"chatgpt": "#514544", "doubao": "#34452c", "ernie": "#51463e", "mimo": "#345154"}
DEFAULT_INSETS = {"top": 0.35, "left": 0.18, "right": 0.15, "bottom": 0.22}
DEFAULT_NAMEPLATE = {"left": 0.19, "top": 0.15, "width": 0.19, "height": 0.14}
NAMEPLATE_ART = {
    "deepseek": (205, 68, 440, 128), "harness": (239, 85, 408, 99),
    "chatgpt": (279, 85, 564, 159), "claude": (300, 82, 560, 160),
    "doubao": (260, 106, 500, 137), "ernie": (289, 91, 555, 142),
    "gemini": (287, 119, 549, 141), "glm": (325, 90, 540, 148),
    "grok": (212, 69, 429, 111), "kimi": (216, 73, 433, 104),
    "mimo": (203, 79, 400, 98), "minimax": (219, 47, 428, 103), "qwen": (222, 67, 397, 101),
    "opencode": (231, 76, 423, 101),
}
NAMEPLATE_SAFE = {
    "harness": (0.1823, 0.217, 0.189, 0.088), "chatgpt": (0.153, 0.168, 0.205, 0.114),
    "claude": (0.17, 0.165, 0.185, 0.105), "doubao": (0.151, 0.17, 0.191, 0.10),
    "ernie": (0.17, 0.17, 0.165, 0.095), "gemini": (0.167, 0.20, 0.185, 0.098),
    "glm": (0.176, 0.16, 0.183, 0.11),
    "grok": (0.179, 0.215, 0.18, 0.086), "kimi": (0.1823, 0.207, 0.188, 0.094),
    "mimo": (0.161, 0.213, 0.189, 0.092), "minimax": (0.178, 0.16, 0.184, 0.09),
    "qwen": (0.173, 0.191, 0.186, 0.096),
    "opencode": (0.181, 0.205, 0.192, 0.082),
}


def remove_exterior_chroma(image, include_enclosed=False):
    """Keep native alpha; key only magenta connected to the outside canvas."""
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    histogram = alpha.histogram()
    if sum(histogram[:240]) > rgba.width * rgba.height * 0.005:
        return rgba, "native-alpha-preserved"
    width, height = rgba.size
    pixels = rgba.load()
    mask = Image.new("L", rgba.size)
    marks = mask.load()
    queue = deque()

    def is_key(x, y):
        red, green, blue, _ = pixels[x, y]
        if include_enclosed:
            return red >= 170 and blue >= 170 and green <= 100 and min(red, blue) - green > 110 and abs(red - blue) < 70
        return red >= 225 and blue >= 225 and green <= 35

    def enqueue(x, y):
        if not marks[x, y] and is_key(x, y):
            marks[x, y] = 255
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                enqueue(nx, ny)
    if not mask.getbbox():
        return rgba, "no-exterior-chroma-found"
    # Reviewed artwork also exposes the same key color through closed ribbon and cable loops.
    if include_enclosed:
        for y in range(height):
            for x in range(width):
                if is_key(x, y):
                    marks[x, y] = 255
    edge = mask.filter(ImageFilter.MaxFilter(9 if include_enclosed else 5)).load()
    for y in range(height):
        for x in range(width):
            if marks[x, y]:
                pixels[x, y] = (0, 0, 0, 0)
            elif edge[x, y]:
                red, green, blue, opacity = pixels[x, y]
                spill = min(red, blue) - green
                if spill > 25 and abs(red - blue) < 110:
                    coverage = max(0.0, min(1.0, 1 - spill / 255))
                    if coverage < 0.03:
                        pixels[x, y] = (0, 0, 0, 0)
                    else:
                        color = (max(0, round((red - (1 - coverage) * 255) / coverage)), min(255, round(green / coverage)), max(0, round((blue - (1 - coverage) * 255) / coverage)))
                        pixels[x, y] = (*color, round(opacity * coverage))
    return rgba, "magenta-keyed-including-reviewed-ribbon-holes" if include_enclosed else "exterior-magenta-keyed-with-edge-unmixing"


def remove_primary_edge_noise(image):
    result = image.copy()
    pixels = result.load()
    near_transparent = image.getchannel("A").filter(ImageFilter.MinFilter(3)).load()
    removed = 0
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            channels = (red, green, blue)
            if 0 < alpha < 224 and near_transparent[x, y] < 16 and min(channels) <= 12 and max(channels) >= 243 and all(channel <= 12 or channel >= 243 for channel in channels):
                pixels[x, y] = (0, 0, 0, 0)
                removed += 1
    return result, removed


def clone_plate_texture(image, target, source_x, feather=5):
    """Use adjacent empty plate pixels to erase only an inherited watermark."""
    left, top, right, bottom = target
    replacement = image.crop((source_x, top, source_x + right - left, bottom))
    source_pixels = image.load()
    replacement_pixels = replacement.load()
    for y in range(replacement.height):
        left_edge = [sum(source_pixels[left - delta, top + y][channel] for delta in (1, 2, 3)) / 3 for channel in range(4)]
        right_edge = [sum(source_pixels[right + delta, top + y][channel] for delta in (0, 1, 2)) / 3 for channel in range(4)]
        before = replacement_pixels[0, y]
        after = replacement_pixels[replacement.width - 1, y]
        for x in range(replacement.width):
            ratio = x / (replacement.width - 1)
            replacement_pixels[x, y] = tuple(max(0, min(255, round(replacement_pixels[x, y][channel] + (left_edge[channel] - before[channel]) * (1 - ratio) + (right_edge[channel] - after[channel]) * ratio))) for channel in range(4))
    inner = Image.new("L", (replacement.width - feather * 2, replacement.height - feather * 2), 255)
    mask = Image.new("L", replacement.size)
    mask.paste(inner, (feather, feather))
    mask = mask.filter(ImageFilter.GaussianBlur(feather / 2))
    result = image.copy()
    result.paste(replacement, (left, top), mask)
    return result


def descriptor(key, size):
    width, height = size
    result = {"width": width, "height": height, "textColor": LIGHT_PAPER.get(key, "#f4f1fc"), "nameColor": "#40364f", "insets": DEFAULT_INSETS, "nameplate": DEFAULT_NAMEPLATE}
    if key == "deepseek":
        result.update(textColor="#d8e4ff", nameColor="#7650ad", insets={"top": 0.38746, "left": 0.17841, "right": 0.11234, "bottom": 0.32975}, nameplate={"left": 0.20044, "top": 0.18688, "width": 0.11894, "height": 0.09536})
    elif key == "chatgpt":
        result.update(nameColor="#76594f")
    if key in NAMEPLATE_SAFE:
        result["nameplate"] = dict(zip(("left", "top", "width", "height"), NAMEPLATE_SAFE[key]))
    if key in NAMEPLATE_ART:
        x, y, w, h = NAMEPLATE_ART[key]
        result["nameplateArt"] = {"left": round(x / width, 6), "top": round(y / height, 6), "width": round(w / width, 6), "height": round(h / height, 6)}
    else:
        result["nameplateArt"] = {"left": 0.14, "top": 0.10, "width": 0.29, "height": 0.23}
    return result


def write_module():
    available = [key for key in KEYS if (ARTWORK / f"{key}.webp").is_file()]
    lines = ["// Generated by scripts/prepare-dialogue-assets.py from local artwork."]
    lines.extend(f"import {key} from '../../output/imagegen/dialogue-frames/{key}.webp'" for key in available)
    lines.append("\nexport const DIALOGUE_FRAME_ASSETS = Object.freeze({")
    for key in available:
        with Image.open(ARTWORK / f"{key}.webp") as image:
            data = descriptor(key, image.size)
        fields = json.dumps(data, ensure_ascii=False, separators=(", ", ": "))[1:-1]
        lines.append(f"  {key}: {{ src: {key}, {fields} }},")
    lines.extend(["})", ""])
    MODULE.write_text("\n".join(lines), encoding="utf-8")
    return available


def prepare(keys):
    ARTWORK.mkdir(parents=True, exist_ok=True)
    report = []
    for key in keys:
        if key not in KEYS:
            raise ValueError(f"Unknown character: {key}")
        source = ARTWORK / "reference" / "deepseek-frame.png" if key == "deepseek" else ARTWORK / f"{key}-source.png"
        if not source.is_file():
            continue
        with Image.open(source) as image:
            result, treatment = remove_exterior_chroma(image, include_enclosed=key in {"ernie", "grok", "minimax", "opencode"})
        edge_noise = 0
        if key != "deepseek":
            result, edge_noise = remove_primary_edge_noise(result)
        cleaned = None
        if key == "chatgpt" and result.size == (2135, 736):
            cleaned = {"x": 315, "y": 123, "width": 137, "height": 113}
            result = clone_plate_texture(result, (315, 123, 452, 236), 470, feather=6)
        elif key == "harness" and result.size == (1536, 512):
            cleaned = {"x": 263, "y": 110, "width": 78, "height": 58}
            result = clone_plate_texture(result, (263, 110, 341, 168), 370, feather=5)
        elif key == "gemini" and result.size == (2061, 763):
            cleaned = {"x": 318, "y": 149, "width": 121, "height": 95}
            result = clone_plate_texture(result, (318, 149, 439, 244), 475, feather=6)
        elif key == "kimi" and result.size == (1536, 512):
            cleaned = {"x": 248, "y": 100, "width": 96, "height": 62}
            result = clone_plate_texture(result, (248, 100, 344, 162), 375, feather=5)
        destination = ARTWORK / f"{key}.webp"
        result.save(destination, "WEBP", quality=92, method=6, exact=True, alpha_quality=100)
        record = {"character": key, "source": source.name, "output": destination.name, "size": list(result.size), "alpha": list(result.getchannel("A").getextrema()), "backgroundTreatment": treatment, "removedPrimaryEdgePixels": edge_noise, "nameplateCleanup": cleaned}
        (ARTWORK / f"{key}-processing.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        report.append(record)
    return report


def prepare_clean_reference():
    source = ARTWORK / "reference" / "deepseek-frame.png"
    if not source.is_file():
        return None
    with Image.open(source) as image:
        cleaned = clone_plate_texture(image.convert("RGBA"), (236, 101, 336, 167), 355, feather=5)
    contained = ImageOps.contain(cleaned, (1536, 512), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (1536, 512))
    result.alpha_composite(contained, ((1536 - contained.width) // 2, (512 - contained.height) // 2))
    destination = ARTWORK / "reference" / "deepseek-blank-nameplate-reference-1536.png"
    result.save(destination)
    return str(destination)


def contact_sheet(keys):
    columns, cell_width, cell_height = 2, 900, 370
    sheet = Image.new("RGB", (columns * cell_width, ((len(keys) + columns - 1) // columns) * cell_height), "#edf0f4")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 23)
    except OSError:
        font = ImageFont.load_default()
    for index, key in enumerate(keys):
        x, y = index % columns * cell_width, index // columns * cell_height
        with Image.open(ARTWORK / f"{key}.webp") as image:
            preview = ImageOps.contain(image.convert("RGBA"), (cell_width - 24, cell_height - 55), Image.Resampling.LANCZOS)
        draw.text((x + 18, y + 12), key, font=font, fill="#222d34")
        sheet.paste(preview, (x + (cell_width - preview.width) // 2, y + 46 + (cell_height - 55 - preview.height) // 2), preview)
    destination = ARTWORK / "runtime-contact-sheet.png"
    sheet.save(destination)
    return str(destination)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keys", nargs="+", choices=KEYS, default=list(KEYS))
    args = parser.parse_args()
    report = prepare(args.keys)
    available = write_module()
    print(json.dumps({"processed": report, "manifestCharacters": available, "blankNameplateReference": prepare_clean_reference(), "contactSheet": contact_sheet(available)}, ensure_ascii=False, indent=2))
