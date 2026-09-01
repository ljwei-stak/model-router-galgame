import test from 'node:test'
import assert from 'node:assert/strict'
import { selectUnifiedUpdate } from '../.dsh-plugin/client/update-selection.mjs'

function item(available, installable, reason = '') {
  return { available, installable, reason }
}

test('one-click update prefers the full client because it contains the plugin', () => {
  const selected = selectUnifiedUpdate({
    plugin: item(true, true),
    desktop: item(true, true),
  })
  assert.equal(selected.kind, 'desktop')
  assert.match(selected.reason, /包含同版本插件/)
})

test('one-click update installs only the plugin when the client is current', () => {
  const selected = selectUnifiedUpdate({
    plugin: item(true, true),
    desktop: item(false, false, '已是最新版'),
  })
  assert.equal(selected.kind, 'plugin')
})

test('one-click update reports incompatible available releases', () => {
  const selected = selectUnifiedUpdate({
    plugin: item(true, false, '需要更高版本运行时'),
    desktop: item(false, false),
  })
  assert.equal(selected.kind, null)
  assert.match(selected.reason, /更高版本运行时/)
})

test('one-click update is a no-op when both components are current', () => {
  const selected = selectUnifiedUpdate({
    plugin: item(false, false),
    desktop: item(false, false),
  })
  assert.equal(selected.kind, null)
  assert.match(selected.reason, /均已是最新版/)
})
