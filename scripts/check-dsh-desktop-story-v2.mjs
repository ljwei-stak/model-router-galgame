import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createStory, currentStoryNode, advanceStory, STORY_CHAPTERS } from '../.dsh-plugin/shared/gal-story-v2.mjs'
import { createStory as createLegacy } from '../.dsh-plugin/shared/gal-story.mjs'
import { storyStorageKey, episodeStorageKey } from '../.dsh-plugin/client/gal-story-storage.mjs'

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

  send(method, params = {}) {
    const id = ++this.nextId
    return new Promise((resolveSend, reject) => {
      this.pending.set(id, { method, resolve: resolveSend, reject })
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
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text)
    }
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

const baseKey = storyStorageKey('model-router:gal-game:v1')
const newKey = episodeStorageKey(baseKey, 'bridges')
const report = {
  actualHarness: true,
  host: 'DSH Desktop',
  desktopVersion: '2.0.7',
  chapters: [],
  decisions: [],
  portraits: {},
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
    if (!root) return false
    const element = [...root.querySelectorAll('button,[role="tab"],[role="treeitem"]')]
      .find(candidate => {
        const label = candidate.getAttribute('aria-label') || candidate.textContent.trim() || candidate.getAttribute('title') || ''
        return candidate.getClientRects().length > 0 && label === text
      })
    if (!element) return false
    element.click()
    return true
  }, label, rootSelector)
  if (!clicked) {
    const diagnostics = await cdp.evaluate(() => ({
      title: document.title,
      ready: document.readyState,
      failedPlugins: document.body.innerText.includes('Failed to load plugins') || document.body.innerText.includes('插件加载失败'),
      hasConversation: Boolean(document.querySelector('textarea')),
      controls: [...document.querySelectorAll('button,[role="tab"]')]
        .filter(element => element.getClientRects().length > 0)
        .map(element => element.getAttribute('aria-label') || element.textContent.trim() || element.getAttribute('title') || '')
        .filter(text => /GAL|对话|轨迹|统计|设置|加载|插件|游戏|视窗|监控/u.test(text))
        .slice(0, 40),
    }))
    assert.fail(`Visible control not found: ${label}; ${JSON.stringify(diagnostics)}`)
  }
}

async function reload() {
  await cdp.send('Page.reload', { ignoreCache: true })
  await waitFor(() => document.readyState === 'complete', [], 180_000, 'DSH Desktop reload')
}

async function openStory() {
  await waitFor(() => document.body && document.body.innerText.length > 0, [], 180_000, 'DSH Desktop application')
  const onboarding = await cdp.evaluate(() => document.querySelector('[role="dialog"]')?.textContent.includes('内测声明') || false)
  if (onboarding) await clickExact('继续', '[role="dialog"]')
  if (!await cdp.evaluate(() => Boolean(document.querySelector('[data-testid="gal-story"]')))) {
    await clickExact('GAL视窗')
    await waitFor(() => [...document.querySelectorAll('[role="tab"],button')].some(element => element.textContent.trim() === 'GAL游戏'), [], 30_000, 'GAL game tab')
    await clickExact('GAL游戏')
  }
  await waitFor(() => Boolean(document.querySelector('[data-testid="gal-story"]')), [], 30_000, 'GAL story view')
}

async function noTyping() {
  await clickExact('剧情与显示设置')
  const updated = await cdp.evaluate(() => {
    const panels = [...document.querySelectorAll('.gg-panel')].filter(element => element.getClientRects().length > 0)
    const panel = panels.at(-1)
    const label = panel && [...panel.querySelectorAll('label')].find(element => element.textContent.includes('逐字显示'))
    const input = label?.querySelector('input[type="checkbox"]')
    if (!input) return false
    if (input.checked) input.click()
    return true
  })
  assert.ok(updated, 'Typing setting was not available')
  await clickExact('关闭', '.gg-panel')
}

async function storySnapshot() {
  return cdp.evaluate(() => {
    const story = document.querySelector('[data-testid="gal-story"]')
    return story && {
      nodeId: story.dataset.nodeId,
      episodeId: story.dataset.episodeId,
      chapterId: story.dataset.chapterId,
      debugEnabled: story.dataset.debugEnabled,
      spoken: story.querySelector('.gg-spoken')?.textContent || '',
      choices: [...story.querySelectorAll('[data-choice-id]')].map(element => element.dataset.choiceId),
      debugCount: story.querySelectorAll('[data-testid="gal-story-debug"],progress').length,
    }
  })
}

async function advanceUi(choiceId = null) {
  const before = (await storySnapshot()).nodeId
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
  await waitFor(id => document.querySelector('[data-testid="gal-story"]')?.dataset.nodeId !== id, [before], 30_000, `story advance from ${before}`)
}

async function layoutAt(width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })
  await waitFor(expected => innerWidth === expected, [width], 10_000, `${width}px viewport`)
  return cdp.evaluate(() => {
    const story = document.querySelector('[data-testid="gal-story"]')
    const name = story.querySelector('.ggd-nameplate span')
    const image = story.querySelector('.gg-character')
    const bounds = story.getBoundingClientRect()
    return {
      width: story.clientWidth,
      scrollWidth: story.scrollWidth,
      left: bounds.left,
      right: bounds.right,
      viewport: innerWidth,
      nameWidth: name.clientWidth,
      nameScrollWidth: name.scrollWidth,
      portraitWidth: image.getBoundingClientRect().width,
      fit: getComputedStyle(image).objectFit,
      speaker: name.textContent,
    }
  })
}

async function snapshotCast(key) {
  await waitFor(() => {
    const image = document.querySelector('[data-testid="gal-story"] .gg-character')
    return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0)
  }, [], 30_000, `${key} portrait`)
  const data = await cdp.evaluate(async () => {
    const image = document.querySelector('[data-testid="gal-story"] .gg-character')
    const bytes = new TextEncoder().encode(image.src)
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    return {
      name: image.alt,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      sourceHash: [...digest].map(byte => byte.toString(16).padStart(2, '0')).join(''),
    }
  })
  const sizes = []
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const layout = await layoutAt(viewport.width, viewport.height)
    assert.ok(layout.scrollWidth <= layout.width + 1 && layout.left >= -1 && layout.right <= layout.viewport + 1, `${key} horizontal overflow`)
    assert.ok(layout.nameScrollWidth <= layout.nameWidth + 1, `${key} clipped name`)
    assert.ok(layout.portraitWidth > 80 && layout.fit === 'contain', `${key} portrait layout`)
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    await writeFile(resolve(output, `desktop-story-v2-${key}-${viewport.width}.png`), Buffer.from(shot.data, 'base64'))
    sizes.push({ viewport, ...layout })
  }
  report.portraits[key] = { ...data, sizes }
}

const savedStorage = await cdp.evaluate(() => Object.fromEntries(Object.entries(localStorage)))
try {
  await cdp.evaluate((base, next) => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(next)) localStorage.removeItem(key)
    }
    localStorage.setItem(`${base}:episode`, 'bridges')
  }, baseKey, newKey)
  await reload()
  await openStory()
  await noTyping()
  assert.equal((await storySnapshot()).episodeId, 'bridges')

  let state = createStory()
  let turns = 0
  let testedSave = false
  const newCast = ['huggingface', 'llama', 'rwkv', 'perplexity', 'github', 'gitlab', 'gitee', 'cloudflare']
  for (; turns < 1024; turns++) {
    const node = currentStoryNode(state)
    const ui = await storySnapshot()
    assert.equal(ui.nodeId, node.id)
    assert.equal(ui.episodeId, 'bridges')
    assert.equal(ui.chapterId, node.chapterId)
    assert.equal(ui.debugEnabled, 'false')
    assert.equal(ui.debugCount, 0)
    assert.equal(ui.spoken, node.text)
    assert.deepEqual(ui.choices, (node.choices || []).map(choice => choice.id))
    if (!report.chapters.includes(node.chapterId)) report.chapters.push(node.chapterId)
    if (newCast.includes(node.speaker) && !report.portraits[node.speaker]) await snapshotCast(node.speaker)
    if (node.choices) report.decisions.push(node.id)

    if (!testedSave && node.chapterId === 'open-day' && node.choices) {
      await clickExact('存档与读档')
      await clickExact('保存到存档 1', '.gg-panel')
      await clickExact('关闭', '.gg-panel')
      await advanceUi(node.choices[0].id)
      await clickExact('存档与读档')
      await clickExact('读取存档 1', '.gg-panel')
      await clickExact('确认', '.gg-panel')
      assert.equal((await storySnapshot()).nodeId, node.id)
      await reload()
      await openStory()
      await noTyping()
      assert.equal((await storySnapshot()).nodeId, node.id)
      report.manualSaveAndReload = true
      testedSave = true
    }
    if (node.ending) break
    await advanceUi(node.choices?.[0]?.id || null)
    state = advanceStory(state, node.choices?.[0]?.id || null)
  }

  assert.ok(turns < 1024, 'Story route did not terminate')
  report.routeSteps = turns
  report.ending = currentStoryNode(state).ending.id
  assert.equal(Object.keys(report.portraits).length, 8)
  assert.equal(new Set(Object.values(report.portraits).map(item => item.sourceHash)).size, 8)

  await clickExact('对话回顾')
  assert.ok(await cdp.evaluate(() => [...document.querySelectorAll('.gg-panel')].some(panel => panel.getClientRects().length > 0 && panel.textContent.includes('如果路线不对'))))
  await clickExact('关闭', '.gg-panel')
  const newSave = await cdp.evaluate(key => localStorage.getItem(key), newKey)
  await cdp.evaluate((key, legacy) => localStorage.setItem(key, JSON.stringify(legacy)), baseKey, createLegacy())
  await clickExact('剧目与章节')
  await clickExact('继续旧城迁移篇', '.gg-panel')
  assert.equal((await storySnapshot()).episodeId, 'legacy')
  assert.equal((await storySnapshot()).nodeId, 'arrival-01')
  await noTyping()
  await advanceUi()
  const oldSave = await cdp.evaluate(key => localStorage.getItem(key), baseKey)
  await clickExact('剧目与章节')
  await clickExact('继续千桥协议', '.gg-panel')
  assert.equal((await storySnapshot()).nodeId, state.nodeId)
  assert.equal(await cdp.evaluate(key => localStorage.getItem(key), newKey), newSave)

  for (const chapter of STORY_CHAPTERS) {
    await clickExact('剧目与章节')
    await clickExact(`试玩：${chapter.title}`, '.gg-panel')
    await clickExact('确认', '.gg-panel')
    assert.equal((await storySnapshot()).nodeId, chapter.startNodeId)
  }
  assert.equal(await cdp.evaluate(key => localStorage.getItem(key), baseKey), oldSave)
  report.episodeAndChapterIsolation = true
  assert.equal(report.gameTurnCalls, 0)
  assert.deepEqual(report.errors, [])
  await cdp.send('Emulation.clearDeviceMetricsOverride')
  await writeFile(resolve(output, 'desktop-story-v2-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, portraits: Object.keys(report.portraits) }))
} catch (error) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }).catch(() => null)
  if (shot) await writeFile(resolve(output, 'desktop-story-v2-failure.png'), Buffer.from(shot.data, 'base64'))
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
