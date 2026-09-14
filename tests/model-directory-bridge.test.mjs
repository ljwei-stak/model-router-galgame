import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogSnapshot, selectModelThroughRemote } from '../.dsh-plugin/client/model-directory-bridge.mjs'

test('catalogSnapshot exposes every Host model without erasing the last good catalog', () => {
  const ready = catalogSnapshot({
    default: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
    groups: [{ id: 'deepseek-official', models: [
      { id: 'deepseek-v4-flash' },
      { id: 'deepseek-v4-pro', reasoning: { efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }], defaultEffort: 'high' } },
    ] }],
  })
  assert.deepEqual(ready.available, [
    { provider: 'deepseek-official', model: 'deepseek-v4-flash', reasoningKnown: true, reasoningEfforts: [] },
    { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningKnown: true, reasoningEfforts: ['low', 'high'], defaultReasoningEffort: 'high' },
  ])
  assert.deepEqual(catalogSnapshot({ groups: [] }, ready), ready)
})

test('selectModelThroughRemote includes the session id and full selection', async () => {
  let request
  const selected = await selectModelThroughRemote({ session: {
    selectModel: async value => {
      request = value
      return { ok: true, value: { selected: value } }
    },
  } }, 'session-1', { provider: 'deepseek-modlens', model: 'deepseek-v4-pro', reasoningEffort: 'high' })
  assert.equal(selected, true)
  assert.deepEqual(request, {
    sessionId: 'session-1',
    provider: 'deepseek-modlens',
    model: 'deepseek-v4-pro',
    reasoningEffort: 'high',
  })
})

test('selectModelThroughRemote reports an unavailable or rejected Remote', async () => {
  assert.equal(await selectModelThroughRemote({}, 'session-1', { provider: 'p', model: 'm' }), false)
  assert.equal(await selectModelThroughRemote({ session: { selectModel: async () => ({ ok: false }) } }, 'session-1', { provider: 'p', model: 'm' }), false)
})
