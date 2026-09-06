import test from 'node:test'
import assert from 'node:assert/strict'
import {
  compareVersions,
  createUpdateApi,
  DESKTOP_RELEASE_API,
  DESKTOP_UPDATE_CHECK_PATH,
  NPM_REGISTRY,
  parseDesktopEnvironment,
  PLUGIN_PACKAGE,
  PLUGIN_UPDATE_CHANNEL,
  PLUGIN_UPDATE_ENDPOINT,
} from '../.dsh-plugin/client/update-api.mjs'

const desktopSearch = mode => `?dsh-desktop-mode=${mode}&dsh-desktop-platform=win32&dsh-desktop-version=2.0.5`

test('compares stable and prerelease npm versions', () => {
  assert.equal(compareVersions('0.4.18', '0.4.19'), -1)
  assert.equal(compareVersions('0.4.19-rc.1', '0.4.19'), -1)
  assert.equal(compareVersions('0.4.19', '0.4.19'), 0)
})

test('detects all official Desktop presentation modes from URL markers', () => {
  for (const mode of ['compatibility', 'extended', 'advanced']) {
    assert.deepEqual(parseDesktopEnvironment(desktopSearch(mode)), {
      mode,
      platform: 'win32',
      version: '2.0.5',
    })
  }
  assert.equal(parseDesktopEnvironment(''), null)
  assert.equal(parseDesktopEnvironment('?dsh-desktop-mode=compatibility&dsh-desktop-platform=win32'), null)
})

test('checks the aggregate plugin from npm and Desktop from the official release', async () => {
  const calls = []
  const api = createUpdateApi({
    pluginVersion: '0.4.18',
    locationSearch: desktopSearch('compatibility'),
    connectionRpc: { call: async () => ({ ok: true, value: {} }) },
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      if (url === DESKTOP_RELEASE_API) return { ok: true, json: async () => ({ tag_name: 'v2.0.6' }) }
      return { ok: true, json: async () => ({ name: PLUGIN_PACKAGE, version: '0.4.19' }) }
    },
  })

  const result = await api.check()
  assert.equal(result.plugin.latestVersion, '0.4.19')
  assert.equal(result.plugin.source, 'npm')
  assert.equal(result.plugin.installable, true)
  assert.match(result.plugin.reason, /全部依赖插件/)
  assert.equal(result.desktop.currentVersion, '2.0.5')
  assert.equal(result.desktop.latestVersion, '2.0.6')
  assert.equal(result.desktop.repository, 'anywhere-labs/dsh-desktop')
  assert.equal(calls.some(call => call.url === `${NPM_REGISTRY}/@ljwei-stak%2Fmodel-router-galgame/latest`), true)
  assert.equal(calls.some(call => call.url === DESKTOP_RELEASE_API), true)
})

test('official Desktop plugin install uses the authenticated Connection RPC channel', async () => {
  let call
  const api = createUpdateApi({
    pluginVersion: '0.4.18',
    locationSearch: desktopSearch('extended'),
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
    connectionRpc: {
      async call(channel, endpoint, payload, signal) {
        call = { channel, endpoint, payload, signal }
        return {
          ok: true,
          value: { changed: true, version: '0.4.19', restartRequired: true },
        }
      },
    },
  })
  const controller = new AbortController()
  const result = await api.installPlugin({ latestVersion: '0.4.19', available: true }, controller.signal)
  assert.deepEqual(call, {
    channel: PLUGIN_UPDATE_CHANNEL,
    endpoint: PLUGIN_UPDATE_ENDPOINT,
    payload: {},
    signal: controller.signal,
  })
  assert.equal(result.version, '0.4.19')
  assert.equal(result.restartRequired, true)
})

test('plugin install asks the Host to recheck npm even after a current assessment', async () => {
  let calls = 0
  const api = createUpdateApi({
    pluginVersion: '0.4.19',
    locationSearch: desktopSearch('compatibility'),
    connectionRpc: {
      async call() {
        calls += 1
        return { ok: true, value: { changed: false, version: '0.4.19', restartRequired: false } }
      },
    },
  })

  const result = await api.installPlugin({ known: true, available: false, reason: '已是 latest。' })
  assert.equal(calls, 1)
  assert.equal(result.changed, false)
})

test('plugin install surfaces a semantic RPC failure', async () => {
  const api = createUpdateApi({
    pluginVersion: '0.4.18',
    locationSearch: desktopSearch('advanced'),
    connectionRpc: {
      call: async () => ({
        ok: false,
        error: { code: 'router/install-failed', message: 'pnpm failed', details: {} },
      }),
    },
  })
  await assert.rejects(
    () => api.installPlugin({ available: true }),
    /pnpm failed/,
  )
})

test('full client action invokes the official same-origin update flow', async () => {
  let call
  const api = createUpdateApi({
    pluginVersion: '0.4.19',
    locationSearch: desktopSearch('compatibility'),
    connectionRpc: { call: async () => ({ ok: true, value: {} }) },
    fetchImpl: async (url, options) => {
      call = { url, options }
      return { ok: true, status: 200, json: async () => ({ accepted: true }) }
    },
  })
  const result = await api.installDesktop()
  assert.equal(call.url, DESKTOP_UPDATE_CHECK_PATH)
  assert.equal(call.options.method, 'POST')
  assert.equal(call.options.credentials, 'same-origin')
  assert.equal(call.options.body, '{}')
  assert.match(result.message, /官方更新检查已完成/)
})

test('full client action reports a rejected Desktop endpoint', async () => {
  const api = createUpdateApi({
    pluginVersion: '0.4.19',
    locationSearch: desktopSearch('compatibility'),
    connectionRpc: { call: async () => ({ ok: true, value: {} }) },
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: 'forbidden' }),
    }),
  })
  await assert.rejects(() => api.installDesktop(), /forbidden/)
})

test('ordinary Web can check npm but cannot mutate a profile or Desktop', async () => {
  const opened = []
  const api = createUpdateApi({
    pluginVersion: '0.4.18',
    locationSearch: '',
    connectionRpc: { call: async () => { throw new Error('must not be called') } },
    openWindow: url => { opened.push(url) },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ name: PLUGIN_PACKAGE, version: '0.4.19' }),
    }),
  })
  const result = await api.check()
  assert.equal(api.isDesktop, false)
  assert.equal(api.installPlugin, null)
  assert.equal(api.installDesktop, null)
  assert.equal(result.plugin.available, true)
  assert.equal(result.plugin.installable, false)
  assert.equal(result.desktop.known, false)
  await api.openNpm()
  await api.openReleases()
  assert.equal(opened.length, 2)
})

test('registry failures stay unknown rather than claiming the plugin is current', async () => {
  const api = createUpdateApi({
    pluginVersion: '0.4.18',
    locationSearch: '',
    fetchImpl: async () => { throw new Error('offline') },
  })
  const result = await api.check()
  assert.equal(result.plugin.known, false)
  assert.match(result.plugin.reason, /offline/)
  assert.equal(result.desktop.known, false)
})
