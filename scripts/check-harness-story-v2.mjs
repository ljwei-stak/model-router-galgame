import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { createStory, currentStoryNode, advanceStory, STORY_CHAPTERS } from '../.dsh-plugin/shared/gal-story-v2.mjs'
import { createStory as createLegacy } from '../.dsh-plugin/shared/gal-story.mjs'
import { storyStorageKey, episodeStorageKey } from '../.dsh-plugin/client/gal-story-storage.mjs'
import { buildPreviewBundle, createPreviewServer } from './gal-preview.mjs'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'test-artifacts')
await mkdir(output, { recursive: true })
const isPreview = process.argv.includes('--preview')
const prefix = isPreview ? 'preview-story-v2' : 'harness-story-v2'
const preview = isPreview ? await createPreviewServer({ bundle: await buildPreviewBundle() }) : null
const urlArg = process.argv.indexOf('--url')
const explicitUrl = urlArg >= 0 ? process.argv[urlArg + 1] : process.env.DSH_HARNESS_URL
const hostLogArg = process.argv.indexOf('--host-log')
const hostLog = hostLogArg >= 0 ? resolve(process.argv[hostLogArg + 1]) : resolve(output, 'dsh-host2.log')
const url = preview
  ? await preview.listen()
  : explicitUrl || (await readFile(hostLog, 'utf8')).match(/dsh web:\s*(http:\/\/[^\s]+)/)?.[1]
if (!url) throw new Error('Actual Harness host startup URL not found')
const baseKey = storyStorageKey(isPreview ? 'model-router-galgame:preview:v1' : 'model-router:gal-game:v1')
const newKey = episodeStorageKey(baseKey, 'bridges')
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
let page, story
const report = { actualHarness: !isPreview, chapters: [], decisions: [], portraits: {}, errors: [], gameTurnCalls: 0 }
async function closePanel() { await page.locator('.gg-panel').last().getByRole('button', { name: '关闭', exact: true }).click() }
async function confirm() { await page.locator('.gg-panel').last().getByRole('button', { name: '确认', exact: true }).click() }
async function openStory() {
  if (!isPreview) {
    const onboarding = page.getByRole('dialog').filter({ hasText: '内测声明' })
    if (await onboarding.count()) await onboarding.getByRole('button', { name: '继续', exact: true }).click()
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
  story = page.getByTestId('gal-story')
  await story.waitFor()
}
async function noTyping() {
  await story.getByRole('button', { name: '剧情与显示设置', exact: true }).click()
  await page.locator('.gg-panel').getByRole('checkbox', { name: '逐字显示', exact: true }).uncheck()
  await closePanel()
}
async function clickNext(choiceId = null) {
  const before = await story.getAttribute('data-node-id')
  if (choiceId) await story.locator(`button[data-choice-id="${choiceId}"]`).click()
  else for (let i = 0; i < 20 && await story.getAttribute('data-node-id') === before; i++) await story.locator('.gg-story-next').getByRole('button', { name: '继续', exact: true }).click()
  await page.waitForFunction(before => document.querySelector('[data-testid="gal-story"]')?.dataset.nodeId !== before, before)
}
async function snapshotCast(key) {
  const portrait = story.locator('.gg-character')
  await portrait.evaluate(image => image.decode())
  const data = await portrait.evaluate(image => ({ name: image.alt, width: image.naturalWidth, height: image.naturalHeight, src: image.src }))
  assert.ok(data.width > 0 && data.height > 0)
  const srcHash = createHash('sha256').update(data.src).digest('hex')
  const sizes = []
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    const fits = await story.evaluate(element => {
      const name = element.querySelector('.ggd-nameplate span')
      const image = element.querySelector('.gg-character')
      const bounds = element.getBoundingClientRect()
      return { width: element.clientWidth, scrollWidth: element.scrollWidth, left: bounds.left, right: bounds.right, viewport: innerWidth, nameWidth: name.clientWidth, nameScrollWidth: name.scrollWidth, portraitWidth: image.getBoundingClientRect().width, fit: getComputedStyle(image).objectFit, speaker: name.textContent }
    })
    assert.ok(fits.scrollWidth <= fits.width + 1 && fits.left >= -1 && fits.right <= fits.viewport + 1, `${key} horizontal overflow`)
    assert.ok(fits.nameScrollWidth <= fits.nameWidth + 1, `${key} clipped name`)
    assert.ok(fits.portraitWidth > 80 && fits.fit === 'contain')
    await page.screenshot({ path: resolve(output, `${prefix}-${key}-${viewport.width}.png`), fullPage: true })
    sizes.push({ viewport, ...fits })
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  report.portraits[key] = { name: data.name, sourceHash: srcHash, sizes }
}
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' })
  page.setDefaultTimeout(25000)
  page.on('pageerror', error => report.errors.push(error.message))
  page.on('websocket', socket => socket.on('framesent', ({ payload }) => { const text = String(payload); if (text.includes('/model-router-gal-game') && text.includes('turn')) report.gameTurnCalls++ }))
  await page.goto(url, { timeout: 180000 })
  await openStory()
  assert.equal(await story.getAttribute('data-episode-id'), 'bridges')
  await noTyping()
  let state = createStory(), turns = 0
  const newCast = ['huggingface', 'llama', 'rwkv', 'perplexity', 'github', 'gitlab', 'gitee', 'cloudflare']
  let testedSave = false
  for (; turns < 1024; turns++) {
    const node = currentStoryNode(state)
    assert.equal(await story.getAttribute('data-node-id'), node.id)
    assert.equal(await story.getAttribute('data-debug-enabled'), 'false')
    assert.equal(await story.locator('[data-testid="gal-story-debug"],progress').count(), 0)
    assert.equal(await story.locator('.gg-spoken').textContent(), node.text)
    if (!report.chapters.includes(node.chapterId)) report.chapters.push(node.chapterId)
    if (newCast.includes(node.speaker) && !report.portraits[node.speaker]) await snapshotCast(node.speaker)
    if (node.choices) {
      assert.equal(await story.locator('[data-choice-id]').count(), node.choices.length)
      report.decisions.push(node.id)
    }
    if (!testedSave && node.chapterId === 'open-day' && node.choices) {
      await story.getByRole('button', { name: '存档与读档', exact: true }).click()
      await page.locator('.gg-panel').getByRole('button', { name: '保存到存档 1', exact: true }).click()
      const downloadPromise = page.waitForEvent('download')
      await page.locator('.gg-panel').getByRole('button', { name: '导出存档', exact: true }).click()
      const download = await downloadPromise
      const exportedPath = resolve(output, `${prefix}-save.json`)
      await download.saveAs(exportedPath)
      await closePanel()
      await clickNext(node.choices[0].id)
      await story.getByRole('button', { name: '存档与读档', exact: true }).click()
      await page.locator('.gg-panel').getByRole('button', { name: '读取存档 1', exact: true }).click(); await confirm()
      assert.equal(await story.getAttribute('data-node-id'), node.id)
      await story.getByRole('button', { name: '存档与读档', exact: true }).click()
      await page.locator('input[type="file"]').setInputFiles(exportedPath); await confirm()
      assert.equal(await story.getAttribute('data-node-id'), node.id)
      await page.reload({ timeout: 180000 }); await openStory(); await noTyping()
      assert.equal(await story.getAttribute('data-node-id'), node.id)
      report.manualSaveImportReload = true; testedSave = true
    }
    if (node.ending) break
    await clickNext(node.choices?.[0]?.id)
    state = advanceStory(state, node.choices?.[0]?.id ?? null)
  }
  assert.ok(turns < 1024)
  report.routeSteps = turns
  report.ending = currentStoryNode(state).ending.id
  assert.equal(Object.keys(report.portraits).length, 8)
  assert.equal(new Set(Object.values(report.portraits).map(item => item.sourceHash)).size, 8)
  await story.getByRole('button', { name: '对话回顾', exact: true }).click()
  assert.ok((await page.locator('.gg-panel').innerText()).includes('如果路线不对'))
  await closePanel()
  const newSave = await page.evaluate(key => localStorage.getItem(key), newKey)
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: baseKey, state: createLegacy() })
  await story.getByRole('button', { name: '剧目与章节', exact: true }).click()
  await page.getByRole('button', { name: '继续旧城迁移篇', exact: true }).click()
  assert.equal(await story.getAttribute('data-episode-id'), 'legacy')
  assert.equal(await story.getAttribute('data-node-id'), 'arrival-01')
  await noTyping(); await clickNext()
  const oldSave = await page.evaluate(key => localStorage.getItem(key), baseKey)
  await story.getByRole('button', { name: '剧目与章节', exact: true }).click()
  await page.getByRole('button', { name: '继续千桥协议', exact: true }).click()
  assert.equal(await story.getAttribute('data-node-id'), state.nodeId)
  assert.equal(await page.evaluate(key => localStorage.getItem(key), newKey), newSave)
  for (const chapter of STORY_CHAPTERS) {
    await story.getByRole('button', { name: '剧目与章节', exact: true }).click()
    await page.getByRole('button', { name: `试玩：${chapter.title}`, exact: true }).click(); await confirm()
    assert.equal(await story.getAttribute('data-node-id'), chapter.startNodeId)
  }
  assert.equal(await page.evaluate(key => localStorage.getItem(key), baseKey), oldSave)
  report.episodeAndChapterIsolation = true
  assert.equal(report.gameTurnCalls, 0)
  assert.deepEqual(report.errors, [])
  await writeFile(resolve(output, `${prefix}-report.json`), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, portraits: Object.keys(report.portraits) }))
} catch (error) {
  if (page) { await page.screenshot({ path: resolve(output, `${prefix}-failure.png`), fullPage: true }).catch(() => {}); await writeFile(resolve(output, `${prefix}-failure.txt`), (await page.locator('body').innerText()).slice(0,10000)).catch(() => {}) }
  throw error
} finally { await browser.close(); await preview?.close() }
