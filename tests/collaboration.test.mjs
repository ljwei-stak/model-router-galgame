import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../.dsh-plugin/index.mjs'

function fakeContext() {
  const listeners = new Map()
  let commandHandler
  const settings = {
    describe: () => [{ ns: 'llm-pi-ai', user: {}, revision: 1 }],
    mutate: async () => undefined,
  }
  const routes = [
    { provider: 'zen', model: 'GPT 5.6 Sol' },
    { provider: 'zen', model: 'Qwen3.7 Plus' },
    { provider: 'zen', model: 'DeepSeek V4 Pro' },
  ]
  const ctx = {
    get: key => key === 'settings' ? settings : undefined,
    settings,
    commands: { register: command => { commandHandler = command.handler } },
    llm: {
      listProviders: () => [{ id: 'zen' }],
      listModels: async () => routes.map(route => ({ id: route.model })),
    },
    logger: { debug: () => undefined, info: () => undefined, warn: () => undefined },
    on: (event, callback) => { listeners.set(event, callback); return () => listeners.delete(event) },
  }
  apply(ctx)
  return { listeners, routes, commandHandler: value => commandHandler?.({ agent: value.agent, rawInput: value.rawInput }) }
}

function user(text) {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }
}

test('complex collective turns execute every planned routed stage and finish on synthesis', async () => {
  const { listeners } = fakeContext()
  const injected = []
  const agent = { inject: message => injected.push(message) }
  const signal = new AbortController().signal
  const first = await listeners.get('agent/pre-step')({
    agent,
    messages: [user('请设计一个复杂工程架构，拆分模块，编写代码、测试、部署方案，并给出论文级说明。')],
    signal,
    turn: 1,
    step: 1,
  }, async () => ({ kind: 'enter', messages: [] }))
  assert.equal(first.kind, 'enter')
  const stageMatch = first.messages.at(-1).content[0].text.match(/协作阶段 1\/(\d+)/)
  assert.ok(stageMatch)
  const totalStages = Number(stageMatch[1])
  assert.ok(totalStages >= 3)
  assert.match(first.messages.at(-2).content[0].text, /路由分析/)

  const request = listeners.get('agent/request')
  const firstConfig = await request({ agent, step: 1, signal }, async () => ({ provider: 'fallback', model: 'fallback', messages: [] }))
  assert.notEqual(firstConfig.model, 'fallback')

  const stopping = listeners.get('agent/turn-stopping')
  for (let step = 2; step <= totalStages; step += 1) {
    stopping({ agent, signal })
    assert.equal(injected.length, step - 1)
    assert.match(injected.at(-1).content[0].text, new RegExp(`协作阶段 ${step}/${totalStages}`))
    const config = await request({ agent, step, signal }, async () => ({ provider: 'fallback', model: 'fallback', messages: [] }))
    if (step === totalStages) assert.equal(config.model, 'DeepSeek V4 Pro')
    else assert.notEqual(config.model, 'fallback')
  }
  stopping({ agent, signal })
  assert.equal(injected.length, totalStages - 1)
})

test('persona is absent from worker stages and added only to the synthesis stage', async () => {
  const { listeners } = fakeContext()
  const agent = { inject: () => undefined }
  const signal = new AbortController().signal
  const question = user('请设计一个复杂工程架构，拆分模块，编写代码、测试、部署方案，并给出论文级说明。')
  const first = await listeners.get('agent/pre-step')({
    agent, messages: [question], signal, turn: 1, step: 1,
  }, async () => ({ kind: 'enter', messages: [] }))
  assert.equal(first.messages.some(message => message.content[0].text.includes('[Model Router Persona 表达层]')), false)

  const stageMatch = first.messages.find(message => message.content[0].text.includes('协作阶段'))?.content[0].text.match(/协作阶段 1\/(\d+)/)
  const totalStages = Number(stageMatch?.[1] ?? 3)
  for (let step = 2; step <= totalStages; step += 1) {
    listeners.get('agent/turn-stopping')({ agent, signal })
    const next = await listeners.get('agent/pre-step')({
      agent, messages: [], signal, turn: 1, step,
    }, async () => ({ kind: 'enter', messages: [] }))
    assert.equal(next.messages.filter(message => message.content[0].text.includes('[Model Router Persona 表达层]')).length, step === totalStages ? 1 : 0)
  }
})

test('single-session persona does not create a routing plan or overwrite the native route', async () => {
  const context = fakeContext()
  const { listeners } = context
  const agent = { inject: () => undefined, options: { provider: 'zen', model: 'Qwen3.7 Plus' } }
  context.commandHandler({ agent, rawInput: 'single' })
  const signal = new AbortController().signal
  const decision = await listeners.get('agent/pre-step')({
    agent, messages: [user('写一段简短的说明')], signal, turn: 1, step: 1,
  }, async () => ({ kind: 'enter', messages: [] }))
  assert.equal(decision.messages.filter(message => message.content[0].text.includes('[Model Router Persona 表达层]')).length, 1)
  const request = await listeners.get('agent/request')({ agent, step: 1, signal }, async () => ({ provider: 'zen', model: 'Qwen3.7 Plus' }))
  assert.deepEqual({ provider: request.provider, model: request.model }, { provider: 'zen', model: 'Qwen3.7 Plus' })
})

test('simple collective answer receives persona without turning it into collaboration', async () => {
  const { listeners } = fakeContext()
  const agent = { inject: () => undefined }
  const signal = new AbortController().signal
  const decision = await listeners.get('agent/pre-step')({
    agent, messages: [user('请简要解释什么是缓存')], signal, turn: 1, step: 1,
  }, async () => ({ kind: 'enter', messages: [] }))
  assert.equal(decision.messages.filter(message => message.content[0].text.includes('[Model Router Persona 表达层]')).length, 1)
  assert.equal(decision.messages.some(message => message.content[0].text.includes('协作阶段')), false)
})
