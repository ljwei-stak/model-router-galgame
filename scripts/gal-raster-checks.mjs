import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export async function inspectRasterFrame(frame) {
  assert.equal(await frame.getAttribute('data-frame-raster'), 'true', 'character dialogue has no raster frame')
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const art = frame.locator('.ggd-raster-art')
  const source = await art.evaluate(element => getComputedStyle(element).borderImageSource)
  assert.match(source, /^url\(["']?data:image\/(?:png|webp|jpeg);/, 'raster frame asset is not bundled')
  const pixels = await art.evaluate(async element => {
    const style = getComputedStyle(element)
    const raw = style.borderImageSource.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
    const image = new Image()
    image.src = raw
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    let colored = 0
    let opaque = 0
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] > 16) opaque++
      if (data[index + 3] > 16 && Math.min(data[index], data[index + 1], data[index + 2]) < 235) colored++
    }
    const bounds = element.getBoundingClientRect()
    return { width: image.naturalWidth, height: image.naturalHeight, colored, opaque, renderedWidth: bounds.width, renderedHeight: bounds.height, opacity: Number(style.opacity), visibility: style.visibility, slice: style.borderImageSlice, borderWidth: style.borderImageWidth }
  })
  assert.ok(pixels.width >= 500 && pixels.height >= 100 && pixels.colored > 100 && pixels.opaque > 100, 'raster frame image is blank or too small')
  assert.ok(pixels.renderedWidth > 200 && pixels.renderedHeight > 120 && pixels.opacity > 0 && pixels.visibility === 'visible', 'raster frame is not visibly rendered')
  assert.match(pixels.slice, /fill/, 'frame center is not rendered')
  assert.ok(/[1-9]/.test(pixels.borderWidth), 'raster frame borders have zero width')

  const layout = await frame.evaluate(element => {
    const shell = element.querySelector('.ggd-frame')
    const body = element.querySelector('.ggd-body')
    const plate = element.querySelector('.ggd-nameplate')
    const name = plate.querySelector('span')
    const rect = element => {
      const value = element.getBoundingClientRect()
      return { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height }
    }
    const nameRange = document.createRange()
    nameRange.selectNodeContents(name)
    return {
      character: element.dataset.dialogueCharacter,
      frame: rect(shell), body: rect(body), plate: rect(plate), name: rect(name), nameText: rect(nameRange),
      nameFont: Number.parseFloat(getComputedStyle(name).fontSize), nameWidth: name.clientWidth, nameScrollWidth: name.scrollWidth,
    }
  })
  const contains = (outer, inner, tolerance = 2) => inner.left >= outer.left - tolerance && inner.right <= outer.right + tolerance && inner.top >= outer.top - tolerance && inner.bottom <= outer.bottom + tolerance
  assert.ok(contains(layout.frame, layout.plate) && contains(layout.frame, layout.body), `${layout.character} text areas extend outside the raster frame`)
  assert.ok(layout.body.top >= layout.plate.bottom - 2, `${layout.character} dialogue overlaps its nameplate`)
  assert.ok(layout.body.width >= 120 && layout.body.height >= 120, `${layout.character} frame has insufficient readable text space`)
  assert.ok(layout.nameScrollWidth <= layout.nameWidth + 1 && contains(layout.plate, layout.nameText), `${layout.character} name is clipped in its raster nameplate`)
  return { hash: createHash('sha256').update(source).digest('hex'), width: pixels.width, height: pixels.height, colored: pixels.colored, renderedWidth: pixels.renderedWidth, renderedHeight: pixels.renderedHeight, nameFont: layout.nameFont, bodyWidth: layout.body.width, bodyHeight: layout.body.height }
}
