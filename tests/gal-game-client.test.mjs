import test from 'node:test'
import assert from 'node:assert/strict'
import { createGalGameApi, GAL_GAME_CHANNEL } from '../.dsh-plugin/client/gal-game-api.mjs'
import { readGame, writeGame, readSlots } from '../.dsh-plugin/client/gal-game-storage.mjs'
import { createGame } from '../.dsh-plugin/shared/gal-game.mjs'

test('game client uses the Host RPC AbortSignal contract without touching a conversation', async () => {
  const calls = []
  const controller = new AbortController()
  const api = createGalGameApi({ async call(...args) { calls.push(args); return { ok: true, value: { valid: true } } } })
  await api.catalog()
  await api.turn({ text: '你好' }, { signal: controller.signal })
  assert.deepEqual(calls[0], [GAL_GAME_CHANNEL, 'catalog', {}, undefined])
  assert.deepEqual(calls[1], [GAL_GAME_CHANNEL, 'turn', { text: '你好' }, controller.signal])
  await assert.rejects(createGalGameApi({ call: async () => ({ ok: false, error: { message: '模型不可用', details: {} } }) }).catalog(), /模型不可用/)
})

test('game saves use isolated keys, preserve corrupt data, and report unavailable storage', () => {
  const data = new Map([['gal-view:scene:v1', 'original-scene']])
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
  const game = createGame({ id: 'test-game' })
  writeGame(storage, 'new-game', game)
  assert.equal(readGame(storage, 'new-game').id, 'test-game')
  assert.equal(data.get('gal-view:scene:v1'), 'original-scene')
  storage.setItem('new-game', '{broken')
  assert.throws(() => readGame(storage, 'new-game'))
  assert.equal(data.get('new-game'), '{broken')
  assert.throws(() => writeGame(null, 'new-game', game), /存储不可用/)
  assert.deepEqual(readSlots(storage, 'new-game'), [null, null, null])
})
