import test from 'node:test'
import assert from 'node:assert/strict'
import { selectUnifiedUpdate } from '../.dsh-plugin/client/update-selection.mjs'

function item(available, installable, reason = '') {
  return { available, installable, reason }
}

test('one-click update plans npm plugin and full client as independent steps', () => {
  const selected = selectUnifiedUpdate({
    plugin: item(true, true),
    desktop: item(true, true),
  })
  assert.deepEqual(selected.steps, ['plugin', 'desktop'])
  assert.match(selected.reason, /npm 插件、完整客户端/)
})

test('one-click update installs only the plugin when the client is current', () => {
  const selected = selectUnifiedUpdate({
    plugin: item(true, true),
    desktop: item(false, false, '已是最新版'),
  })
  assert.deepEqual(selected.steps, ['plugin'])
})

test('one-click update reports incompatible available releases', () => {
  const selected = selectUnifiedUpdate({
    plugin: item(true, false, '需要更高版本运行时'),
    desktop: item(false, false),
  })
  assert.deepEqual(selected.steps, [])
  assert.match(selected.reason, /更高版本运行时/)
})

test('one-click update is a no-op when both components are current', () => {
  const selected = selectUnifiedUpdate({
    plugin: item(false, false),
    desktop: item(false, false),
  })
  assert.deepEqual(selected.steps, [])
  assert.match(selected.reason, /均已是最新版/)
})

test('one-click update runs installable work and reports blocked work', () => {
  const selected = selectUnifiedUpdate({
    plugin: item(true, true),
    desktop: item(true, false, '当前平台不支持客户端自动更新'),
  })
  assert.deepEqual(selected.steps, ['plugin'])
  assert.deepEqual(selected.blocked, ['当前平台不支持客户端自动更新'])
})
