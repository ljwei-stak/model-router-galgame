import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../.dsh-plugin/index.mjs'

function harnessWithSettings(user, { ready = true } = {}) {
  const descriptor = { ns: 'llm-pi-ai', user, revision: 4 }
  const mutations = []
  const listeners = new Map()
  let namespaceReady = ready
  const settings = {
    describe: () => namespaceReady ? [descriptor] : [],
    async mutate(namespace, ops, revision) {
      mutations.push({ namespace, ops, revision })
      for (const op of ops) {
        if (op.op !== 'unset' || op.path.length !== 3) continue
        const [root, provider, field] = op.path
        if (root === 'providers' && descriptor.user?.providers?.[provider] !== undefined) {
          delete descriptor.user.providers[provider][field]
        }
      }
      descriptor.revision += 1
    },
  }
  const ctx = {
    get: key => key === 'settings' ? settings : undefined,
    settings,
    commands: { register: () => undefined },
    llm: {
      listProviders: () => [],
      registerConfigurableProviders: () => ({ replace: () => undefined }),
      registerModelDiscovery: () => () => undefined,
    },
    logger: { debug: () => undefined, info: () => undefined, warn: () => undefined },
    on: (event, callback) => { listeners.set(event, callback); return () => listeners.delete(event) },
  }
  return {
    ctx,
    mutations,
    listeners,
    setNamespaceReady(value) { namespaceReady = value },
  }
}

test('repairs an OpenCode website override when the plugin mounts', async () => {
  const { ctx, mutations } = harnessWithSettings({
    providers: {
      opencode: { apiKeyEnv: 'OPENCODE_API_KEY', baseURL: 'https://opencode.ai' },
      openai: { baseURL: 'https://opencode.ai' },
    },
  })
  apply(ctx)
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(mutations, [{
    namespace: 'llm-pi-ai',
    ops: [{ op: 'unset', path: ['providers', 'opencode', 'baseURL'] }],
    revision: 4,
  }])
})

test('leaves a custom OpenCode gateway untouched', async () => {
  const { ctx, mutations } = harnessWithSettings({
    providers: { opencode: { baseURL: 'https://gateway.example/v1' } },
  })
  apply(ctx)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(mutations.length, 0)
})

test('recognizes a delayed settings namespace and repairs it after startup', async () => {
  const harness = harnessWithSettings({
    providers: { 'opencode-zen': { baseURL: 'https://opencode.ai/zen' } },
  }, { ready: false })
  harness.ctx.get = key => key === 'settings' ? harness.ctx.settings : undefined
  apply(harness.ctx)
  harness.setNamespaceReady(true)
  await new Promise(resolve => setTimeout(resolve, 120))
  assert.deepEqual(harness.mutations, [{
    namespace: 'llm-pi-ai',
    ops: [{ op: 'unset', path: ['providers', 'opencode-zen', 'baseURL'] }],
    revision: 4,
  }])
})

test('repairs OpenCode endpoints before a single-session request', async () => {
  const harness = harnessWithSettings({
    providers: { opencode: { baseURL: 'https://opencode.ai/zen' } },
  }, { ready: false })
  apply(harness.ctx)
  harness.setNamespaceReady(true)
  const preStep = harness.listeners.get('agent/pre-step')
  assert.ok(preStep)
  await preStep({ agent: {}, messages: [], signal: new AbortController().signal }, async () => undefined)
  assert.deepEqual(harness.mutations[0], {
    namespace: 'llm-pi-ai',
    ops: [{ op: 'unset', path: ['providers', 'opencode', 'baseURL'] }],
    revision: 4,
  })
})
