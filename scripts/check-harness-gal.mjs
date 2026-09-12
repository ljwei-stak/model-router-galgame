import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createGame, EMOTIONS } from '../.dsh-plugin/shared/gal-game.mjs'
import { storyStorageKey } from '../.dsh-plugin/client/gal-story-storage.mjs'
import { inspectRasterFrame } from './gal-raster-checks.mjs'

const root = resolve(import.meta.dirname, '..')
const storageKey = 'model-router:gal-game:v1'
const storyKey = storyStorageKey(storageKey)
const log = await readFile(resolve(root, 'test-artifacts/dsh-host2.log'), 'utf8')
const url = log.match(/dsh web:\s*(http:\/\/[^\s]+)/)?.[1]
if (!url) throw new Error('Harness startup URL not found')
const titleIndex = process.argv.indexOf('--session-title')
const sessionTitle = titleIndex < 0 ? null : process.argv[titleIndex + 1]
if (titleIndex >= 0 && !sessionTitle) throw new Error('--session-title requires an existing nonblank session title')
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
let page

async function openExistingSession(page) {
  const tree = page.getByRole('tree', { name: '会话', exact: true })
  await tree.waitFor()
  const candidates = tree.getByRole('treeitem').filter({ hasNot: page.locator('[role="treeitem"]') })
  for (let index = 0; index < await candidates.count(); index++) {
    const candidate = candidates.nth(index)
    if (await candidate.getAttribute('aria-expanded') !== null) continue
    const title = (await candidate.innerText()).trim()
    if (title === '新会话' || (sessionTitle && !title.startsWith(sessionTitle))) continue
    await candidate.click()
    try {
      await page.getByRole('tab', { name: 'GAL视窗', exact: true }).waitFor({ timeout: 5000 })
      return title
    } catch {
      // Blank sessions intentionally have no conversation views in Harness.
    }
  }
  throw new Error('The isolated Harness profile needs an existing nonblank session to show GAL视窗. No task message was sent.')
}

async function assertImmersive(game) {
  assert.equal(await game.locator('progress,.gg-meter,.gg-scene-list,[data-testid="gal-game-debug"]').count(), 0, 'development statistics leaked into normal play')
  assert.equal(await game.getByRole('button', { name: '查看开发调试', exact: true }).count(), 0)
  assert.equal(await game.getAttribute('data-debug-enabled'), 'false')
  assert.doesNotMatch(await game.innerText(), /关系阶段|剧情进度|已互动轮数|场景目标|事件条件|判定理由|好感变化|信任变化|\d+\s*\/\s*100/)
}

async function decodePortrait(game) {
  await game.locator('.gg-character').evaluate(image => image.decode())
  const reveal = game.getByRole('button', { name: '显示完整对话', exact: true })
  if (await reveal.count()) await reveal.click()
}

async function modeContrast(button) {
  await button.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))))
  return button.evaluate(element => {
    const style = getComputedStyle(element)
    function luminance(cssColor) {
      const rgb = cssColor.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
        const linear = value / 255
        return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4
      })
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    }
    const foreground = luminance(style.color)
    const background = luminance(style.backgroundColor)
    return { label: element.textContent.trim(), selected: element.getAttribute('aria-selected'), color: style.color, background: style.backgroundColor, contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) }
  })
}

async function measureGame(game) {
  return game.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    const stages = ['.gg-stage', '.gg-dialogue', '.gg-input-band'].map(selector => {
      const rect = element.querySelector(selector).getBoundingClientRect()
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
    })
    const image = element.querySelector('.gg-character')
    const imageBounds = image?.getBoundingClientRect()
    const portrait = image ? { width: imageBounds.width, height: imageBounds.height, objectFit: getComputedStyle(image).objectFit, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight } : null
    return { width: element.clientWidth, scrollWidth: element.scrollWidth, top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right, viewportWidth: innerWidth, viewportHeight: innerHeight, stages, portrait }
  })
}

function assertGeometry(fits) {
  assert.ok(fits.width > 250 && fits.scrollWidth <= fits.width + 1, 'the embedded game overflows horizontally')
  assert.ok(fits.left >= -1 && fits.right <= fits.viewportWidth + 1, 'game extends outside the viewport')
  assert.ok(fits.stages[0].bottom <= fits.stages[1].top + 1 && fits.stages[1].bottom <= fits.stages[2].top + 1, 'game sections overlap')
  assert.ok(fits.portrait?.width >= 100 && fits.portrait.height >= 150 && fits.portrait.naturalWidth > 0 && fits.portrait.objectFit === 'contain', 'character portrait does not scale to the stage')
}

try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  // Keep the original story/free-mode regression suite on the legacy episode.
  await page.addInitScript(key => localStorage.setItem(`${key}:episode`, 'legacy'), storyKey)
  const errors = []
  let gameRpcCalls = 0
  page.on('pageerror', error => errors.push(error.message))
  page.on('websocket', socket => socket.on('framesent', ({ payload }) => {
    if (String(payload).includes('/model-router-gal-game')) gameRpcCalls += 1
  }))
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  const onboarding = page.getByRole('dialog').filter({ hasText: '内测声明' })
  if (await onboarding.count()) await onboarding.getByRole('button', { name: '继续', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'GAL游戏', exact: true }).count(), 0, 'standalone sidebar launcher must be removed')
  const openedSession = await openExistingSession(page)
  await page.getByRole('tab', { name: 'GAL视窗', exact: true }).click()
  const gal = page.locator('[data-gal-view]')
  const gameTab = gal.getByRole('tab', { name: 'GAL游戏', exact: true })
  const dialogueTab = gal.getByRole('tab', { name: '对话模式', exact: true })
  const editorTab = gal.getByRole('tab', { name: '编辑模式', exact: true })
  async function openFreeGame() {
    await gameTab.click()
    await gal.getByRole('tab', { name: '自由模式', exact: true }).click()
  }
  await gameTab.waitFor()
  await dialogueTab.click()
  const originalInput = gal.getByRole('textbox', { name: '玩家输入', exact: true })
  assert.ok(await originalInput.isEditable(), 'the original dialogue input is unavailable')
  const originalDraft = await originalInput.inputValue()
  const originalScene = await page.evaluate(() => localStorage.getItem('gal-view:scene:v1'))
  const originalDialogueBackground = await gal.locator('.gv-dialogue').first().evaluate(element => element.style.backgroundImage)
  await page.screenshot({ path: resolve(root, 'test-artifacts/harness-gal-original-dialogue.png'), fullPage: true })

  const callsBeforeStory = gameRpcCalls
  await gameTab.click()
  const story = gal.getByTestId('gal-story')
  await story.waitFor()
  assert.equal(await gal.getByRole('tab', { name: '剧情模式', exact: true }).getAttribute('aria-selected'), 'true', 'new game module must default to authored story')
  assert.equal(await story.getAttribute('data-debug-enabled'), 'false')
  assert.equal(await story.locator('progress,[data-testid="gal-story-debug"]').count(), 0)
  await story.getByRole('button', { name: '剧情与显示设置', exact: true }).click()
  await page.locator('.gg-panel').getByRole('checkbox', { name: '逐字显示', exact: true }).uncheck()
  await page.locator('.gg-panel').getByRole('button', { name: '关闭', exact: true }).click()
  const firstStoryText = await story.locator('.gg-spoken').innerText()
  for (let turn = 0; turn < 3; turn++) {
    const previous = await story.getAttribute('data-node-id')
    await story.locator('.gg-story-next').getByRole('button', { name: '继续', exact: true }).click()
    await page.waitForFunction(previous => document.querySelector('[data-testid="gal-story"]')?.dataset.nodeId !== previous, previous)
  }
  const storySaved = await page.evaluate(key => localStorage.getItem(key), storyKey)
  assert.ok(storySaved, 'authored story did not save its progress')
  const storyFrame = story.locator('[data-dialogue-character]')
  assert.ok(await storyFrame.locator('.gv-dialogue').count(), 'story did not use the shared GAL dialogue renderer')
  await story.getByRole('button', { name: '存档与读档', exact: true }).click()
  await page.locator('.gg-panel').getByRole('button', { name: '保存到存档 1', exact: true }).click()
  await page.locator('.gg-panel').getByRole('button', { name: '关闭', exact: true }).click()
  await story.getByRole('button', { name: '对话回顾', exact: true }).click()
  assert.ok((await page.locator('.gg-panel').innerText()).includes(firstStoryText), 'authored dialogue history is incomplete')
  await page.locator('.gg-panel').getByRole('button', { name: '关闭', exact: true }).click()
  const storyFits = []
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await story.locator('.gg-character').evaluate(image => image.decode())
    const fits = await measureGame(story)
    assertGeometry(fits)
    const raster = await inspectRasterFrame(storyFrame)
    storyFits.push({ viewport, ...fits, raster })
    await page.screenshot({ path: resolve(root, `test-artifacts/harness-gal-story-${viewport.width === 1440 ? 'desktop' : 'mobile'}.png`), fullPage: true })
  }
  assert.equal(gameRpcCalls, callsBeforeStory, 'authored story used the LLM game RPC')
  await page.setViewportSize({ width: 1440, height: 1000 })

  // Fixtures live only in this fresh browser context, separate from the user's saves.
  const initial = createGame({ id: 'harness-embedded-game-check' })
  await page.evaluate(({ storageKey, initial }) => localStorage.setItem(storageKey, JSON.stringify(initial)), { storageKey, initial })
  await openFreeGame()
  const game = gal.locator('[data-testid="gal-game"]')
  await game.waitFor()
  assert.equal(await page.getByRole('dialog', { name: 'GAL游戏模式' }).count(), 0, 'game must be embedded in GAL视窗')
  await page.waitForFunction(() => document.querySelector('[data-testid="gal-game"]')?.dataset.modelReady === 'true', undefined, { timeout: 20000 })
  await decodePortrait(game)
  await assertImmersive(game)
  const freeRaster = await inspectRasterFrame(game.locator('[data-dialogue-character]'))
  const modeContrasts = []
  for (const button of [dialogueTab, gameTab, editorTab]) {
    const normal = await modeContrast(button)
    assert.ok(normal.contrast >= 4.5, `${normal.label} has insufficient contrast`)
    await button.hover()
    const hovered = await modeContrast(button)
    assert.ok(hovered.contrast >= 4.5, `${hovered.label} hover has insufficient contrast`)
    modeContrasts.push({ normal, hovered })
  }
  await decodePortrait(game)
  const desktopFits = await measureGame(game)
  assertGeometry(desktopFits)
  await page.screenshot({ path: resolve(root, 'test-artifacts/harness-gal-desktop.png'), fullPage: true })

  const savedBeforeDebug = await page.evaluate(key => localStorage.getItem(key), storageKey)
  await game.getByRole('button', { name: '模型与显示设置', exact: true }).click()
  const settings = page.locator('.gg-panel')
  assert.equal(await settings.getByRole('checkbox', { name: '开发调试', exact: true }).isChecked(), false)
  const modelText = await settings.getByRole('combobox').innerText()
  await settings.getByRole('checkbox', { name: '开发调试', exact: true }).check()
  await settings.getByRole('button', { name: '关闭', exact: true }).click()
  await game.getByRole('button', { name: '查看开发调试', exact: true }).click()
  const debug = page.getByTestId('gal-game-debug')
  await debug.waitFor()
  assert.equal(await debug.getByRole('progressbar').count(), 2)
  assert.match(await debug.innerText(), /剧情进度/)
  assert.match(await debug.innerText(), /判定理由/)
  await page.screenshot({ path: resolve(root, 'test-artifacts/harness-gal-debug.png'), fullPage: true })
  await page.locator('.gg-panel').getByRole('button', { name: '关闭', exact: true }).click()
  await game.getByRole('button', { name: '模型与显示设置', exact: true }).click()
  await page.locator('.gg-panel').getByRole('checkbox', { name: '开发调试', exact: true }).uncheck()
  await page.locator('.gg-panel').getByRole('button', { name: '关闭', exact: true }).click()
  await assertImmersive(game)
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), savedBeforeDebug, 'debugging changed the game state')

  await game.getByRole('button', { name: '模型与显示设置', exact: true }).click()
  await page.locator('.gg-panel').getByRole('checkbox', { name: '开发调试', exact: true }).check()
  await page.locator('.gg-panel').getByRole('button', { name: '关闭', exact: true }).click()
  await editorTab.click()
  await gal.getByRole('toolbar', { name: '编辑器工具栏', exact: true }).waitFor()
  assert.ok(await gal.getByRole('button', { name: '导出', exact: true }).isEnabled())
  assert.ok(await gal.getByRole('spinbutton', { name: '舞台宽', exact: true }).isEditable())
  await page.screenshot({ path: resolve(root, 'test-artifacts/harness-gal-original-editor.png'), fullPage: true })
  await dialogueTab.click()
  assert.ok(await originalInput.isEditable())
  assert.equal(await originalInput.inputValue(), originalDraft)
  assert.equal(await gal.locator('.gv-dialogue').first().evaluate(element => element.style.backgroundImage), originalDialogueBackground, 'new game modes changed the original dialogue frame')
  await openFreeGame()
  await game.waitFor()
  await assertImmersive(game)
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), savedBeforeDebug, 'mode switching changed the save')
  assert.equal(await page.evaluate(() => localStorage.getItem('gal-view:scene:v1')), originalScene, 'game changed the original GAL scene')
  await gal.getByRole('tab', { name: '剧情模式', exact: true }).click()
  await story.waitFor()
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storyKey), storySaved, 'free mode changed the authored story save')
  assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), savedBeforeDebug, 'story mode changed the free-game save')
  await gal.getByRole('tab', { name: '自由模式', exact: true }).click()
  await game.waitFor()

  if (process.argv.includes('--live')) {
    await game.getByPlaceholder('此刻，想对她说些什么……').fill('你好，小深。我愿意陪你一起写这封信。你最希望把这里的哪件小事带到新城？')
    await game.getByRole('button', { name: '发送', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.gg-composer textarea')?.disabled === false, undefined, { timeout: 190000 })
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), storageKey)
    console.log(JSON.stringify({ liveRevision: saved?.revision ?? 0, liveError: await game.locator('.gg-error').allTextContents(), liveResponse: saved?.history?.at(-1)?.text ?? null, liveDelta: saved?.history?.at(-1)?.delta ?? null }))
    assert.equal(saved?.revision, 1, 'live turn did not complete')
    if (process.argv.includes('--negative')) {
      await game.getByPlaceholder('此刻，想对她说些什么……').fill('你的想法毫无价值，闭嘴，我根本不想听你说。')
      await game.getByRole('button', { name: '发送', exact: true }).click()
      await page.waitForFunction(() => document.querySelector('.gg-composer textarea')?.disabled === false, undefined, { timeout: 190000 })
      const hurt = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), storageKey)
      console.log(JSON.stringify({ negativeRevision: hurt?.revision, negativeDelta: hurt?.history?.at(-1)?.delta, mood: hurt?.mood, expression: hurt?.history?.at(-1)?.emotion, distance: hurt?.distance, response: hurt?.history?.at(-1)?.text }))
      assert.ok(hurt?.revision === 2 && hurt.affection < saved.affection && hurt.trust < saved.trust)
    }
    await decodePortrait(game)
    await assertImmersive(game)
    await page.screenshot({ path: resolve(root, 'test-artifacts/harness-gal-live.png'), fullPage: true })
  }

  const viewports = [{ width: 430, height: 860 }, { width: 390, height: 844 }]
  const mobileFits = []
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await decodePortrait(game)
    const fits = await measureGame(game)
    assertGeometry(fits)
    const raster = await inspectRasterFrame(game.locator('[data-dialogue-character]'))
    mobileFits.push({ viewport, ...fits, raster })
    await page.screenshot({ path: resolve(root, `test-artifacts/harness-gal-mobile-${viewport.width}.png`), fullPage: true })
  }

  if (process.argv.includes('--expressions')) {
    const saved = await page.evaluate(key => localStorage.getItem(key), storageKey)
    const checked = []
    try {
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const images = new Set()
        for (const emotion of EMOTIONS) {
          await page.setViewportSize({ width: 1440, height: 1000 })
          await dialogueTab.click()
          const state = createGame({ id: 'expression-verification' })
          state.history[0].emotion = emotion
          await page.evaluate(({ storageKey, state }) => localStorage.setItem(storageKey, JSON.stringify(state)), { storageKey, state })
          await openFreeGame()
          await page.setViewportSize(viewport)
          const portrait = game.locator('.gg-character')
          const pixels = await portrait.evaluate(async image => {
            await image.decode()
            const canvas = document.createElement('canvas')
            canvas.width = 64
            canvas.height = 112
            const context = canvas.getContext('2d')
            context.drawImage(image, 0, 0, 64, 112)
            const data = context.getImageData(0, 0, 64, 112).data
            let colored = 0
            for (let i = 0; i < data.length; i += 4) if (data[i + 3] && Math.min(data[i], data[i + 1], data[i + 2]) < 230) colored++
            return { width: image.naturalWidth, height: image.naturalHeight, colored }
          })
          assert.ok(pixels.width >= 1024 && pixels.height >= 1824 && pixels.colored > 1000, `${emotion} image is blank or too small`)
          const source = await portrait.getAttribute('src')
          if (emotion !== 'neutral') assert.ok(source.startsWith('data:image/webp;'), `${emotion} did not load the generated asset`)
          images.add(createHash('sha256').update(source).digest('hex'))
          assertGeometry(await measureGame(game))
          await assertImmersive(game)
          checked.push({ viewport, emotion, ...pixels })
        }
        assert.equal(images.size, EMOTIONS.length, 'expression images did not switch')
      }
    } finally {
      await page.evaluate(({ storageKey, saved }) => saved === null ? localStorage.removeItem(storageKey) : localStorage.setItem(storageKey, saved), { storageKey, saved })
    }
    console.log(JSON.stringify({ expressionChecks: checked }))
  }
  let expandedStory = null
  if (process.argv.includes('--story-expansion')) {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await gal.getByRole('tab', { name: '剧情模式', exact: true }).click()
    await story.waitFor()
    await story.getByRole('button', { name: '剧情与显示设置', exact: true }).click()
    await page.locator('.gg-panel').getByRole('checkbox', { name: '逐字显示', exact: true }).uncheck()
    await page.locator('.gg-panel').getByRole('button', { name: '关闭', exact: true }).click()
    const rpcBeforeExpansion = gameRpcCalls
    const visited = new Set()
    for (let step = 0; step < 110; step++) {
      const previous = await story.getAttribute('data-node-id')
      visited.add(previous)
      if (previous === 'personal-chatgpt-02') break
      const choices = story.locator('.gg-story-choices button[data-choice-id]')
      if (await choices.count()) await choices.first().click()
      else await story.locator('.gg-story-next').getByRole('button', { name: '继续', exact: true }).click()
      await page.waitForFunction(previous => document.querySelector('[data-testid="gal-story"]')?.dataset.nodeId !== previous, previous)
    }
    assert.ok(visited.has('orientation-choice'), 'Harness served the short story without its expanded prologue')
    assert.ok(visited.has('personal-chatgpt-02'), 'Harness did not load the authored character episode')
    const expansionSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storyKey)
    assert.equal(expansionSave.contentRevision, 2)
    const frames = []
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport)
      await story.locator('.gg-character').evaluate(image => image.decode())
      assertGeometry(await measureGame(story))
      frames.push(await inspectRasterFrame(story.locator('[data-dialogue-character="chatgpt"]')))
      await page.screenshot({ path: resolve(root, `test-artifacts/harness-gal-expanded-${viewport.width}.png`), fullPage: true })
    }
    assert.equal(gameRpcCalls, rpcBeforeExpansion, 'expanded story requested a model')
    expandedStory = { contentRevision: expansionSave.contentRevision, node: expansionSave.nodeId, readSteps: visited.size, frames }
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ origin: new URL(url).origin, phase: 'passed', session: openedSession, embedded: true, authoredStoryDefault: true, storyCallsModel: false, sharedDialogueRenderer: true, normalModeHidesStatistics: true, debugOptIn: true, originalDialogueAndEditor: true, modeSwitchPreservesSave: true, modeContrasts, modelText, storyFits, freeRaster, desktopFits, mobileFits, expandedStory, errors }))
} catch (error) {
  if (page) await page.screenshot({ path: resolve(root, 'test-artifacts/harness-gal-failure.png'), fullPage: true }).catch(() => {})
  console.error(String(error?.stack || error).split(url).join(new URL(url).origin))
  process.exitCode = 1
} finally { await browser.close() }
