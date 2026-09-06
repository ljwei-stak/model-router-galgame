import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyWebIntent,
  webCapabilityForPlan,
  webCapabilityStatus,
  webInstruction,
} from '../.dsh-plugin/shared/web-routing.mjs'

test('ordinary web requests prefer ModSearch and retain an Ego Browser fallback', () => {
  const capability = classifyWebIntent('搜索最新的 TypeScript 发布说明并引用来源')
  assert.equal(capability.needsWeb, true)
  assert.equal(capability.directBrowser, false)
  assert.equal(capability.primary, 'modsearch')
  assert.equal(capability.fallback, 'ego-browser')
})

test('anti-bot requests prefer the visible browser workflow', () => {
  const capability = webCapabilityForPlan('打开 Cloudflare 页面，完成验证码后查找内容', {
    subtasks: [{ id: 'research' }, { id: 'extract' }],
  })
  assert.equal(capability.directBrowser, true)
  assert.equal(capability.stageAware, true)
  assert.equal(capability.humanCheckPolicy, 'pause-and-handoff')
  const instruction = webInstruction(capability)
  assert.match(instruction, /ego_space_open/)
  assert.match(instruction, /ego_captcha/)
  assert.match(instruction, /暂停当前工作包/)
})

test('non-web requests do not add browser guidance', () => {
  const capability = webCapabilityForPlan('请解释二叉树的时间复杂度')
  assert.equal(capability.needsWeb, false)
  assert.equal(webInstruction(capability), '')
})

test('web status exposes the two bundled capability owners', () => {
  const status = webCapabilityStatus({ get: key => key === 'web' || key === 'tools' ? {} : undefined })
  assert.equal(status.modsearch.package, '@liustack/modsearch')
  assert.equal(status.egoBrowser.package, '@ljwei-stak/dsh-ego-browser')
  assert.equal(status.modsearch.webServiceDetected, true)
  assert.equal(status.egoBrowser.toolServiceDetected, true)
  assert.equal(status.humanCheck, 'pause-and-handoff')
})
