import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { STORY_SIDE_ROUTES, createStory, currentStoryNode, advanceStory } from '../.dsh-plugin/shared/gal-story-v2.mjs'
import { buildPreviewBundle, createPreviewServer } from './gal-preview.mjs'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'test-artifacts')
await mkdir(output, { recursive: true })
const isPreview = process.argv.includes('--preview')
const prefix = isPreview ? 'preview-story-v3' : 'harness-story-v3'
const preview = isPreview ? await createPreviewServer({ bundle: await buildPreviewBundle() }) : null
const urlArg = process.argv.indexOf('--url')
const explicitUrl = urlArg >= 0 ? process.argv[urlArg + 1] : process.env.DSH_HARNESS_URL
const hostLogArg = process.argv.indexOf('--host-log')
const hostLog = hostLogArg >= 0 ? resolve(process.argv[hostLogArg + 1]) : resolve(output, 'dsh-host2.log')
const url = preview ? await preview.listen() : explicitUrl || (await readFile(hostLog, 'utf8')).match(/dsh web:\s*(http:\/\/[^\s]+)/)?.[1]
if (!url) throw new Error('Actual Harness host startup URL not found')

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
let page
let story
const report = { actualHarness: !isPreview, title: {}, accessibility: {}, routes: {}, backgrounds: {}, expressions: new Set(), soundCues: new Set(), errors: [], gameTurnCalls: 0 }

async function openStory() {
  if (!isPreview) {
    const onboarding = page.getByRole('dialog').filter({ hasText: '内测声明' })
    if (await onboarding.count()) await onboarding.getByRole('button', { name: '继续', exact: true }).click()
    if (!await page.getByTestId('gal-story').count()) {
      const tree = page.getByRole('tree', { name: '会话', exact: true })
      await tree.waitFor()
      const candidates = tree.getByRole('treeitem').filter({ hasNot: page.locator('[role="treeitem"]') })
      let opened = false
      for (let i = 0; i < await candidates.count(); i++) {
        const candidate = candidates.nth(i)
        if (await candidate.getAttribute('aria-expanded') !== null || (await candidate.innerText()).trim() === '新会话') continue
        await candidate.click()
        try { await page.getByRole('tab', { name: 'GAL视窗', exact: true }).waitFor({ timeout: 5000 }); opened = true; break } catch {}
      }
      assert.ok(opened, 'Create a nonblank offline test conversation in the isolated Harness profile before running this check')
      await page.getByRole('tab', { name: 'GAL视窗', exact: true }).click()
      await page.getByRole('tab', { name: 'GAL游戏', exact: true }).click()
    }
  }
  story = page.getByTestId('gal-story')
  await story.waitFor()
  await story.locator('.gg-title-screen').waitFor()
}

async function closePanel() { await page.locator('.gg-panel').last().getByRole('button', { name: '关闭', exact: true }).click() }
async function clickNext(choiceId = null, keyboard = false) {
  const before = await story.getAttribute('data-node-id')
  if (choiceId) {
    if (keyboard) await page.keyboard.press('Digit1')
    else await story.locator(`button[data-choice-id="${choiceId}"]`).click()
  } else {
    await story.locator('.gg-story-next').getByRole('button', { name: '继续', exact: true }).click()
  }
  await page.waitForFunction(previous => document.querySelector('[data-testid="gal-story"]')?.dataset.nodeId !== previous, before)
}

async function backgroundSnapshot() {
  return story.locator('.gg-stage').evaluate(async element => {
    const css = element.style.backgroundImage
    const source = css.startsWith('url("') ? css.slice(5, -2) : css.startsWith('url(') ? css.slice(4, -1) : ''
    const image = new Image(); image.src = source; await image.decode()
    return { source, width: image.naturalWidth, height: image.naturalHeight, position: getComputedStyle(element).backgroundPosition }
  })
}

try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' })
  page.setDefaultTimeout(30000)
  page.on('pageerror', error => report.errors.push(error.message))
  page.on('websocket', socket => socket.on('framesent', ({ payload }) => { const text = String(payload); if (text.includes('/model-router-gal-game') && text.includes('turn')) report.gameTurnCalls++ }))
  await page.goto(url, { timeout: 180000 })
  await openStory()

  const title = story.locator('.gg-title-screen')
  assert.ok(await title.getByRole('button').count() >= 4)
  assert.equal(await title.getByRole('button', { name: '角色支线', exact: true }).count(), 1)
  const titleBackground = await title.evaluate(async element => {
    const css = element.style.backgroundImage
    const source = css.startsWith('url("') ? css.slice(5, -2) : css.slice(4, -1)
    const image = new Image(); image.src = source; await image.decode()
    return { source, width: image.naturalWidth, height: image.naturalHeight }
  })
  assert.ok(titleBackground.width >= 1900 && titleBackground.height >= 1000)
  report.title = { width: titleBackground.width, height: titleBackground.height, sourceHash: createHash('sha256').update(titleBackground.source).digest('hex') }
  await page.screenshot({ path: resolve(output, `${prefix}-title-1440.png`), fullPage: true })

  await title.getByRole('button', { name: '无障碍与声音', exact: true }).click()
  const settings = page.locator('.gg-panel').last()
  await settings.getByRole('checkbox', { name: '减少动态与关闭逐字动画', exact: true }).check()
  await settings.getByRole('checkbox', { name: '高对比度', exact: true }).check()
  await settings.getByRole('checkbox', { name: '大号文字', exact: true }).check()
  await settings.getByRole('checkbox', { name: '易读字体与加宽字距', exact: true }).check()
  await settings.getByRole('checkbox', { name: '显示声音线索字幕', exact: true }).check()
  await settings.getByRole('slider', { name: '音乐音量', exact: true }).fill('15')
  await closePanel()
  const accessibility = await story.evaluate(element => ({ classes: element.className, titleFocusables: element.querySelectorAll('.gg-title-screen button').length, hiddenMain: element.querySelectorAll('.gg-main').length }))
  for (const name of ['is-reduced-motion', 'is-high-contrast', 'is-large-text', 'is-readable-font']) assert.ok(accessibility.classes.includes(name))
  assert.equal(accessibility.hiddenMain, 0)
  report.accessibility = accessibility

  for (let routeIndex = 0; routeIndex < STORY_SIDE_ROUTES.length; routeIndex++) {
    const route = STORY_SIDE_ROUTES[routeIndex]
    await story.locator('.gg-title-screen').getByRole('button', { name: '角色支线', exact: true }).click()
    const routeCards = page.locator('.gg-panel').last().locator('.gg-route-card')
    assert.equal(await routeCards.count(), 22)
    await page.locator(`.gg-panel .gg-route-card[data-route-id="${route.id}"]`).click()
    assert.equal(await story.getAttribute('data-route-id'), route.id)
    let state = createStory({ routeId: route.id })
    const expressionClasses = new Set()
    let routeSteps = 0
    for (; routeSteps < 32; routeSteps++) {
      const node = currentStoryNode(state)
      assert.equal(await story.getAttribute('data-node-id'), node.id)
      const portrait = story.locator('.gg-character')
      if (await portrait.count()) {
        await portrait.evaluate(image => image.decode())
        const portraitData = await portrait.evaluate(image => {
          const p = image.getBoundingClientRect(), s = image.closest('.gg-main').querySelector('.gg-stage').getBoundingClientRect()
          return { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, displayRatio: p.height / s.height, className: image.className }
        })
        assert.ok(portraitData.naturalWidth > 0 && portraitData.naturalHeight > 0)
        assert.ok(portraitData.displayRatio >= .75)
        expressionClasses.add(portraitData.className.match(/gg-expression-[\w-]+/)?.[0])
        report.expressions.add(portraitData.className.match(/gg-expression-[\w-]+/)?.[0])
      }
      const cue = story.locator('.gg-sound-cue')
      if (await cue.count()) report.soundCues.add((await cue.getAttribute('class')).match(/is-([\w-]+)/)?.[1])
      if (node.ending) break
      const choice = node.choices?.[0]?.id || null
      await clickNext(choice, routeIndex === 0 && Boolean(choice))
      state = advanceStory(state, choice)
    }
    assert.ok(routeSteps < 32)
    assert.equal(currentStoryNode(state).ending.id.startsWith(`${route.id}-`), true)
    const bg = await backgroundSnapshot()
    assert.ok(bg.width >= 1500 && bg.height >= 800 && bg.width / bg.height > 1.6)
    report.backgrounds[route.backgroundId] = createHash('sha256').update(bg.source).digest('hex')
    report.routes[route.id] = { steps: routeSteps, ending: currentStoryNode(state).ending.id, expressions: [...expressionClasses].filter(Boolean), backgroundId: route.backgroundId }
    if (['harness', 'claude', 'kimi', 'huggingface', 'perplexity'].includes(route.id)) await page.screenshot({ path: resolve(output, `${prefix}-route-${route.id}.png`), fullPage: true })
    await story.getByRole('button', { name: '返回游戏首页', exact: true }).click()
    await story.locator('.gg-title-screen').waitFor()
  }

  assert.equal(Object.keys(report.routes).length, 22)
  assert.equal(Object.keys(report.backgrounds).length, 7)
  assert.ok(report.expressions.size >= 5)
  assert.ok(report.soundCues.has('kimi-flute'))
  assert.ok(report.soundCues.has('claude-verse'))

  await page.setViewportSize({ width: 390, height: 844 })
  const mobile = await title.evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth, height: element.clientHeight, scrollHeight: element.scrollHeight }))
  assert.ok(mobile.scrollWidth <= mobile.width + 1)
  assert.ok(mobile.scrollHeight <= mobile.height + 1)
  await page.screenshot({ path: resolve(output, `${prefix}-title-390.png`), fullPage: true })
  report.mobileTitle = mobile
  report.expressions = [...report.expressions].filter(Boolean)
  report.soundCues = [...report.soundCues].filter(Boolean)
  assert.equal(report.gameTurnCalls, 0)
  assert.deepEqual(report.errors, [])
  await writeFile(resolve(output, `${prefix}-report.json`), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ actualHarness: report.actualHarness, routes: Object.keys(report.routes).length, backgrounds: Object.keys(report.backgrounds).length, expressions: report.expressions.length, soundCues: report.soundCues, errors: report.errors }))
} catch (error) {
  if (page) {
    await page.screenshot({ path: resolve(output, `${prefix}-failure.png`), fullPage: true }).catch(() => {})
    await writeFile(resolve(output, `${prefix}-failure.txt`), (await page.locator('body').innerText()).slice(0, 12000)).catch(() => {})
  }
  throw error
} finally {
  await browser.close()
  await preview?.close()
}
