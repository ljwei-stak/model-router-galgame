import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame } from '../.dsh-plugin/shared/gal-game.mjs'
import {
  createGalGameService,
  createHostGalGameGenerator,
  GAL_GAME_CHANNEL,
  galGameCatalog,
  registerGalGameRoutes,
} from '../.dsh-plugin/shared/gal-game-service.mjs'

const selection = { provider: 'test-provider', model: 'test-model' }

test('host errors distinguish transient rate limits without exposing provider response text', async () => {
  let handler
  registerGalGameRoutes({
    connection: { rpc: { handle: (_channel, callback) => { handler = callback } } },
    llm: { async *stream() { throw Object.assign(new Error('sensitive provider response'), { code: 'RATE_LIMIT' }) } },
  })
  const result = await handler('turn', request())
  assert.equal(result.ok, false)
  assert.equal(result.error.details.providerCode, 'RATE_LIMIT')
  assert.match(result.error.message, /限流/)
  assert.doesNotMatch(JSON.stringify(result), /sensitive provider response/)
})

function evaluation(text, overrides = {}) {
  return JSON.stringify({
    affectionDelta: 2,
    trustDelta: 1,
    mood: '开心',
    reason: '玩家认真回应了她的顾虑。',
    evidenceQuote: text,
    eventId: null,
    eventResolved: false,
    consent: 'none',
    memory: null,
    boundary: 'none',
    ...overrides,
  })
}

function request(overrides = {}) {
  return { state: createGame(), text: '谢谢你等我，可以跟我说说你的想法。', requestId: 'test-request-001', selection, ...overrides }
}

function dialogue(overrides = {}) {
  return JSON.stringify({ text: '嗯。我想先把这封信写完，你愿意听听吗？', narration: '她把未写完的信纸推近了一些。', emotion: 'happy', ...overrides })
}

test('evaluates first, generates from the reviewed result, then commits both outputs atomically', async () => {
  const input = request()
  const original = structuredClone(input.state)
  const calls = []
  const service = createGalGameService({ generate: async options => {
    calls.push(options)
    return calls.length === 1 ? evaluation(input.text) : dialogue()
  } })
  const result = await service.turn(input)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0].selection, selection)
  assert.equal(calls[0].temperature, 0)
  assert.equal(calls[0].tools, undefined)
  assert.deepEqual(JSON.parse(calls[1].messages[0].content[0].text).evaluation, result.evaluation)
  assert.equal(result.state.revision, input.state.revision + 1)
  assert.ok(result.state.affection > input.state.affection)
  assert.ok(result.state.trust > input.state.trust)
  assert.equal(result.state.history.at(-1).text, result.reply.text)
  assert.deepEqual(input.state, original)
})

test('plain Chinese dialogue commits with the reviewed emotion and no extra model call', async () => {
  const input = request()
  const text = '（她把信纸推近了一点。）那我们先约定一个条件：这封信不用证明谁永远正确，只要写下一件我们愿意认真对待的事。'
  let calls = 0
  const service = createGalGameService({ generate: async () => ++calls === 1 ? evaluation(input.text, { mood: '安心' }) : `\n ${text} \n` })
  const result = await service.turn(input)
  assert.equal(calls, 2)
  assert.deepEqual(result.reply, { text, narration: '', emotion: 'happy' })
  assert.equal(result.state.history.at(-1).text, text)
  assert.equal(result.state.revision, input.state.revision + 1)
  assert.ok(result.state.affection > input.state.affection)
})

test('empty, oversized, and malformed structured actor outputs preserve the save without retries', async () => {
  for (const output of [
    null, undefined, '', ' \n\t ', '中'.repeat(3001),
    '{"text":"没有结束', '[{"text":"不支持数组"}]',
    '```json\n{"text":\n```', '```\n不应把代码围栏当作角色正文\n```',
    dialogue({ text: '' }), dialogue({ text: '中'.repeat(3001) }),
  ]) {
    const input = request()
    const original = structuredClone(input)
    let calls = 0
    const service = createGalGameService({ generate: async () => ++calls === 1 ? evaluation(input.text) : output })
    await assert.rejects(service.turn(input), { code: 'gal/invalid-response' })
    assert.equal(calls, 2)
    assert.deepEqual(input, original)
  }
})

test('valid legacy JSON and fenced JSON actor replies remain compatible', async () => {
  for (const output of [dialogue(), '```json\n' + dialogue() + '\n```']) {
    const input = request()
    let calls = 0
    const service = createGalGameService({ generate: async () => ++calls === 1 ? evaluation(input.text) : output })
    const result = await service.turn(input)
    assert.deepEqual(result.reply, JSON.parse(dialogue()))
    assert.equal(calls, 2)
  }
})

test('hurtful input can lower affection and trust through the same real evaluation pipeline', async () => {
  const input = request({ text: '你真是没用，你的想法没有任何价值。' })
  let calls = 0
  const service = createGalGameService({ generate: async () => ++calls === 1
    ? evaluation(input.text, { affectionDelta: -4, trustDelta: -3, mood: '低落', boundary: 'hurt', reason: '玩家贬低了她的想法。' })
    : dialogue({ text: '你可以不认同我，但我不接受这样的评价。', emotion: 'sad' }) })
  const result = await service.turn(input)
  assert.ok(result.state.affection < input.state.affection)
  assert.ok(result.state.trust < input.state.trust)
})

test('the committed expression follows the reviewed mood rather than a contradictory actor label', async () => {
  const input = request({ text: '闭嘴，你的想法根本不值得听。' })
  let calls = 0
  const service = createGalGameService({ generate: async () => ++calls === 1
    ? evaluation(input.text, { affectionDelta: -2, trustDelta: -2, mood: '生气', boundary: 'hurt' })
    : dialogue({ text: '请不要这样说话。', emotion: 'happy' }) })
  const result = await service.turn(input)
  assert.equal(result.reply.emotion, 'angry')
  assert.equal(result.state.history.at(-1).emotion, 'angry')
})

test('reviewed relationship decisions survive both evaluation passes for natural player phrasing', async () => {
  for (const [text, expected, consent] of [
    ['你愿意成为我的女朋友吗', 'romance', 'romance'],
    ['我不想只是朋友，我希望和你认真交往', 'romance', 'romance'],
    ['对不起，我们分手吧。', 'separate', 'none'],
  ]) {
    const input = request({ text, state: { ...createGame(), sceneIndex: 4, affection: 50, trust: 50, romanceConsent: true, relationshipPreference: 'romance', completedEvents: ['shared-letter', 'heard-failure', 'named-relationship'] } })
    const calls = []
    const service = createGalGameService({ generate: async options => {
      calls.push(options)
      return calls.length === 1 ? evaluation(text, { consent }) : dialogue()
    } })
    const result = await service.turn(input)
    assert.equal(result.evaluation.consent, expected, text)
    assert.equal(result.state.relationshipPreference, expected, text)
    assert.equal(JSON.parse(calls[1].messages[0].content[0].text).evaluation.consent, expected, text)
  }
})

test('unreviewed milestones and romance claims cannot mutate the game state', async () => {
  const input = request({ text: '我们刚刚认识，先聊聊吧。' })
  const calls = []
  const service = createGalGameService({ generate: async options => {
    calls.push(options)
    if (calls.length === 1) return evaluation(input.text, {
      eventId: 'named-relationship', eventResolved: true, consent: 'romance',
    })
    return dialogue({
      state: { affection: 100, trust: 100, romanceConsent: true },
      completedEvents: ['named-relationship'], consent: 'romance', evaluation: { affectionDelta: 99 },
    })
  } })
  const result = await service.turn(input)
  assert.equal(result.evaluation.eventResolved, false)
  assert.equal(result.evaluation.consent, 'none')
  assert.deepEqual(result.state.completedEvents, [])
  assert.equal(result.state.romanceConsent, false)
  assert.notEqual(result.state.stage, '恋人')
  assert.equal(result.state.sceneIndex, 0)
  assert.ok(result.state.affection < 100)
  const reviewed = JSON.parse(calls[1].messages[0].content[0].text).evaluation
  assert.equal(reviewed.eventResolved, false)
  assert.equal(reviewed.consent, 'none')
})

test('evaluation without a real player quote cannot add a memory or complete the current event', async () => {
  const input = request()
  let calls = 0
  const service = createGalGameService({ generate: async () => ++calls === 1
    ? evaluation(input.text, { evidenceQuote: '没有说过的话', eventId: 'shared-letter', eventResolved: true, memory: '我们已经一起完成了一封信。' })
    : dialogue() })
  const result = await service.turn(input)
  assert.deepEqual(result.state.completedEvents, [])
  assert.deepEqual(result.state.memories, [])
  assert.equal(result.state.affection, input.state.affection)
  assert.equal(result.state.trust, input.state.trust)
})

test('model output cannot spoof engine-owned proposed relation deltas', async () => {
  const input = request()
  let calls = 0
  const service = createGalGameService({ generate: async () => ++calls === 1
    ? evaluation(input.text, { affectionDelta: 0, trustDelta: 0, proposedAffectionDelta: -4, proposedTrustDelta: -6, boundary: 'hurt' })
    : dialogue() })
  const result = await service.turn(input)
  assert.equal(result.state.affection, input.state.affection)
  assert.equal(result.state.trust, input.state.trust)
  assert.equal(result.state.distance, input.state.distance)
  assert.equal(result.evaluation.proposedAffectionDelta, 0)
  assert.equal(result.evaluation.proposedTrustDelta, 0)
})

test('invalid evaluation never causes a second call or commits a fabricated fallback', async () => {
  const input = request()
  const original = structuredClone(input)
  let calls = 0
  const service = createGalGameService({ generate: async () => { calls += 1; return '她很开心，好感度+99' } })
  await assert.rejects(service.turn(input), { code: 'gal/invalid-response' })
  assert.equal(calls, 1)
  assert.deepEqual(input, original)
})

test('reply failure preserves the save and allows the same request to be retried', async () => {
  const input = request()
  const original = structuredClone(input)
  let calls = 0
  const service = createGalGameService({ generate: async () => {
    calls += 1
    if (calls === 2) throw new Error('upstream unavailable')
    return calls % 2 === 1 ? evaluation(input.text) : dialogue()
  } })
  await assert.rejects(service.turn(input), /upstream unavailable/)
  assert.deepEqual(input, original)
  const result = await service.turn(input)
  assert.equal(calls, 4)
  assert.equal(result.state.revision, original.state.revision + 1)
})

test('retries reuse a completed request and persisted request IDs do not call the model again', async () => {
  const input = request()
  let calls = 0
  const service = createGalGameService({ generate: async () => ++calls === 1 ? evaluation(input.text) : dialogue() })
  const result = await service.turn(input)
  const retried = await service.turn(input)
  assert.deepEqual(retried, result)
  const restartedService = createGalGameService({ generate: async () => { throw new Error('must not call') } })
  const persisted = await restartedService.turn({ ...input, state: result.state })
  assert.deepEqual(persisted.state, result.state)
  assert.deepEqual(persisted.reply, result.reply)
  assert.equal(calls, 2)
  await assert.rejects(service.turn({ ...input, text: '这是另一句话' }), { code: 'gal/conflict' })
})

test('concurrent retry shares a single pair of model calls', async () => {
  const input = request()
  let release
  const gate = new Promise(resolve => { release = resolve })
  let calls = 0
  const service = createGalGameService({ generate: async () => {
    calls += 1
    if (calls === 1) { await gate; return evaluation(input.text) }
    return dialogue()
  } })
  const first = service.turn(input)
  const duplicate = service.turn(input)
  release()
  assert.deepEqual(await first, await duplicate)
  assert.equal(calls, 2)
})

test('bad saves, inputs, model selections, and already cancelled calls make no model request', async () => {
  const service = createGalGameService({ generate: async () => { throw new Error('must not call') } })
  for (const invalid of [{ state: {} }, { state: { ...createGame(), version: 99 } }, { text: '' }, { text: 'x'.repeat(2001) }, { requestId: 'bad' }, { selection: {} }]) {
    await assert.rejects(service.turn(request(invalid)), error => /^gal\/(bad-request|model-required)$/.test(error.code))
  }
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(service.turn(request(), { signal: controller.signal }), { code: 'gal/cancelled' })
})

test('cancellation settles even when the provider ignores its signal, without committing a late response', async () => {
  const input = request()
  const original = structuredClone(input.state)
  const controller = new AbortController()
  let finishGeneration
  let calls = 0
  const service = createGalGameService({ generate: () => {
    calls += 1
    return new Promise(resolve => { finishGeneration = resolve })
  } })
  const pending = service.turn(input, { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending, { code: 'gal/cancelled' })
  finishGeneration(evaluation(input.text))
  await Promise.resolve()
  assert.equal(calls, 1)
  assert.deepEqual(input.state, original)
})

test('host generator only collects answer text and passes no tools or session into the LLM', async () => {
  let invocation
  const generate = createHostGalGameGenerator({ async *stream(options) {
    invocation = options
    yield { type: 'reasoning-delta', text: 'private reasoning' }
    yield { type: 'text-delta', text: '{"text":' }
    yield { type: 'text-delta', text: '"你好"}' }
    yield { type: 'finish', reason: { kind: 'stop' } }
  } })
  const text = await generate({ selection, system: 'system', messages: [], maxTokens: 100, temperature: 0 })
  assert.equal(text, '{"text":"你好"}')
  assert.equal(invocation.provider, selection.provider)
  assert.equal(invocation.model, selection.model)
  assert.equal(invocation.tools, undefined)
  assert.equal(invocation.sessionId, undefined)
})

test('host generator rejects provider errors, incomplete streams, and tool calls', async () => {
  for (const chunks of [
    [{ type: 'finish', reason: { kind: 'error', failure: { message: 'secret upstream details' } } }],
    [{ type: 'text-delta', text: '{}' }],
    [{ type: 'tool-call-delta', name: 'shell' }],
    [{ type: 'text-delta', text: '{}' }, { type: 'finish', reason: { kind: 'max-tokens' } }],
  ]) {
    const generate = createHostGalGameGenerator({ async *stream() { yield* chunks } })
    await assert.rejects(generate({ selection, messages: [] }), error => error.code.startsWith('gal/') && !error.message.includes('secret'))
  }
})

test('authenticated RPC registers an isolated channel and retains usable model catalogs', async () => {
  let channel
  let handler
  const llm = {
    listProviders: () => [{ id: 'unavailable' }, { id: selection.provider, name: 'Test' }],
    listModels: async provider => {
      if (provider === 'unavailable') throw new Error('provider offline')
      return [{ id: selection.model, name: 'Model', inputModalities: ['text'] }, { id: 'image-only', inputModalities: ['image'] }]
    },
    async *stream() { throw new Error('must not call') },
  }
  assert.deepEqual(await galGameCatalog(llm), { available: true, models: [{ ...selection, label: 'Test / Model' }] })
  assert.equal(registerGalGameRoutes({ llm, connection: { rpc: { handle: (name, operation) => { channel = name; handler = operation } } } }), true)
  assert.equal(channel, GAL_GAME_CHANNEL)
  assert.equal((await handler('catalog', {})).value.models.length, 1)
  const unknown = await handler('delete-session', {})
  assert.equal(unknown.error.code, 'gal/not-found')
  assert.deepEqual(unknown.error.details, {})
  const failed = await handler('turn', request())
  assert.equal(failed.error.code, 'gal/model-failed')
  assert.deepEqual(failed.error.details, {})
  assert.equal(registerGalGameRoutes({}), false)
})

test('host catalog selections pass unchanged through both authenticated RPC model calls', async () => {
  const input = request()
  let handler
  const requests = []
  const llm = {
    listProviders: () => [{ id: selection.provider }],
    listModels: async () => [{ id: selection.model, name: 'Configured Model' }],
    async *stream(options) {
      requests.push(options)
      yield { type: 'text-delta', text: requests.length === 1 ? evaluation(input.text) : dialogue() }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
  registerGalGameRoutes({ llm, connection: { rpc: { handle: (_name, operation) => { handler = operation } } } })
  const catalog = await handler('catalog', {})
  const selected = catalog.value.models[0]
  const result = await handler('turn', { ...input, selection: selected })
  assert.equal(result.ok, true)
  assert.equal(requests.length, 2)
  for (const call of requests) {
    assert.equal(call.provider, selection.provider)
    assert.equal(call.model, selection.model)
    assert.equal(call.tools, undefined)
    assert.equal(call.sessionId, undefined)
    assert.ok(call.signal instanceof AbortSignal)
  }
  const replay = await handler('turn', { ...input, state: result.value.state, selection: selected })
  assert.equal(replay.ok, true)
  assert.equal(requests.length, 2)
  assert.deepEqual(replay.value.state, result.value.state)
})
