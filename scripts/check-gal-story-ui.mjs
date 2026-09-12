import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildPreviewBundle, createPreviewServer } from './gal-preview.mjs'
import { createGame } from '../.dsh-plugin/shared/gal-game.mjs'
import { STORY_CHARACTERS, createStory, currentStoryNode, advanceStory, storyHistory } from '../.dsh-plugin/shared/gal-story.mjs'
import { storyStorageKey } from '../.dsh-plugin/client/gal-story-storage.mjs'
import { inspectRasterFrame } from './gal-raster-checks.mjs'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'test-artifacts')
const frameOutput = resolve(output, 'gal-dialogue-frames')
const freeKey = 'model-router-galgame:preview:v1'
const storyKey = storyStorageKey(freeKey)
await mkdir(frameOutput, { recursive: true })
const preview = await createPreviewServer({ bundle: await buildPreviewBundle() })
const url = await preview.listen()
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
let page
const readNodes = new Map()
const routeLimit = 2048

function completeFirstRoute() {
  let state = createStory()
  for (let step = 0; step < routeLimit; step++) {
    const node = currentStoryNode(state)
    if (node.ending) return state
    state = advanceStory(state, node.choices?.[0]?.id ?? null)
  }
  throw new Error('The expanded story did not finish within the save path limit.')
}

const expectedEnding = completeFirstRoute()

async function recordStoryNode(story) {
  const node = await story.evaluate(element => ({
    id: element.dataset.nodeId,
    character: element.querySelector('[data-dialogue-character]')?.dataset.dialogueCharacter,
    text: element.querySelector('.gg-spoken')?.textContent,
    scene: element.querySelector('.gg-scene-meta')?.textContent,
  }))
  assert.ok(node.text, `Story node ${node.id} has no rendered text.`)
  readNodes.set(node.id, node)
}

async function closePanel() {
  await page.locator('.gg-panel').getByRole('button', { name: '关闭', exact: true }).click()
}

async function storyState() {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), storyKey)
}

async function disableTyping(story) {
  await story.getByRole('button', { name: '剧情与显示设置', exact: true }).click()
  await page.locator('.gg-panel').getByRole('checkbox', { name: '逐字显示', exact: true }).uncheck()
  await closePanel()
}

async function advanceStoryUi(story) {
  await recordStoryNode(story)
  const previous = await story.getAttribute('data-node-id')
  const choices = story.locator('.gg-story-choices button[data-choice-id]')
  const choice = await choices.count() ? await choices.first().getAttribute('data-choice-id') : null
  if (choice) await choices.first().click()
  else {
    const next = story.locator('.gg-story-next').getByRole('button', { name: '继续', exact: true })
    for (let pageTurn = 0; pageTurn < 20 && await story.getAttribute('data-node-id') === previous; pageTurn++) await next.click()
  }
  await page.waitForFunction(previous => document.querySelector('[data-testid="gal-story"]')?.dataset.nodeId !== previous, previous)
  return { previous, next: await story.getAttribute('data-node-id'), choice }
}

async function assertStoryImmersive(story) {
  assert.equal(await story.getAttribute('data-debug-enabled'), 'false')
  assert.equal(await story.locator('progress,[data-testid="gal-story-debug"]').count(), 0)
  assert.equal(await story.getByRole('button', { name: '查看开发调试', exact: true }).count(), 0)
  assert.doesNotMatch(await story.innerText(), /好感变化|信任变化|剧情进度|已互动轮数|判定理由|存档修订|\d+\s*\/\s*100/)
}

async function typographyWithin(container) {
  await container.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const measures = await container.locator('.gg-spoken').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const range = document.createRange()
    range.selectNodeContents(element)
    const lines = [...range.getClientRects()].filter(line => line.width > 0 && line.height > 0)
    return {
      text: element.textContent,
      fontSize: Number.parseFloat(style.fontSize),
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
      withinHorizontalBounds: lines.every(line => line.left >= rect.left - 2 && line.right <= rect.right + 2),
    }
  }))
  assert.ok(measures.length, 'dialogue text is missing')
  for (const measure of measures) {
    assert.ok(measure.fontSize >= 13 && measure.fontSize <= 26, 'dialogue uses an unreadable or oversized font')
    assert.ok(measure.width > 0 && measure.scrollWidth <= measure.width + 2 && measure.withinHorizontalBounds, `dialogue text overflows its frame: ${JSON.stringify(measure)}`)
  }
  assert.ok(await container.evaluate(element => element.scrollWidth <= element.clientWidth + 2), 'dialogue container overflows horizontally')
  return measures.map(({ text, ...measurement }) => ({ ...measurement, characters: text.length }))
}

try {
  page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  // This regression suite deliberately exercises the preserved first edition.
  await page.addInitScript(key => localStorage.setItem(`${key}:episode`, 'legacy'), storyKey)
  const errors = []
  const apiCalls = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    apiCalls.push(path)
    if (path === '/api/catalog') return route.fulfill({ json: { available: false, configured: false, models: [] } })
    return route.fulfill({ status: 503, json: { error: 'This offline UI check must not call a model.' } })
  })
  await page.goto(url)
  const story = page.getByTestId('gal-story')
  await story.waitFor()
  assert.equal(await page.getByRole('tab', { name: '剧情模式', exact: true }).getAttribute('aria-selected'), 'true')
  assert.equal(await page.getByTestId('gal-game').count(), 0)
  await assertStoryImmersive(story)
  await disableTyping(story)
  const route = []
  for (let index = 0; index < 3; index++) route.push(await advanceStoryUi(story))
  const savedState = await storyState()
  assert.ok(savedState, 'story progress was not saved locally')
  const savedNode = await story.getAttribute('data-node-id')
  const savedText = await story.locator('.gg-spoken').innerText()
  await story.getByRole('button', { name: '存档与读档', exact: true }).click()
  await page.locator('.gg-panel').getByRole('button', { name: '保存到存档 1', exact: true }).click()
  await closePanel()
  route.push(await advanceStoryUi(story))
  assert.notEqual(await story.getAttribute('data-node-id'), savedNode)
  await story.getByRole('button', { name: '对话回顾', exact: true }).click()
  assert.ok((await page.locator('.gg-panel').innerText()).includes(savedText), 'history omitted a previously viewed line')
  await closePanel()
  await story.getByRole('button', { name: '存档与读档', exact: true }).click()
  await page.locator('.gg-panel').getByRole('button', { name: '读取存档 1', exact: true }).click()
  await page.locator('.gg-panel').last().getByRole('button', { name: '确认', exact: true }).click()
  assert.deepEqual(await storyState(), savedState, 'manual story load did not restore progress')
  assert.equal(await story.getAttribute('data-node-id'), savedNode)

  await story.getByRole('button', { name: '剧情与显示设置', exact: true }).click()
  await page.locator('.gg-panel').getByRole('checkbox', { name: '开发调试', exact: true }).check()
  await closePanel()
  await story.getByRole('button', { name: '查看开发调试', exact: true }).click()
  assert.match(await page.locator('.gg-panel').innerText(), /开发调试/)
  await closePanel()
  await page.reload()
  await story.waitFor()
  await assertStoryImmersive(story)
  assert.equal(await story.getAttribute('data-node-id'), savedNode)
  assert.deepEqual(await storyState(), savedState, 'reload changed the story save')
  await disableTyping(story)

  await story.getByRole('button', { name: '剧情与显示设置', exact: true }).click()
  await page.locator('.gg-panel').getByRole('button', { name: '对话框图鉴', exact: true }).click()
  const gallery = page.locator('.gg-panel').filter({ has: page.getByRole('heading', { name: '对话框图鉴', exact: true }) })
  const frameButtons = gallery.locator('button[data-frame-character]')
  const frameCharacters = await frameButtons.evaluateAll(elements => elements.map(element => ({ key: element.dataset.frameCharacter, name: element.textContent.trim() })))
  assert.equal(frameCharacters.length, 14, 'gallery should include all fourteen characters')
  const frameChecks = []
  const portraits = new Set()
  const frameDesigns = new Set()
  const frameImages = new Set()
  for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    for (const { key, name } of frameCharacters) {
      await gallery.locator(`button[data-frame-character="${key}"]`).click()
      const frame = gallery.locator('.gg-gallery-preview [data-dialogue-character]')
      assert.equal(await frame.getAttribute('data-dialogue-character'), key)
      const design = await frame.getAttribute('data-dialogue-motif')
      assert.ok(design, `${name} has no corresponding dialogue frame design`)
      frameDesigns.add(design)
      const raster = await inspectRasterFrame(frame)
      frameImages.add(raster.hash)
      await gallery.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())))
      const portrait = gallery.locator('.gg-gallery-portrait')
      const pixels = await portrait.evaluate(image => {
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 96
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data
        let colored = 0
        for (let index = 0; index < data.length; index += 4) if (data[index + 3] > 0 && Math.min(data[index], data[index + 1], data[index + 2]) < 230) colored++
        const bounds = image.getBoundingClientRect()
        return { width: image.naturalWidth, height: image.naturalHeight, colored, renderedWidth: bounds.width, renderedHeight: bounds.height, objectFit: getComputedStyle(image).objectFit }
      })
      assert.ok(pixels.width > 0 && pixels.height > 0 && pixels.colored > 100, `${name} portrait is blank`)
      assert.ok(pixels.renderedWidth >= 120 && pixels.renderedHeight >= 100 && pixels.objectFit === 'contain', `${name} portrait does not scale in the gallery`)
      portraits.add(createHash('sha256').update(await portrait.getAttribute('src')).digest('hex'))
      const typography = await typographyWithin(gallery)
      const bounds = await gallery.evaluate(element => {
        const rect = element.getBoundingClientRect()
        return { left: rect.left, right: rect.right, viewport: innerWidth }
      })
      assert.ok(bounds.left >= -1 && bounds.right <= bounds.viewport + 1, 'frame gallery extends beyond the viewport')
      await gallery.locator('.gg-gallery-preview').screenshot({ path: resolve(frameOutput, `${key}-${viewport.width}.png`) })
      frameChecks.push({ key, design, viewport: viewport.width, ...pixels, raster, typography })
    }
  }
  assert.equal(portraits.size, 14, 'gallery portraits did not switch independently')
  assert.equal(frameDesigns.size, 14, 'gallery dialogue frame designs are not distinct')
  assert.equal(frameImages.size, 14, 'gallery raster frames did not switch independently')
  await closePanel()
  assert.deepEqual(apiCalls, [], 'authored story or frame gallery made a model API request')

  const freeSentinel = createGame({ id: 'story-free-save-separation' })
  await page.evaluate(({ freeKey, freeSentinel }) => localStorage.setItem(freeKey, JSON.stringify(freeSentinel)), { freeKey, freeSentinel })
  const storyBeforeSwitch = await storyState()
  await page.getByRole('tab', { name: '自由模式', exact: true }).click()
  await page.getByTestId('gal-game').waitFor()
  await page.getByTestId('gal-game').getByRole('button', { name: '模型与显示设置', exact: true }).click()
  await page.locator('.gg-panel').getByRole('button', { name: '对话框图鉴', exact: true }).click()
  await gallery.waitFor()
  assert.equal(await gallery.locator('button[data-frame-character]').count(), 14)
  await closePanel()
  await page.getByRole('tab', { name: '剧情模式', exact: true }).click()
  await story.waitFor()
  assert.deepEqual(await storyState(), storyBeforeSwitch, 'free mode changed the story save')
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), freeKey), freeSentinel, 'story mode changed the free-mode save')
  await assertStoryImmersive(story)
  await disableTyping(story)

  await page.setViewportSize({ width: 1440, height: 960 })
  let longestDialogue = { characters: 0, node: null }
  let lateSave = null
  const readingStarted = performance.now()
  for (let step = 0; step < routeLimit && !await story.locator('.gg-story-ending').count(); step++) {
    const text = await story.locator('.gg-spoken').innerText()
    if (text.length > longestDialogue.characters) {
      longestDialogue = { characters: text.length, node: await story.getAttribute('data-node-id') }
      await typographyWithin(story)
      await page.setViewportSize({ width: 390, height: 844 })
      await typographyWithin(story)
      await page.screenshot({ path: resolve(output, 'gal-story-long-dialogue-mobile.png'), fullPage: true })
      await page.setViewportSize({ width: 1440, height: 960 })
    }
    route.push(await advanceStoryUi(story))
    if (step === 400) {
      lateSave = await storyState()
      const historyBeforeReload = storyHistory(lateSave)
      await story.getByRole('button', { name: '对话回顾', exact: true }).click()
      const historyText = await page.locator('.gg-panel').innerText()
      assert.ok(historyText.includes(historyBeforeReload[0].text), 'late-story history lost the opening')
      assert.ok(historyText.includes(historyBeforeReload.at(-1).text), 'late-story history lost the current line')
      await closePanel()
      await page.reload()
      await story.waitFor()
      assert.deepEqual(await storyState(), lateSave, 'long story save changed after reload')
      await assertStoryImmersive(story)
      await disableTyping(story)
    }
  }
  await story.locator('.gg-story-ending').waitFor()
  assert.ok(route.some(step => step.choice), 'story route never offered a player choice')
  await assertStoryImmersive(story)
  const endingState = await storyState()
  assert.deepEqual(endingState, expectedEnding, 'browser did not complete the full authored route')
  assert.ok(lateSave?.trail.length > 384, 'expanded route did not exercise saves beyond the old limit')
  await recordStoryNode(story)
  const characterAppearances = Object.fromEntries(Object.keys(STORY_CHARACTERS).map(key => {
    const lines = [...readNodes.values()].filter(node => node.character === key)
    const scenes = new Set(lines.map(node => node.scene))
    assert.ok(lines.length >= 20, `${key} has only ${lines.length} actual dialogue lines in the common route`)
    assert.ok(scenes.size >= 3, `${key} appears in only ${scenes.size} common-route scenes`)
    return [key, { dialogueLines: lines.length, scenes: scenes.size }]
  }))
  const endingNode = await story.getAttribute('data-node-id')
  await page.screenshot({ path: resolve(output, 'gal-story-ending-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await typographyWithin(story)
  await page.screenshot({ path: resolve(output, 'gal-story-ending-mobile.png'), fullPage: true })
  await page.reload()
  await story.locator('.gg-story-ending').waitFor()
  assert.equal(await story.getAttribute('data-node-id'), endingNode)
  assert.deepEqual(await storyState(), endingState, 'ending did not survive reload')
  assert.equal(apiCalls.filter(path => path !== '/api/catalog').length, 0, 'offline UI check attempted a model turn')
  assert.deepEqual(errors, [])
  const report = { authoredStoryOffline: true, storyDefault: true, manualSaveLoadReload: true, lateSaveReload: Boolean(lateSave), debugOptIn: true, independentModeSaves: true, routeSteps: endingState.trail.length, routeChoices: endingState.trail.filter(step => step.choiceId !== null).length, characterAppearances, readingCheckMilliseconds: Math.round(performance.now() - readingStarted), endingNode, longestDialogue, frameChecks, apiCalls, errors }
  await writeFile(resolve(output, 'gal-story-ui-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, frameChecks: { characters: frameImages.size, viewportChecks: frameChecks.length, report: 'test-artifacts/gal-story-ui-report.json' } }))
} catch (error) {
  if (page) await page.screenshot({ path: resolve(output, 'gal-story-failure.png'), fullPage: true }).catch(() => {})
  console.error(error)
  process.exitCode = 1
} finally {
  await browser.close()
  await preview.close()
}
