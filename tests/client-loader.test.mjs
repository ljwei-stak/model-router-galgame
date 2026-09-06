import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

test('client bundle registers under the scoped npm package name', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const bundle = readFileSync(new URL('../.dsh-plugin/client.js', import.meta.url), 'utf8')
  let registration
  vm.runInNewContext(bundle, {
    window: {
      __ModuleLoader__: {
        load(entry) {
          registration = entry
        },
      },
    },
  }, { timeout: 2000 })
  assert.equal(registration?.id, packageJson.name)
  assert.match(registration.id, /^@[^/]+\//)
  assert.equal(typeof registration.factory, 'function')
  assert.match(bundle, new RegExp(`PLUGIN_VERSION = ${JSON.stringify(packageJson.version).replaceAll('.', '\\.')}[;]`))
})
