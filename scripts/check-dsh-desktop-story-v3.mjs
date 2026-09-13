import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { STORY_SIDE_ROUTES, createStory, currentStoryNode, advanceStory } from '../.dsh-plugin/shared/gal-story-v2.mjs'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'test-artifacts')
await mkdir(output, { recursive: true })
const debugPort = process.env.DSH_DESKTOP_DEBUG_PORT || '9223'
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()
const target = targets.find(item => item.type === 'page' && /^http:\/\/127\.0\.0\.1:\d+\/?/.test(item.url))
if (!target?.webSocketDebuggerUrl) throw new Error('The authenticated DSH Desktop renderer target was not found')

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url)
    this.nextId = 0
    this.pending = new Map()
    this.listeners = new Map()
  }

  async open() {
    await new Promise((resolveOpen, reject) => {
      this.socket.addEventListener('open', resolveOpen, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(String(data))
      if (message.id) {
        const pending = this.pending.get(message.id)
        if (!pending) return
        this.pending.delete(message.id)
        clearTimeout(pending.timer)
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`))
        else pending.resolve(message.result)
        return
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params)
    })
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || []
    listeners.push(listener)
    this.listeners.set(method, listeners)
  }

  send(method, params = {}, timeout = 30_000) {
    const id = ++this.nextId
    return new Promise((resolveSend, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method}: CDP response timed out after ${timeout}ms`))
      }, timeout)
      this.pending.set(id, { method, resolve: resolveSend, reject, timer })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async evaluate(fn, ...args) {
    const expression = `(${fn.toString()})(...${JSON.stringify(args)})`
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text)
    return response.result.value
  }

  close() { this.socket.close() }
}

const cdp = new Cdp(target.webSocketDebuggerUrl)
await cdp.open()
await Promise.all([
  cdp.send('Runtime.enable'),
  cdp.send('Page.enable'),
  cdp.send('Network.enable'),
  cdp.send('Log.enable'),
])

const report = {
  actualHarness: true,
  host: 'DSH Desktop',
  desktopVersion: '2.0.7',
  title: {},
  accessibility: {},
  routes: {},
  backgrounds: {},
  expressions: new Set(),
  soundCues: new Set(),
  errors: [],
  gameTurnCalls: 0,
}
cdp.on('Runtime.exceptionThrown', params => report.errors.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'page exception'))
cdp.on('Network.webSocketFrameSent', params => {
  const payload = String(params.response?.payloadData || '')
  if (payload.includes('/model-router-gal-game') && payload.includes('turn')) report.gameTurnCalls++
})

async function waitFor(predicate, args = [], timeout = 30_000, label = 'condition') {
  const deadline = Date.now() + timeout
  do {
    if (await cdp.evaluate(predicate, ...args)) return
    await new Promise(resolveWait => setTimeout(resolveWait, 100))
  } while (Date.now() < deadline)
  throw new Error(`Timed out waiting for ${label}`)
}

async function clickExact(label, rootSelector = null) {
  const clicked = await cdp.evaluate((text, selector) => {
    const roots = selector
      ? [...document.querySelectorAll(selector)].filter(element => element.getClientRects().length > 0)
      : [document]
    const root = roots.at(-1)
    const element = root && [...root.querySelectorAll('button,[role="tab"],[role="treeitem"]')]
      .find(candidate => candidate.getClientRects().length > 0 && (candidate.getAttribute('aria-label') || candidate.textContent.trim() || candidate.getAttribute('title') || '') === text)
    if (!element) return false
    element.click()
    return true
  }, label, rootSelector)
  assert.ok(clicked, `Visible control not found: ${label}`)
}

async function screenshot(name) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  await writeFile(resolve(output, name), Buffer.from(shot.data, 'base64'))
}

async function openStoryAtTitle() {
  await waitFor(() => document.body && document.body.innerText.length > 0, [], 180_000, 'DSH Desktop application')
  const onboarding = await cdp.evaluate(() => document.querySelector('[role="dialog"]')?.textContent.includes('内测声明') || false)
  if (onboarding) await clickExact('继续', '[role="dialog"]')
  if (!await cdp.evaluate(() => Boolean(document.querySelector('[data-testid="gal-story"]')))) {
    await clickExact('GAL视窗')
    await waitFor(() => [...document.querySelectorAll('[role="tab"],button')].some(element => element.textContent.trim() === 'GAL游戏'), [], 30_000, 'GAL game tab')
    await clickExact('GAL游戏')
  }
  await waitFor(() => Boolean(document.querySelector('[data-testid="gal-story"]')), [], 30_000, 'GAL story view')
  if (!await cdp.evaluate(() => Boolean(document.querySelector('.gg-title-screen')))) await clickExact('返回游戏首页')
  await waitFor(() => Boolean(document.querySelector('.gg-title-screen')), [], 10_000, 'Galgame title screen')
}

async function advanceUi(choiceId = null, keyboard = false) {
  const before = await cdp.evaluate(() => document.querySelector('[data-testid="gal-story"]')?.dataset.nodeId)
  if (keyboard) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: '1', code: 'Digit1', windowsVirtualKeyCode: 49 })
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: '1', code: 'Digit1', windowsVirtualKeyCode: 49 })
  } else {
    const clicked = await cdp.evaluate(choice => {
      const story = document.querySelector('[data-testid="gal-story"]')
      const button = choice
        ? story?.querySelector(`button[data-choice-id="${CSS.escape(choice)}"]`)
        : story?.querySelector('.gg-story-next button')
      if (!button) return false
      button.click()
      return true
    }, choiceId)
    assert.ok(clicked, `Story advance control not found at ${before}`)
  }
  await waitFor(id => document.querySelector('[data-testid="gal-story"]')?.dataset.nodeId !== id, [before], 30_000, `story advance from ${before}`)
}

async function backgroundSnapshot() {
  return cdp.evaluate(async () => {
    const element = document.querySelector('[data-testid="gal-story"] .gg-stage')
    const css = element.style.backgroundImage
    const source = css.startsWith('url("') ? css.slice(5, -2) : css.startsWith('url(') ? css.slice(4, -1) : ''
    const image = new Image()
    image.src = source
    await image.decode()
    return {
      sourceType: source.slice(0, 24),
      sourceKey: `${source.length}:${source.slice(-24)}`,
      width: image.naturalWidth,
      height: image.naturalHeight,
      position: getComputedStyle(element).backgroundPosition,
    }
  })
}

const savedStorage = await cdp.evaluate(() => Object.fromEntries(Object.entries(localStorage)))
try {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await openStoryAtTitle()

  const title = await cdp.evaluate(async () => {
    const element = document.querySelector('.gg-title-screen')
    const css = element.style.backgroundImage
    const source = css.startsWith('url("') ? css.slice(5, -2) : css.slice(4, -1)
    const image = new Image()
    image.src = source
    await image.decode()
    return {
      buttons: [...element.querySelectorAll('button')].map(button => button.textContent.trim()),
      width: image.naturalWidth,
      height: image.naturalHeight,
      sourceType: source.slice(0, 24),
    }
  })
  assert.ok(title.buttons.length >= 4)
  assert.ok(title.buttons.includes('角色支线'))
  assert.ok(title.width >= 1900 && title.height >= 1000)
  report.title = title
  await screenshot('desktop-story-v3-title-1440.png')

  await clickExact('无障碍与声音', '.gg-title-screen')
  const settingsUpdated = await cdp.evaluate(() => {
    const panel = [...document.querySelectorAll('.gg-panel')].filter(element => element.getClientRects().length > 0).at(-1)
    const wanted = ['减少动态与关闭逐字动画', '高对比度', '大号文字', '易读字体与加宽字距', '显示声音线索字幕']
    for (const text of wanted) {
      const input = [...panel.querySelectorAll('label')].find(label => label.textContent.trim().includes(text))?.querySelector('input[type="checkbox"]')
      if (!input) return false
      if (!input.checked) input.click()
    }
    const volume = panel.querySelector('input[type="range"]')
    if (!volume) return false
    volume.value = '15'
    volume.dispatchEvent(new Event('input', { bubbles: true }))
    volume.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  })
  assert.ok(settingsUpdated)
  await clickExact('关闭', '.gg-panel')
  const accessibility = await cdp.evaluate(() => {
    const story = document.querySelector('[data-testid="gal-story"]')
    return { classes: story.className, titleFocusables: story.querySelectorAll('.gg-title-screen button').length, hiddenMain: story.querySelectorAll('.gg-main').length }
  })
  for (const name of ['is-reduced-motion', 'is-high-contrast', 'is-large-text', 'is-readable-font']) assert.ok(accessibility.classes.includes(name))
  assert.equal(accessibility.hiddenMain, 0)
  report.accessibility = accessibility

  for (let routeIndex = 0; routeIndex < STORY_SIDE_ROUTES.length; routeIndex++) {
    const route = STORY_SIDE_ROUTES[routeIndex]
    await clickExact('角色支线', '.gg-title-screen')
    const routeCount = await cdp.evaluate(() => document.querySelectorAll('.gg-panel .gg-route-card').length)
    assert.equal(routeCount, 22)
    const selected = await cdp.evaluate(routeId => {
      const button = document.querySelector(`.gg-panel .gg-route-card[data-route-id="${CSS.escape(routeId)}"]`)
      if (!button) return false
      button.click()
      return true
    }, route.id)
    assert.ok(selected, `Route card not found: ${route.id}`)
    await waitFor(routeId => document.querySelector('[data-testid="gal-story"]')?.dataset.routeId === routeId, [route.id], 10_000, `${route.id} route`)

    let state = createStory({ routeId: route.id })
    const routeExpressions = new Set()
    let routeSteps = 0
    for (; routeSteps < 32; routeSteps++) {
      const node = currentStoryNode(state)
      const ui = await cdp.evaluate(async () => {
        const story = document.querySelector('[data-testid="gal-story"]')
        const image = story.querySelector('.gg-character')
        let portrait = null
        if (image) {
          await image.decode()
          const bounds = image.getBoundingClientRect()
          const stage = story.querySelector('.gg-stage').getBoundingClientRect()
          portrait = { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, displayRatio: bounds.height / stage.height, className: image.className }
        }
        return { nodeId: story.dataset.nodeId, portrait, cueClass: story.querySelector('.gg-sound-cue')?.className || '' }
      })
      assert.equal(ui.nodeId, node.id)
      if (ui.portrait) {
        assert.ok(ui.portrait.naturalWidth > 0 && ui.portrait.naturalHeight > 0)
        assert.ok(ui.portrait.displayRatio >= .75)
        const expression = ui.portrait.className.match(/gg-expression-[\w-]+/)?.[0]
        if (expression) { routeExpressions.add(expression); report.expressions.add(expression) }
      }
      const cue = ui.cueClass.match(/is-([\w-]+)/)?.[1]
      if (cue) report.soundCues.add(cue)
      if (node.ending) break
      const choice = node.choices?.[0]?.id || null
      await advanceUi(choice, routeIndex === 0 && Boolean(choice))
      state = advanceStory(state, choice)
    }
    assert.ok(routeSteps < 32)
    assert.ok(currentStoryNode(state).ending.id.startsWith(`${route.id}-`))
    const background = await backgroundSnapshot()
    assert.ok(background.width >= 1500 && background.height >= 800 && background.width / background.height > 1.6)
    report.backgrounds[route.backgroundId] = background.sourceKey
    report.routes[route.id] = { steps: routeSteps, ending: currentStoryNode(state).ending.id, expressions: [...routeExpressions], backgroundId: route.backgroundId }
    if (['harness', 'claude', 'kimi', 'huggingface', 'perplexity'].includes(route.id)) await screenshot(`desktop-story-v3-route-${route.id}.png`)
    await clickExact('返回游戏首页')
    await waitFor(() => Boolean(document.querySelector('.gg-title-screen')), [], 10_000, 'title return')
  }

  assert.equal(Object.keys(report.routes).length, 22)
  assert.equal(Object.keys(report.backgrounds).length, 7)
  assert.ok(report.expressions.size >= 5)
  assert.ok(report.soundCues.has('kimi-flute'))
  assert.ok(report.soundCues.has('claude-verse'))

  await clickExact('剧目与章节', '.gg-title-screen')
  await clickExact('试玩：千桥之夜', '.gg-panel')
  await clickExact('确认', '.gg-panel')
  for (let step = 0; step < 48 && !report.soundCues.has('bridge-anomaly'); step++) {
    const cue = await cdp.evaluate(() => document.querySelector('[data-testid="gal-story"] .gg-sound-cue')?.className.match(/is-([\w-]+)/)?.[1] || null)
    if (cue) report.soundCues.add(cue)
    if (report.soundCues.has('bridge-anomaly')) break
    const choice = await cdp.evaluate(() => document.querySelector('[data-testid="gal-story"] [data-choice-id]')?.dataset.choiceId || null)
    await advanceUi(choice)
  }
  assert.ok(report.soundCues.has('bridge-anomaly'))
  await clickExact('返回游戏首页')

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await waitFor(() => innerWidth === 390, [], 10_000, '390px title viewport')
  const mobileTitle = await cdp.evaluate(() => {
    const element = document.querySelector('.gg-title-screen')
    return { width: element.clientWidth, scrollWidth: element.scrollWidth, height: element.clientHeight, scrollHeight: element.scrollHeight }
  })
  assert.ok(mobileTitle.scrollWidth <= mobileTitle.width + 1)
  assert.ok(mobileTitle.scrollHeight <= mobileTitle.height + 1)
  report.mobileTitle = mobileTitle
  await screenshot('desktop-story-v3-title-390.png')

  report.expressions = [...report.expressions]
  report.soundCues = [...report.soundCues]
  assert.equal(report.gameTurnCalls, 0)
  assert.deepEqual(report.errors, [])
  await writeFile(resolve(output, 'desktop-story-v3-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ actualHarness: true, host: report.host, routes: Object.keys(report.routes).length, backgrounds: Object.keys(report.backgrounds).length, expressions: report.expressions.length, soundCues: report.soundCues, errors: report.errors, gameTurnCalls: report.gameTurnCalls }))
} catch (error) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }).catch(() => null)
  if (shot) await writeFile(resolve(output, 'desktop-story-v3-failure.png'), Buffer.from(shot.data, 'base64'))
  throw error
} finally {
  await cdp.send('Emulation.clearDeviceMetricsOverride').catch(() => {})
  await cdp.evaluate(snapshot => {
    localStorage.clear()
    for (const [key, value] of Object.entries(snapshot)) localStorage.setItem(key, value)
  }, savedStorage).catch(() => {})
  await cdp.send('Page.reload', { ignoreCache: false }).catch(() => {})
  cdp.close()
}
