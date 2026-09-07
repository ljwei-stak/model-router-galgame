import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { execFileSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { values } = parseArgs({ options: {
  scene: { type: 'string', default: path.join(root, 'gal-scene.json') },
  output: { type: 'string', default: path.join(root, 'output/imagegen/dialogue-frames/reference') },
  screenshot: { type: 'string' },
  python: { type: 'string' },
} })
const document = JSON.parse(await fs.readFile(values.scene, 'utf8'))
const output = path.resolve(values.output)
const dialogue = document.elements.find(element => element.type === 'dialogue' && !element.hidden)
if (!dialogue?.image) throw new Error('The scene has no visible dialogue artwork.')
const frame = document.assets[dialogue.image]
if (!frame) throw new Error('The dialogue artwork reference is missing.')
const pngDimensions = bytes => {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Expected a PNG reference image.')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25], hasAlphaChannel: [4, 6].includes(bytes[25]) }
}
const rect = element => ({ x: element.x, y: element.y, width: element.w, height: element.h })
const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const related = document.elements.filter(element => !element.hidden && ['dialogue', 'dialogue-text', 'speaker-name', 'action-button'].includes(element.type))
const artworkElements = document.elements.filter(element => !element.hidden && element.image && !['background', 'character'].includes(element.type) && intersects(element, dialogue))
const artifactIds = [...new Set(artworkElements.map(element => element.image))]
await fs.mkdir(output, { recursive: true })
const extracted = []
for (const id of artifactIds) {
  const asset = document.assets[id]
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=\r\n]+)$/.exec(asset?.dataUrl ?? '')
  if (!match) throw new Error(`Unsupported or missing PNG data URL: ${id}`)
  const bytes = Buffer.from(match[1], 'base64')
  const dimensions = pngDimensions(bytes)
  const name = id === frame.id ? 'deepseek-frame-original.png' : `${id}.png`
  await fs.writeFile(path.join(output, name), bytes)
  extracted.push({ id, originalName: asset.name, file: name, ...dimensions })
}
const original = extracted.find(item => item.id === frame.id)
const scale = Math.max(dialogue.w / original.width, dialogue.h / original.height)
const offsetX = (dialogue.w - original.width * scale) / 2
const offsetY = (dialogue.h - original.height * scale) / 2
const round = value => Math.round(value * 1000) / 1000
const sourceRect = element => ({
  x: round((element.x - dialogue.x - offsetX) / scale),
  y: round((element.y - dialogue.y - offsetY) / scale),
  width: round(element.w / scale),
  height: round(element.h / scale),
})
let screenshot = null
if (values.screenshot) {
  const bytes = await fs.readFile(values.screenshot)
  screenshot = { file: 'user-screenshot.png', ...pngDimensions(bytes) }
  await fs.writeFile(path.join(output, screenshot.file), bytes)
}
const metadata = {
  source: path.relative(root, path.resolve(values.scene)).replaceAll('\\', '/'),
  stage: { width: document.settings.stageW, height: document.settings.stageH },
  extracted,
  screenshot,
  dialogue: { id: dialogue.id, assetId: dialogue.image, sceneRect: rect(dialogue), rendering: 'background-size: cover; background-position: center', scale: round(scale), offsetX: round(offsetX), offsetY: round(offsetY) },
  visibleSourceRect: sourceRect(dialogue),
  overlays: related.filter(element => element.id !== dialogue.id).map(element => ({
    id: element.id, type: element.type, role: element.role, action: element.action,
    text: element.text, image: element.image, color: element.color, fontSize: element.fontSize,
    sceneRect: rect(element), sourceRect: sourceRect(element),
  })),
  notes: [
    'Source artwork bytes are extracted unchanged. Text overlays are not flattened into the image.',
    'Speaker name and dialogue text are separate scene elements; image inspection is still needed to identify labels baked into the PNG.',
    'The source image aspect ratio differs from the scene dialogue element; original cover cropping must be considered when deriving a responsive frame.',
  ],
}
if (values.python) {
  const processing = JSON.parse(execFileSync(values.python, ['-c', `
from PIL import Image, ImageOps
from pathlib import Path
import json, sys

out = Path(sys.argv[1])
original = Image.open(out / 'deepseek-frame-original.png').convert('RGBA')
alpha = original.getchannel('A')
bbox = alpha.getbbox()
crop = (0, max(0, bbox[1] - 13), original.width, min(original.height, bbox[3] + 12))
reference = original.crop(crop)
reference.save(out / 'deepseek-frame-reference.png')
scaled = ImageOps.contain(reference, (1536, 512), Image.Resampling.LANCZOS)
api_reference = Image.new('RGBA', (1536, 512))
api_reference.alpha_composite(scaled, ((1536 - scaled.width) // 2, (512 - scaled.height) // 2))
api_reference.save(out / 'deepseek-frame-reference-1536.png')

# Reconstruct only the small baked toolbar glyph band from adjacent blank rows.
# The frame ornaments, gold border, nameplate and original PNG stay untouched.
runtime = original.copy()
source = original.load()
target = runtime.load()
left, top, right, bottom = 870, 703, 1532, 727
for x in range(left, right):
    upper = [sum(source[x, y][channel] for y in range(699, 703)) / 4 for channel in range(4)]
    lower_samples = [source[x, y] for y in range(727, 731) if source[x, y][2] > source[x, y][0] and source[x, y][2] > source[x, y][1]]
    lower = [sum(pixel[channel] for pixel in lower_samples) / len(lower_samples) for channel in range(4)] if lower_samples else upper
    for y in range(top, bottom):
        ratio = (y - top + 1) / (bottom - top + 1)
        target[x, y] = tuple(round(upper[channel] * (1 - ratio) + lower[channel] * ratio) for channel in range(4))
runtime_cropped = runtime.crop(crop)
runtime_cropped.save(out / 'deepseek-frame.png')
clean_scaled = ImageOps.contain(runtime_cropped, (1536, 512), Image.Resampling.LANCZOS)
clean_reference = Image.new('RGBA', (1536, 512))
clean_reference.alpha_composite(clean_scaled, ((1536 - clean_scaled.width) // 2, (512 - clean_scaled.height) // 2))
clean_reference.save(out / 'deepseek-frame-clean-reference-1536.png')
detail = original.crop((840, 685, 1560, 742)).resize((1440, 114), Image.Resampling.NEAREST)
detail.save(out / 'toolbar-original-detail.png')
runtime.crop((840, 685, 1560, 742)).resize((1440, 114), Image.Resampling.NEAREST).save(out / 'toolbar-cleaned-detail.png')
print(json.dumps({
  'alphaBBox': list(bbox), 'alphaExtrema': list(alpha.getextrema()),
  'crop': {'x': crop[0], 'y': crop[1], 'width': crop[2] - crop[0], 'height': crop[3] - crop[1]},
  'toolbarPatchSourceRect': {'x': left, 'y': top, 'width': right-left, 'height': bottom-top},
  'runtimeFile': 'deepseek-frame.png', 'referenceFile': 'deepseek-frame-reference.png',
  'apiReferenceFile': 'deepseek-frame-reference-1536.png',
  'cleanApiReferenceFile': 'deepseek-frame-clean-reference-1536.png',
  'apiReferenceSize': {'width': 1536, 'height': 512},
  'centerPixelRGBA': list(original.getpixel((800, 540))),
}))
`, output], { encoding: 'utf8' }))
  metadata.processing = processing
  metadata.croppedOverlays = metadata.overlays.map(overlay => ({
    id: overlay.id, type: overlay.type, action: overlay.action,
    rect: { ...overlay.sourceRect, x: round(overlay.sourceRect.x - processing.crop.x), y: round(overlay.sourceRect.y - processing.crop.y) },
  }))
  metadata.notes.push('The original PNG contains baked English toolbar labels and icons. The processed runtime image reconstructs only that glyph band; real controls must be supplied by the UI.')
}
await fs.writeFile(path.join(output, 'reference-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`)
console.log(JSON.stringify({ output, extracted, screenshot, visibleSourceRect: metadata.visibleSourceRect, processing: metadata.processing, overlays: metadata.overlays.filter(item => ['speaker-name', 'dialogue-text'].includes(item.type)).map(({ id, sourceRect }) => ({ id, sourceRect })) }, null, 2))
