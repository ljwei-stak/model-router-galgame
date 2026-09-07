import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { commitTurn, currentScene } from '../.dsh-plugin/shared/gal-game.mjs'

const url = process.env.GAL_PREVIEW_URL || 'http://127.0.0.1:61533'
const output = new URL('../test-artifacts/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const errors = []
async function assertImmersive(page) {
  const game = page.locator('.gg-root')
  assert.equal(await game.getAttribute('data-debug-enabled'), 'false')
  assert.equal(await game.locator('progress,.gg-sidebar,[data-testid="gal-game-debug"]').count(), 0)
  assert.doesNotMatch(await game.innerText(), /好感|信任|初识|熟悉|信赖|心意渐近|当前篇章|内部判定/)
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  await page.getByRole('tab', { name: '自由模式', exact: true }).click()
  await page.locator('.gg-root').waitFor()
  await assertImmersive(page)
  await page.locator('.gg-character').evaluate(image => image.decode())
  await page.locator('.gg-dialogue-content').click()
  await page.screenshot({ path: new URL('gal-desktop.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  assert.equal(await page.locator('.gg-character').evaluate(image => image.naturalWidth > 0), true)
  await page.getByLabel('模型与显示设置', { exact: true }).click()
  await page.getByLabel('API 地址', { exact: true }).fill('https://example.com/v1')
  await page.getByLabel('模型名称', { exact: true }).fill('test-model')
  await page.route('**/api/configure', route => route.fulfill({ json: { available: true, configured: true, models: [{ provider: 'fixture', model: 'test-model' }] } }))
  await page.getByRole('button', { name: '应用连接', exact: true }).click()
  await page.locator('.gg-panel').waitFor({ state: 'hidden' })
  assert.equal(await page.getByTestId('gal-game').getAttribute('data-model-ready'), 'true')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: new URL('gal-mobile.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'mobile horizontal overflow')
  const areas = await page.locator('.gg-stage,.gg-dialogue,.gg-input-band').evaluateAll(elements => elements.map(element => ({ top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom })))
  assert.ok(areas[0].bottom <= areas[1].top + 1 && areas[1].bottom <= areas[2].top + 1, 'stage/dialogue/input overlap')
  await page.getByRole('button', { name: '共同回忆', exact: true }).last().click()
  await page.locator('.gg-panel').waitFor()
  await assertImmersive(page)
  await page.getByLabel('关闭', { exact: true }).click()
  await page.close()

  // A controlled model fixture exercises the UI without spending API credits.
  const play = await context.newPage()
  play.on('pageerror', error => errors.push(error.message))
  await play.addInitScript(() => { localStorage.setItem('gal-view:scene:v1', 'legacy-scene'); localStorage.setItem('gal-view:enabled', 'false') })
  let attempts = 0
  let firstRetryId
  let shouldFail = true
  const models = [{ provider: 'fixture', model: 'fixture-model', label: 'UI test model' }]
  await play.route('**/api/catalog', route => route.fulfill({ json: { available: true, configured: true, models } }))
  await play.route('**/api/turn', async route => {
    const payload = route.request().postDataJSON()
    attempts += 1
    if (payload.text === '重试测试') {
      if (shouldFail) { firstRetryId = payload.requestId; shouldFail = false; return route.fulfill({ status: 502, json: { error: '测试接口暂时失败' } }) }
      assert.equal(payload.requestId, firstRetryId, 'retry changed request ID')
    }
    const hurt = payload.text.includes('没用')
    const evaluation = { affectionDelta: hurt ? -2 : 2, trustDelta: hurt ? -2 : 2, mood: hurt ? '低落' : '开心', reason: hurt ? '内部判定：对人的贬低让她受伤。' : '内部判定：认真回应了当前话题。', evidenceQuote: payload.text, eventId: currentScene(payload.state).eventId, eventResolved: !hurt, consent: 'none', memory: hurt ? null : `她记得你说过：${payload.text}`, boundary: hurt ? 'hurt' : 'none' }
    const reply = { text: hurt ? '你可以指出问题，但我不希望被这样评价。' : payload.text === '我们一起想一想这封信。' ? '这封信可以先从一件小事写起。' + '窗边的灯还亮着，我们可以慢慢把想说的话写下来，不必急着给它一个结论。'.repeat(16) : '我记下了。你的这句话，让我想到了另一种可能。', narration: hurt ? '她放下笔，收起了笑容。' : '她抬起头，看向窗边。', emotion: hurt ? 'sad' : 'happy' }
    const state = commitTurn(payload.state, { ...payload, evaluation, reply })
    return route.fulfill({ json: { state, reply, evaluation, requestId: payload.requestId } })
  })
  await play.goto(url)
  await play.getByRole('tab', { name: '自由模式', exact: true }).click()
  await play.locator('.gg-root[data-model-ready="true"]').waitFor()
  await play.getByLabel('模型与显示设置', { exact: true }).click()
  await play.getByLabel('逐字显示对话', { exact: true }).uncheck()
  await play.getByLabel('关闭', { exact: true }).click()
  await play.setViewportSize({ width: 390, height: 844 })
  const input = play.getByPlaceholder('此刻，想对她说些什么……')
  async function say(text) {
    await input.fill(text)
    await play.getByLabel('发送', { exact: true }).click()
    await input.waitFor({ state: 'visible' })
    await play.waitForFunction(() => document.querySelector('.gg-composer textarea')?.disabled === false)
  }
  await say('我们一起想一想这封信。')
  await play.waitForFunction(() => JSON.parse(localStorage.getItem('model-router-galgame:preview:v1')).revision === 1)
  assert.equal(await input.inputValue(), '')
  const positive = await play.evaluate(() => JSON.parse(localStorage.getItem('model-router-galgame:preview:v1')))
  assert.equal(positive.affection, 22)
  const body = play.locator('.ggd-body')
  await play.getByRole('button', { name: '后续台词', exact: true }).waitFor()
  assert.equal(await body.evaluate(element => element.scrollTop), 0, 'a new long reply must start at its first line')
  for (let page = 0; page < 30 && await play.getByRole('button', { name: '后续台词', exact: true }).count(); page++) {
    await play.getByRole('button', { name: '后续台词', exact: true }).click()
  }
  assert.ok(await body.evaluate(element => element.scrollTop > 0 && element.scrollHeight - element.clientHeight - element.scrollTop <= 2), 'next-text control did not reach the end')
  assert.equal(await play.evaluate(() => JSON.parse(localStorage.getItem('model-router-galgame:preview:v1')).revision), 1, 'reading more text must not submit or advance the game')
  await play.setViewportSize({ width: 1440, height: 960 })
  await assertImmersive(play)
  await say('你真没用。')
  const negative = await play.evaluate(() => JSON.parse(localStorage.getItem('model-router-galgame:preview:v1')))
  assert.equal(negative.affection, 20)
  assert.equal(negative.distance, 1)
  assert.equal(await play.locator('.gg-character').getAttribute('alt'), 'DeepSeek')
  await assertImmersive(play)
  await play.getByRole('button', { name: '对话回顾', exact: true }).last().click()
  await assertImmersive(play)
  await play.getByLabel('关闭', { exact: true }).click()
  await play.getByRole('button', { name: '共同回忆', exact: true }).last().click()
  await assertImmersive(play)
  await play.getByLabel('关闭', { exact: true }).click()
  const beforeDebug = await play.evaluate(() => localStorage.getItem('model-router-galgame:preview:v1'))
  await play.getByLabel('模型与显示设置', { exact: true }).click()
  await play.getByLabel('开发调试', { exact: true }).check()
  await play.getByLabel('关闭', { exact: true }).click()
  await play.getByLabel('查看开发调试', { exact: true }).click()
  await play.getByTestId('gal-game-debug').waitFor()
  assert.match(await play.getByTestId('gal-game-debug').innerText(), /好感/)
  assert.match(await play.getByTestId('gal-game-debug').innerText(), /内部判定/)
  await play.getByLabel('关闭', { exact: true }).click()
  await play.getByLabel('模型与显示设置', { exact: true }).click()
  await play.getByLabel('开发调试', { exact: true }).uncheck()
  await play.getByLabel('关闭', { exact: true }).click()
  assert.equal(await play.evaluate(() => localStorage.getItem('model-router-galgame:preview:v1')), beforeDebug)
  await assertImmersive(play)
  await play.getByRole('button', { name: '存档与读档', exact: true }).last().click()
  await play.getByLabel('保存到存档 1', { exact: true }).click()
  await assertImmersive(play)
  await play.getByLabel('关闭', { exact: true }).click()
  await say('重试测试')
  await play.getByRole('alert').filter({ hasText: '测试接口暂时失败' }).waitFor()
  assert.equal(await input.inputValue(), '重试测试')
  assert.equal(await play.evaluate(() => JSON.parse(localStorage.getItem('model-router-galgame:preview:v1')).revision), 2)
  await say('重试测试')
  assert.equal(await input.inputValue(), '')
  await play.getByRole('button', { name: '继续', exact: true }).click()
  await play.waitForFunction(() => JSON.parse(localStorage.getItem('model-router-galgame:preview:v1')).sceneIndex === 1)
  await play.getByRole('button', { name: '存档与读档', exact: true }).last().click()
  await play.getByLabel('读取存档 1', { exact: true }).click()
  await play.getByRole('button', { name: '确认', exact: true }).click()
  assert.equal(await play.evaluate(() => JSON.parse(localStorage.getItem('model-router-galgame:preview:v1')).sceneIndex), 0)
  await play.getByLabel('模型与显示设置', { exact: true }).click()
  await play.getByLabel('开发调试', { exact: true }).check()
  await play.reload()
  await play.locator('.gg-root[data-model-ready="true"]').waitFor()
  await assertImmersive(play)
  assert.equal(await play.evaluate(() => JSON.parse(localStorage.getItem('model-router-galgame:preview:v1')).revision), 2)
  assert.equal(await play.evaluate(() => localStorage.getItem('gal-view:scene:v1')), 'legacy-scene')
  assert.equal(await play.evaluate(() => localStorage.getItem('gal-view:enabled')), 'false')
  for (let sceneIndex = 0; sceneIndex < 6; sceneIndex++) {
    if (sceneIndex > 0) { await say(`第${sceneIndex}幕，我愿意听你继续说。`); await say(`第${sceneIndex}幕，我们按约定继续吧。`) }
    await play.getByRole('button', { name: '继续', exact: true }).click()
  }
  await play.locator('.gg-ending').waitFor()
  assert.ok(await play.evaluate(() => JSON.parse(localStorage.getItem('model-router-galgame:preview:v1')).ending))
  await play.screenshot({ path: new URL('gal-ending.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ desktop: '1440x960', mobile: '390x844', screenshots: ['gal-desktop.png', 'gal-mobile.png', 'gal-ending.png'], modelFixtureCalls: attempts, checks: 'immersive UI hides relationship/progress/evidence across main screen and menus; debug opt-in does not change save and resets on reload; free input, internal affection gain/loss, save/load/reload, failure/retry, independent legacy storage, six scenes and ending', pageErrors: errors }))
} finally {
  await browser.close()
}
